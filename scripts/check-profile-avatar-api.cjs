const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');

const raw=fs.readFileSync('src/app/api/profile/avatar/route.ts','utf8');
const js=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const state={uid:'account-uuid',authenticated:true,bucket:false,public:false,reads:0,writes:0,removed:0,paths:[]};
const storage={
 getBucket:async()=>state.bucket?{data:{public:state.public},error:null}:{data:null,error:{message:'Bucket not found',statusCode:'404'}},
 createBucket:async(name,options)=>{assert.equal(name,'profile-avatars');assert.equal(options.public,false);assert.deepEqual(Array.from(options.allowedMimeTypes),['image/jpeg']);state.bucket=true;return {data:{},error:null};},
 updateBucket:async()=>{state.public=false;return {error:null}},
 from:bucket=>{
  assert.equal(bucket,'profile-avatars');
  return {
   upload:async(path,bytes,opts)=>{state.paths.push(path);state.writes++;assert.equal(path,state.uid+'/avatar.jpg');assert.equal(opts.contentType,'image/jpeg');assert.equal(opts.upsert,true);assert.equal(bytes[0],255);return {data:{path},error:null};},
   download:async path=>{state.reads++;assert.equal(path,state.uid+'/avatar.jpg');return {data:new Blob(['fake-jpeg'],{type:'image/jpeg'}),error:null};},
   createSignedUrl:async path=>{assert.equal(path,state.uid+'/avatar.jpg');return {data:{signedUrl:'https://private.storage.test/avatar?token=test'},error:null};},
   remove:async paths=>{state.removed++;assert.deepEqual(Array.from(paths),[state.uid+'/avatar.jpg']);return {data:[],error:null};}
  };
 }
};
let adminCalls=0;
const admin={storage};
const mod={exports:{}};
const context={
 module:mod,exports:mod.exports,Blob,Uint8Array,Error,RegExp,Number,String,Boolean,console,
 process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://resumebuilder-only.supabase.co',SUPABASE_SECRET_KEY:'test-server-key'}},
 require:(path)=>{
  if(path==='next/server')return {NextResponse:{json:(body,options)=>({body,status:options?.status||200,headers:options?.headers})}};
  if(path==='@supabase/supabase-js')return {createClient:()=>{adminCalls++;return admin;}};
  if(path==='@/lib/supabase-server')return {serverSupabase:async()=>({auth:{getUser:async()=>({data:{user:state.authenticated?{id:state.uid}:null},error:null})}})};
  throw Error('Unexpected import '+path);
 }
};
vm.runInNewContext(js,context);
const api=mod.exports;
function request({origin='https://resumeaibuild-virid.vercel.app',format='image/jpeg',bytes=new Uint8Array([255,216,255,224,0,0]),method='POST'}={}){
 return {
  nextUrl:{origin:'https://resumeaibuild-virid.vercel.app'},
  headers:{get:name=>name==='origin'?origin:null},
  formData:async()=>({get:key=>key==='file'?{type:format,size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer}:null})
 };
}
(async()=>{
 state.authenticated=false;
 let res=await api.GET();
 assert.equal(res.status,401,'Anonymous users cannot read private photos');
 res=await api.POST(request());
 assert.equal(res.status,401,'Anonymous users cannot upload private photos');
 state.authenticated=true;
 res=await api.POST(request({origin:'https://evil.example'}));
 assert.equal(res.status,403,'Reject a cross-origin form submission');
 res=await api.POST(request({format:'image/png'}));
 assert.equal(res.status,400,'Server accepts JPEG only after client conversion');
 res=await api.POST(request({bytes:new Uint8Array([10,20,30,40])}));
 assert.equal(res.status,400,'Server verifies JPEG magic header');
 res=await api.POST(request());
 assert.equal(res.status,200);
 assert.equal(res.body.saved,true);
 assert.equal(state.bucket,true,'Authenticated upload creates app bucket with server-only key');
 assert.equal(state.writes,1);
 assert.equal(state.reads,1,'Uploaded image must be readable before reporting success');
 assert.ok(adminCalls>0);
 res=await api.GET();
 assert.equal(res.status,200);
 assert.ok(res.body.url.includes('private.storage.test'));
 res=await api.DELETE(request());
 assert.equal(res.status,200);
 assert.equal(state.removed,1);
 state.public=true;
 res=await api.POST(request());
 assert.equal(res.status,200);
 assert.equal(state.public,false,'Existing public bucket must be locked private');
 delete context.process.env.SUPABASE_SECRET_KEY;
 res=await api.POST(request());
 assert.equal(res.status,503,'Without private key, route cannot silently claim success');
 console.log('PASS avatar API: auth/CSRF, MIME validation, private bucket provisioning, owner isolation, verified readback and deletion');
})().catch(e=>{console.error(e);process.exitCode=1;});
