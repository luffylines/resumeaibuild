'use client';
import type {User} from '@supabase/supabase-js';
import type {Resume} from '@/lib/types';
import {browserSupabase} from '@/lib/supabase';

const BUCKET='profile-avatars';
const AVATAR_FILE='avatar.jpg';
const MAX_INPUT_BYTES=5*1024*1024;
const MAX_CLOUD_BYTES=1024*1024;
const revisions=new Map<string,number>();
const supported=new Set(['image/jpeg','image/png','image/webp']);
export function photoKey(userId:string){return 'resumebuilder:profile-photo:v1:'+userId;}
export function photoPendingKey(userId:string){return 'resumebuilder:profile-photo:pending:'+userId;}
function photoPath(userId:string){return userId+'/'+AVATAR_FILE;}
function bump(userId:string){revisions.set(userId,(revisions.get(userId)||0)+1);}
function changed(userId:string){bump(userId);if(typeof window!=='undefined')window.dispatchEvent(new Event('resumebuilder:avatar-changed'));}
function localGet(key:string):string{try{return typeof window==='undefined'?'':localStorage.getItem(key)||'';}catch{return '';}}
function localSet(key:string,value:string):boolean{try{localStorage.setItem(key,value);return true;}catch{return false;}}
function localRemove(key:string){try{localStorage.removeItem(key);}catch{}}
export function readProfilePhoto(userId:string):string{
 if(!userId)return '';
 const photo=localGet(photoKey(userId));
 return /^data:image\/(jpeg|png|webp);base64,/i.test(photo)?photo:'';
}
export function isProfilePhotoPending(userId:string){return !!(userId&&localGet(photoPendingKey(userId))==='1');}
function reason(error:unknown):string{
 const info=error&&typeof error==='object'?error as {message?:string;statusCode?:string|number;code?:string}:{};
 const message=String(info.message||'').toLowerCase();
 const code=String(info.statusCode||info.code||'');
 if(/bucket not found|bucket does not exist/i.test(message)||code==='404')
  return 'The private profile-avatars bucket is missing in the ResumeBuilder Supabase project.';
 if(/row level security|permission denied|unauthorized|not authorized|forbidden/i.test(message)||code==='403'||code==='42501')
  return 'Supabase Storage denied access. Check the owner-only SELECT, INSERT and UPDATE policies in the ResumeBuilder project.';
 if(/payload too large|file size|exceeded|max.*size/i.test(message)||code==='413')
  return 'The profile-avatars bucket rejected the file size. Set its limit to at least 1 MB.';
 if(/mime|content.type|unsupported/i.test(message))
  return 'The bucket must allow image/jpeg uploads.';
 if(/network|fetch failed|failed to fetch|timeout/i.test(message))
  return 'The network interrupted the upload. Check your connection and retry.';
 if(/invalid jwt|session|sign.in|token/i.test(message)||code==='401')
  return 'Your login session may have expired. Sign in again before retrying.';
 return 'Cloud Storage could not confirm the upload. Check Supabase Storage logs and the profile-avatars setup.';
}
function withCacheBuster(url:string):string{
 return url+(url.includes('?')?'&':'?')+'rbv='+Date.now();
}
/** The cloud avatar is authoritative only after a verified upload.
 * A locally selected image with an unsynced flag must never be overwritten
 * by an older signed URL during background refresh or failed cloud writes.
 */
