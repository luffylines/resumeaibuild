'use client';
import {useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Download,FileDown,FileImage,FileType,Printer,Palette,FileText,GraduationCap,Plus,Save,Sparkles,Trash2,UserRound,BriefcaseBusiness,ShieldCheck,Camera,ImageUp,XCircle} from 'lucide-react';
import type {ReactNode} from 'react';
import {UNIQUE_RESUME_TEMPLATES,TEMPLATE_CATEGORIES,DESIGN_COLOR_OPTIONS,PAGE_BACKGROUND_OPTIONS,getResumeTemplate,canonicalTemplateId,designDisplayName} from '@/lib/templates';
import ResumeDocument from '@/components/resume-document';
import {exportResumeDOCX,exportResumePDF,exportResumePNG} from '@/lib/resume-export';
import type {TemplateCategory} from '@/lib/templates';
import type {Resume} from '@/lib/types';
import {uid} from '@/lib/types';
const stages=[{label:'Profile',icon:UserRound},{label:'Experience',icon:BriefcaseBusiness},{label:'Education',icon:GraduationCap},{label:'Skills',icon:Sparkles},{label:'Generate',icon:FileText}];
type Props={draft:Resume;setDraft:(v:Resume)=>void;save:(v:Resume)=>Promise<void>;runAI:(task:'resume'|'summary',context:string)=>Promise<string|null>;busy:boolean;preview:ReactNode;onBack:()=>void};
function Input({label,value,change,placeholder='',area=false}:{label:string;value:string;change:(s:string)=>void;placeholder?:string;area?:boolean}){return <label className="wizard-field"><span>{label}</span>{area?<textarea rows={4} value={value} onChange={e=>change(e.target.value)} placeholder={placeholder}/>:<input value={value} onChange={e=>change(e.target.value)} placeholder={placeholder}/>}</label>;}
export default function ResumeWizard({draft,setDraft,save,runAI,busy,preview,onBack}:Props){
 const [step,setStep]=useState(0),[prompt,setPrompt]=useState(''),[message,setMessage]=useState('');
 const photoInput=useRef<HTMLInputElement>(null);
 const exportSheet=useRef<HTMLDivElement>(null);
 const [exporting,setExporting]=useState<'PDF'|'DOCX'|'PNG'|null>(null);
 const [photoBusy,setPhotoBusy]=useState(false);
 const [templateGroup,setTemplateGroup]=useState<TemplateCategory>('All');
 function change<K extends keyof Resume>(key:K,value:Resume[K]){setDraft({...draft,[key]:value});}

 async function handlePhoto(file:File|undefined){
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setMessage('Choose a JPEG, PNG or WebP photo.');return;}
  if(file.size>8*1024*1024){setMessage('The image is too large. Select a photo smaller than 8MB.');return;}
  setPhotoBusy(true);setMessage('');
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();
   await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(Error('Unable to read image'));img.src=url;});
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image conversion unavailable.');
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,480,480);
   const width=img.naturalWidth,height=img.naturalHeight,side=Math.min(width,height);
   ctx.drawImage(img,(width-side)/2,(height-side)/2,side,side,0,0,480,480);
   // Reduce photo size for database JSON persistence and fast PDF previews.
   const image=canvas.toDataURL('image/jpeg',.78);
   setDraft({...draft,photo:image});
   setMessage('Photo added. You can remove it anytime; resume photos are optional.');
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to add the photo.');}
  finally{URL.revokeObjectURL(url);setPhotoBusy(false);if(photoInput.current)photoInput.current.value='';}
 }
 const photoChooser=<div className="wizard-photo-upload">
  <div className="wizard-photo-head"><Camera size={19}/><div><strong>Profile Photo <em>Optional</em></strong><p>Use a professional photo if your selected template or employer needs one. Not required for ATS resumes.</p></div></div>
  <div className="wizard-photo-controls"><div className="wizard-photo-thumb">{draft.photo?<img alt="Your uploaded headshot" src={draft.photo}/>:<Camera size={26}/>}</div><div className="wizard-photo-buttons"><input ref={photoInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void handlePhoto(e.target.files?.[0])}/><button type="button" className="outline-button" disabled={photoBusy} onClick={()=>photoInput.current?.click()}><ImageUp size={16}/>{photoBusy?'Processing…':draft.photo?'Replace Photo':'Upload Photo'}</button>{draft.photo&&<button type="button" className="wizard-photo-remove" onClick={()=>{change('photo',null);setMessage('Photo removed from this resume.');}}><XCircle size={16}/> Remove</button>}<small>JPG, PNG or WebP · Max 8MB · center-cropped automatically</small></div></div>
 </div>;

 const downloadFile=async(kind:'PDF'|'DOCX'|'PNG')=>{
  setMessage('');setExporting(kind);
  try{
   if(kind==='PDF')await exportResumePDF(draft);
   if(kind==='DOCX')await exportResumeDOCX(draft);
   if(kind==='PNG')await exportResumePNG(draft,exportSheet.current);
   setMessage(kind+' exported. Your resume contains no website URLs, browser dates or page headers.');
  }catch(e){setMessage(e instanceof Error?e.message:kind+' export failed.');}
  finally{setExporting(null);}
 };
 const chooseTemplate=(id:Resume['template'])=>{
  if(!id)return;
  setDraft({...draft,template:id,accentColor:draft.accentColor||getResumeTemplate(id).accent});
 };
 const changeColor=(key:'accentColor'|'backgroundColor',value:string)=>{if(/^#[0-9a-f]{6}$/i.test(value))setDraft({...draft,[key]:value});};
 const exportActions=<div className="wizard-download-actions" aria-label="Resume export options">
   <button type="button" disabled={!!exporting} onClick={()=>void downloadFile('PDF')}><FileDown size={19}/><span>{exporting==='PDF'?'Preparing…':'Download PDF'}</span></button>
   <button type="button" disabled={!!exporting} onClick={()=>void downloadFile('DOCX')}><FileType size={19}/><span>{exporting==='DOCX'?'Preparing…':'Download DOCX'}</span></button>
   <button type="button" disabled={!!exporting} onClick={()=>void downloadFile('PNG')}><FileImage size={19}/><span>{exporting==='PNG'?'Preparing…':'Download PNG'}</span></button>
   <button type="button" disabled={!!exporting} onClick={()=>window.print()}><Printer size={19}/><span>Print</span></button>
 </div>;
 const exp=(id:string,k:'role'|'company'|'dates'|'details',v:string)=>change('experience',draft.experience.map(e=>e.id===id?{...e,[k]:v}:e));
 const edu=(id:string,k:'school'|'degree'|'dates',v:string)=>change('education',draft.education.map(e=>e.id===id?{...e,[k]:v}:e));
 async function generate(){setMessage('');const output=await runAI('resume',JSON.stringify({background:prompt,existing:draft}));if(!output)return;try{
 const begin=output.indexOf('{'),end=output.lastIndexOf('}');const data=JSON.parse(output.slice(begin,end+1)) as Record<string,unknown>;
 const val=(key:'targetRole'|'summary'|'skills')=>typeof data[key]==='string'?data[key] as string:draft[key];
 setDraft({...draft,targetRole:val('targetRole'),summary:val('summary'),skills:val('skills')});setMessage('AI draft created. Review every detail before saving.');
 }catch{setMessage('AI response could not be parsed. Try again.');}}
 return <div className="wizard-page"><div className="page-heading"><div><div className="eyebrow">CREATE YOUR RESUME</div><h1>Build Resume</h1><p>Create a professional, ATS-friendly resume step by step.</p></div><button className="outline-button" onClick={onBack}><ArrowLeft size={16}/> My Resumes</button></div>
 <div className="wizard-stagebar">{stages.map((x,i)=>{const Icon=x.icon;return <button key={x.label} className={step===i?'current':i<step?'done':''} onClick={()=>setStep(i)}><span>{i<step?<Check size={14}/>:<Icon size={17}/>}</span><strong>{x.label}</strong>{i!==4&&<i/>}</button>})}</div>
 <div className="wizard-layout"><section className="wizard-editor panel"><header><div><span>STEP {step+1} OF 5</span><h2>{['Personal Information','Work Experience','Education','Skills & Summary','Generate & Download'][step]}</h2><p>{['Fill in your profile details.','Describe your experience and achievements.','Add your educational background.','Highlight the skills most relevant to your goals.','Create an AI draft, select a template and save.'][step]}</p></div></header>
 <div className="wizard-fields">
 {step===0&&<div className="wizard-grid"><Input label="Full Name" value={draft.name} change={v=>change('name',v)} placeholder="Christian B. Aring"/><Input label="Target Job Title" value={draft.targetRole} change={v=>change('targetRole',v)} placeholder="Frontend Developer"/><Input label="Email Address" value={draft.email} change={v=>change('email',v)} placeholder="you@example.com"/><Input label="Phone Number" value={draft.phone} change={v=>change('phone',v)} placeholder="+63 9XX XXX XXXX"/><Input label="Location" value={draft.location} change={v=>change('location',v)} placeholder="Quezon City, Philippines"/><Input label="Portfolio / LinkedIn" value={draft.portfolio} change={v=>change('portfolio',v)} placeholder="https://..."/><div className="wizard-full"><Input label="Resume Name" value={draft.title} change={v=>change('title',v)}/></div><div className="wizard-full">{photoChooser}</div></div>}
 {step===1&&<div className="wizard-repeat-list">{draft.experience.map((e,i)=><div className="wizard-repeat" key={e.id}><div className="wizard-repeat-head"><strong>Experience {i+1}</strong><button onClick={()=>change('experience',draft.experience.filter(x=>x.id!==e.id))} aria-label="Remove experience"><Trash2 size={16}/></button></div><div className="wizard-grid"><Input label="Position" value={e.role} change={v=>exp(e.id,'role',v)}/><Input label="Company" value={e.company} change={v=>exp(e.id,'company',v)}/><div className="wizard-full"><Input label="Dates" value={e.dates} change={v=>exp(e.id,'dates',v)} placeholder="2024 – Present"/><Input area label="Responsibilities and achievements" value={e.details} change={v=>exp(e.id,'details',v)}/></div></div></div>)}<button className="wizard-add" onClick={()=>change('experience',[...draft.experience,{id:uid(),role:'',company:'',dates:'',details:''}])}><Plus size={17}/> Add Experience</button></div>}
 {step===2&&<div className="wizard-repeat-list">{draft.education.map((e,i)=><div className="wizard-repeat" key={e.id}><div className="wizard-repeat-head"><strong>Education {i+1}</strong><button aria-label="Remove education" onClick={()=>change('education',draft.education.filter(x=>x.id!==e.id))}><Trash2 size={16}/></button></div><div className="wizard-grid"><Input label="School" value={e.school} change={v=>edu(e.id,'school',v)}/><Input label="Degree" value={e.degree} change={v=>edu(e.id,'degree',v)}/><div className="wizard-full"><Input label="Dates" value={e.dates} change={v=>edu(e.id,'dates',v)}/></div></div></div>)}<button className="wizard-add" onClick={()=>change('education',[...draft.education,{id:uid(),school:'',degree:'',dates:''}])}><Plus size={17}/> Add Education</button></div>}
 {step===3&&<div className="wizard-repeat-list"><Input area label="Skills (separated by commas)" value={draft.skills} change={v=>change('skills',v)} placeholder="React, Laravel, SQL..."/><Input area label="Professional Summary" value={draft.summary} change={v=>change('summary',v)}/><button className="wizard-add" disabled={busy} onClick={async()=>{const out=await runAI('summary',JSON.stringify({role:draft.targetRole,summary:draft.summary,experience:draft.experience,skills:draft.skills}));if(out){change('summary',out);setMessage('AI summary generated. Verify the accuracy.');}}}><Sparkles size={16}/>{busy?'Generating...':'Improve Summary with AI'}</button></div>}
 {step===4&&<div className="wizard-generate"><div className="wizard-generate-head"><span><Sparkles size={26}/></span><h3>Create a Professional Resume with AI ✨</h3><p>Provide your real experience and career goals. AI will suggest a suitable professional summary, job title and skills.</p></div><Input area label="Describe your background" value={prompt} change={setPrompt} placeholder="I'm an IT graduate with experience in React and PHP who wants to work in web development..."/><button className="purple-button" disabled={busy||prompt.trim().length<20} onClick={()=>void generate()}><Sparkles size={17}/>{busy?'Generating...':'Generate Resume with AI'}</button><div className="rt-wizard-template-section"><h3 className="wizard-option-title">Choose a Professional Resume Design</h3><p className="rt-wizard-intro">Your selection updates the live resume preview and printed PDF. Single-column designs are the safest starting point for online applications.</p><div className="rt-wizard-filters">{TEMPLATE_CATEGORIES.map(c=><button type="button" key={c} className={templateGroup===c?'active':''} onClick={()=>setTemplateGroup(c)}>{c}</button>)}</div><div className="rt-wizard-template-grid">{UNIQUE_RESUME_TEMPLATES.filter(t=>templateGroup==='All'||t.category===templateGroup).map(t=><button key={t.id} className={'rt-wizard-design '+(canonicalTemplateId(draft.template)===t.id?'selected':'')} onClick={()=>chooseTemplate(t.id)} aria-pressed={canonicalTemplateId(draft.template)===t.id}><span className="rt-wizard-swatch" style={{borderTopColor:draft.template===t.id&&draft.accentColor?draft.accentColor:t.accent}}><i style={{backgroundColor:draft.template===t.id&&draft.accentColor?draft.accentColor:t.accent}}/><em/><em/><em/><em/></span><strong>{designDisplayName(t.id)}</strong><small>{t.category}</small>{canonicalTemplateId(draft.template)===t.id&&<Check size={16} className="rt-wizard-check"/>}</button>)}</div><div className="wizard-color-customizer"><h3><Palette size={18}/> Customize this design</h3><div className="wizard-color-group"><strong>Accent color</strong><div className="wizard-color-swatches">${DESIGN_COLOR_OPTIONS.map(c=><button type="button" title={c.name} aria-label={'Accent '+c.name} aria-pressed={(draft.accentColor||getResumeTemplate(draft.template).accent).toLowerCase()===c.hex.toLowerCase()} key={c.hex} style={{'--swatch':c.hex} as React.CSSProperties} className={(draft.accentColor||getResumeTemplate(draft.template).accent).toLowerCase()===c.hex.toLowerCase()?'active':''} onClick={()=>changeColor('accentColor',c.hex)}>{(draft.accentColor||getResumeTemplate(draft.template).accent).toLowerCase()===c.hex.toLowerCase()&&<Check size={12}/>}</button>)}<input type="color" title="Custom accent" aria-label="Custom accent color" value={draft.accentColor||getResumeTemplate(draft.template).accent} onChange={e=>changeColor('accentColor',e.target.value)}/></div></div><div className="wizard-color-group"><strong>Page background</strong><div className="wizard-color-swatches">${PAGE_BACKGROUND_OPTIONS.map(c=><button type="button" title={c.name} aria-label={'Background '+c.name} aria-pressed={(draft.backgroundColor||'#FFFFFF').toLowerCase()===c.hex.toLowerCase()} key={c.hex} style={{'--swatch':c.hex} as React.CSSProperties} className={(draft.backgroundColor||'#FFFFFF').toLowerCase()===c.hex.toLowerCase()?'active':''} onClick={()=>changeColor('backgroundColor',c.hex)}>{(draft.backgroundColor||'#FFFFFF').toLowerCase()===c.hex.toLowerCase()&&<Check size={12}/>}</button>)}<input type="color" title="Custom background" aria-label="Custom background color" value={draft.backgroundColor||'#FFFFFF'} onChange={e=>changeColor('backgroundColor',e.target.value)}/></div></div></div><div className="wizard-export-area"><h3>Download or print</h3>${exportActions}<p><FileText size={15}/> DOCX is editable in Word and can be imported to Canva. PDF contains selectable text and can also be imported to Canva; Canva may adjust fonts/layouts. PNG is an image, not editable text.</p><a href="https://www.canva.com/help/import-and-edit-pdfs-canva/" target="_blank" rel="noopener noreferrer">How to edit your PDF in Canva ↗</a><p className="wizard-print-tip">For browser Print: select A4 and turn OFF “Headers and footers” if the browser shows the page URL, date, or page number.</p></div><p className="wizard-hint"><ShieldCheck size={17}/> You can use any layout without a photo. For online ATS applications, clean single-column resumes are usually safer.</p></div>}
 {message&&<div role="status" className="wizard-message">{message}</div>}</div>
 <footer className="wizard-footer"><button className="outline-button" disabled={step===0} onClick={()=>setStep(i=>Math.max(0,i-1))}><ArrowLeft size={16}/> Back</button><button className="outline-button" onClick={()=>void save(draft)}><Save size={16}/> Save Draft</button>{step===4?<button className="purple-button" onClick={onBack}><Check size={16}/> Done</button>:<button className="purple-button" onClick={()=>setStep(i=>Math.min(4,i+1))}>Next <ArrowRight size={16}/></button>}</footer>
 </section><aside className="wizard-preview"><div className="wizard-preview-head"><strong>Resume Preview</strong><span><Check size={15}/> Live Preview</span></div>{preview}<p>Live preview updates as you type.</p></aside></div><div className="resume-export-host" ref={exportSheet} aria-hidden="true"><ResumeDocument resume={draft}/></div></div>;
}
