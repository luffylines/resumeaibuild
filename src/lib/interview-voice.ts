/** Select one clear, English interviewer voice for the entire session.
 * Prefer native high-quality voices over Compact/eSpeak variants where available.
 * This does not download voices or override the user's iOS voice settings.
 */
export function selectInterviewerVoice(voices:readonly SpeechSynthesisVoice[]):SpeechSynthesisVoice|null{
 const english=voices.filter(v=>/^(en)(-|_|$)/i.test(v.lang));
 if(!english.length)return null;
 const rank=(v:SpeechSynthesisVoice)=>{
  const name=v.name.toLowerCase();
  let score=0;
  if(/^en-us$/i.test(v.lang))score+=20;
  if(v.localService)score+=8;
  if(/ava|samantha|alex|allison|aria|jenny|serena|siri natural/i.test(name))score+=35;
  if(/enhanced|premium|natural|neural/i.test(name))score+=20;
  if(/compact|espeak|novelty|robot|bad news|whisper/i.test(name))score-=60;
  if(v.default)score+=5;
  return score;
 };
 return [...english].sort((a,b)=>rank(b)-rank(a))[0]||null;
}
export function applyInterviewerVoice(
 utterance:SpeechSynthesisUtterance,
 engine:Pick<SpeechSynthesis,'getVoices'>,
 locked:{current:string|null;chosen:boolean}
){
 utterance.lang='en-US';
 utterance.rate=0.98;
 utterance.pitch=1;
 utterance.volume=1;
 const choices=typeof engine.getVoices==='function'?engine.getVoices()||[]:[];
 if(!locked.chosen){
  locked.chosen=true;
  locked.current=selectInterviewerVoice(choices)?.voiceURI||null;
 }
 const pinned=locked.current?choices.find(v=>v.voiceURI===locked.current):undefined;
 if(pinned)utterance.voice=pinned;
}