export async function loadProfilePhoto(userId:string):Promise<string>{
 const local=readProfilePhoto(userId);
 if(!userId)return '';
 if(isProfilePhotoPending(userId)&&local)return local;
 const sb=browserSupabase();
 if(!sb)return local;
 const version=revisions.get(userId)||0;
 try{
  const {data:{user},error}=await sb.auth.getUser();
  if(error||user?.id!==userId)return local;
  // The server endpoint uses its own project Storage credentials; use it
  // first, then the owner-only browser RLS flow for older installations.
  try{
   const response=await fetch('/api/profile/avatar',{method:'GET',credentials:'same-origin',cache:'no-store'});
   if(response.ok){
    const payload=await response.json() as {url?:string};
    if((revisions.get(userId)||0)!==version||isProfilePhotoPending(userId))return readProfilePhoto(userId);
    if(payload.url)return withCacheBuster(payload.url);
   }
   if(response.status===404)return readProfilePhoto(userId);
  }catch{/* Browser RLS fallback below. */}
  const {data,error:signError}=await sb.storage.from(BUCKET).createSignedUrl(photoPath(userId),3600);
  if((revisions.get(userId)||0)!==version||isProfilePhotoPending(userId))return readProfilePhoto(userId);
  if(!signError&&data?.signedUrl)return withCacheBuster(data.signedUrl);
 }catch{/* Keep a verified local backup when the private bucket is unavailable. */}
 return local;
}
function cachePreview(userId:string,image:string){
 const saved=localSet(photoKey(userId),image);
 if(saved)localSet(photoPendingKey(userId),'1');
 changed(userId);
 return saved;
}
export type ProfilePhotoSave={image:string;cloudSaved:boolean;localSaved:boolean;detail:string};
async function verifiedCloudUpload(userId:string,image:string):Promise<void>{
 const sb=browserSupabase();
 if(!sb)throw Error('No Supabase client configured.');
 const {data:{user},error}=await sb.auth.getUser();
 if(error||user?.id!==userId)throw Error('Your session expired or account changed; please sign in again.');
 const response=await fetch(image);
 if(!response.ok)throw Error('Unable to prepare the photo for upload.');
 const blob=await response.blob();
 if(blob.size===0||blob.size>MAX_CLOUD_BYTES)throw Error('The processed photo size exceeded the avatar bucket limit.');
 // First attempt an authenticated same-origin server route. It can create
 // a private Storage bucket on first use if the matching server-only key
 // exists in the dedicated ResumeBuilder project.
 let serverFailure='';
 try{
  const form=new FormData();
  form.append('file',blob,'avatar.jpg');
  const response=await fetch('/api/profile/avatar',{method:'POST',body:form,credentials:'same-origin',cache:'no-store'});
  if(response.ok){
   const payload=await response.json() as {saved?:boolean};
   if(payload.saved)return;
  }else{
   const payload=await response.json().catch(()=>({})) as {error?:string};
   serverFailure=payload.error||'Server avatar endpoint unavailable.';
   if(response.status===401||response.status===403||response.status===400)throw Error(serverFailure);
  }
 }catch(e){
  if(e instanceof Error&&/session|sign in|request origin|processed JPEG/i.test(e.message))throw e;
  if(!serverFailure)serverFailure='Server avatar request failed.';
 }
 // Older installations may have owner-only RLS policies but no server key.
 // Keep that route functional, with verification; never report a cloud save
 // merely because this local upload was attempted.
 const upload=await sb.storage.from(BUCKET).upload(photoPath(userId),blob,{
  contentType:'image/jpeg',cacheControl:'0',upsert:true
 });
 if(upload.error)throw Error((serverFailure?serverFailure+' ':'')+(upload.error.message||'Browser Storage upload was rejected.'));
 // A successful write alone does not establish that the owner can read it.
 // A download also catches incomplete SELECT policies and unavailable objects.
 const downloaded=await sb.storage.from(BUCKET).download(photoPath(userId));
 if(downloaded.error)throw downloaded.error;
 if(!downloaded.data||downloaded.data.size===0)throw Error('Stored image could not be verified.');
}
/** Uploads automatically when selected, not when Save Profile is clicked.
 * The device backup prevents data loss, but only cloudSaved=true means
 * cross-device persistence was verified.
 */
function imageType(file:File):string {
 if(supported.has(file.type))return file.type;
 if(file.type)return '';
 const extension=file.name.toLowerCase().split('.').pop();
 return extension==='jpg'||extension==='jpeg'?'image/jpeg':extension==='png'?'image/png':extension==='webp'?'image/webp':'';
}
function fileDataUrl(file:File):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(Error('Unable to read the selected image.'));
  reader.onerror=()=>reject(Error('Could not read this picture. Please choose the file again.'));
  reader.readAsDataURL(file);
 });
}
async function resizedJpeg(file:File):Promise<string>{
 const src=URL.createObjectURL(file);
 try{
  const picture=new Image();
  await new Promise<void>((resolve,reject)=>{
   picture.onload=()=>resolve();
   picture.onerror=()=>reject(Error('This browser could not decode the selected image. Try JPG or PNG.'));
   picture.src=src;
  });
  if(!picture.naturalWidth||!picture.naturalHeight)throw Error('This picture has no readable dimensions.');
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Your browser cannot resize this image. Try a JPEG under 1 MB.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);
  const size=Math.min(picture.naturalWidth,picture.naturalHeight);
  ctx.drawImage(picture,(picture.naturalWidth-size)/2,(picture.naturalHeight-size)/2,size,size,0,0,256,256);
  const output=canvas.toDataURL('image/jpeg',.82);
  if(!output.startsWith('data:image/jpeg;base64,'))throw Error('Could not convert this picture to JPEG.');
  return output;
 }finally{URL.revokeObjectURL(src);}
}

