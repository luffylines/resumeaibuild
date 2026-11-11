'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {
 Activity,ArrowDownToLine,ArrowLeft,ArrowRight,BarChart3,BookOpen,BriefcaseBusiness,Check,CheckCircle2,
 ChevronDown,ChevronRight,ClipboardCheck,Copy,FileCheck2,FilePlus2,FileText,Flag,FolderOpen,GraduationCap,
 LayoutDashboard,Lightbulb,LoaderCircle,LogOut,Mail,Menu,MessageCircle,Plus,Search,Settings2,ShieldCheck,
 Sparkles,Target,Trash2,UploadCloud,UserRound,WalletCards,WandSparkles,X,Zap
} from 'lucide-react';
import {atsScore,jobFit} from '@/lib/ats';
import {browserSupabase,configured} from '@/lib/supabase';
import {emptyResume,sampleResume,sampleJobs,uid} from '@/lib/types';
import type {Resume,JobApplication,ApplicationStatus} from '@/lib/types';

type Section='dashboard'|'builder'|'resumes'|'ats'|'jobs'|'interview'|'tracker'|'letters'|'settings';
type AiTask='summary'|'interview'|'coverletter';
const nav:{id:Section;label:string;icon:typeof LayoutDashboard}[]=[
 {id:'dashboard',label:'Dashboard',icon:LayoutDashboard},{id:'builder',label:'Resume Builder',icon:FilePlus2},
 {id:'resumes',label:'My Resumes',icon:FolderOpen},{id:'ats',label:'ATS Checker',icon:Target},
 {id:'jobs',label:'Job Matches',icon:BriefcaseBusiness},{id:'interview',label:'AI Interview',icon:MessageCircle},
 {id:'tracker',label:'Job Tracker',icon:ClipboardCheck},{id:'letters',label:'Cover Letters',icon:Mail}
];
const starters:JobApplication[]=[
 {id:'a1111111-1111-4111-8111-111111111111',company:'Stripe (sample)',role:'Senior Product Designer',status:'Interview',link:'',appliedAt:'2026-11-02'},
 {id:'a2222222-2222-4222-8222-222222222222',company:'Google (sample)',role:'UX Designer',status:'Applied',link:'',appliedAt:'2026-10-28'}
];
const questions=[
 'Tell me about yourself and your professional background.',
 'Describe a challenging project and how you handled it.',
 'Why are you interested in this position?',
 'What is your greatest professional strength?',
 'How do you prioritize when multiple deadlines conflict?'
];
function loadDemo<T>(key:string,fallback:T):T {try{const s=localStorage.getItem(key);return s?JSON.parse(s) as T:fallback;}catch{return fallback;}}
function cap(s:string){return s.replace(/\b\w/g,c=>c.toUpperCase());}
function Field({label,value,onChange,placeholder,wide=false,rows=0}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;wide?:boolean;rows?:number}){
 return <label className={'field '+(wide?'wide':'')}><span>{label}</span>{rows?<textarea rows={rows} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>:<input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>}</label>;
}
function Status({value}:{value:ApplicationStatus}){return <span className={'status status-'+value.toLowerCase()}><span className="status-dot"/>{value}</span>;}
function ResumePreview({resume:r}:{resume:Resume}){
 return <article className="resume-paper" aria-label="Resume preview">
 <h2>{r.name||'Your Name'}</h2><p className="resume-role">{r.targetRole||'Your professional title'}</p>
 <p className="resume-contact">{[r.email,r.phone,r.location,r.portfolio].filter(Boolean).join('  •  ')||'Email  •  Phone  •  Location'}</p>
 <section><h3>Professional Summary</h3><p>{r.summary||'Write a short, results-focused introduction about your background and career goals.'}</p></section>
 <section><h3>Experience</h3>{r.experience.map(e=><div key={e.id} className="preview-item"><div className="preview-between"><strong>{e.role||'Position title'} · {e.company||'Company'}</strong><span>{e.dates}</span></div><p>{e.details||'Describe your responsibilities and achievements.'}</p></div>)}</section>
 <section><h3>Education</h3>{r.education.map(e=><div key={e.id} className="preview-between preview-item"><span><strong>{e.degree||'Degree'}</strong><br/>{e.school||'University or school'}</span><span>{e.dates}</span></div>)}</section>
 <section><h3>Skills</h3><p>{r.skills||'Add skills separated by commas.'}</p></section>
 </article>;
}
export default function Home(){
 const [section,setSection]=useState<Section>('dashboard');
 const [mobileNav,setMobileNav]=useState(false);
 const [resumes,setResumes]=useState<Resume[]>([sampleResume]);
 const [applications,setApplications]=useState<JobApplication[]>(starters);
 const [draft,setDraft]=useState<Resume>(sampleResume);
 const [selectedId,setSelectedId]=useState(sampleResume.id);
 const [user,setUser]=useState<User|null>(null);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [search,setSearch]=useState('');
 const [jobDescription,setJobDescription]=useState('');
 const [letterRole,setLetterRole]=useState('');
 const [letterCompany,setLetterCompany]=useState('');
 const [letterOutput,setLetterOutput]=useState('');
 const [answer,setAnswer]=useState('');
 const [questionIndex,setQuestionIndex]=useState(0);
 const [feedback,setFeedback]=useState('');
 const [busy,setBusy]=useState(false);
 const [email,setEmail]=useState('');
 const [otp,setOtp]=useState('');
 const [sentOtp,setSentOtp]=useState(false);
 const [showAuth,setShowAuth]=useState(false);
 const [newApp,setNewApp]=useState({company:'',role:'',status:'Applied' as ApplicationStatus,link:''});
 const sb=useMemo(()=>browserSupabase(),[]);
 const activeResume=resumes.find(r=>r.id===selectedId)||resumes[0]||draft;
 const results=atsScore(activeResume,jobDescription);
 const formattedName=user?.user_metadata?.full_name?.split(' ')[0]||user?.email?.split('@')[0]||'Alex';
 const isDemo=!user;
 const currentScore=atsScore(activeResume).score;
 const go=(s:Section)=>{setSection(s);setMobileNav(false);setError('');window.scrollTo({top:0,behavior:'smooth'});};
 const init=useCallback(async(u:User|null)=>{
  try{
   if(sb&&u){
    const [rr,aa]=await Promise.all([sb.from('resumes').select('content').eq('user_id',u.id).order('updated_at',{ascending:false}),sb.from('job_applications').select('content').eq('user_id',u.id).order('created_at',{ascending:false})]);
    if(rr.error)throw rr.error;if(aa.error)throw aa.error;
    const r=(rr.data||[]).map(x=>x.content as Resume);
    setResumes(r);setApplications((aa.data||[]).map(x=>x.content as JobApplication));
    if(r.length){setSelectedId(r[0].id);setDraft(r[0]);}else{const blank=emptyResume();setDraft(blank);setSelectedId(blank.id);}
   }else{
    const r=loadDemo('resumebuilder_resumes',[sampleResume]);const a=loadDemo('resumebuilder_apps',starters);
    setResumes(r);setApplications(a);if(r.length){setSelectedId(r[0].id);setDraft(r[0]);}
   }
  }catch(e){setError(e instanceof Error?e.message:'Unable to load saved data.');}
  finally{setReady(true);}
 },[sb]);
 useEffect(()=>{
  let active=true;
  if(!sb){void init(null);return;}
  void sb.auth.getUser().then(({data})=>{if(!active)return;setUser(data.user);void init(data.user);});
  const {data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION')return;setTimeout(()=>{if(!active)return;setUser(session?.user||null);void init(session?.user||null);},0);});
  return ()=>{active=false;subscription.unsubscribe();};
 },[sb,init]);
 useEffect(()=>{if(ready&&!user){localStorage.setItem('resumebuilder_resumes',JSON.stringify(resumes));localStorage.setItem('resumebuilder_apps',JSON.stringify(applications));}},[ready,user,resumes,applications]);
 const flash=(text:string)=>{setNotice(text);setError('');};
 async function saveResume(r:Resume){
  setError('');const item={...r,updatedAt:new Date().toISOString()};
  if(sb&&user){const {error:e}=await sb.from('resumes').upsert({id:item.id,user_id:user.id,title:item.title,content:item,updated_at:item.updatedAt});if(e){setError(e.message);return;}}
  setResumes(prev=>[item,...prev.filter(x=>x.id!==item.id)]);setDraft(item);setSelectedId(item.id);flash('Resume saved successfully.');
 }
 async function removeResume(id:string){
  if(!window.confirm('Delete this resume?'))return;
  if(sb&&user){const {error:e}=await sb.from('resumes').delete().eq('id',id).eq('user_id',user.id);if(e){setError(e.message);return;}}
  const remaining=resumes.filter(x=>x.id!==id);setResumes(remaining);if(selectedId===id){const other=remaining[0]||emptyResume();setSelectedId(other.id);setDraft(other);}flash('Resume deleted.');
 }
 async function saveApp(a:JobApplication){
  if(sb&&user){const {error:e}=await sb.from('job_applications').upsert({id:a.id,user_id:user.id,content:a});if(e){setError(e.message);return;}}
  setApplications(prev=>[a,...prev.filter(x=>x.id!==a.id)]);flash('Application updated.');
 }
 async function removeApp(id:string){
  if(sb&&user){const {error:e}=await sb.from('job_applications').delete().eq('id',id).eq('user_id',user.id);if(e){setError(e.message);return;}}
  setApplications(prev=>prev.filter(x=>x.id!==id));flash('Application removed.');
 }
 function startNew(){const r=emptyResume();setDraft(r);setSelectedId(r.id);go('builder');}
 function editResume(r:Resume){setDraft(structuredClone(r));setSelectedId(r.id);go('builder');}
 function setDraftKey<K extends keyof Resume>(k:K,v:Resume[K]){setDraft(old=>({...old,[k]:v}));}
 async function requestAI(task:AiTask,context:string){
  setError('');setNotice('');setBusy(true);
  try{const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task,context})});const data=await res.json();if(!res.ok)throw Error(data.error||'AI unavailable.');return data.output as string;}
  catch(e){setError(e instanceof Error?e.message:'AI unavailable.');return null;}
  finally{setBusy(false);}
 }
 async function loginGoogle(){
  if(!sb){setError('Create and connect your new Supabase project to enable login.');return;}
  const {error:e}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/auth/callback'}});
  if(e)setError(e.message);
 }
 async function sendEmailOtp(){
  if(!sb){setError('Connect Supabase to enable email OTP.');return;}
  const {error:e}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true}});
  if(e)setError(e.message);else{setSentOtp(true);flash('Check your email for the verification code.');}
 }
 async function verifyEmailOtp(){
  if(!sb)return;const {error:e}=await sb.auth.verifyOtp({email,token:otp,type:'email'});
  if(e)setError(e.message);else{setShowAuth(false);flash('You are signed in.');}
 }
 async function signOut(){if(sb){const {error:e}=await sb.auth.signOut();if(e){setError(e.message);return;}}setUser(null);await init(null);flash('Signed out.');}
 const title:Record<Section,string>={dashboard:'Dashboard',builder:'Resume Builder',resumes:'My Resumes',ats:'ATS Resume Scanner',jobs:'Job Recommendations',interview:'Interview Practice',tracker:'Job Application Tracker',letters:'Cover Letter Generator',settings:'Settings'};
 const filteredResumes=resumes.filter(r=>(r.title+' '+r.targetRole).toLowerCase().includes(search.toLowerCase()));
 return <div className="app-shell">
  <aside className={'sidebar '+(mobileNav?'sidebar-open':'')}>
   <div className="brand"><span className="brand-icon"><FileText size={18}/></span><span>Resume<span className="brand-bold">Builder</span><span className="brand-dot">.</span></span><button className="mobile-close icon-button" onClick={()=>setMobileNav(false)} aria-label="Close menu"><X size={19}/></button></div>
   <button className="create-button" onClick={startNew}><Plus size={17}/> Create New Resume <ArrowRight size={16}/></button>
   <div className="side-label">WORKSPACE</div>
   <nav className="side-nav" aria-label="Main navigation">{nav.map(n=>{const Icon=n.icon;return <button key={n.id} onClick={()=>go(n.id)} className={section===n.id?'nav-active':''}><Icon size={17}/><span>{n.label}</span>{section===n.id&&<span className="active-marker"/>}</button>;})}</nav>
   <div className="side-label recent-label">RECENT DOCUMENTS</div>
   <div className="sidebar-docs">{resumes.slice(0,3).map(r=><button onClick={()=>editResume(r)} key={r.id}><FileText size={14}/><span>{r.title}</span></button>)}{resumes.length===0&&<p>No saved resumes yet</p>}</div>
   <div className="sidebar-bottom">
    <div className="sidebar-tip"><span><Sparkles size={18}/></span><strong>Career toolkit</strong><p>Your next opportunity starts with a stronger resume.</p></div>
    <button className="account-button" onClick={()=>{go('settings');}}><span className="avatar">{formattedName.slice(0,1).toUpperCase()}</span><span className="account-text"><strong>{user?.user_metadata?.full_name|| (isDemo?'Alex Rivera (Demo)':user?.email)}</strong><small>{isDemo?'Demo workspace':'Personal account'}</small></span><Settings2 size={17}/></button>
   </div>
  </aside>
  <div className="main-area">
   <header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)} aria-label="Open menu"><Menu/></button>
    <div className="breadcrumbs">Workspace <ChevronRight size={15}/><strong>{title[section]}</strong></div>
    <div className="top-actions"><div className="searchbox"><Search size={17}/><input placeholder="Search resumes..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')go('resumes');}}/></div><span className="top-separator"/><button onClick={()=>setShowAuth(true)} className="profile-chip"><span className="avatar mini">{formattedName.slice(0,1).toUpperCase()}</span><span>{user?'My Account':'Demo Mode'}</span><ChevronDown size={14}/></button></div>
   </header>
   <main className="content">
    {!ready&&<div className="inline-info"><LoaderCircle className="spin" size={18}/> Loading workspace…</div>}
    {!!error&&<div role="alert" className="alert alert-error">{error}<button onClick={()=>setError('')} aria-label="Dismiss"><X size={16}/></button></div>}
    {!!notice&&<div role="status" className="alert alert-success"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
    {isDemo&&ready&&<div className="demo-notice"><Sparkles size={16}/><span>Preview mode: sample content and local browser storage. Connect a new Supabase project for private account storage and AI features.</span><button onClick={()=>{setShowAuth(true);}}>Connect account <ArrowRight size={14}/></button></div>}
    {section==='dashboard'&&<><div className="page-heading"><div><div className="eyebrow"><span className="green-dot"/> YOUR CAREER WORKSPACE</div><h1>Welcome back, {cap(formattedName)} <span className="wave">✳</span></h1><p>Here’s an overview of your career assets and job search progress.</p></div><button className="outline-button" onClick={()=>go('resumes')}><FolderOpen size={17}/> View all resumes</button></div>
     <div className="overview-grid">
      <div className="panel scan-panel"><div className="panel-title">Scan Your Resume</div><p>Make your resume stand out with a smarter ATS analysis.</p><button className="green-button" onClick={()=>go('ats')}><Zap size={16}/> Scan with AI <ArrowRight size={16}/></button><div className="scan-illustration"><span className="scan-file"><FileText size={34}/><i/></span><span className="magnifier"><Search size={28}/></span></div></div>
      <div className="panel score-panel"><div className="panel-kicker"><Target size={17}/> Profile Score</div><div className="gauge" style={{'--score':currentScore+'%'} as React.CSSProperties}><div className="gauge-center"><strong>{currentScore}<small>%</small></strong><span>Resume readiness</span></div></div><p>Based on profile completeness</p></div>
      <div className="panel pipeline-panel"><div className="panel-kicker"><BriefcaseBusiness size={17}/> Job Pipeline <button onClick={()=>go('tracker')}>View <ChevronRight size={13}/></button></div><div className="pipeline-values"><div><span>Applied</span><strong>{applications.length.toString().padStart(2,'0')}</strong></div><div><span>Interviews</span><strong>{applications.filter(a=>a.status==='Interview').length.toString().padStart(2,'0')}</strong></div></div><div className="bar-chart" aria-hidden="true">{[31,48,40,61,43,78,35].map((h,i)=><span key={i} style={{height:h+'%',background:i===5?'#343b38':undefined}}/>)}</div></div>
     </div>
     <div className="section-line"><h2>Tools & Features</h2><p>Everything you need to take the next step</p></div>
     <div className="tool-grid">
      {[{id:'builder' as Section,icon:WandSparkles,name:'AI Resume Builder',desc:'Build and improve your resume with helpful AI suggestions.',color:'mint'},
      {id:'ats' as Section,icon:FileCheck2,name:'ATS Checker',desc:'Check formatting, keywords, and resume completeness.',color:'violet'},
      {id:'jobs' as Section,icon:BriefcaseBusiness,name:'Job Matching',desc:'Find sample roles that fit your skills and experience.',color:'blue'},
      {id:'interview' as Section,icon:MessageCircle,name:'Interview Practice',desc:'Practice popular questions and get personalized feedback.',color:'orange'}].map(t=>{const Icon=t.icon;return <button className="tool-card" key={t.id} onClick={()=>go(t.id)}><span className={'tool-icon '+t.color}><Icon size={20}/></span><span className="tool-arrow"><ArrowRight size={18}/></span><strong>{t.name}</strong><p>{t.desc}</p></button>;})}
     </div>
     <div className="bottom-grid"><div className="panel recent-panel"><div className="panel-head"><div><FolderOpen size={18}/><strong>Recent Documents</strong></div><button onClick={()=>go('resumes')}>View all <ArrowRight size={14}/></button></div>
      {filteredResumes.length?filteredResumes.slice(0,3).map(r=><button className="doc-row" key={r.id} onClick={()=>editResume(r)}><span className="doc-icon"><FileText size={19}/></span><span className="doc-name"><strong>{r.title}</strong><small>Resume · Updated {new Date(r.updatedAt).toLocaleDateString()}</small></span><span className="doc-score"><i/> ATS: {atsScore(r).score}</span><ChevronRight size={16}/></button>):<div className="empty-small">No resumes match your search.</div>}
     </div><div className="panel next-panel"><div className="panel-head"><div><Flag size={18}/><strong>Next Steps</strong></div></div><div className="todo"><CheckCircle2 size={18}/><span><strong>Complete your resume</strong><small>Fill in your skills and experience</small></span></div><div className="todo"><span className="todo-circle"/><span><strong>Find matching roles</strong><small>Explore sample recommendations</small></span></div><div className="todo"><span className="todo-circle"/><span><strong>Practice interview</strong><small>Prepare for common questions</small></span></div><button className="text-link" onClick={()=>go('interview')}><Plus size={15}/> Start practicing</button></div></div>
     </>}
    {section==='builder'&&<><div className="page-heading"><div><div className="eyebrow">CREATE & CUSTOMIZE</div><h1>Resume Builder <span className="heading-accent">✦</span></h1><p>Edit the details below and preview your resume in real time.</p></div><button className="outline-button" onClick={()=>go('resumes')}><ArrowLeft size={16}/> All resumes</button></div>
     <div className="builder-layout"><div className="panel form-panel"><div className="panel-head"><div><FileText size={18}/><strong>Resume Details</strong></div><span className="muted-badge">Editable</span></div>
      <div className="form-fields"><Field label="Document name" value={draft.title} onChange={v=>setDraftKey('title',v)} wide placeholder="e.g. Product Designer – Google"/><div className="form-subheading"><UserRound size={17}/> Personal Information</div>
       <Field label="Full name" value={draft.name} onChange={v=>setDraftKey('name',v)} placeholder="Your full name"/><Field label="Target role" value={draft.targetRole} onChange={v=>setDraftKey('targetRole',v)} placeholder="e.g. UX Designer"/>
       <Field label="Email address" value={draft.email} onChange={v=>setDraftKey('email',v)} placeholder="hello@example.com"/><Field label="Phone" value={draft.phone} onChange={v=>setDraftKey('phone',v)} placeholder="+63 900 000 0000"/>
       <Field label="Location" value={draft.location} onChange={v=>setDraftKey('location',v)} placeholder="Quezon City, Philippines"/><Field label="Portfolio / LinkedIn" value={draft.portfolio} onChange={v=>setDraftKey('portfolio',v)} placeholder="https://..."/>
       <div className="form-subheading"><BookOpen size={17}/> Professional Summary</div><Field label="About you" value={draft.summary} onChange={v=>setDraftKey('summary',v)} wide rows={5} placeholder="Describe your experience and strengths."/>
       <div className="field wide"><button className="ai-inline" disabled={busy} onClick={async()=>{const text=await requestAI('summary',JSON.stringify({targetRole:draft.targetRole,summary:draft.summary,experience:draft.experience,skills:draft.skills}));if(text)setDraftKey('summary',text);}}><Sparkles size={15}/> {busy?'Generating...':'Improve summary with AI'}</button><small>Requires connected Supabase login and an AI API key.</small></div>
       <div className="form-subheading"><Zap size={17}/> Skills</div><Field label="Skills (comma-separated)" value={draft.skills} onChange={v=>setDraftKey('skills',v)} wide rows={3} placeholder="JavaScript, React, Problem Solving..."/>
       <div className="form-subheading"><BriefcaseBusiness size={17}/> Experience</div>
       {draft.experience.map((e,i)=><div className="repeat-form" key={e.id}><div className="repeat-title">Experience {i+1}<button title="Remove experience" onClick={()=>setDraftKey('experience',draft.experience.filter(x=>x.id!==e.id))}><Trash2 size={15}/></button></div>
        <Field label="Job title" value={e.role} onChange={v=>setDraftKey('experience',draft.experience.map(x=>x.id===e.id?{...x,role:v}:x))}/><Field label="Company" value={e.company} onChange={v=>setDraftKey('experience',draft.experience.map(x=>x.id===e.id?{...x,company:v}:x))}/><Field label="Dates" value={e.dates} onChange={v=>setDraftKey('experience',draft.experience.map(x=>x.id===e.id?{...x,dates:v}:x))} wide placeholder="2023 – Present"/><Field label="Achievements" value={e.details} onChange={v=>setDraftKey('experience',draft.experience.map(x=>x.id===e.id?{...x,details:v}:x))} wide rows={3}/></div>)}
       <div className="field wide"><button className="outline-button compact" onClick={()=>setDraftKey('experience',[...draft.experience,{id:uid(),role:'',company:'',dates:'',details:''}])}><Plus size={15}/> Add experience</button></div>
       <div className="form-subheading"><GraduationCap size={17}/> Education</div>
       {draft.education.map((e,i)=><div className="repeat-form" key={e.id}><div className="repeat-title">Education {i+1}<button title="Remove education" onClick={()=>setDraftKey('education',draft.education.filter(x=>x.id!==e.id))}><Trash2 size={15}/></button></div><Field label="School" value={e.school} onChange={v=>setDraftKey('education',draft.education.map(x=>x.id===e.id?{...x,school:v}:x))}/><Field label="Degree" value={e.degree} onChange={v=>setDraftKey('education',draft.education.map(x=>x.id===e.id?{...x,degree:v}:x))}/><Field label="Dates" value={e.dates} onChange={v=>setDraftKey('education',draft.education.map(x=>x.id===e.id?{...x,dates:v}:x))} wide/></div>)}
       <div className="field wide"><button className="outline-button compact" onClick={()=>setDraftKey('education',[...draft.education,{id:uid(),school:'',degree:'',dates:''}])}><Plus size={15}/> Add education</button></div>
      </div>
      <div className="form-bottom"><button className="black-button" onClick={()=>void saveResume(draft)}><Check size={17}/> Save resume</button><button className="outline-button" onClick={()=>window.print()}><ArrowDownToLine size={17}/> Print / Save PDF</button></div>
     </div><div className="preview-column"><div className="preview-top"><strong>Live Preview</strong><span className="muted-badge"><span className="green-dot"/> ATS Friendly</span></div><ResumePreview resume={draft}/><p className="preview-hint">Use “Print / Save PDF” and choose “Save as PDF” in your browser.</p></div></div>
    </>}
    {section==='resumes'&&<><div className="page-heading"><div><div className="eyebrow">YOUR DOCUMENTS</div><h1>My Resumes</h1><p>Create versions tailored to different roles and companies.</p></div><button className="black-button" onClick={startNew}><Plus size={16}/> New Resume</button></div>
     <div className="resumes-grid">{filteredResumes.map(r=><article className="panel resume-card" key={r.id}><div className="mini-paper"><span/><span/><span/><span/></div><div className="resume-card-body"><div><h3>{r.title}</h3><p>{r.targetRole||'No target role specified'}</p></div><span className="muted-badge"><span className="green-dot"/> {atsScore(r).score}% score</span></div><div className="resume-card-footer"><small>Edited {new Date(r.updatedAt).toLocaleDateString()}</small><div><button onClick={()=>void removeResume(r.id)} aria-label={'Delete '+r.title}><Trash2 size={16}/></button><button onClick={()=>editResume(r)} className="small-dark">Edit <ArrowRight size={15}/></button></div></div></article>)}
      <button className="new-resume-card" onClick={startNew}><span><Plus size={23}/></span><strong>Create a new resume</strong><small>Start with a blank template</small></button></div>
     {filteredResumes.length===0&&<p className="muted-copy">No saved resumes match your search.</p>}
    </>}
    {section==='ats'&&<><div className="page-heading"><div><div className="eyebrow">SMART RESUME ANALYSIS</div><h1>ATS Resume Checker</h1><p>Understand your resume’s completeness and its keywords relative to a job description.</p></div></div><div className="two-column"><div className="panel padded"><h2 className="card-heading"><FileCheck2 size={20}/> Scan your resume</h2><label className="field"><span>Select resume</span><select value={activeResume.id} onChange={e=>setSelectedId(e.target.value)}>{resumes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}{resumes.length===0&&<option value={draft.id}>Unsaved resume</option>}</select></label><label className="field"><span>Paste job description (optional)</span><textarea rows={13} value={jobDescription} onChange={e=>setJobDescription(e.target.value)} placeholder="Paste a job description to compare relevant keywords against your resume..."/></label><div className="inline-info"><Lightbulb size={17}/> This is a heuristic readiness score, not an official ATS pass probability.</div><button className="black-button" onClick={()=>flash('Resume analysis updated.')}>Analyze Resume <ArrowRight size={16}/></button></div>
     <div className="panel padded"><h2 className="card-heading"><BarChart3 size={20}/> Your Analysis</h2><div className="ats-summary"><div className="ats-circle" style={{'--score':results.score+'%'} as React.CSSProperties}><strong>{results.score}<small>/100</small></strong></div><div><h3>{results.score>=80?'Looking good!':results.score>=55?'Good progress':'Room to improve'}</h3><p>Estimated content and keyword readiness based on your entered information.</p></div></div><h3 className="minor-title">Recommendations</h3><div className="tips">{results.suggestions.map((s,i)=><div key={i}><CheckCircle2 size={18}/><p>{s}</p></div>)}</div>{jobDescription&&<><h3 className="minor-title">Keywords found</h3><div className="tag-list">{results.matched.length?results.matched.map(x=><span className="tag tag-green" key={x}>{x}</span>):<small>No matching terms yet.</small>}</div><h3 className="minor-title">Potential missing keywords</h3><div className="tag-list">{results.missing.map(x=><span className="tag" key={x}>{x}</span>)}</div></>}<button className="outline-button" onClick={()=>editResume(activeResume)}>Improve Resume <ArrowRight size={16}/></button></div></div>
    </>}
    {section==='jobs'&&<><div className="page-heading"><div><div className="eyebrow">EXPLORE OPPORTUNITIES</div><h1>Job Recommendations</h1><p>Compare your resume skills to example roles. These are illustrative matches, not live vacancies.</p></div><button className="outline-button" onClick={()=>go('tracker')}><BriefcaseBusiness size={16}/> My applications</button></div><div className="jobs-top panel"><div><Target size={18}/><strong>Matching with: {activeResume.title}</strong></div><span>Skills-based estimates · Sample job cards</span></div><div className="job-list">{[...sampleJobs].sort((a,b)=>jobFit(activeResume,b)-jobFit(activeResume,a)).map(j=><div className="panel job-card" key={j.id}><div className="job-company"><span className="company-mark">{j.company.slice(0,1)}</span><div><h3>{j.role}</h3><p>{j.company} · {j.location} · {j.type}</p></div></div><div className="tag-list">{j.keywords.slice(0,4).map(k=><span className="tag" key={k}>{cap(k)}</span>)}</div><div className="job-card-right"><span className="job-match">{jobFit(activeResume,j)}% skill match</span><button className="outline-button compact" onClick={()=>void saveApp({id:uid(),company:j.company+' (sample)',role:j.role,status:'Applied',link:'',appliedAt:new Date().toISOString().slice(0,10)})}>Track example <Plus size={15}/></button></div></div>)}</div><p className="muted-copy">No employers are connected. Integrate an authorized jobs API for actual openings.</p></>}
    {section==='interview'&&<><div className="page-heading"><div><div className="eyebrow">GET INTERVIEW READY</div><h1>AI Interview Practice</h1><p>Prepare clear, confident responses to common interview questions.</p></div><span className="muted-badge">Practice session {questionIndex+1} of {questions.length}</span></div><div className="two-column"><div className="panel padded"><div className="interview-kicker"><span><MessageCircle size={19}/></span> QUESTION {questionIndex+1} OF {questions.length}</div><h2 className="interview-question">{questions[questionIndex]}</h2><p className="muted-copy">Target role: {activeResume.targetRole||'Your chosen role'}</p><label className="field"><span>Your answer</span><textarea rows={10} placeholder="Type your answer here. Mention real examples from your experience..." value={answer} onChange={e=>setAnswer(e.target.value)}/></label><div className="form-bottom"><button className="black-button" disabled={busy||answer.length<15} onClick={async()=>{const text=await requestAI('interview',JSON.stringify({role:activeResume.targetRole,question:questions[questionIndex],answer}));if(text)setFeedback(text);}}><Sparkles size={16}/>{busy?'Reviewing...':'Get AI Feedback'}</button><button className="outline-button" onClick={()=>{setQuestionIndex((questionIndex+1)%questions.length);setAnswer('');setFeedback('');}}>Next Question <ArrowRight size={16}/></button></div></div><div className="panel padded"><h2 className="card-heading"><Lightbulb size={20}/> Interview Coach</h2>{feedback?<div className="output-text">{feedback}</div>:<div className="empty-coach"><span><Sparkles size={28}/></span><h3>Your feedback will appear here</h3><p>Write an answer and select “Get AI Feedback” to receive strengths and suggestions.</p><p className="muted-copy">AI feedback requires an account and a configured API key.</p></div>}</div></div></>}
    {section==='tracker'&&<><div className="page-heading"><div><div className="eyebrow">STAY ORGANIZED</div><h1>Job Application Tracker</h1><p>Organize positions, application stages, and next steps.</p></div></div><div className="stats-row">{(['Applied','Interview','Offer','Rejected'] as ApplicationStatus[]).map(status=><div className="panel mini-stat" key={status}><span>{status}</span><strong>{applications.filter(x=>x.status===status).length}</strong></div>)}</div><div className="panel padded"><h2 className="card-heading"><Plus size={18}/> Add an Application</h2><div className="application-form"><Field label="Company" value={newApp.company} onChange={v=>setNewApp({...newApp,company:v})} placeholder="Company name"/><Field label="Job title" value={newApp.role} onChange={v=>setNewApp({...newApp,role:v})} placeholder="Position"/><label className="field"><span>Stage</span><select value={newApp.status} onChange={e=>setNewApp({...newApp,status:e.target.value as ApplicationStatus})}>{(['Applied','Interview','Offer','Rejected'] as ApplicationStatus[]).map(x=><option key={x}>{x}</option>)}</select></label><Field label="Job URL (optional)" value={newApp.link} onChange={v=>setNewApp({...newApp,link:v})} placeholder="https://..."/><button className="black-button" disabled={!newApp.company.trim()||!newApp.role.trim()} onClick={()=>{void saveApp({...newApp,id:uid(),appliedAt:new Date().toISOString().slice(0,10)});setNewApp({company:'',role:'',status:'Applied',link:''});}}><Plus size={16}/> Add application</button></div></div><div className="panel tracker-table"><div className="panel-head"><div><ClipboardCheck size={18}/><strong>All Applications</strong></div><span className="muted-badge">{applications.length} entries</span></div><div className="table-scroll"><table><thead><tr><th>COMPANY</th><th>POSITION</th><th>DATE ADDED</th><th>STATUS</th><th></th></tr></thead><tbody>{applications.map(a=><tr key={a.id}><td><strong>{a.company}</strong></td><td>{a.link&&/^https?:\/\//i.test(a.link)?<a href={a.link} target="_blank" rel="noopener noreferrer">{a.role}</a>:a.role}</td><td>{a.appliedAt}</td><td><select className="stage-select" value={a.status} onChange={e=>void saveApp({...a,status:e.target.value as ApplicationStatus})}>{(['Applied','Interview','Offer','Rejected'] as ApplicationStatus[]).map(x=><option key={x}>{x}</option>)}</select></td><td><button className="icon-button" onClick={()=>void removeApp(a.id)} aria-label={'Remove '+a.company}><Trash2 size={17}/></button></td></tr>)}</tbody></table>{applications.length===0&&<p className="empty-small">No applications yet. Add one above to get started.</p>}</div></div></>}
    {section==='letters'&&<><div className="page-heading"><div><div className="eyebrow">WRITE WITH CONFIDENCE</div><h1>Cover Letter Generator</h1><p>Create a personalized letter from your existing resume and target role.</p></div></div><div className="two-column"><div className="panel padded"><h2 className="card-heading"><Mail size={19}/> Job Details</h2><Field label="Target role" value={letterRole} onChange={setLetterRole} placeholder="e.g. Frontend Developer"/><Field label="Company name" value={letterCompany} onChange={setLetterCompany} placeholder="e.g. Acme Inc."/><label className="field"><span>Your resume</span><select value={activeResume.id} onChange={e=>setSelectedId(e.target.value)}>{resumes.map(r=><option value={r.id} key={r.id}>{r.title}</option>)}{resumes.length===0&&<option value={draft.id}>{draft.title}</option>}</select></label><button className="black-button" disabled={!letterRole.trim()||busy} onClick={async()=>{const text=await requestAI('coverletter',JSON.stringify({role:letterRole,company:letterCompany,resume:activeResume}));if(text)setLetterOutput(text);}}><Sparkles size={17}/>{busy?'Writing...':'Generate Cover Letter'}</button></div><div className="panel padded"><div className="panel-head"><div><FileText size={18}/><strong>Generated Letter</strong></div>{letterOutput&&<button onClick={()=>{void navigator.clipboard.writeText(letterOutput);flash('Letter copied.');}}><Copy size={16}/> Copy</button>}</div>{letterOutput?<div className="output-text">{letterOutput}</div>:<div className="empty-coach"><FileText size={28}/><h3>Draft preview</h3><p>Your generated cover letter will appear here when AI is configured and you’re signed in.</p></div>}</div></div></>}
    {section==='settings'&&<><div className="page-heading"><div><div className="eyebrow">PREFERENCES</div><h1>Account & Settings</h1><p>Manage your session and connect your private workspace.</p></div></div><div className="panel padded settings-panel"><h2 className="card-heading"><UserRound size={19}/> Your Account</h2><div className="settings-user"><span className="avatar large">{formattedName.slice(0,1).toUpperCase()}</span><div><strong>{user?.email||'Demo workspace'}</strong><p>{user?'Your data is saved to your own Supabase account.':'Demo documents are stored only in this browser.'}</p></div></div><div className="settings-actions">{user?<button className="outline-button" onClick={()=>void signOut()}><LogOut size={17}/> Sign out</button>:<button className="black-button" onClick={()=>setShowAuth(true)}><UserRound size={17}/> Sign in / Register</button>}</div><hr/><h2 className="card-heading"><ShieldCheck size={19}/> Integration Status</h2><div className="setting-item"><span>Supabase</span><strong>{configured?'Configured':'Not connected'}</strong></div><div className="setting-item"><span>AI provider</span><strong>Configured via server environment variables</strong></div><p className="muted-copy">Create a brand-new Supabase project for ResumeBuilder, run the SQL schema, enable Google OAuth / Email OTP, then set environment variables. Never use your SKVASRA database or publish server-side AI keys.</p></div></>}
   </main>
  </div>
  {showAuth&&<div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAuth(false);}}><div className="auth-modal" role="dialog" aria-modal="true" aria-label="Sign in"><button className="modal-close icon-button" onClick={()=>setShowAuth(false)}><X size={19}/></button><span className="brand-icon"><FileText size={21}/></span><h2>Welcome to ResumeBuilder</h2><p>Sign in to keep resumes private and unlock AI-powered tools.</p>{!configured&&<div className="inline-info">No Supabase project is connected yet. You can continue using the demo.</div>}
    {user?<><div className="auth-current">Signed in as {user.email}</div><button className="outline-button full" onClick={()=>void signOut()}><LogOut size={16}/> Sign out</button></>:<><button className="google-button" disabled={!configured} onClick={()=>void loginGoogle()}><span className="google-g">G</span> Continue with Google</button><div className="or-line"><span>or continue with email</span></div><label className="field"><span>Email address</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>{sentOtp&&<label className="field"><span>6-digit email OTP</span><input inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Enter the code from email"/></label>}<button className="black-button full" disabled={!configured||!email.includes('@')} onClick={()=>void (sentOtp?verifyEmailOtp():sendEmailOtp())}>{sentOtp?'Verify code':'Send email code'} <ArrowRight size={16}/></button><small className="auth-note">For code-based OTP, customize the Supabase email template to include the verification token.</small></>}
    <button className="demo-link" onClick={()=>setShowAuth(false)}>Continue in demo mode</button>
   </div></div>}
  </div>;
}
