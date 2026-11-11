import type {CSSProperties} from 'react';
import type {Resume} from '@/lib/types';
import {getResumeSections} from '@/lib/resume-sections';
import type {ResumeSection} from '@/lib/resume-sections';
import {getResumeTemplate,PHOTO_READY_TEMPLATES} from '@/lib/templates';

type Props={resume:Resume;miniature?:boolean};
function Section({data}:{data:ResumeSection}){
 return <section className={'rd-section rd-key-'+data.key} aria-label={data.title}>
  <h3>{data.title}</h3>
  {data.kind==='skills'?<div className="rd-skills">{data.entries[0].body.split(/[,;\n]/).map(v=>v.trim()).filter(Boolean).map((v,i)=><span key={i}>{v}</span>)}</div>:
   data.kind==='text'?data.entries.map((e,i)=><p key={i}>{e.body}</p>):
   data.entries.map((e,i)=><div className="rd-entry" key={i}>
    {(e.title||e.subtitle)&&<div className="rd-entry-title">{e.title?<strong>{e.title}</strong>:<span/>}{e.subtitle&&<span>{e.subtitle}</span>}</div>}
    {e.body&&<p className="rd-entry-details">{e.body}</p>}
   </div>)}
 </section>;
}
export default function ResumeDocument({resume:r,miniature=false}:Props){
 const template=getResumeTemplate(r.template);
 const accent=/^#[0-9a-fA-F]{6}$/.test(r.accentColor||'')?r.accentColor!:template.accent;
 const pageBackground=/^#[0-9a-fA-F]{6}$/.test(r.backgroundColor||'')?r.backgroundColor:undefined;
 const contact=[r.email,r.phone,r.location,r.portfolio].filter(Boolean);
 const sections=getResumeSections(r);
 const hasPortraitTemplate=PHOTO_READY_TEMPLATES.has(template.id);
 const validPhoto=!!(r.photo&&/^data:image\/(jpeg|png|webp);base64,/i.test(r.photo));
 const portrait=hasPortraitTemplate?<div className={'rd-portrait '+(validPhoto?'rd-portrait-active':'rd-portrait-placeholder')}>{validPhoto?<img src={r.photo!} alt="Applicant profile photo" width={116} height={116}/>:miniature?<img src="/images/resume-avatar-demo.svg" alt="" aria-hidden="true" width={116} height={116} loading="eager"/>:null}</div>:null;
 const columns=template.layout==='two-column'||template.layout==='sidebar';
 return <article
  className={'resume-document '+(miniature?'resume-document--mini':'resume-paper')+' rd-style-'+template.id+' rd-layout-'+template.layout+(hasPortraitTemplate?' rd-photo-layout':'')+(validPhoto?' rd-has-photo':' rd-no-photo')}
  style={{'--rd-accent':accent,'--rd-ink':template.ink,'--rd-page-bg':pageBackground} as CSSProperties}
  aria-label={miniature?template.name+' template preview':'Resume preview: '+template.name}
 >
  <div className="rd-accent-bar" aria-hidden="true"/>
  <header className={'rd-header '+(hasPortraitTemplate?'rd-header-photo':'')}>
   <div className="rd-header-text"><h2>{r.name||'YOUR NAME'}</h2></div>
   {template.id==='creative-sidebar'&&<div className="rd-header-mark" aria-hidden="true">{(r.name||'A').charAt(0).toUpperCase()}</div>}
   <p className="rd-contact">{contact.length?contact.map((s,i)=><span key={i}>{s}</span>):<span>Email  •  Phone  •  Location</span>}</p>{portrait}
  </header>
  <div className="rd-body">
   <main className="rd-primary">{sections.filter(s=>s.placement==='primary').map((s,i)=><Section data={s} key={s.key+'-'+i}/>)}</main>
   {columns&&<aside className="rd-secondary">{sections.filter(s=>s.placement==='secondary').map((s,i)=><Section data={s} key={s.key+'-'+i}/>)}</aside>}
  </div>
 </article>;
}
