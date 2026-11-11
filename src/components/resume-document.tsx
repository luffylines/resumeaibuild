import type {CSSProperties,ReactNode} from 'react';
import type {Resume} from '@/lib/types';
import {getResumeTemplate} from '@/lib/templates';

type Props={resume:Resume;miniature?:boolean};
function Block({name,children}:{name:string;children:ReactNode}){return <section className="rd-section"><h3>{name}</h3>{children}</section>;}
export default function ResumeDocument({resume:r,miniature=false}:Props){
 const template=getResumeTemplate(r.template);
 const experience=(r.experience||[]).filter(e=>e.role||e.company||e.dates||e.details);
 const education=(r.education||[]).filter(e=>e.school||e.degree||e.dates);
 const skills=(r.skills||'').split(',').map(s=>s.trim()).filter(Boolean);
 const contact=[r.email,r.phone,r.location,r.portfolio].filter(Boolean);
 const fallback=(message:string)=><span className="rd-empty-hint">{message}</span>;
 const skillBlock=<Block name="Core Skills">{skills.length?<div className="rd-skills">{skills.map((s,i)=><span key={i}>{s}</span>)}</div>:fallback('Add skills relevant to the job opening.')}</Block>;
 const eduBlock=<Block name="Education">{education.length?education.map(e=><div className="rd-entry rd-edu" key={e.id}><div className="rd-entry-title"><strong>{e.degree||'Degree / Program'}</strong><span>{e.dates}</span></div><div className="rd-entry-company">{e.school}</div></div>):fallback('Add your school and qualification.')}</Block>;
 const summaryBlock=<Block name="Professional Summary"><p>{r.summary||fallback('Write a short, tailored professional summary about your skills and achievements.')}</p></Block>;
 const experienceBlock=<Block name="Work Experience">{experience.length?experience.map(e=><div className="rd-entry" key={e.id}><div className="rd-entry-title"><strong>{[e.role,e.company].filter(Boolean).join(' · ')||'Role and company'}</strong><span>{e.dates}</span></div>{e.details&&<p className="rd-entry-details">{e.details}</p>}</div>):fallback('Add your relevant experience, projects or internship.')}</Block>;
 const hasPortraitTemplate=['portrait-navy','studio-beige','executive-portrait','blue-profile','modern-portrait','editorial-beige','black-gold','graduate-portrait'].includes(template.id);
 const validPhoto=!!(r.photo&&/^data:image\/(jpeg|png|webp);base64,/i.test(r.photo));
 const portrait=hasPortraitTemplate?<div className={'rd-portrait '+(validPhoto?'rd-portrait-active':'rd-portrait-placeholder')}>{validPhoto?<img src={r.photo!} alt="Applicant profile photo" width={116} height={116}/>:miniature?<div className="rd-portrait-silhouette" aria-hidden="true"><i/><span/></div>:null}</div>:null;
 const columns=template.layout==='two-column'||template.layout==='sidebar';
 return <article
  className={'resume-document '+(miniature?'resume-document--mini':'resume-paper')+' rd-style-'+template.id+' rd-layout-'+template.layout+(hasPortraitTemplate?' rd-photo-layout':'')+(validPhoto?' rd-has-photo':' rd-no-photo')}
  style={{'--rd-accent':template.accent,'--rd-ink':template.ink} as CSSProperties}
  aria-label={miniature?template.name+' template preview':'Resume preview: '+template.name}
 >
  <div className="rd-accent-bar" aria-hidden="true"/>
  <header className={"rd-header "+(hasPortraitTemplate?"rd-header-photo":"")}><div className="rd-header-text"><h2>{r.name||fallback('YOUR NAME')}</h2><p className="rd-job-title">{r.targetRole||fallback('Professional title')}</p></div>{template.id==='creative-sidebar'&&<div className="rd-header-mark" aria-hidden="true">{(r.name||'A').charAt(0).toUpperCase()}</div>}<p className="rd-contact">{contact.length?contact.map((s,i)=><span key={i}>{s}</span>):fallback('Email  •  Phone  •  Location')}</p>{portrait}</header>
  <div className="rd-body">
   <main className="rd-primary">{summaryBlock}{experienceBlock}{!columns&&eduBlock}{!columns&&skillBlock}</main>
   {columns&&<aside className="rd-secondary">{skillBlock}{eduBlock}</aside>}
  </div>
 </article>;
}
