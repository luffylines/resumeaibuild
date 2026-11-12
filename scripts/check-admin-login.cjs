const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

const transpile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
function fromSource(path,mocks={}){
 const mod={exports:{}};
 const ctx={module:mod,exports:mod.exports,require:name=>{
  if(name in mocks)return mocks[name];
  throw Error('Unexpected import '+name);
 },console,URL};
 vm.runInNewContext(transpile(path),ctx);
 return mod.exports;
}
const {checkAdminRole}=fromSource('src/lib/admin-role.ts');

async function checkRole(lookup){
 const sb={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>lookup})})})};
 return checkAdminRole(sb,'a-user-id');
}
(async()=>{
 assert.equal((await checkRole({data:{user_id:'a-user-id'},error:null})).status,'authorized');
 assert.equal((await checkRole({data:null,error:null})).status,'not_admin');
 assert.equal((await checkRole({data:{user_id:'someone-else'},error:null})).status,'not_admin');
 assert.equal((await checkRole({data:null,error:{code:'42501'}})).status,'unavailable');

 const redirect=url=>({redirect:url.toString()});
 const response={redirect,json:(body,options)=>({body,status:options?.status||200})};
 const user={id:'a-user-id'};
 const getCallback=(role,opts={})=>{
  const sb={
   auth:{
    exchangeCodeForSession:async()=>opts.exchangeError?{error:{code:'flow_state_expired',status:400}}:{error:null},
    getUser:async()=>({data:{user},error:null})
   }
  };
  return fromSource('src/app/auth/callback/route.ts',{
   'next/server':{NextResponse:response},
   '@/lib/supabase-server':{serverSupabase:async()=>sb},
   '@/lib/admin-role':{checkAdminRole:async()=>({status:role})}
  }).GET;
 };
 const adminURL='https://resumeaibuild-virid.vercel.app/auth/callback?code=sample-code&next=admin';
 let result=await getCallback('authorized')({url:adminURL,nextUrl:new URL(adminURL)});
 assert.equal(new URL(result.redirect).pathname,'/admin','Admin OAuth must reach /admin after authorization');
 result=await getCallback('not_admin')({url:adminURL,nextUrl:new URL(adminURL)});
 assert.equal(new URL(result.redirect).pathname,'/admin/login','Non-admin Google account must not access admin');
 assert.equal(new URL(result.redirect).searchParams.get('error'),'not_admin');
 result=await getCallback('unavailable')({url:adminURL,nextUrl:new URL(adminURL)});
 assert.equal(new URL(result.redirect).searchParams.get('error'),'admin_role_unavailable');
 const userURL='https://resumeaibuild-virid.vercel.app/auth/callback?code=sample-code';
 result=await getCallback('not_admin')({url:userURL,nextUrl:new URL(userURL)});
 assert.equal(new URL(result.redirect).pathname,'/app','Ordinary user login still reaches /app');

 const getStatus=(role,authenticated=true)=>{
  const sb={auth:{getUser:async()=>({data:{user:authenticated?user:null},error:null})}};
  return fromSource('src/app/api/admin/access-check/route.ts',{
   'next/server':{NextResponse:response},
   '@/lib/supabase-server':{serverSupabase:async()=>sb},
   '@/lib/admin-role':{checkAdminRole:async()=>({status:role})}
  }).GET;
 };
 result=await getStatus('authorized')();assert.equal(result.status,200);assert.equal(result.body.authorized,true);
 result=await getStatus('not_admin')();assert.equal(result.status,403);assert.equal(result.body.authorized,false);
 result=await getStatus('unavailable')();assert.equal(result.status,503);
 result=await getStatus('authorized',false)();assert.equal(result.status,401);
 console.log('PASS admin auth: Google callback goes to /admin only for role-approved users; password session checks fail closed');
})().catch(error=>{console.error(error);process.exitCode=1;});
