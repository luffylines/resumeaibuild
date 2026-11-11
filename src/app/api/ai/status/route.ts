import {NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/supabase-server';
import {geminiModel} from '@/lib/ai-model';
export const runtime='nodejs';

type ProviderStatus={name:'Gemini'|'OpenAI'|'Groq';status:'connected'|'unavailable'|'not_configured';model:string;message:string};
/** A credential/connectivity probe, NOT a paid-generation test.
 * Never sends keys or provider error bodies back to the browser.
 */
export async function GET(){
 const sb=await serverSupabase();
 if(!sb)return NextResponse.json({error:'Authentication is not configured.'},{status:503});
 const {data:{user},error}=await sb.auth.getUser();
 if(error||!user)return NextResponse.json({error:'Sign in to check AI integrations.'},{status:401});
 const {data:aal,error:aalError}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
 if(aalError||!aal||aal.nextLevel==='aal2'&&aal.currentLevel!=='aal2')return NextResponse.json({error:'Complete two-factor sign in first.'},{status:403});
 const targets:[
  ProviderStatus['name'],string|undefined,string,string,Record<string,string>
 ][]=[
  ['Gemini',process.env.GEMINI_API_KEY,geminiModel(),'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',{'x-goog-api-key':process.env.GEMINI_API_KEY||''}],
  ['OpenAI',process.env.OPENAI_API_KEY,(process.env.OPENAI_MODEL||'gpt-4.1-mini'),'https://api.openai.com/v1/models',{Authorization:'Bearer '+(process.env.OPENAI_API_KEY||'')}],
  ['Groq',process.env.GROQ_API_KEY,(process.env.GROQ_TRANSCRIPTION_MODEL||'whisper-large-v3-turbo'),'https://api.groq.com/openai/v1/models',{Authorization:'Bearer '+(process.env.GROQ_API_KEY||'')}]
 ];
 const providers=await Promise.all(targets.map(async([name,key,model,url,headers]):Promise<ProviderStatus>=>{
  if(!key)return {name,status:'not_configured',model,message:'API key is not configured on the deployment.'};
  try{
   const res=await fetch(url,{method:'GET',headers,cache:'no-store',signal:AbortSignal.timeout(6000)});
   return {name,status:res.ok?'connected':'unavailable',model,message:res.ok?'API credentials accepted; this does not guarantee generation capacity.':res.status===401||res.status===403?'Provider rejected these credentials.':'Provider endpoint could not be verified.'};
  }catch{return {name,status:'unavailable',model,message:'Provider could not be reached from the server.'};}
 }));
 return NextResponse.json({providers,checkedAt:new Date().toISOString()}, {headers:{'Cache-Control':'private, no-store'}});
}
