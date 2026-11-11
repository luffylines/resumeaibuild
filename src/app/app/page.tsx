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
import ResumeWizard from '@/components/resume-wizard';

type Section='dashboard'|'builder'|'resumes'|'ats'|'jobs'|'interview'|'tracker'|'letters'|'templates'|'settings';
type AiTask='summary'|'interview'|'coverletter'|'resume';
const nav:{id:Section;label:string;icon:typeof LayoutDashboard}[]=[
 {id:'dashboard',label:'Dashboard',icon:LayoutDashboard},{id:'builder',label:'Resume Builder',icon:FilePlus2},
 {id:'resumes',label:'My Resumes',icon:FolderOpen},{id:'ats',label:'ATS Checker',icon:Target},
 {id:'jobs',label:'Job Matches',icon:BriefcaseBusiness},{id:'interview',label:'AI Interview',icon:MessageCircle},
 {id:'tracker',label:'Job Tracker',icon:ClipboardCheck},{id:'letters',label:'Cover Letters',icon:Mail},{id:'templates',label:'Templates',icon:BookOpen}
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
 return <article className={'resume-paper resume-template-'+(r.template||'modern')} aria-label="Resume preview">
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
 const [jobsData,setJobsData]=useState(sampleJobs);
 const [draft,setDraft]=useState<Resume>(sampleResume);
 const [selectedId,setSelectedId]=useState(sampleResume.id);
 const [user,setUser]=useState<User|null>(null);
 const [isAdmin,setIsAdmin]=useState(false);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [search,setSearch]=useState('');
 const [jobDescription,setJobDescription]=useState('');
 const [letterRole,setLetterRole]=useState('');
 const [letterCompany,setLetterCompany]=useState('');
 const [letterOutput,setLetterOutput]=useState('');
 const [generationPrompt,setGenerationPrompt]=useState('');
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
 const formattedName=user?.user_metadata?.full_name?.split(' ')[0]||user?.email?.split('@')[0]||'Christian';
 const isDemo=!user;
 const currentScore=atsScore(activeResume).score;
 const go=(s:Section)=>{setSection(s);setMobileNav(false);setError('');window.scrollTo({top:0,behavior:'smooth'});};
 const init=useCallback(async(u:User|null)=>{
  try{
   if(sb&&u){
    const [rr,aa,jj]=await Promise.all([(sb as any).from('resumes').select('content').eq('user_id',u.id).order('updated_at',{ascending:false}),(sb as any).from('job_applications').select('content').eq('user_id',u.id).order('created_at',{ascending:false}),(sb as any).from('job_posts').select('id,role,company,location,type,keywords').eq('is_active',true)]);setJobsData(jj.error?[]:jj.data||[]);const role=await (sb as any).from('admin_users').select('user_id').eq('user_id',u.id).maybeSingle();setIsAdmin(!!role.data);
    if(rr.error)throw rr.error;if(aa.error)throw aa.error;
    const r=(rr.data||[]).map((x:{content:Resume})=>x.content);
    setResumes(r);setApplications((aa.data||[]).map((x:{content:JobApplication})=>x.content));
    if(r.length){setSelectedId(r[0].id);setDraft(r[0]);}else{const blank=emptyResume();setDraft(blank);setSelectedId(blank.id);}
   }else{
    const r=loadDemo('resumebuilder_resumes',[sampleResume]);const a=loadDemo('resumebuilder_apps',starters);
    setResumes(r);setApplications(a);const adminPreview=loadDemo<{jobs:(typeof sampleJobs[number]&{is_active:boolean})[]}|null>('resume_admin_preview',null);setJobsData(adminPreview?.jobs?adminPreview.jobs.filter(j=>j.is_active):sampleJobs);setIsAdmin(false);if(r.length){setSelectedId(r[0].id);setDraft(r[0]);}
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
  if(sb&&user){const {error:e}=await (sb as any).from('resumes').upsert({id:item.id,user_id:user.id,title:item.title,content:item,updated_at:item.updatedAt});if(e){setError(e.message);return;}}
  setResumes(prev=>[item,...prev.filter(x=>x.id!==item.id)]);setDraft(item);setSelectedId(item.id);flash('Resume saved successfully.');
 }
 async function removeResume(id:string){
  if(!window.confirm('Delete this resume?'))return;
  if(sb&&user){const {error:e}=await (sb as any).from('resumes').delete().eq('id',id).eq('user_id',user.id);if(e){setError(e.message);return;}}
  const remaining=resumes.filter(x=>x.id!==id);setResumes(remaining);if(selectedId===id){const other=remaining[0]||emptyResume();setSelectedId(other.id);setDraft(other);}flash('Resume deleted.');
 }
 async function saveApp(a:JobApplication){
  if(sb&&user){const {error:e}=await (sb as any).from('job_applications').upsert({id:a.id,user_id:user.id,content:a});if(e){setError(e.message);return;}}
  setApplications(prev=>[a,...prev.filter(x=>x.id!==a.id)]);flash('Application updated.');
 }
 async function removeApp(id:string){
  if(sb&&user){const {error:e}=await (sb as any).from('job_applications').delete().eq('id',id).eq('user_id',user.id);if(e){setError(e.message);return;}}
  setApplications(prev=>prev.filter(x=>x.id!==id));flash('Application removed.');
 }
 function startNew(){const r=emptyResume();setDraft(r);setSelectedId(r.id);go('builder');}
 function editResume(r:Resume){setDraft(structuredClone(r));setSelectedId(r.id);go('builder');}
 function setDraftKey<K extends keyof Resume>(k:K,v:Resume[K]){setDraft(old=>({...old,[k]:v}));}
 async function logATS(){if(sb&&user){const {error:e}=await (sb as any).from('ats_scans').insert({id:uid(),user_id:user.id,resume_id:resumes.some(r=>r.id===activeResume.id)?activeResume.id:null,score:results.score});if(e){setError(e.message);return;}}flash('Resume analysis updated.');}
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
 const title:Record<Section,string>={dashboard:'Dashboard',builder:'Build Resume',resumes:'My Resumes',ats:'ATS Checker',jobs:'Job Matching',interview:'Interview Practice',tracker:'Job Tracker',letters:'Cover Letter',templates:'Templates',settings:'Settings'};
 const filteredResumes=resumes.filter(r=>(r.title+' '+r.targetRole).toLowerCase().includes(search.toLowerCase()));
 return <div className="app-shell resume-client-shell">
  <aside className={'sidebar '+(mobileNav?'sidebar-open':'')}>
   <div className="brand"><span className="brand-icon"><FileText size={18}/></span><span>Resume<span className="brand-bold">Builder</span><span className="brand-dot">.</span></span><button className="mobile-close icon-button" onClick={()=>setMobileNav(false)} aria-label="Close menu"><X size={19}/></button></div>
   <button className="create-button" onClick={startNew}><Plus size={17}/> Create New Resume <ArrowRight size={16}/></button>
   <div className="side-label">WORKSPACE</div>
   <nav className="side-nav" aria-label="Main navigation">{nav.map(n=>{const Icon=n.icon;return <button key={n.id} onClick={()=>go(n.id)} className={section===n.id?'nav-active':''}><Icon size={17}/><span>{n.label}</span>{section===n.id&&<span className="active-marker"/>}</button>;})}</nav>
   <div className="side-label recent-label">RECENT DOCUMENTS</div>
   <div className="sidebar-docs">{resumes.slice(0,3).map(r=><button onClick={()=>editResume(r)} key={r.id}><FileText size={14}/><span>{r.title}</span></button>)}{resumes.length===0&&<p>No saved resumes yet</p>}</div>
   <div className="sidebar-bottom">{isAdmin&&<a className="admin-account-link" href="/admin"><ShieldCheck size={16}/> Admin Dashboard <ArrowRight size={15}/></a>}
    <div className="sidebar-tip"><span><Sparkles size={18}/></span><strong>Career toolkit</strong><p>Your next opportunity starts with a stronger resume.</p></div>
    <button className="account-button" onClick={()=>{go('settings');}}><span className="avatar">{formattedName.slice(0,1).toUpperCase()}</span><span className="account-text"><strong>{user?.user_metadata?.full_name|| (isDemo?'Alex Rivera (Demo)':user?.email)}</strong><small>{isDemo?'Demo workspace':'Personal account'}</small></span><Settings2 size={17}/></button>
   </div>
  </aside>
  <div className="main-area">
   <header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)} aria-label="Open menu"><Menu/></button>
    <div className="breadcrumbs">Workspace <ChevronRight size={15}/><strong>{title[section]}</strong></div>
    <div className="top-actions"><div className="searchbox"><Search size={17}/><input placeholder="Search resumes..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')go('resumes');}}/></div><span className="top-separator"/><button onClick={()=>user?go('settings'):window.location.assign('/login')} className="profile-chip"><span className="avatar mini">{formattedName.slice(0,1).toUpperCase()}</span><span>{user?'My Account':'Demo Mode'}</span><ChevronDown size={14}/></button></div>
   </header>
   <main className="content">
    {!ready&&<div className="inline-info"><LoaderCircle className="spin" size={18}/> Loading workspace…</div>}
    {!!error&&<div role="alert" className="alert alert-error">{error}<button onClick={()=>setError('')} aria-label="Dismiss"><X size={16}/></button></div>}
    {!!notice&&<div role="status" className="alert alert-success"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
    {isDemo&&ready&&<div className="demo-notice"><Sparkles size={16}/><span>Preview mode: sample content and local browser storage. Connect a new Supabase project for private account storage and AI features.</span><button onClick={()=>window.location.assign('/signup')}>Connect account <ArrowRight size={14}/></button></div>}
    {section==='dashboard'&&<div className="client-dashboard"><div className="client-dashboard-heading"><div><h1>Welcome back, <span>{cap(formattedName)}!</span> 👋</h1><p>AI Resume Builder &amp; Job Matching</p><small>Automatic resume generation, ATS checking, interview practice, at job recommendations.</small></div><button className="purple-button" onClick={startNew}><Plus size={17}/> Create New Resume</button></div>
<div className="client-stat-grid">{[{label:'My Resumes',value:resumes.length,icon:FileText,go:'resumes' as Section},{label:'ATS Score (Latest)',value:currentScore+'%',icon:ShieldCheck,go:'ats' as Section},{label:'Job Matches',value:jobsData.length,icon:BriefcaseBusiness,go:'jobs' as Section},{label:'Applications',value:applications.length,icon:Mail,go:'tracker' as Section}].map(stat=>{const Icon=stat.icon;return <button key={stat.label} className="client-stat" onClick={()=>go(stat.go)}><span className="client-stat-icon"><Icon size={23}/></span><div><small>{stat.label}</small><strong>{stat.value}</strong></div></button>})}</div>
<div className="client-feature-row"><section className="client-purple-hero"><div><h2>Create a Professional<br/> Resume with AI ✨</h2><p>Build an ATS-friendly resume in minutes with the power of AI.</p><button onClick={startNew}>Create Resume <ArrowRight size={17}/></button></div><div className="client-resume-graphic"><div><span className="mock-avatar">{formattedName.slice(0,1)}</span><strong>{user?.user_metadata?.full_name||'Christian B. Aring'}</strong><small>IT Professional</small><i/><i/><i/><i/></div><span><CheckCircle2 size={15}/> ATS Ready</span></div></section><section className="client-progress"><h3>Your Progress</h3><div className="client-progress-ring" style={{'--progress':currentScore+'%'} as React.CSSProperties}><strong>{currentScore}%</strong></div><div className="client-check"><CheckCircle2/> Build a Resume</div><div className="client-check"><CheckCircle2/> Run ATS Check</div><div className="client-check"><span/> Practice Interview</div><div className="client-check"><span/> Apply for Jobs</div></section></div>
<div className="client-shortcuts"><h2>Quick Actions</h2><div>{([{id:'builder',label:'Build Resume',desc:'Generate with AI',icon:FileText},{id:'ats',label:'ATS Checker',desc:'Improve your score',icon:ShieldCheck},{id:'jobs',label:'Job Matching',desc:'Find relevant jobs',icon:BriefcaseBusiness},{id:'interview',label:'Interview Practice',desc:'AI mock interview',icon:MessageCircle},{id:'letters',label:'Cover Letter',desc:'Create in seconds',icon:Mail}] as const).map(a=>{const Icon=a.icon;return <button key={a.id} onClick={()=>go(a.id)}><span><Icon size={22}/></span><span><strong>{a.label}</strong><small>{a.desc}</small></span></button>})}</div></div>
<div className="client-bottom-row"><section className="panel"><div className="panel-head"><div><FolderOpen size={18}/><strong>Recent Resumes</strong></div><button onClick={()=>go('resumes')}>View all <ArrowRight size={14}/></button></div>{resumes.slice(0,3).map(r=><button className="doc-row" key={r.id} onClick={()=>editResume(r)}><span className="doc-icon"><FileText size={18}/></span><span className="doc-name"><strong>{r.title}</strong><small>Resume · Edited {new Date(r.updatedAt).toLocaleDateString()}</small></span><span className="doc-score">ATS: {atsScore(r).score}%</span></button>)}{!resumes.length&&<p className="empty-small">Create your first resume</p>}</section><section className="panel client-next-steps"><div className="panel-head"><div><Flag size={18}/><strong>Next Steps</strong></div></div><button onClick={()=>go('interview')}><CheckCircle2 size={18}/><span><strong>Prepare for interview</strong><small>Practice with AI based on your target role.</small></span></button><button onClick={()=>go('ats')}><Target size={18}/><span><strong>Optimize resume keywords</strong><small>Improve your ATS score (current: {currentScore}%).</small></span></button><button onClick={()=>go('jobs')}><BriefcaseBusiness size={18}/><span><strong>Apply to matched jobs</strong><small>{jobsData.length} {isDemo?'sample':'published'} opportunities.</small></span></button></section></div>
</div>}
{section==='builder'&&<ResumeWizard draft={draft} setDraft={setDraft} save={saveResume} runAI={requestAI} busy={busy} preview={<ResumePreview resume={draft}/>} onBack={()=>go('resumes')}/>}
{section==='templates'&&<><div className="page-heading"><div><div className="eyebrow">RESUME STYLES</div><h1>Templates</h1><p>Choose a resume style and customize it in the editor.</p></div></div><div className="template-library">{(['Modern','Professional','Minimal'] as const).map((name,i)=><button key={name} className="template-choice" onClick={()=>{setDraft(old=>({...old,template:name.toLowerCase() as Resume['template']}));go('builder');flash(name+' template selected. Save your resume after editing.');}}><div className={'template-preview template-'+name.toLowerCase()}><strong>{draft.name||'CHRISTIAN B. ARING'}</strong><span>{draft.targetRole||'IT Professional'}</span><i/><i/><i/><b>EXPERIENCE</b><i/><i/><b>SKILLS</b><i/><i/></div><div><strong>{name}</strong><span>{i===0?'Modern color accents':i===1?'Professional structure':'Minimal, clean layout'}</span></div><span className="purple-button">Use Template <ArrowRight size={15}/></span></button>)}</div></>}{section==='resumes'&&<><div className="page-heading"><div><div className="eyebrow">YOUR DOCUMENTS</div><h1>My Resumes</h1><p>Create versions tailored to different roles and companies.</p></div><button className="black-button" onClick={startNew}><Plus size={16}/> New Resume</button></div>
     <div className="resumes-grid">{filteredResumes.map(r=><article className="panel resume-card" key={r.id}><div className="mini-paper"><span/><span/><span/><span/></div><div className="resume-card-body"><div><h3>{r.title}</h3><p>{r.targetRole||'No target role specified'}</p></div><span className="muted-badge"><span className="green-dot"/> {atsScore(r).score}% score</span></div><div className="resume-card-footer"><small>Edited {new Date(r.updatedAt).toLocaleDateString()}</small><div><button onClick={()=>void removeResume(r.id)} aria-label={'Delete '+r.title}><Trash2 size={16}/></button><button onClick={()=>editResume(r)} className="small-dark">Edit <ArrowRight size={15}/></button></div></div></article>)}
      <button className="new-resume-card" onClick={startNew}><span><Plus size={23}/></span><strong>Create a new resume</strong><small>Start with a blank template</small></button></div>
     {filteredResumes.length===0&&<p className="muted-copy">No saved resumes match your search.</p>}
    </>}
    {section==='ats'&&<><div className="page-heading"><div><div className="eyebrow">SMART RESUME ANALYSIS</div><h1>ATS Resume Checker</h1><p>Understand your resume’s completeness and its keywords relative to a job description.</p></div></div><div className="two-column"><div className="panel padded"><h2 className="card-heading"><FileCheck2 size={20}/> Scan your resume</h2><label className="field"><span>Select resume</span><select value={activeResume.id} onChange={e=>setSelectedId(e.target.value)}>{resumes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}{resumes.length===0&&<option value={draft.id}>Unsaved resume</option>}</select></label><label className="field"><span>Paste job description (optional)</span><textarea rows={13} value={jobDescription} onChange={e=>setJobDescription(e.target.value)} placeholder="Paste a job description to compare relevant keywords against your resume..."/></label><div className="inline-info"><Lightbulb size={17}/> This is a heuristic readiness score, not an official ATS pass probability.</div><button className="black-button" onClick={()=>void logATS()}>Analyze Resume <ArrowRight size={16}/></button></div>
     <div className="panel padded"><h2 className="card-heading"><BarChart3 size={20}/> Your Analysis</h2><div className="ats-summary"><div className="ats-circle" style={{'--score':results.score+'%'} as React.CSSProperties}><strong>{results.score}<small>/100</small></strong></div><div><h3>{results.score>=80?'Looking good!':results.score>=55?'Good progress':'Room to improve'}</h3><p>Estimated content and keyword readiness based on your entered information.</p></div></div><h3 className="minor-title">Recommendations</h3><div className="tips">{results.suggestions.map((s,i)=><div key={i}><CheckCircle2 size={18}/><p>{s}</p></div>)}</div>{jobDescription&&<><h3 className="minor-title">Keywords found</h3><div className="tag-list">{results.matched.length?results.matched.map(x=><span className="tag tag-green" key={x}>{x}</span>):<small>No matching terms yet.</small>}</div><h3 className="minor-title">Potential missing keywords</h3><div className="tag-list">{results.missing.map(x=><span className="tag" key={x}>{x}</span>)}</div></>}<button className="outline-button" onClick={()=>editResume(activeResume)}>Improve Resume <ArrowRight size={16}/></button></div></div>
    </>}
    {section==='jobs'&&<><div className="page-heading"><div><div className="eyebrow">EXPLORE OPPORTUNITIES</div><h1>Job Recommendations</h1><p>Compare your skills with {isDemo?'sample roles':'published job listings'}.</p></div><button className="outline-button" onClick={()=>go('tracker')}><BriefcaseBusiness size={16}/> My applications</button></div><div className="jobs-top panel"><div><Target size={18}/><strong>Matching with: {activeResume.title}</strong></div><span>Skills-based estimates · {isDemo?'Sample roles':'Published jobs'}</span></div><div className="job-list">{jobsData.length===0&&<div className="panel padded">No job posts have been published yet.</div>}{[...jobsData].sort((a,b)=>jobFit(activeResume,b)-jobFit(activeResume,a)).map(j=><div className="panel job-card" key={j.id}><div className="job-company"><span className="company-mark">{j.company.slice(0,1)}</span><div><h3>{j.role}</h3><p>{j.company} · {j.location} · {j.type}</p></div></div><div className="tag-list">{j.keywords.slice(0,4).map(k=><span className="tag" key={k}>{cap(k)}</span>)}</div><div className="job-card-right"><span className="job-match">{jobFit(activeResume,j)}% skill match</span><button className="outline-button compact" onClick={()=>void saveApp({id:uid(),company:isDemo?j.company+' (sample)':j.company,role:j.role,status:'Applied',link:'',appliedAt:new Date().toISOString().slice(0,10)})}>Track job <Plus size={15}/></button></div></div>)}</div><p className="muted-copy">{isDemo?'These are samples, not live vacancies.':'Published jobs should be verified directly with the employer.'}</p></>}
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
