import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {serverSupabase} from '@/lib/supabase-server';
export const runtime='nodejs';
async function guarded(){
 const sb=await serverSupabase();if(!sb)return {status:503 as const,error:'Dedicated Supabase project not configured.'};
 const {data:{user},error}=await sb.auth.getUser();if(error||!user)return {status:401 as const,error:'Please sign in.'};
 const role=await (sb as any).from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(role.error||!role.data)return {status:403 as const,error:'Administrator permission required.'};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret)return {status:503 as const,error:'Configure the separate Supabase project and server-side admin secret key.'};
 return {admin:createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}),user};
}
const err=(status:number,error:string)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const guard=await guarded();if('error'in guard)return err(guard.status??500,guard.error);
 const db=guard.admin;
 const [users,resumes,ats,jobs,applications,profiles,events,ai]=await Promise.all([
  db.auth.admin.listUsers({page:1,perPage:200}),
  db.from('resumes').select('id,title,user_id,created_at,updated_at',{count:'exact'}).order('created_at',{ascending:false}).limit(30),
  db.from('ats_scans').select('id,score,user_id,created_at',{count:'exact'}).order('created_at',{ascending:false}).limit(30),
  db.from('job_posts').select('*').order('created_at',{ascending:false}).limit(200),
  db.from('job_applications').select('id',{count:'exact',head:true}),
  db.from('profiles').select('user_id,full_name,plan,created_at').limit(200),
  db.from('activity_logs').select('id,action,details,created_at',{count:'exact'}).order('created_at',{ascending:false}).limit(30),
  db.from('ai_events').select('id,task,created_at',{count:'exact'}).order('created_at',{ascending:false}).limit(30)
 ]);
 for(const item of [users,resumes,ats,jobs,applications,profiles,events,ai])if(item.error)return err(500,item.error.message);
 const meta=new Map((profiles.data||[]).map(p=>[p.user_id,p]));
 const people=(users.data?.users||[]).map(u=>({id:u.id,email:u.email||'',name:meta.get(u.id)?.full_name||u.user_metadata?.full_name||'',plan:meta.get(u.id)?.plan||'Free',created_at:u.created_at,last_sign_in_at:u.last_sign_in_at||null}));
 const data={users:people,userTotal:(users.data as any)?.total||people.length,resumes:resumes.data||[],resumeCount:resumes.count||0,ats:ats.data||[],atsCount:ats.count||0,jobs:jobs.data||[],applicationCount:applications.count||0,activities:events.data||[],aiEvents:ai.data||[],aiCount:ai.count||0,plans:{free:people.filter(p=>p.plan==='Free').length,pro:people.filter(p=>p.plan==='Pro').length,team:people.filter(p=>p.plan==='Team').length},limitedUsers:people.length===200};
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)return err(403,'Invalid request origin.');
 const guard=await guarded();if('error'in guard)return err(guard.status??500,guard.error);
 let body:Record<string,unknown>;try{body=await req.json();}catch{return err(400,'Invalid JSON.');}
 if(!body||typeof body!=='object')return err(400,'Invalid request.');
 const db=guard.admin;
 if(body.action==='save-job'){
  const role=String(body.role||'').trim(),company=String(body.company||'').trim(),location=String(body.location||'').trim(),type=String(body.type||'Full-time').trim();
  if(!role||!company||role.length>150||company.length>150||location.length>150||type.length>50)return err(400,'Please provide valid job details.');
  if(!['Full-time','Part-time','Contract','Internship'].includes(type))return err(400,'Invalid employment type.');
  const keywords=Array.isArray(body.keywords)?body.keywords.filter((x):x is string=>typeof x==='string'&&x.length<60).slice(0,12):[];
  const id=typeof body.id==='string'&&/^[0-9a-f-]{36}$/i.test(body.id)?body.id:crypto.randomUUID();
  const {error}=await db.from('job_posts').upsert({id,role,company,location,type,keywords,is_active:body.is_active===true,updated_at:new Date().toISOString()});
  if(error)return err(500,error.message);
  await db.from('activity_logs').insert({action:'job_saved',details:{role,company},actor_id:guard.user.id});
  return NextResponse.json({ok:true,id});
 }
 if(body.action==='delete-job'){
  if(typeof body.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))return err(400,'Invalid job ID.');
  const {error}=await db.from('job_posts').delete().eq('id',body.id);if(error)return err(500,error.message);
  await db.from('activity_logs').insert({action:'job_deleted',details:{id:body.id},actor_id:guard.user.id});
  return NextResponse.json({ok:true});
 }
 if(body.action==='set-plan'){
  if(typeof body.user_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.user_id)||!['Free','Pro','Team'].includes(String(body.plan)))return err(400,'Invalid plan update.');
  const {error}=await db.from('profiles').upsert({user_id:body.user_id,plan:body.plan},{onConflict:'user_id'});if(error)return err(500,error.message);
  await db.from('activity_logs').insert({action:'plan_updated',details:{user_id:body.user_id,plan:body.plan},actor_id:guard.user.id});
  return NextResponse.json({ok:true});
 }
 return err(400,'Unsupported action.');
}
