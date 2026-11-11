'use client';
import {useEffect,useMemo,useState} from 'react';
import type {CSSProperties} from 'react';
import {ArrowRight,Check,Eye,FileText,Search,ShieldCheck,Sparkles,X} from 'lucide-react';
import type {Resume} from '@/lib/types';
import {RESUME_TEMPLATES,TEMPLATE_CATEGORIES,getResumeTemplate} from '@/lib/templates';
import type {ResumeTemplateId,TemplateCategory} from '@/lib/templates';
import ResumeDocument from '@/components/resume-document';

type Props={resume:Resume;onUse:(id:ResumeTemplateId)=>void};
function Preview({resume,id,large=false}:{resume:Resume;id:ResumeTemplateId;large?:boolean}){
 const preview={...resume,template:id};
 return <div className={'rt-preview-stage '+(large?'rt-preview-stage-large':'')} aria-hidden="true">
   <div className="rt-preview-viewport"><ResumeDocument resume={preview} miniature /></div>
 </div>;
}
export default function TemplateGallery({resume,onUse}:Props){
 const [category,setCategory]=useState<TemplateCategory>('All');
 const [query,setQuery]=useState('');
 const [expanded,setExpanded]=useState<ResumeTemplateId|null>(null);
 const filtered=useMemo(()=>RESUME_TEMPLATES.filter(t=>(category==='All'||t.category===category)&&[t.name,t.description,t.audience,t.category].join(' ').toLowerCase().includes(query.trim().toLowerCase())),[category,query]);
 const picked=expanded?getResumeTemplate(expanded):null;
 useEffect(()=>{if(!expanded)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(null);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[expanded]);
 return <div className="rt-gallery"><div className="page-heading"><div><div className="eyebrow">RECRUITER-READY RESUME STYLES</div><h1>Resume Templates <span className="rt-count">{RESUME_TEMPLATES.length} designs</span></h1><p>Choose a modern, professional layout for job applications. Each design updates your resume preview and PDF printout.</p></div></div>
 <div className="rt-gallery-toolbar"><div className="rt-category-list" aria-label="Filter resume templates">{TEMPLATE_CATEGORIES.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c} <small>{c==='All'?RESUME_TEMPLATES.length:RESUME_TEMPLATES.filter(t=>t.category===c).length}</small></button>)}</div><label className="rt-search"><Search size={17}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search templates..." aria-label="Search templates"/></label></div>
 <div className="rt-gallery-hint"><ShieldCheck size={18}/><span><strong>Applying online?</strong> Choose a clean, single-column design with an ATS-friendly label for online applications. Photo, sidebar, and multi-column layouts are optional and may be better for direct sharing or portfolios.</span></div>
 <div className="rt-gallery-grid">{filtered.map(t=><article key={t.id} className={'rt-template-card '+(resume.template===t.id?'rt-card-selected':'')}>
   <div className="rt-card-image"><Preview resume={resume} id={t.id}/><span className="rt-tag" style={{'--rt-tag-accent':t.accent} as CSSProperties}>{t.tag}</span>
    <button className="rt-card-preview-button" onClick={()=>setExpanded(t.id)} aria-label={'Preview '+t.name}><Eye size={16}/> Preview</button>
   </div>
   <div className="rt-card-detail"><div className="rt-card-name"><h2>{t.name}</h2>{resume.template===t.id&&<span className="rt-selected-badge"><Check size={13}/> Selected</span>}</div><p>{t.description}</p><span className="rt-bestfor"><FileText size={13}/> Best for: {t.audience}</span><div className="rt-card-footer"><span className="rt-category">{t.category}</span><button className="purple-button" onClick={()=>onUse(t.id)}>Use Template <ArrowRight size={15}/></button></div></div>
   </article>)}</div>
 {filtered.length===0&&<div className="rt-no-results">No templates found for that search. <button onClick={()=>{setCategory('All');setQuery('');}}>Show all templates</button></div>}
 {picked&&expanded&&<div className="rt-modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setExpanded(null);}}><section className="rt-template-dialog" role="dialog" aria-modal="true" aria-label={'Preview '+picked.name}>
 <div className="rt-dialog-top"><div><span>RESUME TEMPLATE PREVIEW</span><h2>{picked.name}</h2><p>{picked.description}</p></div><button onClick={()=>setExpanded(null)} aria-label="Close preview"><X size={20}/></button></div>
 <div className="rt-dialog-preview"><Preview resume={resume} id={expanded} large/></div>
 <div className="rt-dialog-actions"><span><Sparkles size={15}/> Example content for layout preview; your own information stays unchanged.</span><button className="purple-button" onClick={()=>{onUse(expanded);setExpanded(null);}}>Use This Template <ArrowRight size={17}/></button></div>
 </section></div>}
 </div>;
}