/** File selection must show the new picture immediately, regardless of network
 * access. Small, valid JPGs (including progressive JPEGs) do not need canvas
 * processing; this also avoids browser-specific image decoding failures.
 */
export async function saveProfilePhoto(userId:string,file:File,onPreview?:(image:string)=>void):Promise<ProfilePhotoSave>{
 const mime=imageType(file);
 if(!userId||!mime)throw Error('Select a JPG, PNG or WebP photo.');
 if(!file.size||file.size>MAX_INPUT_BYTES)throw Error('Choose a profile image smaller than 5 MB.');
 const raw=await fileDataUrl(file);
 if(!raw.includes(';base64,'))throw Error('The selected picture could not be read. Choose JPG or PNG.');
 const original='data:'+mime+';base64,'+raw.split(';base64,')[1];
 // Never make the user's visible preview depend on Storage or a successful
 // image conversion, and keep a per-account local fallback when possible.
 let image=original;
 let localSaved=cachePreview(userId,image);
 onPreview?.(image);
 if(mime!=='image/jpeg'||file.size>MAX_CLOUD_BYTES){
  try{
   image=await resizedJpeg(file);
   localSaved=cachePreview(userId,image)||localSaved;
   onPreview?.(image);
  }catch(error){
   return {
    image:original,cloudSaved:false,localSaved,
    detail:'Your photo is selected but the browser could not prepare it for cloud upload. '+(error instanceof Error?error.message:'Try a JPG or PNG photo.')
   };
  }
 }
 try{
  await verifiedCloudUpload(userId,image);
  localRemove(photoPendingKey(userId));
  changed(userId);
  return {image,cloudSaved:true,localSaved,detail:'Profile photo saved to your ResumeBuilder account. It will remain after refresh or sign-in on another device.'};
 }catch(error){
  if(!localSaved)throw Error('Photo preview is visible, but neither browser backup nor cloud save succeeded. '+reason(error));
  return {image,cloudSaved:false,localSaved:true,detail:'Photo is visible on this device but not yet saved to your account. '+reason(error)};
 }
}

/** Retry a previously selected photo without making the user choose it again. */
export async function retryProfilePhotoSync(userId:string):Promise<ProfilePhotoSave>{
 const image=readProfilePhoto(userId);
 if(!image)throw Error('No locally saved photo is available. Select your picture again.');
 try{
  await verifiedCloudUpload(userId,image);
  localRemove(photoPendingKey(userId));
  changed(userId);
  return {image,cloudSaved:true,localSaved:true,detail:'Profile photo synchronized to your ResumeBuilder account. It is now available across devices.'};
 }catch(error){
  localSet(photoPendingKey(userId),'1');
  throw Error('Cloud sync still failed. '+reason(error));
 }
}
export async function removeProfilePhoto(userId:string):Promise<{cloudRemoved:boolean;localRemoved:boolean;detail:string}>{
 const sb=browserSupabase();
 if(sb){
  try{
   const {data:{user},error}=await sb.auth.getUser();
   if(error||user?.id!==userId)throw Error('Your session expired or account changed.');
   let serverRemoved=false;
   try{
    const response=await fetch('/api/profile/avatar',{method:'DELETE',credentials:'same-origin'});
    if(response.ok)serverRemoved=true;
    else if(response.status!==503)throw Error('Unable to remove photo from the account.');
   }catch(error){
    if(error instanceof Error&&/Unable to remove photo from the account/.test(error.message))throw error;
   }
   if(!serverRemoved){
    const removed=await sb.storage.from(BUCKET).remove([photoPath(userId)]);
    if(removed.error)throw removed.error;
   }
   localRemove(photoKey(userId));
   localRemove(photoPendingKey(userId));
   changed(userId);
   return {cloudRemoved:true,localRemoved:true,detail:'Profile photo removed from your account and this device.'};
  }catch(error){
   if(isProfilePhotoPending(userId)&&/bucket.*missing|bucket.*not found/i.test(reason(error))){
    localRemove(photoKey(userId));localRemove(photoPendingKey(userId));changed(userId);
    return {cloudRemoved:false,localRemoved:true,detail:'Local-only photo removed. No cloud bucket was available.'};
   }
   return {cloudRemoved:false,localRemoved:false,detail:'The photo was not removed because cloud deletion failed. '+reason(error)};
  }
 }
 localRemove(photoKey(userId));localRemove(photoPendingKey(userId));changed(userId);
 return {cloudRemoved:false,localRemoved:true,detail:'Local photo removed. Supabase is not connected.'};
}
export function accountAvatar(_user:User|null,_resumes:Resume[]=[],custom=''):string{
 return custom||'/images/avatar.png';
}
