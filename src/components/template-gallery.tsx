'use client';
import {useEffect,useMemo,useState} from 'react';
import type {CSSProperties} from 'react';
import {ArrowRight,Check,Eye,FileText,Palette,Search,ShieldCheck,Sparkles,X} from 'lucide-react';
import type {Resume} from '@/lib/types';
import {UNIQUE_UNIQUE_RESUME_TEMPLATES,DESIGN_COLOR_OPTIONS,PAGE_BACKGROUND_OPTIONS,canonicalTemplateId,designDisplayName,TEMPLATE_CATEGORIES,getResumeTemplate} from '@/lib/templates';
import type {ResumeTemplateId,TemplateCategory} from '@/lib/templates';
import ResumeDocument from '@/components/resume-document';

type Props={resume:Resume;onUse:(id:ResumeTemplateId,accentColor:string,backgroundColor:string)=>void};
const validHex=(s:string)=>/^#[0-9a-f]{6}$/i.test(s);
function Preview({resume,id,accent,background,large=false}:{resume:Resume;id:ResumeTemplateId;accent:string;background:string;large?:boolean}){
 const preview={...resume,template:id,accentColor:accent,backgroundColor:background};
 return <div className={'rt-preview-stage '+(large?'rt-preview-stage-large':'')} aria-hidden="true"><div className="rt-preview-viewport"><ResumeDocument resume={preview} miniature/></div></div>;
}
function PalettePicker({title,values,value,change}:{title:string;values:readonly {name:string;hex:string}[];value:string;change:(v:string)=>void}){
 return <div className="rt-palette-row"><span>{title}</span><div className="rt-palette-options" role="group" aria-label={title}>{values.map(v=><button type="button" title={v.name} aria-label={title+': '+v.name} aria-pressed={value.toLowerCase()===v.hex.toLowerCase()} className={'rt-palette-dot '+(value.toLowerCase()===v.hex.toLowerCase()?'active':'')} key={v.hex} style={{'--swatch':v.hex} as CSSProperties} onClick={()=>change(v.hex)}>{value.toLowerCase()===v.hex.toLowerCase()&&<Check size={12}/>}</button>)}</div></div>;
}
export default function TemplateGallery({resume,onUse}:Props){
 const [category,setCategory]=useState<TemplateCategory>('All');
 const [query,setQuery]=useState('');
 const [expanded,setExpanded]=useState<ResumeTemplateId|null>(null);
 const [accentChoices,setAccentChoices]=useState<Record<string,string>>({});
 const [backgroundChoices,setBackgroundChoices]=useState<Record<string,string>>({});
 const selectedId=canonicalTemplateId(resume.template);
 const colorFor=(id:ResumeTemplateId)=>accentChoices[id]||(selectedId===id&&validHex(resume.accentColor||'')?resume.accentColor!:selectedId===id&&resume.template?getResumeTemplate(resume.template).accent:getResumeTemplate(id).accent);
 const backgroundFor=(id:ResumeTemplateId)=>backgroundChoices[id]||(selectedId===id&&validHex(resume.backgroundColor||'')?resume.backgroundColor!:'#FFFFFF');
 const apply=(id:ResumeTemplateId)=>onUse(id,colorFor(id),backgroundFor(id));
 const filtered=useMemo(()=>UNIQUE_RESUME_TEMPLATES.filter(t=>(category==='All'||t.category===category)&&[t.name,t.description,t.audience,t.category].join(' ').toLowerCase().includes(query.trim().toLowerCase())),[category,query]);
 const picked=expanded?getResumeTemplate(expanded):null;
 useEffect(()=>{if(!expanded)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(null);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[expanded]);
 return <div className="rt-gallery"><div className="page-heading"><div><div className="eyebrow">RECRUITER-READY RESUME STYLES</div><h1>Resume Templates <span className="rt-count">{UNIQUE_RESUME_TEMPLATES.length} unique layouts</span></h1><p>Each card represents a distinct resume layout. Pick the accent and page background colors inside the card, then preview or edit your resume.</p></div></div>
 <div className="rt-gallery-toolbar"><div className="rt-category-list" aria-label="Filter resume templates">{TEMPLATE_CATEGORIES.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c} <small>{c==='All'?UNIQUE_RESUME_TEMPLATES.length:UNIQUE_RESUME_TEMPLATES.filter(t=>t.category===c).length}</small></button>)}</div><label className="rt-search"><Search size={17}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search templates..." aria-label="Search templates"/></label></div>
 <div className="rt-gallery-hint"><ShieldCheck size={18}/><span><strong>Applying online?</strong> Choose a clean, single-column design with an ATS-friendly label for online applications. Photo, sidebar, and multi-column layouts are optional and may be better for direct sharing or portfolios.</span></div>
 <div className="rt-gallery-grid">{filtered.map(t=><article key={t.id} className={'rt-template-card '+(selectedId===t.id?'rt-card-selected':'')}>
   <div className="rt-card-image"><Preview resume={resume} id={t.id} accent={colorFor(t.id)} background={backgroundFor(t.id)}/><span className="rt-tag" style={{'--rt-tag-accent':colorFor(t.id)} as CSSProperties}>{t.tag}</span>
    <button className="rt-card-preview-button" onClick={()=>setExpanded(t.id)} aria-label={'Preview '+designDisplayName(t.id)}><Eye size={16}/> Preview</button>
   </div>
   <div className="rt-card-detail"><div className="rt-card-name"><h2>{designDisplayName(t.id)}</h2>{selectedId===t.id&&<span className="rt-selected-badge"><Check size={13}/> Selected</span>}</div><p>{t.description}</p><PalettePicker title="Accent color" values={DESIGN_COLOR_OPTIONS} value={colorFor(t.id)} change={v=>setAccentChoices(old=>({...old,[t.id]:v}))}/><PalettePicker title="Page background" values={PAGE_BACKGROUND_OPTIONS} value={backgroundFor(t.id)} change={v=>setBackgroundChoices(old=>({...old,[t.id]:v}))}/><span className="rt-bestfor"><FileText size={13}/> Best for: {t.audience}</span><div className="rt-card-footer"><span className="rt-category">{t.category}</span><button className="purple-button" onClick={()=>apply(t.id)}>Use Layout <ArrowRight size={15}/></button></div></div>
   </article>)}</div>
 {filtered.length===0&&<div className="rt-no-results">No templates found for that search. <button onClick={()=>{setCategory('All');setQuery('');}}>Show all templates</button></div>}
 {picked&&expanded&&<div className="rt-modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setExpanded(null);}}><section className="rt-template-dialog" role="dialog" aria-modal="true" aria-label={'Preview '+picked.name}>
 <div className="rt-dialog-top"><div><span>RESUME TEMPLATE PREVIEW</span><h2>{designDisplayName(picked.id)}</h2><p>{picked.description}</p></div><button onClick={()=>setExpanded(null)} aria-label="Close preview"><X size={20}/></button></div>
 <div className="rt-dialog-preview"><Preview resume={resume} id={expanded} accent={colorFor(expanded)} background={backgroundFor(expanded)} large/></div>
 <div className="rt-modal-palettes"><PalettePicker title="Accent color" values={DESIGN_COLOR_OPTIONS} value={colorFor(expanded)} change={v=>setAccentChoices(old=>({...old,[expanded]:v}))}/><label className="rt-custom-palette"><Palette size={15}/> Custom accent <input aria-label="Custom accent color" type="color" value={colorFor(expanded)} onChange={e=>setAccentChoices(old=>({...old,[expanded]:e.target.value}))}/></label><PalettePicker title="Page background" values={PAGE_BACKGROUND_OPTIONS} value={backgroundFor(expanded)} change={v=>setBackgroundChoices(old=>({...old,[expanded]:v}))}/><label className="rt-custom-palette"><Palette size={15}/> Custom background <input aria-label="Custom background color" type="color" value={backgroundFor(expanded)} onChange={e=>setBackgroundChoices(old=>({...old,[expanded]:e.target.value}))}/></label></div><div className="rt-dialog-actions"><span><Sparkles size={15}/> Example content for layout preview; your own information stays unchanged.</span><button className="purple-button" onClick={()=>{apply(expanded);setExpanded(null);}}>Use This Layout <ArrowRight size={17}/></button></div>
 </section></div>}
 </div>;
}
