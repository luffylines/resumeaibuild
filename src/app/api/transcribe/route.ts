import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {serverSupabase} from '@/lib/supabase-server';
import {geminiModel} from '@/lib/ai-model';

export const runtime='nodejs';
const MAX_AUDIO_BYTES=2_500_000;
const DAILY_LIMIT=15;
const ALLOWED=new Set(['audio/webm','audio/mp4','audio/ogg','audio/wav','audio/mpeg','audio/mp3','audio/x-m4a','audio/m4a']);
const reply=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});

/**
 * Explicit opt-in backup for browsers without working Web Speech recognition.
 * Never exposed to demo/anonymous users. Never stores the raw audio.
 */
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return reply('Cross-site requests are not allowed.',403);
 if(!process.env.GROQ_API_KEY&&!process.env.GEMINI_API_KEY&&!process.env.OPENAI_API_KEY)return reply('Configure GROQ_API_KEY, GEMINI_API_KEY or OPENAI_API_KEY in Vercel first.',503);
 const supabase=await serverSupabase();
 if(!supabase)return reply('Configure Supabase before enabling AI transcription.',503);
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return reply('Sign in to ResumeBuilder first to use AI transcription.',401);
 const {data:aal,error:aalError}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(aalError||!aal||aal.nextLevel==='aal2'&&aal.currentLevel!=='aal2')return reply('Complete your two-factor authentication first.',403);

 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const adminKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!adminKey)return reply('Configure the private Supabase server key for secure transcription limits.',503);

 const db=createClient(url,adminKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const since=new Date(Date.now()-24*60*60*1000).toISOString();
 const {count,error:countError}=await db.from('ai_events').select('id',{count:'exact',head:true})
  .eq('user_id',user.id).eq('task','transcription').gte('created_at',since);
 if(countError)return reply('Transcription quota could not be checked. Try again later.',503);
 if((count||0)>=DAILY_LIMIT)return reply('You reached the 15-transcription daily limit. Try again tomorrow or use browser dictation.',429);

 const sizeHeader=Number(req.headers.get('content-length')||0);
 if(sizeHeader>MAX_AUDIO_BYTES+100_000)return reply('Recording is too large. Keep your recording under 40 seconds.',413);
 let form:FormData;
 try{form=await req.formData();}catch{return reply('Invalid audio upload.',400);}
 const audio=form.get('audio');
 const language=form.get('language');
 if(!(audio instanceof File)||!audio.size||audio.size>MAX_AUDIO_BYTES)return reply('Please record a short audio answer under 2.5 MB.',400);
 const mime=audio.type.split(';')[0].toLowerCase();
 if(!ALLOWED.has(mime))return reply('Unsupported audio format. Use WebM, MP4, OGG, WAV or MP3.',415);
 const lang=typeof language==='string'&&['en-US','en-PH','fil-PH'].includes(language)?language:'en-US';
 const abort=AbortSignal.timeout(30000);
 let transcript='';
 try{
  if(process.env.GROQ_API_KEY){
   // Groq Whisper is optimized for transcription. Do not force an English
   // locale on mixed Filipino/Taglish answers; auto-detection preserves speech.
   const upload=new FormData();
   upload.append('model',process.env.GROQ_TRANSCRIPTION_MODEL||'whisper-large-v3-turbo');
   const ext=mime==='audio/mp4'?'.mp4':mime==='audio/ogg'?'.ogg':mime==='audio/wav'?'.wav':mime==='audio/mpeg'||mime==='audio/mp3'?'.mp3':mime==='audio/x-m4a'||mime==='audio/m4a'?'.m4a':'.webm';
   upload.append('file',audio,'interview'+ext);
   upload.append('response_format','json');
   if(lang==='en-US'||lang==='en-PH')upload.append('language','en');
   const res=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{
    method:'POST',headers:{Authorization:'Bearer '+process.env.GROQ_API_KEY},
    body:upload,signal:abort
   });
   const json=await res.json();if(!res.ok)throw Error(json.error?.message||'Groq speech recognition is unavailable.');
   transcript=typeof json.text==='string'?json.text.trim():'';
  }else if(process.env.GEMINI_API_KEY){
   const data=Buffer.from(await audio.arrayBuffer()).toString('base64');
   const model=geminiModel();
   const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},
    body:JSON.stringify({
     contents:[{parts:[
      {text:'Transcribe the recorded interview answer faithfully in its original language (English/Filipino/Taglish). Return ONLY the spoken words with natural punctuation. Do not answer the question, paraphrase, summarize, correct factual claims, or invent speech if audio is silent.'},
      {inlineData:{mimeType:mime,data}}
     ]}],
     generationConfig:{maxOutputTokens:1100}
    }),signal:abort
   });
   const json=await res.json();if(!res.ok)throw Error(json.error?.message||'Gemini transcription unavailable.');
   transcript=(json.candidates?.[0]?.content?.parts||[]).map((p:{text?:string})=>p.text||'').join('').trim();
  }else{
   const upload=new FormData();upload.append('model','gpt-4o-mini-transcribe');
   upload.append('file',audio,'interview'+(mime==='audio/mp4'?'.mp4':mime==='audio/ogg'?'.ogg':mime==='audio/wav'?'.wav':mime==='audio/mpeg'||mime==='audio/mp3'?'.mp3':mime==='audio/x-m4a'||mime==='audio/m4a'?'.m4a':'.webm'));
   if(lang==='fil-PH')upload.append('language','tl');else upload.append('language','en');
   const res=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:upload,signal:abort});
   const json=await res.json();if(!res.ok)throw Error(json.error?.message||'OpenAI transcription unavailable.');
   transcript=typeof json.text==='string'?json.text.trim():'';
  }
  if(!transcript)return reply('No words were detected. Please check your microphone and try again.',422);
  transcript=transcript.slice(0,5000);
  const {error:logError}=await db.from('ai_events').insert({user_id:user.id,task:'transcription'});
  if(logError)return reply('Transcription could not be logged. Retry later.',503);
  return NextResponse.json({transcript},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const info=error instanceof Error?error.message:'Transcription is unavailable.';
  return reply(info.includes('Timeout')?'Transcription timed out. Try a shorter answer.':info.slice(0,200),502);
 }
}
