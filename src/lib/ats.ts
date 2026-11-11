import type {Resume,SampleJob} from './types';
export function resumeText(r:Resume){return [r.targetRole,r.summary,r.skills,...r.experience.flatMap(x=>[x.role,x.company,x.details]),...r.education.map(x=>x.degree)].join(' ').toLowerCase();}
export function atsScore(r:Resume,description=''){
 const checks=[!!r.name,/.+@.+\..+/.test(r.email),!!r.phone,!!r.targetRole,r.summary.trim().length>=50,r.skills.split(',').filter(Boolean).length>=4,r.experience.some(x=>!!x.role&&x.details.length>=20),r.education.some(x=>!!x.school)];
 const base=Math.round(checks.filter(Boolean).length/checks.length*70);
 const stop=new Set(['and','the','with','for','you','our','are','will','have','this','from','that','job','role','work','team','years','their','your','experience','skills','strong','required']);
 const terms=Array.from(new Set((description.toLowerCase().match(/[a-z][a-z+#.]{2,}/g)||[]).filter(w=>!stop.has(w))));
 const haystack=resumeText(r);const matched=terms.filter(x=>haystack.includes(x));const missing=terms.filter(x=>!matched.includes(x));
 const score=Math.min(100,base+(terms.length?Math.round(matched.length/terms.length*30):(r.summary.length>40?22:8)));
 const suggestions:string[]=[];if(!r.targetRole)suggestions.push('Add a specific target job title.');if(r.summary.length<50)suggestions.push('Write a clear 2–3 sentence professional summary.');if(r.skills.split(',').filter(Boolean).length<4)suggestions.push('List at least four relevant skills.');if(!r.experience.some(x=>x.details.length>=20))suggestions.push('Describe your experience with real achievements, without inventing metrics.');if(!r.education.some(x=>!!x.school))suggestions.push('Complete your education details.');if(missing.length)suggestions.push('Consider these relevant terms when truthful: '+missing.slice(0,6).join(', ')+'.');if(!suggestions.length)suggestions.push('Looks well structured. Tailor your resume to each job.');
 return {score,suggestions,matched:matched.slice(0,12),missing:missing.slice(0,12)};
}
export function jobFit(r:Resume,j:SampleJob){const t=resumeText(r);const n=j.keywords.filter(x=>t.includes(x)).length;const tw=j.role.toLowerCase().split(' ').filter(x=>x.length>3);const k=tw.filter(x=>r.targetRole.toLowerCase().includes(x)).length;return Math.min(95,32+Math.round(n/j.keywords.length*50)+Math.min(13,k*7));}
