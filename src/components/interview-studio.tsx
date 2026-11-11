'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,CheckCircle2,Headphones,Lightbulb,LoaderCircle,Mic,MicOff,ShieldCheck,Sparkles,Video,VideoOff,Volume2,X,Languages,AudioLines} from 'lucide-react';

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
type Props={targetRole:string;runAI:(task:'interview',context:string)=>Promise<string|null>;busy:boolean};
export default function InterviewStudio({targetRole,runAI,busy}:Props){
 const [index,setIndex]=useState(0);
 const [answer,setAnswer]=useState('');
 const [feedback,setFeedback]=useState('');
 const [message,setMessage]=useState('');
 const [language,setLanguage]=useState('en-US');
 const [microphone,setMicrophone]=useState(false);
 const [speaking,setSpeaking]=useState(false);
 const [camera,setCamera]=useState(false);
 const [cameraLoading,setCameraLoading]=useState(false);
 const [supported,setSupported]=useState(true);
 const [interim,setInterim]=useState(false);
 const recognitionRef=useRef<BrowserRecognition|null>(null);
 const listeningWanted=useRef(false);
 const speakingRef=useRef(false);
 const answerRef=useRef('');
 const languageRef=useRef('en-US');
 const stream=useRef<MediaStream|null>(null);
 const video=useRef<HTMLVideoElement|null>(null);
 const restartTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const utteranceVersion=useRef(0);
 useEffect(()=>{
  const browser=window as RecognitionBrowser;
  setSupported(!!(browser.SpeechRecognition||browser.webkitSpeechRecognition));
 },[]);
 useEffect(()=>{if(video.current&&stream.current)video.current.srcObject=stream.current;},[camera]);
 useEffect(()=>()=>{listeningWanted.current=false;if(restartTimer.current)clearTimeout(restartTimer.current);recognitionRef.current?.stop();stream.current?.getTracks().forEach(t=>t.stop());if('speechSynthesis'in window)window.speechSynthesis.cancel();},[]);
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
  if(speakingRef.current)return;
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
      ?'Microphone access was blocked. Allow microphone permission for this localhost site in your browser settings.'
      :e.error==='language-not-supported'
      ?'This speech language is not supported on your device. Try English (US).'
      :'Speech recognition stopped ('+e.error+'). You can retry or type your answer.';
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
   setMessage('Unable to start speech recognition. Check your microphone permission or type your answer.');
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
 function next(){
  const nextIndex=(index+1)%QUESTIONS.length;
  const resume=listeningWanted.current;
  stopMic(!resume);
  setIndex(nextIndex);
  setAnswerText('');
  setFeedback('');
  setMessage('');
  // This call is directly inside the Next Question click handler so speech
  // playback can pass browser user-gesture restrictions.
  speakQuestion(nextIndex,resume);
 }
 function reset(){
  utteranceVersion.current++;
  stopMic();
  stream.current?.getTracks().forEach(t=>t.stop());
  stream.current=null;setCamera(false);
  if('speechSynthesis'in window)window.speechSynthesis.cancel();
  speakingRef.current=false;setSpeaking(false);
  setAnswerText('');setFeedback('');
  setMessage('Session reset. Use Read Question Aloud to start again.');
  setIndex(0);
 }
 async function toggleCamera(){
  if(camera){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setCamera(false);return;}
  setCameraLoading(true);
  try{const s=await navigator.mediaDevices.getUserMedia({video:true,audio:false});stream.current=s;setCamera(true);setMessage('Camera preview enabled locally. Video is not uploaded or shared with the AI service.');}
  catch{setMessage('Camera access denied or unavailable. You can keep practicing without camera.');}
  finally{setCameraLoading(false);}
 }
 async function review(){
  setMessage('');
  const result=await runAI('interview',JSON.stringify({role:targetRole||'General',question:QUESTIONS[index],answer:answerRef.current.trim()}));
  if(result)setFeedback(result);
 }
 return <div className="interview-studio">
  <div className="page-heading"><div><div className="eyebrow">PRACTICE WITH AI</div><h1>Interview Practice</h1><p>Practice interview questions and get personalized AI feedback.</p></div><span className="interview-session-label"><Headphones size={17}/> Interview Session</span></div>
  <div className="interview-studio-grid">
   <section className="interview-stage-panel"><div className="interview-stage-top"><span><span className="live-dot"/> AI Interviewer</span><span>{speaking?'Asking Question':microphone?'Listening':'Practice Mode'}</span></div>
    <div className="interview-visual">{camera?<video ref={video} autoPlay playsInline muted aria-label="Your private camera preview"/>:<div className={'interview-bot '+(speaking?'bot-talking':'')}><div className="bot-antenna"/><div className="bot-head"><div className="bot-screen"><span/><span/><i/></div></div><div className="bot-neck"/><div className="bot-torso"><span/></div><div className="bot-left-arm"/><div className="bot-right-arm"/></div>}</div>
    <div className="interview-stage-actions"><button className={microphone?'active':''} onClick={toggleMic} aria-label={microphone?'Stop microphone':'Start microphone transcription'} title={microphone?'Pause transcript':'Speak and transcribe your answer'}>{microphone?<MicOff size={19}/>:<Mic size={19}/>}</button><button className="hangup" onClick={reset} aria-label="Reset interview practice" title="Reset practice"><X size={21}/></button><button className={camera?'active':''} onClick={()=>void toggleCamera()} disabled={cameraLoading} aria-label={camera?'Turn off camera':'Turn on local camera preview'} title="Local camera preview only">{camera?<VideoOff size={19}/>:<Video size={19}/>}</button></div>
    <div className="interview-stage-caption"><ShieldCheck size={14}/> The camera stays on your device; the microphone uses your browser's speech recognition service.</div>
   </section>
   <section className="interview-coach-panel"><span className="interview-count">Current Question ({index+1}/{QUESTIONS.length})</span><h2>{QUESTIONS[index]}</h2><div className="interview-role">Target role: <strong>{targetRole||'General'}</strong></div>
    <button className="interview-read-aloud" onClick={()=>speakQuestion(index,listeningWanted.current)}><Volume2 size={17}/> {speaking?'Reading question…':'Read Question Aloud'}</button>
    <div className="interview-coach-tips"><h3><Lightbulb size={17}/> Tips</h3><p><Check size={15}/> Be concise and relevant.</p><p><Check size={15}/> Highlight your actual skills.</p><p><Check size={15}/> Mention notable achievements.</p></div>
    <button className="interview-next" onClick={next}>Next Question <ArrowRight size={17}/></button>
   </section>
  </div>
  <section className="interview-answer-card panel">
   <div className="interview-answer-title"><h2>Your Answer</h2><small>Type, or enable the microphone to see your words live.</small></div>
   <div className="interview-language-row"><label htmlFor="interview-language"><Languages size={16}/> Speech language</label>
    <select id="interview-language" value={language} onChange={e=>{const nextLanguage=e.target.value;languageRef.current=nextLanguage;setLanguage(nextLanguage);if(listeningWanted.current){stopMic();setMessage('Language changed. Tap the microphone button to start again.');}}}><option value="en-US">English (US)</option><option value="fil-PH">Filipino / Tagalog</option><option value="en-PH">English (Philippines)</option></select>
    <span className={'interview-live-status '+(microphone?'active':'')}><AudioLines size={15}/>{speaking?'Bot speaking':microphone?(interim?'Transcribing…':'Listening'):'Microphone off'}</span>
   </div>
   <textarea aria-label="Your Answer" value={answer} onChange={e=>{if(listeningWanted.current){stopMic();setMessage('Microphone paused while editing your answer. Tap the mic to continue speaking.');}setAnswerText(e.target.value);}} rows={5} placeholder={microphone?'Listening to your voice…':'Tap the microphone above to speak, or type your answer here.'}/>
   <div className="interview-answer-bottom"><button className="purple-button" disabled={busy||answer.trim().length<15} onClick={()=>void review()}>{busy?<LoaderCircle className="spin" size={17}/>:<Sparkles size={17}/>} {busy?'Reviewing...':'Get AI Feedback'}</button><span>{supported?'Speech accuracy depends on browser, language and microphone quality. Review the transcript.':'Speech recognition unavailable here. You can type your answer.'}</span></div>
   {message&&<p className="interview-inline-message" role="status">{message}</p>}
   {feedback&&<div className="interview-feedback"><h3><CheckCircle2 size={18}/> Your AI Feedback</h3><div>{feedback}</div></div>}
  </section>
 </div>;
}
