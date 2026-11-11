const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

function compile(path){
 return ts.transpileModule(fs.readFileSync(path,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText;
}
function moduleWith(source,env,imports={}){
 const mod={exports:{}};
 const runtime={module:mod,exports:mod.exports,process:{env},require:name=>{
  if(name in imports)return imports[name];
  throw Error('Unexpected module '+name);
 },console,AbortSignal,fetch:imports.__fetch};
 vm.runInNewContext(source,runtime);
 return mod.exports;
}
const modelsJS=compile('src/lib/ai-model.ts');
function models(env){return moduleWith(modelsJS,env);}
assert.equal(models({}).geminiModel(),'gemini-3.5-flash-lite');
assert.deepEqual(Array.from(models({}).geminiModels()),['gemini-3.5-flash-lite','gemini-3.8-flash']);
assert.deepEqual(Array.from(models({GEMINI_MODEL:'gemini-3.8-flash'}).geminiModels()),['gemini-3.8-flash','gemini-3.5-flash-lite']);
assert.equal(models({GEMINI_MODEL:'gemini-2.5-flash'}).geminiModel(),'gemini-3.5-flash-lite');
assert.deepEqual(Array.from(models({GEMINI_MODEL:'gemini-3.8-flash',GEMINI_FALLBACK_MODEL:'gemini-3.5-flash'}).geminiModels()),['gemini-3.8-flash','gemini-3.5-flash','gemini-3.5-flash-lite']);

const routeJS=compile('src/app/api/ai/route.ts');
function setup(env,fetcher){
 const fakeSupabase={
  auth:{
   getUser:async()=>({data:{user:{id:'test-user'}}}),
   mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null})}
  },
  from:()=>({insert:async()=>({error:null})})
 };
 const routing=moduleWith(routeJS,env,{
  'next/server':{NextResponse:{json:(payload,options)=>({data:payload,status:options?.status||200})}},
  '@/lib/supabase-server':{serverSupabase:async()=>fakeSupabase},
  '@/lib/ai-model':models(env),
  __fetch:fetcher
 });
 return routing.POST;
}
const req={json:async()=>({task:'summary',context:'An applicant with demonstrated experience working on projects and technical skills.'})};
const ok=data=>({ok:true,status:200,json:async()=>data});
const error=(status,message)=>({ok:false,status,json:async()=>({error:{message}})});
(async()=>{
 let urls=[];
 let post=setup({GEMINI_API_KEY:'gemini-test'},async url=>{
  urls.push(String(url));
  if(String(url).includes('gemini-3.5-flash-lite'))return error(503,'This model is currently experiencing high demand.');
  return ok({candidates:[{content:{parts:[{text:'Recovered with alternate Gemini model.'}]}}]});
 });
 let response=await post(req);
 assert.equal(response.status,200);
 assert.equal(response.data.output,'Recovered with alternate Gemini model.');
 assert.equal(response.data.model,'gemini-3.8-flash');
 assert.equal(urls.length,2);

 urls=[];
 post=setup({GEMINI_API_KEY:'gemini-test',OPENAI_API_KEY:'openai-test'},async url=>{
  urls.push(String(url));
  if(String(url).includes('generativelanguage.googleapis.com'))return error(503,'This model is currently experiencing high demand.');
  return ok({choices:[{message:{content:'Recovered via configured OpenAI fallback.'}}]});
 });
 response=await post(req);
 assert.equal(response.status,200);
 assert.equal(response.data.provider,'OpenAI');
 assert.equal(urls.length,3);

 urls=[];
 post=setup({GEMINI_API_KEY:'gemini-test'},async url=>{urls.push(String(url));return error(503,'Busy');});
 response=await post(req);
 assert.equal(response.status,503);
 assert.equal(response.data.code,'AI_BUSY');
 assert.ok(!response.data.error.includes('This model'));
 assert.equal(urls.length,2);

 urls=[];
 post=setup({GEMINI_API_KEY:'gemini-test',OPENAI_API_KEY:'openai-test'},async url=>{
  urls.push(String(url));return error(401,'Invalid API key');
 });
 response=await post(req);
 assert.equal(response.status,401);
 assert.equal(urls.length,1,'Invalid API keys must not loop through other models or providers');
 console.log('PASS AI fallback: light model, alternate Gemini, OpenAI backup, busy-state and invalid-key guard');
})().catch(err=>{console.error(err);process.exitCode=1;});
