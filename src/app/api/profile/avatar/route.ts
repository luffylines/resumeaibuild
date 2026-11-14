import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {serverSupabase} from '@/lib/supabase-server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const BUCKET='profile-avatars';
const MAX_BYTES=1024*1024;
const responseHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const json=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers:responseHeaders});

function logStorage(operation:string,error:unknown){
 const detail=error&&typeof error==='object'?error as {code?:string;statusCode?:string|number}:{};
 console.error('[profile-avatar] Storage operation failed',{operation,code:detail.code||detail.statusCode||'UNKNOWN'});
}
function isMissing(error:unknown){
 if(!error||typeof error!=='object')return false;
 const e=error as {message?:string;status?:number;statusCode?:string|number};
 return Number(e.status||e.statusCode)===404||/bucket not found|not found|does not exist/i.test(e.message||'');
}
async function sessionAndStorage(){
 const sb=await serverSupabase();
 if(!sb)return {error:json({error:'Supabase authentication is not configured for ResumeBuilder.'},503)};
 const {data:{user},error}=await sb.auth.getUser();
 if(error||!user)return {error:json({error:'Please sign in to upload your account picture.'},401)};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret)return {error:json({error:'Server avatar Storage is not configured. A server-only Supabase secret key is needed in the dedicated ResumeBuilder Vercel project.'},503)};
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 return {user,admin};
}
function rejectCrossOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 return Boolean(origin&&origin!==request.nextUrl.origin);
}
async function ensurePrivateBucket(admin:ReturnType<typeof createClient>){
 const present=await admin.storage.getBucket(BUCKET);
 if(present.data){
  if(present.data.public){
   // Prevent an existing misconfigured public avatar bucket from leaking photos.
   const update=await admin.storage.updateBucket(BUCKET,{public:false,allowedMimeTypes:['image/jpeg'],fileSizeLimit:MAX_BYTES});
   if(update.error)throw update.error;
  }
  return;
 }
 if(present.error&&!isMissing(present.error))throw present.error;
 // Authenticated, fixed-path uploads may provision this app-owned bucket
 // once, if the project's server key is configured. No access is granted
 // to other users: all object operations are done on the authenticated UID.
 const created=await admin.storage.createBucket(BUCKET,{public:false,allowedMimeTypes:['image/jpeg'],fileSizeLimit:MAX_BYTES});
 if(created.error){
  const race=await admin.storage.getBucket(BUCKET);
  if(race.error||!race.data)throw created.error;
  if(race.data.public)throw Error('Avatar storage is not private.');
 }
}
export async function GET(){
 const state=await sessionAndStorage();
 if('error' in state)return state.error;
 const {user,admin}=state;
 const result=await admin.storage.from(BUCKET).createSignedUrl(user.id+'/avatar.jpg',3600);
 if(result.error){
  if(isMissing(result.error))return json({error:'No saved account picture was found.'},404);
  logStorage('signed-url',result.error);
  return json({error:'Unable to retrieve your saved profile picture.'},503);
 }
 return json({url:result.data?.signedUrl||''});
}
export async function POST(request:NextRequest){
 if(rejectCrossOrigin(request))return json({error:'Request origin does not match this website.'},403);
 const state=await sessionAndStorage();
 if('error' in state)return state.error;
 const {user,admin}=state;
 let part:FormDataEntryValue|null;
 try{
  const data=await request.formData();
  part=data.get('file');
 }catch{return json({error:'Unable to read your uploaded photo.'},400);}
 if(!part||typeof part==='string'||typeof part.arrayBuffer!=='function'||part.type!=='image/jpeg'||!part.size||part.size>MAX_BYTES){
  return json({error:'Upload a processed JPEG profile picture no larger than 1 MB.'},400);
 }
 const bytes=new Uint8Array(await part.arrayBuffer());
 if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff){
  return json({error:'The file is not a valid JPEG.'},400);
 }
 try{
  await ensurePrivateBucket(admin);
  const path=user.id+'/avatar.jpg';
  const uploaded=await admin.storage.from(BUCKET).upload(path,bytes,{contentType:'image/jpeg',cacheControl:'0',upsert:true});
  if(uploaded.error)throw uploaded.error;
  const verify=await admin.storage.from(BUCKET).download(path);
  if(verify.error||!verify.data||verify.data.size===0)throw verify.error||Error('Avatar verification failed.');
  const signed=await admin.storage.from(BUCKET).createSignedUrl(path,3600);
  if(signed.error||!signed.data?.signedUrl)throw signed.error||Error('Avatar signed URL failed.');
  return json({saved:true,url:signed.data.signedUrl});
 }catch(error){
  logStorage('upload-and-verify',error);
  return json({error:'Account photo could not be stored. Check the ResumeBuilder server-only Supabase credentials and Storage configuration.'},503);
 }
}
export async function DELETE(request:NextRequest){
 if(rejectCrossOrigin(request))return json({error:'Request origin does not match this website.'},403);
 const state=await sessionAndStorage();
 if('error' in state)return state.error;
 const {user,admin}=state;
 const removed=await admin.storage.from(BUCKET).remove([user.id+'/avatar.jpg']);
 if(removed.error){
  logStorage('delete',removed.error);
  return json({error:'Unable to remove your account photo from cloud storage.'},503);
 }
 return json({removed:true});
}
