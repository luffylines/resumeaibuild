'use client';
import {useState} from 'react';
import {ArrowRight,BriefcaseBusiness,CalendarDays,Check,ChevronDown,GripVertical,Plus,Trash2,X} from 'lucide-react';
import type {ApplicationStatus,JobApplication} from '@/lib/types';
import {uid} from '@/lib/types';
const stages:ApplicationStatus[]=['Applied','Interview','Offer','Rejected'];
type Props={applications:JobApplication[];save:(app:JobApplication)=>Promise<void>;remove:(id:string)=>Promise<void>};
export default function JobBoard({applications,save,remove}:Props){
 const [add,setAdd]=useState(false);
 const [company,setCompany]=useState(''),[role,setRole]=useState(''),[url,setUrl]=useState(''),[status,setStatus]=useState<ApplicationStatus>('Applied');
 const [moving,setMoving]=useState('');
 const addJob=async()=>{if(!company.trim()||!role.trim())return;const app={id:uid(),company:company.trim(),role:role.trim(),link:url.trim(),status,appliedAt:new Date().toISOString().slice(0,10)};await save(app);setCompany('');setRole('');setUrl('');setStatus('Applied');setAdd(false);};
 const move=async(id:string,next:ApplicationStatus)=>{const x=applications.find(a=>a.id===id);if(x&&x.status!==next)await save({...x,status:next});setMoving('');};
 return <section className="kanban-page">
 <div className="page-heading"><div><div className="eyebrow">JOB APPLICATIONS</div><h1>Job Tracker</h1><p>Track and manage your job applications in one place.</p></div><button className="purple-button" onClick={()=>setAdd(x=>!x)}><Plus size={17}/> Add Application</button></div>
 {add&&<div className="kanban-add panel"><div className="kanban-add-head"><strong>New Job Application</strong><button onClick={()=>setAdd(false)} aria-label="Close form"><X size={17}/></button></div><div className="kanban-add-grid"><label>Company<input value={company} onChange={e=>setCompany(e.target.value)} placeholder="e.g. Globe"/></label><label>Job Title<input value={role} onChange={e=>setRole(e.target.value)} placeholder="Frontend Developer"/></label><label>Job URL (optional)<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value as ApplicationStatus)}>{stages.map(x=><option key={x}>{x}</option>)}</select></label></div><button className="purple-button" disabled={!company.trim()||!role.trim()} onClick={()=>void addJob()}><Check size={16}/> Save Application</button></div>}
 <div className="kanban-board">{stages.map(stage=><section key={stage} className={'kanban-column kanban-'+stage.toLowerCase()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/resumebuilder-application-id');if(id)void move(id,stage);}}>
 <header><span>{stage} ({applications.filter(x=>x.status===stage).length})</span><button title={'Add '+stage+' application'} onClick={()=>{setStatus(stage);setAdd(true);}}><Plus size={17}/></button></header>
 <div className="kanban-stack">{applications.filter(x=>x.status===stage).map(app=><article className={'kanban-ticket '+(moving===app.id?'moving':'')} key={app.id} draggable onDragStart={e=>{e.dataTransfer.setData('text/resumebuilder-application-id',app.id);e.dataTransfer.effectAllowed='move';setMoving(app.id);}} onDragEnd={()=>setMoving('')}>
  <div className="kanban-ticket-top"><GripVertical size={15}/><strong>{app.role}</strong><button title={'Remove '+app.role} onClick={()=>void remove(app.id)}><Trash2 size={15}/></button></div>
  <p>{app.company}</p><div className="kanban-ticket-foot"><span><CalendarDays size={12}/>{app.appliedAt||'Not set'}</span>{app.link&&/^https?:\/\//i.test(app.link)&&<a href={app.link} rel="noopener noreferrer" target="_blank">Job link <ArrowRight size={12}/></a>}</div>
  <label className="kanban-move-label">Move to <span><select value={app.status} onChange={e=>void move(app.id,e.target.value as ApplicationStatus)}>{stages.map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={14}/></span></label>
 </article>)}{applications.filter(x=>x.status===stage).length===0&&<div className="kanban-empty"><BriefcaseBusiness size={18}/><p>Drop applications here</p></div>}</div></section>)}</div><p className="muted-copy">Drag cards between columns on desktop, or use the status selector on mobile. Changes save automatically.</p>
 </section>;
}
