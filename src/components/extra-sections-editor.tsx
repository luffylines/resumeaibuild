'use client';
import {useState} from 'react';
import {Award,BookOpen,BriefcaseBusiness,CheckCircle2,FilePlus2,FolderOpen,HeartHandshake,Languages,Plus,Trash2,Trophy,Users} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {Resume} from '@/lib/types';
import {uid} from '@/lib/types';
import {getTemplateSections} from '@/lib/resume-sections';

type ExtraListKey='certifications'|'references'|'languages'|'projects'|'awards'|'volunteer'|'customSections';
type Field={name:string;label:string;placeholder:string;area?:boolean};
type Editor={key:ExtraListKey;title:string;singular:string;icon:LucideIcon;fields:Field[]};
const editors:Editor[]=[
 {key:'certifications',title:'Certifications & Training',singular:'Certification',icon:Award,fields:[
  {name:'title',label:'Certificate / Training Title',placeholder:'e.g. Google IT Support Certificate'},
  {name:'issuer',label:'Issuer / Organization',placeholder:'e.g. Google'},
  {name:'year',label:'Year / Date',placeholder:'2026'},
  {name:'details',label:'Details (optional)',placeholder:'Credential ID, course highlights, etc.',area:true}]},
 {key:'references',title:'Professional References',singular:'Reference',icon:Users,fields:[
  {name:'name',label:'Reference Name',placeholder:'Full name'},
  {name:'role',label:'Job Title',placeholder:'e.g. IT Supervisor'},
  {name:'company',label:'Company / Organization',placeholder:'e.g. ABC Corporation'},
  {name:'contact',label:'Contact Information',placeholder:'Email or phone — only with permission'}]},
 {key:'languages',title:'Languages',singular:'Language',icon:Languages,fields:[
  {name:'name',label:'Language',placeholder:'e.g. English / Filipino'},
  {name:'level',label:'Proficiency Level',placeholder:'e.g. Fluent / Conversational / Native'}]},
 {key:'projects',title:'Projects & Portfolio',singular:'Project',icon:FolderOpen,fields:[
  {name:'name',label:'Project Name',placeholder:'e.g. Community Portal'},
  {name:'role',label:'Your Role',placeholder:'e.g. Full-stack Developer'},
  {name:'link',label:'Project Link (optional)',placeholder:'https://...'},
  {name:'details',label:'Description / Achievements',placeholder:'What you built and what impact it made',area:true}]},
 {key:'awards',title:'Awards & Achievements',singular:'Award',icon:Trophy,fields:[
  {name:'title',label:'Award / Achievement',placeholder:'e.g. Best Capstone Project'},
  {name:'issuer',label:'Awarding Organization',placeholder:'e.g. University'},
  {name:'year',label:'Year',placeholder:'2026'},
  {name:'details',label:'Details (optional)',placeholder:'Why this recognition matters',area:true}]},
 {key:'volunteer',title:'Volunteer Experience',singular:'Volunteer Role',icon:HeartHandshake,fields:[
  {name:'role',label:'Volunteer Role',placeholder:'e.g. Community Coordinator'},
  {name:'organization',label:'Organization',placeholder:'e.g. Youth Council'},
  {name:'dates',label:'Dates',placeholder:'2024 – 2026'},
  {name:'details',label:'Contribution / Achievements',placeholder:'Describe real work and measurable results',area:true}]},
 {key:'customSections',title:'Custom Sections',singular:'Custom Section',icon:FilePlus2,fields:[
  {name:'title',label:'Section Title',placeholder:'e.g. Seminars Attended / Professional Memberships'},
  {name:'details',label:'Content',placeholder:'Add the details you want to show in this section',area:true}]}
];
function listFor(resume:Resume,key:ExtraListKey):Record<string,string>[] {
 return ((resume[key]||[]) as unknown as Record<string,string>[]);
}
export default function ExtraSectionsEditor({draft,setDraft}:{draft:Resume;setDraft:(value:Resume)=>void}){
 const [additionalOpen,setAdditionalOpen]=useState(false);
 const {suggested}=getTemplateSections(draft.template);
 const sorted=[...editors].sort((a,b)=>Number(suggested.includes(b.key))-Number(suggested.includes(a.key)));
 function add(key:ExtraListKey){
  const def=editors.find(e=>e.key===key);
  if(!def)return;
  const row:Record<string,string>={id:uid()};
  for(const field of def.fields)row[field.name]='';
  setDraft({...draft,[key]:[...listFor(draft,key),row]});
 }
 function update(key:ExtraListKey,id:string,field:string,value:string){
  setDraft({...draft,[key]:listFor(draft,key).map(item=>item.id===id?{...item,[field]:value}:item)});
 }
 function remove(key:ExtraListKey,id:string){
  setDraft({...draft,[key]:listFor(draft,key).filter(item=>item.id!==id)});
 }
 return <section className="wizard-extra-section" aria-label="Additional resume sections">
  <div className="wizard-extra-heading"><div className="wizard-extra-heading-icon"><BookOpen size={20}/></div><div><h3>Additional Resume Sections</h3><p>Choose only what applies to you. Filled sections appear automatically in the resume, even if the selected design does not normally include them.</p></div></div>
  <div className="wizard-extra-pick-list" aria-label="Add an optional resume section">{sorted.map(editor=>{
   const Icon=editor.icon;
   const count=listFor(draft,editor.key).length;
   const recommended=suggested.includes(editor.key);
   return <button type="button" key={editor.key} className={'wizard-extra-pick '+(count?'added':'')} onClick={()=>add(editor.key)}>
    <span className="wizard-extra-pick-icon"><Icon size={17}/></span>
    <span className="wizard-extra-pick-text"><strong>{editor.title}</strong><small>{recommended?'Suggested for this layout':count?count+' item(s) added':'Optional section'}</small></span>
    {count?<span className="wizard-extra-count">{count}</span>:<Plus size={16}/>}
   </button>;
  })}<button type="button" className={'wizard-extra-pick '+(draft.additionalInfo||additionalOpen?'added':'')} onClick={()=>setAdditionalOpen(true)}>
    <span className="wizard-extra-pick-icon"><BriefcaseBusiness size={17}/></span><span className="wizard-extra-pick-text"><strong>Additional Information</strong><small>Other qualifications or details</small></span>{draft.additionalInfo?<CheckCircle2 size={16}/>:<Plus size={16}/>}
   </button></div>
  {editors.map(editor=>{
    const items=listFor(draft,editor.key);
    if(!items.length)return null;
    const Icon=editor.icon;
    return <section key={editor.key} className="wizard-extra-editor" aria-label={'Edit '+editor.title}>
     <div className="wizard-extra-editor-top"><div><Icon size={17}/><h4>{editor.title}</h4></div><button type="button" onClick={()=>add(editor.key)}><Plus size={15}/> Add another</button></div>
     {editor.key==='references'&&<p className="wizard-reference-note">Only include professional references who agreed to share their contact details. References are optional for most applications.</p>}
     {items.map((item,i)=><div key={item.id} className="wizard-extra-item">
       <div className="wizard-extra-item-heading"><strong>{editor.singular} {i+1}</strong><button type="button" aria-label={'Remove '+editor.singular+' '+(i+1)} onClick={()=>remove(editor.key,item.id)}><Trash2 size={16}/> Remove</button></div>
       <div className="wizard-extra-input-grid">{editor.fields.map(field=><label key={field.name} className={'wizard-field '+(field.area?'wizard-extra-wide':'')}><span>{field.label}</span>
         {field.area?<textarea rows={3} value={item[field.name]||''} placeholder={field.placeholder} onChange={e=>update(editor.key,item.id,field.name,e.target.value)}/>:<input value={item[field.name]||''} placeholder={field.placeholder} onChange={e=>update(editor.key,item.id,field.name,e.target.value)}/>}
        </label>)}</div>
      </div>)}
    </section>;
  })}
  {(additionalOpen||!!draft.additionalInfo)&&<section className="wizard-extra-editor" aria-label="Edit Additional Information">
    <div className="wizard-extra-editor-top"><div><BriefcaseBusiness size={17}/><h4>Additional Information</h4></div><button type="button" onClick={()=>{setDraft({...draft,additionalInfo:''});setAdditionalOpen(false);}}><Trash2 size={15}/> Remove</button></div>
    <label className="wizard-field"><span>Other Qualifications / Information</span><textarea rows={4} placeholder="Add real information relevant to the application" value={draft.additionalInfo||''} onChange={e=>setDraft({...draft,additionalInfo:e.target.value})}/></label>
   </section>}
  <p className="wizard-extra-hint"><CheckCircle2 size={16}/> Empty optional fields stay hidden from your final resume. Your sections are included in PDF, DOCX, PNG, and Print exports once filled.</p>
 </section>;
}
