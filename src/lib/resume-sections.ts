import type {Resume} from './types';
import {educationEntry,sortEducation} from './education';
import {getResumeTemplate} from './templates';

/** Shared section model for live HTML preview, PDF, DOCX and PNG. */
export type ResumeSectionKey='summary'|'experience'|'education'|'skills'|'certifications'|'projects'|'languages'|'awards'|'volunteer'|'references'|'additionalInfo'|'customSections';
export type SectionEntry={title:string;subtitle:string;body:string};
export type ResumeSection={key:ResumeSectionKey;title:string;entries:SectionEntry[];placement:'primary'|'secondary';kind:'text'|'skills'|'entries';suggested:boolean};

const standard:ResumeSectionKey[]=['summary','experience','education','skills','certifications','projects','languages','awards','volunteer','references','additionalInfo','customSections'];
const templateSets:{
 [name:string]:{suggested:ResumeSectionKey[];order:ResumeSectionKey[];sidebar:ResumeSectionKey[]};
}={
 'graduate':{
  suggested:['summary','education','skills','projects','certifications'],
  order:['summary','education','projects','skills','certifications','experience'],
  sidebar:[]
 },
 'graduate-portrait':{
  suggested:['summary','education','skills','projects','certifications'],
  order:['summary','education','projects','skills','certifications','experience'],
  sidebar:[]
 },
 'creative-sidebar':{
  suggested:['summary','experience','education','skills','languages','references'],
  order:['summary','experience','projects','awards','volunteer','skills','education','languages','certifications','references'],
  sidebar:['skills','education','languages','certifications']
 },
 'studio-beige':{
  suggested:['summary','experience','skills','education','languages','references'],
  order:['summary','experience','projects','references','skills','education','languages','certifications'],
  sidebar:['skills','education','languages','certifications']
 },
 'blue-profile':{
  suggested:['summary','experience','skills','education','languages','references'],
  order:['summary','experience','projects','references','skills','education','languages','certifications'],
  sidebar:['skills','education','languages','certifications']
 },
 'tech-split':{
  suggested:['summary','experience','projects','skills','education','certifications'],
  order:['summary','experience','projects','awards','skills','education','certifications','languages'],
  sidebar:['skills','education','certifications','languages']
 },
 'modern-portrait':{
  suggested:['summary','experience','skills','education','certifications'],
  order:['summary','experience','projects','skills','education','certifications','languages'],
  sidebar:['skills','education','certifications','languages']
 },
 'editorial':{
  suggested:['summary','experience','education','awards','references'],
  order:['summary','experience','education','awards','projects','references','skills'],
  sidebar:[]
 },
 'editorial-beige':{
  suggested:['summary','experience','education','awards','references'],
  order:['summary','experience','education','awards','projects','references','skills'],
  sidebar:[]
 },

 'sapphire-columns':{
  suggested:['summary','experience','skills','education','certifications','projects'],
  order:['summary','experience','projects','education','certifications','skills','languages'],
  sidebar:['skills','education','certifications','languages']
 },
 'lilac-portfolio':{
  suggested:['summary','projects','experience','skills','education','languages'],
  order:['summary','projects','experience','awards','skills','education','languages','references'],
  sidebar:['skills','education','languages','certifications','awards']
 },
 'nordic-photo':{
  suggested:['summary','experience','skills','education','languages','certifications'],
  order:['summary','experience','education','skills','languages','certifications','references'],
  sidebar:['skills','languages','certifications']
 },
 'emerald-ledger':{
  suggested:['summary','experience','education','skills','certifications','references'],
  order:['summary','experience','projects','skills','education','certifications','references','languages'],
  sidebar:['skills','education','certifications','languages','references']
 },
 'coastal-architect':{
  suggested:['summary','projects','experience','education','skills','languages'],
  order:['summary','projects','experience','education','skills','languages','certifications','references'],
  sidebar:['skills','education','languages','certifications']
 },
 'graphite-graduate':{
  suggested:['summary','education','skills','projects','certifications','experience'],
  order:['summary','education','projects','skills','certifications','experience','languages'],
  sidebar:[]
 },
 'charcoal-timeline-photo':{
  suggested:['summary','experience','education','skills','certifications'],
  order:['summary','experience','projects','education','skills','certifications'],
  sidebar:[]
 },
 'horizon-photo':{
  suggested:['summary','experience','education','skills','certifications'],
  order:['summary','experience','education','certifications','skills','projects'],
  sidebar:[]
 },
 'warm-editorial-photo':{
  suggested:['summary','experience','education','awards','projects','references'],
  order:['summary','experience','projects','education','awards','references','skills'],
  sidebar:[]
 },
 'burgundy-portfolio':{
  suggested:['summary','projects','experience','education','skills'],
  order:['summary','projects','experience','awards','education','skills','references'],
  sidebar:[]
 },
 'minimal':{
  suggested:['summary','experience','education','skills'],
  order:['summary','experience','education','skills'],
  sidebar:[]
 },
 'classic':{
  suggested:['summary','experience','education','skills','references'],
  order:['summary','experience','education','skills','certifications','references'],
  sidebar:[]
 }
};
const regular={
 suggested:['summary','experience','education','skills','certifications'],
 order:['summary','experience','education','skills','certifications','projects'],
 sidebar:[] as ResumeSectionKey[]
};
const single=['modern','professional','executive-black','clean-gray','timeline','bold-header','portrait-navy','executive-portrait','black-gold'];

