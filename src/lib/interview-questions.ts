import type {Resume} from './types';

export const INTERVIEW_COUNT=10;
export const DEFAULT_INTERVIEW_QUESTIONS=[
 'Tell me about yourself and how your background prepared you for professional opportunities.',
 'What professional or academic achievement are you most proud of, and why?',
 'Describe a challenging task or project and how you solved it.',
 'Tell me about a time you had to learn something quickly.',
 'How do you organize your priorities when several tasks are due at once?',
 'Describe a time you worked with other people to achieve a goal.',
 'How do you respond to constructive feedback?',
 'What is one skill you want to develop further, and why?',
 'What makes you a valuable member of a professional team?',
 'How would you approach an unfamiliar problem at work?'
] as const;

function shuffle<T>(items:T[]):T[]{
 const result=[...items];
 for(let i=result.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}
function readable(value:unknown,max=65):string{
 return typeof value==='string'?value.replace(/\s+/g,' ').replace(/[\r\n]/g,' ').trim().slice(0,max).replace(/[.,:; ]+$/,''):'';
}
function distinct(items:string[]):string[]{
 const used=new Set<string>();
 return items.filter(q=>{const key=q.toLowerCase().replace(/[^a-z0-9]/g,'');if(!key||used.has(key))return false;used.add(key);return true;});
}
/** Offline fallback while AI is unavailable; chooses from real resume details, never invents them. */
export function buildInterviewQuestions(resume?:Resume):string[]{
 const personal:string[]=[];
 if(resume){
  const skills=distinct((resume.skills||'').split(/[,\n;]+/).map(s=>readable(s,42)).filter(Boolean)).slice(0,8);
  for(const skill of shuffle(skills).slice(0,3)){
   personal.push(`Your resume lists ${skill}. Can you describe how you have used or practiced this skill?`);
  }
  for(const job of shuffle((resume.experience||[]).filter(x=>x.role||x.company)).slice(0,2)){
   const description=readable(job.role||'your work',70);
   const company=readable(job.company,60);
   personal.push(`What did you learn from your experience as ${description}${company?' at '+company:''}?`);
  }
  for(const project of shuffle((resume.projects||[]).filter(x=>x.name)).slice(0,2)){
   personal.push(`Your resume mentions the ${readable(project.name,70)} project. What was your contribution and what did you learn?`);
  }
  for(const edu of shuffle((resume.education||[]).filter(x=>x.degree||x.school)).slice(0,2)){
   personal.push(`How did your ${readable(edu.degree||'education',70)} studies${edu.school?' at '+readable(edu.school,60):''} prepare you for real-world responsibilities?`);
  }
  for(const cert of shuffle((resume.certifications||[]).filter(x=>x.title)).slice(0,1)){
   personal.push(`What practical knowledge did you gain from ${readable(cert.title,70)}?`);
  }
  for(const volunteer of shuffle((resume.volunteer||[]).filter(x=>x.role||x.organization)).slice(0,1)){
   personal.push(`What did you learn from your volunteer experience with ${readable(volunteer.organization||volunteer.role,70)}?`);
  }
  for(const award of shuffle((resume.awards||[]).filter(x=>x.title)).slice(0,1)){
   personal.push(`What did earning ${readable(award.title,70)} teach you?`);
  }
 }
 const chosen=shuffle(distinct(personal)).slice(0,6);
 return shuffle([...chosen,...shuffle([...DEFAULT_INTERVIEW_QUESTIONS]).slice(0,INTERVIEW_COUNT-chosen.length)]);
}
export function parseInterviewQuestions(raw:string):string[]|null{
 try{
  const cleaned=raw.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'');
  const obj=JSON.parse(cleaned) as unknown;
  const list=Array.isArray(obj)?obj:(obj&&typeof obj==='object'&&'questions' in obj?(obj as {questions:unknown}).questions:null);
  if(!Array.isArray(list)||list.length!==INTERVIEW_COUNT||!list.every(x=>typeof x==='string'&&x.trim().length>=12&&x.trim().length<=280))return null;
  const questions=list.map(x=>(x as string).trim().replace(/^\d+[.)]\s*/,''));
  return distinct(questions).length===INTERVIEW_COUNT?questions:null;
 }catch{return null;}
}
