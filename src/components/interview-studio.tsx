'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,Headphones,Lightbulb,LoaderCircle,Mic,MicOff,ShieldCheck,Sparkles,Video,VideoOff,Volume2,X,Languages,AudioLines,CloudUpload} from 'lucide-react';
import type {Resume} from '@/lib/types';

type SpeechItem={transcript:string};
type SpeechResult=ArrayLike<SpeechItem>&{isFinal:boolean};
type RecognitionEvent={results:ArrayLike<SpeechResult>;resultIndex:number};
type RecognitionError={error:string};
type BrowserRecognition={
 lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;
 onstart:(()=>void)|null;onresult:((e:RecognitionEvent)=>void)|null;
 onend:(()=>void)|null;onerror:((e:RecognitionError)=>void)|null;
 start:()=>void;stop:()=>void;
};
type RecognitionBrowser=Window&{SpeechRecognition?:new()=>BrowserRecognition;webkitSpeechRecognition?:new()=>BrowserRecognition};
const QUESTIONS=[
 'Tell me about yourself and your professional background.',
 'Describe a challenging project and how you handled it.',
 'Why are you interested in this position?',
 'What is your greatest professional strength?',
 'How do you prioritize multiple deadlines?',
 'Describe a time you learned a new skill quickly.',
 'Tell me about a time you worked on a team.',
 'What can you contribute to this company?',
 'Describe a time you received critical feedback.',
 'Where do you see your career in five years?'
];
type Props={targetRole:string;resumes:Resume[];activeResumeId:string;onEditResume?:(resume:Resume)=>void;runAI:(task:'interview',context:string)=>Promise<string|null>;busy:boolean;signedIn:boolean;userId:string};
export default function InterviewStudio({targetRole,resumes,activeResumeId,onEditResume,runAI,busy,signedIn,userId}:Props){
 const [index,setIndex]=useState(0);
 const [resumeId,setResumeId]=useState(activeResumeId);
 const [answers,setAnswers]=useState<string[]>(()=>QUESTIONS.map(()=>''));
 const [completed,setCompleted]=useState(false);
 const sessionKey='resumebuilder:interview:v1:'+userId;
 const [sessionLoadedFor,setSessionLoadedFor]=useState('');
 const [sessionSavedAt,setSessionSavedAt]=useState<number|null>(null);
 const [sessionSaveFailed,setSessionSaveFailed]=useState(false);
 const currentResume=resumes.find(r=>r.id===resumeId)||resumes.find(r=>r.id===activeResumeId)||resumes[0];
 const role=(currentResume?.targetRole||targetRole||'').trim();
 const targetLabel=role&&role.toLowerCase()!=='general'?role:'Not set in resume';
 const [answer,setAnswer]=useState('');
 const answeredCount=answers.filter((x,i)=>i!==index&&!!x.trim()).length+(answer.trim()?1:0);
 const [feedback,setFeedback]=useState('');
 const [message,setMessage]=useState('');
 const [language,setLanguage]=useState('en-US');
 const [microphone,setMicrophone]=useState(false);
 const [speaking,setSpeaking]=useState(false);
 const [camera,setCamera]=useState(false);
 const [cameraLoading,setCameraLoading]=useState(false);
 const [supported,setSupported]=useState(true);
 const [interim,setInterim]=useState(false);
 const [cloudRecording,setCloudRecording]=useState(false);
 const [cloudBusy,setCloudBusy]=useState(false);
 const recognitionRef=useRef<BrowserRecognition|null>(null);
 const cloudRecorderRef=useRef<MediaRecorder|null>(null);
 const cloudStreamRef=useRef<MediaStream|null>(null);
 const cloudChunksRef=useRef<Blob[]>([]);
 const cloudTimeoutRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const cloudVersionRef=useRef(0);
 const listeningWanted=useRef(false);
 const speakingRef=useRef(false);
 const answerRef=useRef('');
 const languageRef=useRef('en-US');
 const stream=useRef<MediaStream|null>(null);
 const video=useRef<HTMLVideoElement|null>(null);
 const restartTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const utteranceVersion=useRef(0);

 type Session={v:1;resumeId:string;index:number;answers:string[];answer:string;completed:boolean;feedback:string;savedAt:number};
 const currentSessionRef=useRef<Session|null>(null);
 currentSessionRef.current={v:1,resumeId,index,answers,answer,completed,feedback,savedAt:Date.now()};
 function flushSession(){
  if(sessionLoadedFor!==sessionKey||!currentSessionRef.current)return;
  try{
   localStorage.setItem(sessionKey,JSON.stringify(currentSessionRef.current));
   setSessionSavedAt(currentSessionRef.current.savedAt);
   setSessionSaveFailed(false);
  }catch{setSessionSaveFailed(true);}
 }
 useEffect(()=>{
  try{
   const raw=localStorage.getItem(sessionKey);
   if(raw){
    const data=JSON.parse(raw) as Partial<Session>;
    if(data.v===1&&typeof data.resumeId==='string'&&resumes.some(r=>r.id===data.resumeId)){
     const restored=Array.from({length:QUESTIONS.length},(_,i)=>typeof data.answers?.[i]==='string'?data.answers[i].slice(0,5000):'');
     const candidate=typeof data.index==='number'?data.index:-1;
     const restoredIndex=Number.isInteger(candidate)&&candidate>=0&&candidate<QUESTIONS.length?candidate:0;
     const currentAnswer=typeof data.answer==='string'?data.answer.slice(0,5000):restored[restoredIndex];
     setResumeId(data.resumeId);
     setIndex(restoredIndex);
     setAnswers(restored);
     setAnswerText(currentAnswer);
     setCompleted(data.completed===true);
     setFeedback(typeof data.feedback==='string'?data.feedback:'');
     if(typeof data.savedAt==='number')setSessionSavedAt(data.savedAt);
     setMessage('Interview progress restored. Your previous answers are still here.');
    }
   }
  }catch{}
  setSessionLoadedFor(sessionKey);
 },[sessionKey]);
 useEffect(()=>{
  if(sessionLoadedFor!==sessionKey)return;
  flushSession();
 },[sessionLoadedFor,sessionKey,resumeId,index,answers,answer,completed,feedback]);
 useEffect(()=>{
  if(sessionLoadedFor!==sessionKey)return;
  const flush=()=>{if(currentSessionRef.current)try{localStorage.setItem(sessionKey,JSON.stringify(currentSessionRef.current));}catch{}};
  const hidden=()=>{if(document.visibilityState==='hidden')flush();};
  window.addEventListener('pagehide',flush);
  document.addEventListener('visibilitychange',hidden);
  return()=>{flush();window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden);};
 },[sessionLoadedFor,sessionKey]);

 useEffect(()=>{
  const browser=window as RecognitionBrowser;
  setSupported(!!(browser.SpeechRecognition||browser.webkitSpeechRecognition));
 },[]);
 useEffect(()=>{if(video.current&&stream.current)video.current.srcObject=stream.current;},[camera]);
 useEffect(()=>()=>{listeningWanted.current=false;if(restartTimer.current)clearTimeout(restartTimer.current);recognitionRef.current?.stop();cloudVersionRef.current++;if(cloudTimeoutRef.current)clearTimeout(cloudTimeoutRef.current);const recorder=cloudRecorderRef.current;if(recorder){recorder.onstop=null;try{if(recorder.state!=='inactive')recorder.stop();}catch{}}cloudStreamRef.current?.getTracks().forEach(t=>t.stop());stream.current?.getTracks().forEach(t=>t.stop());if('speechSynthesis'in window)window.speechSynthesis.cancel();},[]);
 function setAnswerText(text:string){answerRef.current=text;setAnswer(text);}
 function stopMic(disable=true){
  if(disable)listeningWanted.current=false;
  if(restartTimer.current){clearTimeout(restartTimer.current);restartTimer.current=null;}
  const rec=recognitionRef.current;
  recognitionRef.current=null;
  if(rec){try{rec.stop();}catch{}}
  setMicrophone(false);
  setInterim(false);
 }
 function beginMic(){
  if(speakingRef.current||cloudRecorderRef.current)return;
  if(recognitionRef.current)return;
  const browser=window as RecognitionBrowser;
  const Ctor=browser.SpeechRecognition||browser.webkitSpeechRecognition;
  if(!Ctor){listeningWanted.current=false;setSupported(false);setMessage('Speech-to-text is unavailable in this browser. Try an updated Chrome browser or type your answer.');return;}
  const base=answerRef.current.trim();
  try{
   const rec=new Ctor();
   rec.lang=languageRef.current;
   rec.continuous=true;
   rec.interimResults=true;
   rec.maxAlternatives=1;
   rec.onstart=()=>{if(recognitionRef.current===rec){setMicrophone(true);setMessage('Microphone is on. Your speech will appear live in Your Answer.');}};
   rec.onresult=e=>{
    if(recognitionRef.current!==rec)return;
    const finalParts:string[]=[];
    const interimParts:string[]=[];
    for(let i=0;i<e.results.length;i++){
     const result=e.results[i];
     if(!result?.[0])continue;
     const text=result[0].transcript.trim();
     if(!text)continue;
     if(result.isFinal)finalParts.push(text);
     else interimParts.push(text);
    }
    const combined=[base,...finalParts,...interimParts].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    answerRef.current=combined;
    setAnswer(combined);
    setInterim(interimParts.length>0);
   };
   rec.onerror=e=>{
    if(recognitionRef.current!==rec)return;
    if(e.error==='no-speech'){setMessage('No speech detected yet. Keep speaking near your microphone.');return;}
    listeningWanted.current=false;
    recognitionRef.current=null;
    setMicrophone(false);
    setInterim(false);
    const reason=e.error==='not-allowed'||e.error==='service-not-allowed'
      ?'Microphone blocked. Click the permissions icon beside the website address and allow Microphone, then reload the page.'
      :e.error==='audio-capture'
      ?'No microphone was detected. Check Windows Settings → Privacy & security → Microphone and Chrome microphone settings.'
      :e.error==='network'
      ?'Your browser could not contact its speech recognition service. Check your connection, try Chrome, or use the optional Record with AI backup after signing in.'
      :e.error==='language-not-supported'
      ?'This speech language is not supported on your device. Try English (US).'
      :e.error==='aborted'
      ?'Voice input stopped. Click Start speaking to try again.'
      :'Speech recognition stopped ('+e.error+'). Check microphone permission, or try Record with AI (backup).';
    setMessage(reason);
   };
   rec.onend=()=>{
    if(recognitionRef.current!==rec)return;
    recognitionRef.current=null;
    setMicrophone(false);
    setInterim(false);
    // Chrome may end a recognition session after silence. Resume only when the
    // user has explicitly enabled the microphone and we are not reading a question.
    if(listeningWanted.current&&!speakingRef.current){
     restartTimer.current=setTimeout(()=>{restartTimer.current=null;if(listeningWanted.current&&!speakingRef.current&&!recognitionRef.current)beginMic();},400);
    }
   };
   recognitionRef.current=rec;
   rec.start();
   setMicrophone(true);
   setMessage('Listening… speak clearly. You can correct the transcript directly.');
  }catch{
   recognitionRef.current=null;
   listeningWanted.current=false;
   setMicrophone(false);
   setMessage('Unable to start speech recognition. Check the microphone permission icon next to the website address, or try Record with AI (backup).');
  }
 }

 function cancelCloud(){
  cloudVersionRef.current++;
  if(cloudTimeoutRef.current){clearTimeout(cloudTimeoutRef.current);cloudTimeoutRef.current=null;}
  const recorder=cloudRecorderRef.current;
  cloudRecorderRef.current=null;
  if(recorder){
   recorder.onstop=null;
   try{if(recorder.state!=='inactive')recorder.stop();}catch{}
  }
  cloudStreamRef.current?.getTracks().forEach(t=>t.stop());
  cloudStreamRef.current=null;cloudChunksRef.current=[];
  setCloudRecording(false);
 }
 async function toggleCloud(){
  if(cloudRecording){
   if(cloudTimeoutRef.current)clearTimeout(cloudTimeoutRef.current);
   if(cloudRecorderRef.current?.state==='recording')cloudRecorderRef.current.stop();
   setCloudRecording(false);
   setMessage('Recording saved. Transcribing with AI…');
   return;
  }
  if(!signedIn){setMessage('Sign in to your ResumeBuilder account to use AI audio transcription. Browser microphone transcription remains free.');return;}
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
   setMessage('Audio recording is unavailable in this browser. Try updated Chrome/Edge or type your answer.');
   return;
  }
  cancelCloud();
  stopMic();
  utteranceVersion.current++;
  if('speechSynthesis'in window)window.speechSynthesis.cancel();
  speakingRef.current=false;setSpeaking(false);
  const version=cloudVersionRef.current;
  let recordingStream:MediaStream|null=null;
  try{
   recordingStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(version!==cloudVersionRef.current){recordingStream.getTracks().forEach(t=>t.stop());return;}
   const options=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(m=>MediaRecorder.isTypeSupported(m));
   const recorder=options?new MediaRecorder(recordingStream,{mimeType:options,audioBitsPerSecond:64000}):new MediaRecorder(recordingStream,{audioBitsPerSecond:64000});
   cloudStreamRef.current=recordingStream;cloudRecorderRef.current=recorder;cloudChunksRef.current=[];
   recorder.ondataavailable=event=>{if(event.data.size>0)cloudChunksRef.current.push(event.data);};
   recorder.onerror=()=>{cancelCloud();setCloudBusy(false);setMessage('Recording stopped unexpectedly. Check your microphone and try again.');};
   recorder.onstop=()=>{
    if(cloudTimeoutRef.current){clearTimeout(cloudTimeoutRef.current);cloudTimeoutRef.current=null;}
    if(cloudRecorderRef.current!==recorder||version!==cloudVersionRef.current)return;
    cloudRecorderRef.current=null;
    cloudStreamRef.current?.getTracks().forEach(t=>t.stop());cloudStreamRef.current=null;
    setCloudRecording(false);
    const blob=new Blob(cloudChunksRef.current,{type:recorder.mimeType||'audio/webm'});
    cloudChunksRef.current=[];
    if(blob.size<800){setMessage('No audio was recorded. Check your mic and try again.');return;}
    if(blob.size>2_500_000){setMessage('Audio was too large. Record a shorter answer.');return;}
    setCloudBusy(true);
    const data=new FormData();
    data.append('audio',blob,'interview.'+(blob.type.includes('mp4')?'mp4':'webm'));
    data.append('language',languageRef.current);
    void fetch('/api/transcribe',{method:'POST',body:data})
     .then(async res=>{const json=await res.json().catch(()=>({error:'Invalid transcription response.'}));if(!res.ok)throw Error(json.error||'Transcription unavailable.');return json.transcript as string;})
     .then(transcript=>{
      if(version!==cloudVersionRef.current)return;
      const words=String(transcript||'').trim();
      if(!words)throw Error('No words detected. Speak clearly and try again.');
      setAnswerText([answerRef.current.trim(),words].filter(Boolean).join(' '));
      setMessage('AI transcription added to Your Answer. Review and correct any errors before requesting feedback.');
     })
     .catch(error=>{if(version===cloudVersionRef.current)setMessage(error instanceof Error?error.message:'Could not transcribe audio.');})
     .finally(()=>{if(version===cloudVersionRef.current)setCloudBusy(false);});
   };
   recorder.start(250);
   setCloudRecording(true);
   setMessage('Recording privately for up to 40 seconds. Press Stop & transcribe to send audio securely to your configured AI provider.');
   cloudTimeoutRef.current=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},40000);
  }catch(error){
   recordingStream?.getTracks().forEach(t=>t.stop());
   cancelCloud();
   setMessage(error instanceof Error&&error.name==='NotAllowedError'?'Microphone permission denied. Allow microphone access in your browser site settings and Windows privacy settings.':'Could not start recording. Check your microphone settings.');
  }
 }
 function toggleMic(){
  if(listeningWanted.current){stopMic();setMessage('Microphone paused. Your transcript has been kept.');return;}
  // Do not accidentally transcribe the robot's own voice.
  utteranceVersion.current++;
  if('speechSynthesis'in window)window.speechSynthesis.cancel();
  speakingRef.current=false;
  setSpeaking(false);
  listeningWanted.current=true;
  beginMic();
 }
 function speakQuestion(question:number,resumeMic:boolean){
  const version=++utteranceVersion.current;
  speakingRef.current=true;
  setSpeaking(true);
  stopMic(!resumeMic);
  if(resumeMic)listeningWanted.current=true;
  if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance==='undefined'){
   speakingRef.current=false;setSpeaking(false);
   setMessage('Voice playback is unsupported in this browser. The question is shown on screen.');
   if(resumeMic)beginMic();
   return;
  }
  const voice=new SpeechSynthesisUtterance(QUESTIONS[question]);
  voice.lang='en-US';voice.rate=.92;voice.pitch=1.02;
  const finished=()=>{
   if(version!==utteranceVersion.current)return;
   speakingRef.current=false;setSpeaking(false);
   if(resumeMic&&listeningWanted.current){
    beginMic();
   }else{
    setMessage('Question finished. Press the microphone button to speak your answer, or type below.');
   }
  };
  voice.onend=finished;
  voice.onerror=finished;
  try{
   window.speechSynthesis.cancel();
   window.speechSynthesis.speak(voice);
   setMessage(resumeMic?'Bot is reading the question. Your microphone will resume afterward.':'Bot is reading the question aloud.');
  }catch{finished();}
 }
 function clearInterview(){
  cancelCloud();
  utteranceVersion.current++;
  stopMic();
  if('speechSynthesis'in window)window.speechSynthesis.cancel();
  speakingRef.current=false;setSpeaking(false);
  setIndex(0);setAnswers(QUESTIONS.map(()=>''));setAnswerText('');
  setFeedback('');setMessage('');setCompleted(false);
 }
 async function evaluateSession(completedAnswers:string[]){
  if(!role||role.toLowerCase()==='general'){
   setMessage('Your selected resume has no target job title. Update the Target Job Title in Build Resume before requesting a role-specific evaluation.');
   return;
  }
  if(!completedAnswers.some(x=>x.trim())){
   setMessage('Answer at least one interview question before finishing. You can go back to add your responses.');
   return;
  }
  setCompleted(true);setFeedback('');
  setMessage('All answers saved. The AI is now evaluating the entire interview, not individual questions.');
  const payload={
   mode:'complete_interview',
   role,
   resume:{
    title:currentResume?.title||'',
    targetRole:role,
    summary:(currentResume?.summary||'').slice(0,550),
    skills:(currentResume?.skills||'').slice(0,400),
    experience:(currentResume?.experience||[]).slice(0,3).map(e=>({role:e.role,company:e.company,details:e.details.slice(0,200)})),
    education:(currentResume?.education||[]).slice(0,2).map(e=>({degree:e.degree,school:e.school}))
   },
   questions:QUESTIONS.map((question,i)=>({number:i+1,question,answer:completedAnswers[i]?.trim().slice(0,700)||'[Skipped]'}))
  };
  const result=await runAI('interview',JSON.stringify(payload));
  if(result){setFeedback(result);setMessage('Full interview evaluation completed. Results are based on your saved answers.');}
  else setMessage('AI evaluation was unavailable. Your answers are saved in this session; select Retry Evaluation to try again.');
 }
 function next(){
  if(busy||cloudRecording||cloudBusy){setMessage('Finish recording and transcribing your current answer before continuing.');return;}
  const saved=[...answers];
  saved[index]=answerRef.current.trim();
  setAnswers(saved);
  if(index===QUESTIONS.length-1){
   stopMic();cancelCloud();
   utteranceVersion.current++;
   if('speechSynthesis'in window)window.speechSynthesis.cancel();
   speakingRef.current=false;setSpeaking(false);
   void evaluateSession(saved);
   return;
  }
  const nextIndex=index+1;
  const resume=listeningWanted.current;
  stopMic(!resume);
  setIndex(nextIndex);
  setAnswerText(saved[nextIndex]||'');
  setFeedback('');
  setMessage('Answer saved. Evaluation will run after all 10 questions.');
  // Browser speech synthesis requires a direct click; keep the auto-read behavior.
  speakQuestion(nextIndex,resume);
 }
 function previous(){
  if(index===0||busy||cloudBusy||cloudRecording)return;
  stopMic();
  utteranceVersion.current++;
  if('speechSynthesis'in window)window.speechSynthesis.cancel();
  speakingRef.current=false;setSpeaking(false);
  setAnswers(old=>old.map((v,i)=>i===index?answerRef.current.trim():v));
  setIndex(index-1);setAnswerText(answers[index-1]||'');setMessage('Previous answer restored. You can edit it before continuing.');
 }
 function changeResume(id:string){
  if(id===resumeId)return;
  if((answers.some(a=>a.trim())||answerRef.current.trim())&&!window.confirm('Switching resumes will restart this interview. Continue?'))return;
  clearInterview();setResumeId(id);
 }
 function reset(){
  clearInterview();
  stream.current?.getTracks().forEach(t=>t.stop());
  stream.current=null;setCamera(false);
  setMessage('Interview restarted. Answer each question, then finish to get one comprehensive AI evaluation.');
 }
 async function toggleCamera(){
  if(camera){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setCamera(false);return;}
  setCameraLoading(true);
  try{const s=await navigator.mediaDevices.getUserMedia({video:true,audio:false});stream.current=s;setCamera(true);setMessage('Camera preview enabled locally. Video is not uploaded or shared with the AI service.');}
  catch{setMessage('Camera access denied or unavailable. You can keep practicing without camera.');}
  finally{setCameraLoading(false);}
 }
 return <div className="interview-studio">
  <div className="page-heading"><div><div className="eyebrow">PRACTICE WITH AI</div><h1>Interview Practice</h1><p>Practice for a role from your saved resume. Complete all 10 questions, then receive one AI assessment.</p></div><span className="interview-session-label"><Headphones size={17}/> Interview Session</span></div>
  <div className="interview-studio-grid">
   <section className="interview-stage-panel"><div className="interview-stage-top"><span><span className="live-dot"/> AI Interviewer</span><span>{speaking?'Asking Question':microphone?'Listening':'Practice Mode'}</span></div>
    <div className="interview-visual">{camera?<video ref={video} autoPlay playsInline muted aria-label="Your private camera preview"/>:<div className={'interview-bot '+(speaking?'bot-talking':'')}><div className="bot-antenna"/><div className="bot-head"><div className="bot-screen"><span/><span/><i/></div></div><div className="bot-neck"/><div className="bot-torso"><span/></div><div className="bot-left-arm"/><div className="bot-right-arm"/></div>}</div>
    <div className="interview-stage-actions"><button className={microphone?'active':''} onClick={toggleMic} aria-label={microphone?'Stop microphone':'Start microphone transcription'} title={microphone?'Pause transcript':'Speak and transcribe your answer'}>{microphone?<MicOff size={19}/>:<Mic size={19}/>}</button><button className="hangup" onClick={reset} aria-label="Reset interview practice" title="Reset practice"><X size={21}/></button><button className={camera?'active':''} onClick={()=>void toggleCamera()} disabled={cameraLoading} aria-label={camera?'Turn off camera':'Turn on local camera preview'} title="Local camera preview only">{camera?<VideoOff size={19}/>:<Video size={19}/>}</button></div>
    <div className="interview-stage-caption"><ShieldCheck size={14}/> Browser dictation uses your browser's speech service. AI backup uploads audio only after you choose Record with AI.</div>
   </section>
   <section className="interview-coach-panel"><span className="interview-count">Current Question ({index+1}/{QUESTIONS.length})</span><h2>{QUESTIONS[index]}</h2><div className="interview-resume-selector"><label htmlFor="interview-resume-choice"><BookOpen size={15}/> Practice using resume</label>
    <select id="interview-resume-choice" value={currentResume?.id||''} onChange={e=>changeResume(e.target.value)} disabled={busy||cloudBusy||cloudRecording}>
     {resumes.map(r=><option key={r.id} value={r.id}>{r.title||'Untitled Resume'} — {r.targetRole?.trim()||'Target role missing'}</option>)}
    </select></div>
    <div className="interview-role">Target role: <strong>{targetLabel}</strong>{targetLabel==='Not set in resume'&&currentResume&&onEditResume&&<button type="button" className="interview-edit-role" onClick={()=>onEditResume(currentResume)}>Set job title in resume</button>}</div>
    <div className="interview-progress-text"><CheckCircle2 size={14}/> {answeredCount}/{QUESTIONS.length} answered · AI evaluates after the final question</div>
    <button className="interview-read-aloud" onClick={()=>speakQuestion(index,listeningWanted.current)}><Volume2 size={17}/> {speaking?'Reading question…':'Read Question Aloud'}</button>
    <div className="interview-coach-tips"><h3><Lightbulb size={17}/> Tips</h3><p><Check size={15}/> Be concise and relevant.</p><p><Check size={15}/> Highlight your actual skills.</p><p><Check size={15}/> Mention notable achievements.</p></div>
    <div className="interview-nav-actions">{index>0&&!completed&&<button className="interview-back" onClick={previous} disabled={busy||cloudRecording||cloudBusy}><ArrowLeft size={16}/> Previous</button>}
    {!completed&&<button className="interview-next" onClick={next} disabled={busy||cloudRecording||cloudBusy}>{index===QUESTIONS.length-1?<><Sparkles size={17}/> Finish & Evaluate</>:<>Next Question <ArrowRight size={17}/></>}</button>}
    {completed&&<button className="interview-next" onClick={reset}>Start New Interview <ArrowRight size={17}/></button>}</div>
   </section>
  </div>
  <section className="interview-answer-card panel">
   <div className="interview-answer-title"><h2>Your Answer</h2><small>{completed?'Interview complete — review your saved response below.':'Speak or type your answer. Auto-save keeps it when you navigate away.'}</small></div>
   <div className="interview-autosave-notice" role="status"><CheckCircle2 size={15}/>{sessionSaveFailed?'Could not auto-save on this device. Check browser storage.':sessionSavedAt?'Interview progress auto-saved on this device':'Interview progress saves automatically on this device'}</div>
   <div className="interview-language-row"><label htmlFor="interview-language"><Languages size={16}/> Speech language</label>
    <select id="interview-language" value={language} onChange={e=>{const nextLanguage=e.target.value;languageRef.current=nextLanguage;setLanguage(nextLanguage);if(listeningWanted.current){stopMic();setMessage('Language changed. Tap the microphone button to start again.');}}}><option value="en-US">English (US)</option><option value="fil-PH">Filipino / Tagalog</option><option value="en-PH">English (Philippines)</option></select>
    <span role="status" className={'interview-live-status '+(microphone?'active':'')}><AudioLines size={15}/>{cloudRecording?'Recording for AI…':cloudBusy?'Transcribing audio…':speaking?'Bot speaking':microphone?(interim?'Transcribing live…':'Listening…'):'Microphone off'}</span>
   </div>
   <div className="interview-transcription-tools">
    <button type="button" className={'interview-voice-primary '+(microphone?'active':'')} onClick={toggleMic} disabled={cloudRecording||cloudBusy} aria-label={microphone?'Stop speaking':'Start speaking'}>{microphone?<MicOff size={17}/>:<Mic size={17}/>} {microphone?'Stop Listening':'Start Speaking'}</button>
    <button type="button" className={'interview-cloud-button '+(cloudRecording?'active':'')} onClick={()=>void toggleCloud()} disabled={cloudBusy} aria-label={cloudRecording?'Stop and transcribe recording':'Record with AI backup'}><CloudUpload size={17}/>{cloudBusy?'Transcribing…':cloudRecording?'Stop & Transcribe':'Record with AI (backup)'}</button>
    <span className="interview-voice-help">{signedIn?'AI backup uses your configured Groq/Gemini key and is limited to 15 recordings per day.':'AI backup requires sign-in; browser dictation needs no API key.'}</span>
   </div>
   <textarea aria-label="Your Answer" value={answer} disabled={completed} onChange={e=>{if(listeningWanted.current){stopMic();setMessage('Microphone paused while editing your answer. Tap the mic to continue speaking.');}setAnswerText(e.target.value);}} rows={5} placeholder={microphone?'Listening to your voice…':'Tap the microphone above to speak, or type your answer here.'}/>
   <div className="interview-answer-bottom"><div className="interview-evaluation-note"><ShieldCheck size={16}/>{completed?'All questions completed. Your transcript remains available for review.':'No AI scoring yet. Your responses are collected until Finish & Evaluate on question 10.'}</div><span>{supported?'Speech recognition may make mistakes; review the transcript.':'You can type your answer if speech recognition is unavailable.'}</span></div>
   {message&&<p className="interview-inline-message" role="status">{message}</p>}
   {completed&&<div className="interview-results-panel"><h3><CheckCircle2 size={19}/> Interview Complete — {targetLabel}</h3><p>{answers.filter(x=>x.trim()).length} answered, {QUESTIONS.length-answers.filter(x=>x.trim()).length} skipped. The AI evaluates your actual responses against the selected resume and role.</p>
    {busy&&<p className="interview-evaluating" role="status"><LoaderCircle className="spin" size={17}/> Evaluating your entire interview…</p>}
    {feedback?<div className="interview-feedback"><h3><Sparkles size={18}/> Overall AI Evaluation</h3><div className="interview-feedback-body">{feedback}</div></div>:!busy&&<button className="purple-button" type="button" onClick={()=>void evaluateSession(answers)}><Sparkles size={17}/> Retry Evaluation</button>}
    <details className="interview-review-answers"><summary>Review saved answers ({QUESTIONS.length} questions)</summary>
     {QUESTIONS.map((q,i)=><section key={i}><strong>{i+1}. {q}</strong><p>{answers[i]?.trim()||'Skipped'}</p></section>)}
    </details>
   </div>}
  </section>
 </div>;
}