/** The active design changes suggested headings/ordering, never deletes typed sections. */
export function getTemplateSections(templateId?:string){
 const template=getResumeTemplate(templateId);
 const config=templateSets[template.id]||regular;
 const order=[...new Set<ResumeSectionKey>([...config.order,...standard])];
 return {suggested:config.suggested,order,sidebar:config.sidebar};
}
export const SECTION_TITLES:Record<ResumeSectionKey,string>={
 summary:'Professional Summary',experience:'Work Experience',education:'Education',skills:'Skills',
 certifications:'Certifications & Training',projects:'Projects',languages:'Languages',
 awards:'Awards & Achievements',volunteer:'Volunteer Experience',references:'References',
 additionalInfo:'Additional Information',customSections:'Other Sections'
};
function fill(value:unknown){return typeof value==='string'?value.trim():'';}
function item(title='',subtitle='',body=''):SectionEntry{return {title:fill(title),subtitle:fill(subtitle),body:fill(body)};}
function hasContent(x:SectionEntry){return !!(x.title||x.subtitle||x.body);}
function entries(r:Resume,key:ResumeSectionKey):SectionEntry[]{
 switch(key){
  case 'summary':return [item('','',r.summary)].filter(hasContent);
  case 'skills':return [item('','',r.skills)].filter(hasContent);
  case 'experience':return (r.experience||[]).map(x=>item([x.role,x.company].filter(fill).join(' · '),x.dates,x.details)).filter(hasContent);
  case 'education':return sortEducation(r.education||[]).map(x=>{const e=educationEntry(x);return item(e.title,e.subtitle,e.body);}).filter(hasContent);
  case 'certifications':return (r.certifications||[]).map(x=>item(x.title,[x.issuer,x.year].filter(fill).join(' · '),x.details)).filter(hasContent);
  case 'projects':return (r.projects||[]).map(x=>item(x.name,[x.role,x.link].filter(fill).join(' · '),x.details)).filter(hasContent);
  case 'languages':return (r.languages||[]).map(x=>item(x.name,x.level)).filter(hasContent);
  case 'awards':return (r.awards||[]).map(x=>item(x.title,[x.issuer,x.year].filter(fill).join(' · '),x.details)).filter(hasContent);
  case 'volunteer':return (r.volunteer||[]).map(x=>item(x.role,[x.organization,x.dates].filter(fill).join(' · '),x.details)).filter(hasContent);
  case 'references':return (r.references||[]).map(x=>item(x.name,[x.role,x.company].filter(fill).join(' · '),x.contact)).filter(hasContent);
  case 'additionalInfo':return [item('','',r.additionalInfo)].filter(hasContent);
  case 'customSections':return (r.customSections||[]).map(x=>item(x.title,'',x.details)).filter(hasContent);
 }
}
export function getResumeSections(resume:Resume):ResumeSection[]{
 const {suggested,order,sidebar}=getTemplateSections(resume.template);
 const template=getResumeTemplate(resume.template);
 const canSidebar=template.layout==='two-column'||template.layout==='sidebar';
 const out:ResumeSection[]=[];
 for(const key of order){
  const content=entries(resume,key);
  if(!content.length)continue;
  if(key==='customSections'){
   // User-created headings are first-class sections, not nested under "Other Sections".
   for(const e of content){out.push({key,title:e.title||'Custom Section',entries:[item('', '',e.body)],placement:'primary',kind:'text',suggested:false});}
   continue;
  }
  out.push({key,title:key==='summary'&&['creative-sidebar','studio-beige','editorial-beige','blue-profile'].includes(template.id)?'Profile / About Me':SECTION_TITLES[key],
   entries:content,placement:canSidebar&&sidebar.includes(key)?'secondary':'primary',
   kind:key==='skills'?'skills':key==='summary'||key==='additionalInfo'?'text':'entries',
   suggested:suggested.includes(key)});
 }
 return out;
}
