import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
import {adminAccess} from '@/lib/admin-access';
import {writeAudit} from '@/lib/audit';
const err=(status:number,error:string)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:NextRequest){
 const period=req.nextUrl.searchParams.get('period')||'30';
 if(!['7','30','90','all'].includes(period))return err(400,'Invalid date filter.');
 const since=period==='all'?null:new Date(Date.now()-Number(period)*86400000).toISOString();
 const guard=await adminAccess();if('error'in guard)return err(guard.status??500,guard.error??'Admin authorization failed.');
 const db=guard.admin;
 const [users,resumes,ats,profiles,events,ai]=await Promise.all([
  db.auth.admin.listUsers({page:1,perPage:200}),
  db.from('resumes').select('id,title,user_id,created_at,updated_at',{count:'exact'}).order('created_at',{ascending:false}).limit(30),
  (since?db.from('ats_scans').select('id,score,user_id,created_at',{count:'exact'}).gte('created_at',since):db.from('ats_scans').select('id,score,user_id,created_at',{count:'exact'})).order('created_at',{ascending:false}).limit(80),
  db.from('profiles').select('user_id,full_name,plan,created_at').limit(200),
  (since?db.from('activity_logs').select('id,actor_id,action,details,created_at,ip_address,user_agent',{count:'exact'}).gte('created_at',since):db.from('activity_logs').select('id,actor_id,action,details,created_at,ip_address,user_agent',{count:'exact'})).order('created_at',{ascending:false}).limit(250),
  (since?db.from('ai_events').select('id,task,created_at',{count:'exact'}).gte('created_at',since):db.from('ai_events').select('id,task,created_at',{count:'exact'})).order('created_at',{ascending:false}).limit(120)
 ]);
 for(const item of [users,resumes,ats,profiles,events,ai])if(item.error)return err(500,item.error.message);
 const meta=new Map((profiles.data||[]).map(p=>[p.user_id,p]));
 const people=(users.data?.users||[]).map(u=>({id:u.id,email:u.email||'',name:meta.get(u.id)?.full_name||u.user_metadata?.full_name||'',plan:meta.get(u.id)?.plan||'Free',created_at:u.created_at,last_sign_in_at:u.last_sign_in_at||null}));
 const data={users:people,userTotal:(users.data as any)?.total||people.length,resumes:resumes.data||[],resumeCount:resumes.count||0,ats:ats.data||[],atsCount:ats.count||0,activities:(events.data||[]).map(e=>({...e,actor_email:(e.details as Record<string,unknown>|null)?.actor_email||null})),activityCount:events.count||0,period,aiEvents:ai.data||[],aiCount:ai.count||0,plans:{free:people.filter(p=>p.plan==='Free').length,pro:people.filter(p=>p.plan==='Pro').length,team:people.filter(p=>p.plan==='Team').length},limitedUsers:people.length===200};
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)return err(403,'Invalid request origin.');
 const guard=await adminAccess();if('error'in guard)return err(guard.status??500,guard.error??'Admin authorization failed.');
 let body:Record<string,unknown>;try{body=await req.json();}catch{return err(400,'Invalid JSON.');}
 if(!body||typeof body!=='object')return err(400,'Invalid request.');
 const db=guard.admin;
 if(body.action==='set-plan'){
  if(typeof body.user_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.user_id)||!['Free','Pro','Team'].includes(String(body.plan)))return err(400,'Invalid plan update.');
  const {error}=await db.from('profiles').upsert({user_id:body.user_id,plan:body.plan},{onConflict:'user_id'});if(error)return err(500,error.message);
  await writeAudit(db,req,guard.user,'plan_updated',{target_user:body.user_id,plan:body.plan});
  return NextResponse.json({ok:true});
 }
 return err(400,'Unsupported action.');
}
