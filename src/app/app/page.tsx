'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {
 Activity,ArrowDownToLine,ArrowLeft,ArrowRight,BarChart3,BookOpen,BriefcaseBusiness,Check,CheckCircle2,LockKeyhole,
 ChevronDown,ChevronRight,ClipboardCheck,Copy,FileCheck2,FilePlus2,FileText,Flag,FolderOpen,GraduationCap,
 LayoutDashboard,Lightbulb,LoaderCircle,LogOut,Mail,Menu,MessageCircle,Plus,Search,Settings2,ShieldCheck,
 Sparkles,Target,Trash2,UploadCloud,UserRound,WalletCards,WandSparkles,X,Zap
} from 'lucide-react';
import {atsScore} from '@/lib/ats';
import {browserSupabase,configured} from '@/lib/supabase';
import {emptyResume,sampleResume,sampleResumes,uid} from '@/lib/types';
import type {Resume} from '@/lib/types';
import {UNIQUE_RESUME_TEMPLATES,PHOTO_READY_TEMPLATES} from '@/lib/templates';
import {cacheResumeDraft,cachedResumeDraft,discardCachedResumeDraft,isCacheNewer,latestCachedResumeDraft} from '@/lib/resume-autosave';
import ResumeWizard from '@/components/resume-wizard';
import InterviewStudio from '@/components/interview-studio';
import {authReturnUrl} from '@/lib/auth-return-url';
import SettingsPanel from '@/components/settings-panel';
import MfaPanel from '@/components/mfa-panel';
import {accountAvatar,loadProfilePhoto,readProfilePhoto} from '@/lib/profile-photo';
import {requiresMfaChallenge} from '@/lib/mfa-factors';
import {BrandMark} from '@/components/brand-icons';
import ResumeDocument from '@/components/resume-document';
import TemplateGallery from '@/components/template-gallery';

type Section='dashboard'|'builder'|'resumes'|'ats'|'interview'|'letters'|'templates'|'settings';
type AiTask='summary'|'interview'|'interview_questions'|'coverletter'|'resume';
const nav:{id:Section;label:string;icon:typeof LayoutDashboard}[]=[
 {id:'dashboard',label:'Dashboard',icon:LayoutDashboard},
 {id:'builder',label:'Build Resume',icon:FilePlus2},
 {id:'ats',label:'ATS Checker',icon:ShieldCheck},
 {id:'interview',label:'Interview Practice',icon:MessageCircle},
 {id:'letters',label:'Cover Letter',icon:Mail},
 {id:'templates',label:'Templates',icon:BookOpen},
 {id:'settings',label:'Settings',icon:Settings2}
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

export default function Home(){
 const [section,setSection]=useState<Section>('dashboard');
 const [mobileNav,setMobileNav]=useState(false);
 const [profileMenuOpen,setProfileMenuOpen]=useState(false);
 const [settingsFocus,setSettingsFocus]=useState<'account'|'security'>('account');
 const [profilePhoto,setProfilePhoto]=useState('');
 const [mfaState,setMfaState]=useState<'checking'|'guest'|'required'|'verified'|'error'>('checking');
 const [mfaError,setMfaError]=useState('');
 useEffect(()=>{
  if(!mobileNav)return;
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setMobileNav(false);};
  const onResize=()=>{if(window.innerWidth>700)setMobileNav(false);};
  const prior=document.body.style.overflow;document.body.style.overflow='hidden';
  document.addEventListener('keydown',onKey);window.addEventListener('resize',onResize);
  return()=>{document.body.style.overflow=prior;document.removeEventListener('keydown',onKey);window.removeEventListener('resize',onResize);};
 },[mobileNav]);
 useEffect(()=>{const initial=new URLSearchParams(window.location.search).get('section');if(initial==='templates')setSection('templates');},[]);
 const [resumes,setResumes]=useState<Resume[]>(sampleResumes);
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
 const [letterTone,setLetterTone]=useState('Professional');
 const [letterOutput,setLetterOutput]=useState('');
 const [demoLetter,setDemoLetter]=useState('Dear Hiring Manager,\n\nI am excited to apply for this opportunity. My background in teamwork, technical projects, and problem-solving has prepared me to contribute effectively to your organization.\n\nI look forward to discussing how my skills and experience match your needs.\n\nSincerely,\nYour Name');
 const [generationPrompt,setGenerationPrompt]=useState('');
 const [answer,setAnswer]=useState('');
 const [questionIndex,setQuestionIndex]=useState(0);
 const [feedback,setFeedback]=useState('');
 const [busy,setBusy]=useState(false);
 const [email,setEmail]=useState('');
 const [otp,setOtp]=useState('');
 const [sentOtp,setSentOtp]=useState(false);
 const [showAuth,setShowAuth]=useState(false);
 const sb=useMemo(()=>browserSupabase(),[]);
 const scope=user?.id||'demo';
 const [autosaveStatus,setAutosaveStatus]=useState<'idle'|'saving'|'local'|'synced'|'error'>('idle');
 const syncTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const syncVersion=useRef(0);
 const syncQueue=useRef<Promise<void>>(Promise.resolve());
 const lastDraft=useRef<{key:string;body:string}|null>(null);
 const scopeRef=useRef(scope);scopeRef.current=scope;
 const [formsLoadedFor,setFormsLoadedFor]=useState('');
 const activeResume=draft.id===selectedId?draft:resumes.find(r=>r.id===selectedId)||resumes[0]||draft;
 const results=atsScore(activeResume,jobDescription);
 const formattedName=user?.user_metadata?.full_name?.split(' ')[0]||user?.email?.split('@')[0]||'Christian';
 const isDemo=!user;
 useEffect(()=>{try{const cached=localStorage.getItem('resumebuilder:demo-cover-letter:v1');if(cached!==null)setDemoLetter(cached);}catch{}},[]);
 useEffect(()=>{if(!ready||!isDemo)return;try{localStorage.setItem('resumebuilder:demo-cover-letter:v1',demoLetter);}catch{}},[demoLetter,isDemo,ready]);
 const avatarSrc=accountAvatar(user,resumes,profilePhoto);
 useEffect(()=>{
  const id=user?.id;
  let active=true;
  const refresh=()=>{
   setProfilePhoto(id?readProfilePhoto(id):'');
   if(id)void loadProfilePhoto(id).then(url=>{if(active)setProfilePhoto(url);});
  };
  refresh();
  window.addEventListener('resumebuilder:avatar-changed',refresh);
  return()=>{active=false;window.removeEventListener('resumebuilder:avatar-changed',refresh);};
 },[user?.id]);
 useEffect(()=>{
  if(!profileMenuOpen)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setProfileMenuOpen(false);};
  document.addEventListener('keydown',onKey);
  return()=>document.removeEventListener('keydown',onKey);
 },[profileMenuOpen]);
 const currentScore=atsScore(activeResume).score;
 const go=(s:Section)=>{setSection(s);setMobileNav(false);setProfileMenuOpen(false);setError('');window.scrollTo({top:0,behavior:'smooth'});};
 const verifyMfaState=useCallback(async(nextUser:User|null)=>{
  if(!sb||!nextUser){setMfaState('guest');return;}
  setMfaState('checking');setMfaError('');
  try{
   const [assurance,listed]=await Promise.all([
    sb.auth.mfa.getAuthenticatorAssuranceLevel(),
    sb.auth.mfa.listFactors()
   ]);
   if(assurance.error)throw assurance.error;
   if(listed.error)throw listed.error;
   // Never demand a 2FA login challenge for an enrollment that was started
   // but never verified. AAL2 authentication is only required after a factor
   // is VERIFIED by Supabase, not after QR generation or QR scanning.
   const required=requiresMfaChallenge(listed.data,assurance.data.currentLevel);
   setMfaState(required?'required':'verified');
  }catch(error){
   setMfaState('error');
   setMfaError(error instanceof Error?error.message:'Could not confirm two-factor security state.');
  }
 },[sb]);
 const init=useCallback(async(u:User|null)=>{
  try{
   if(sb&&u){
    const rr=await (sb as any).from('resumes').select('content').eq('user_id',u.id).order('updated_at',{ascending:false});const role=await (sb as any).from('admin_users').select('user_id').eq('user_id',u.id).maybeSingle();setIsAdmin(!!role.data);
    if(rr.error)throw rr.error;
    const r=(rr.data||[]).map((x:{content:Resume})=>x.content);
    const cached=latestCachedResumeDraft(u.id);
    const remote=cached?r.find((x:Resume)=>x.id===cached.id):null;
    const chosen=cached&&isCacheNewer(cached,remote)?cached:r[0]||emptyResume();
    const recover=cached&&isCacheNewer(cached,remote);
    setResumes(recover?[chosen,...r.filter((x:Resume)=>x.id!==chosen.id)]:r);
    setDraft(chosen);setSelectedId(chosen.id);
    if(recover&&cached){
     // A browser closed before debounce may leave a newer local copy.
     // Reconcile it with the authenticated user's private Supabase row.
     void (sb as any).from('resumes').upsert({
      id:cached.id,user_id:u.id,title:cached.title,content:cached,updated_at:cached.updatedAt
     },{onConflict:'id'}).then(({error}:{error:Error|null})=>{
      if(error)setAutosaveStatus('error');else setAutosaveStatus('synced');
     });
    }
   }else{
    const r=loadDemo('resumebuilder_resumes',sampleResumes);
    const cached=latestCachedResumeDraft('demo');
    const old=cached?r.find((x:Resume)=>x.id===cached.id):null;
    const chosen=cached&&isCacheNewer(cached,old)?cached:r[0]||emptyResume();
    setResumes(cached&&isCacheNewer(cached,old)?[chosen,...r.filter((x:Resume)=>x.id!==chosen.id)]:r);
    setIsAdmin(false);setDraft(chosen);setSelectedId(chosen.id);
   }
  }catch(e){setError(e instanceof Error?e.message:'Unable to load saved data.');}
  finally{setReady(true);}
 },[sb]);
 useEffect(()=>{
  let active=true;
  if(!sb){setMfaState('guest');void init(null);return;}
  void sb.auth.getUser().then(({data})=>{if(!active)return;setMfaState(data.user?'checking':'guest');setUser(data.user);void verifyMfaState(data.user);void init(data.user);});
  const {data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')return;setTimeout(()=>{if(!active)return;setMfaState(session?.user?'checking':'guest');setUser(session?.user||null);void verifyMfaState(session?.user||null);void init(session?.user||null);},0);});
  return ()=>{active=false;subscription.unsubscribe();};
 },[sb,init,verifyMfaState]);
 useEffect(()=>{if(ready&&!user){try{localStorage.setItem('resumebuilder_resumes',JSON.stringify(resumes));}catch{setAutosaveStatus('error');}}},[ready,user,resumes]);

 function cloudUpsert(item:Resume,owner:string){
  const next=syncQueue.current.then(async()=>{
   if(!sb||scopeRef.current!==owner)return 'Account changed';
   const {error}=await (sb as any).from('resumes').upsert({
    id:item.id,user_id:owner,title:item.title,content:item,updated_at:item.updatedAt
   },{onConflict:'id'});
   return error?.message||'';
  });
  syncQueue.current=next.then(()=>{},()=>{});
  return next;
 }
 // Debounced cloud writes, with immediate per-account local backup.
 useEffect(()=>{
  if(!ready)return;
  const key=scope+':'+draft.id;
  const body=JSON.stringify({...draft,updatedAt:''});
  const previous=lastDraft.current;lastDraft.current={key,body};
  if(!previous||previous.key!==key||previous.body===body)return;
  const item={...draft,updatedAt:new Date().toISOString()};
  const stored=cacheResumeDraft(scope,item);
  setResumes(prev=>[item,...prev.filter(r=>r.id!==item.id)]);
  const version=++syncVersion.current;
  if(syncTimer.current)clearTimeout(syncTimer.current);
  if(sb&&user){
   setAutosaveStatus('saving');
   const owner=user.id;
   syncTimer.current=setTimeout(()=>{
    syncTimer.current=null;
    void cloudUpsert(item,owner).then(error=>{
     if(version===syncVersion.current&&scopeRef.current===owner)setAutosaveStatus(error?'error':'synced');
    }).catch(()=>{if(version===syncVersion.current)setAutosaveStatus('error');});
   },900);
  }else setAutosaveStatus(stored?'local':'error');
 },[draft,ready,scope,user,sb]);
 useEffect(()=>()=>{if(syncTimer.current)clearTimeout(syncTimer.current);},[]);
 useEffect(()=>{
  if(!ready)return;
  let value:Record<string,unknown>={};
  try{
   const raw=localStorage.getItem('resumebuilder:forms:v1:'+scope);
   if(raw&&typeof JSON.parse(raw)==='object')value=JSON.parse(raw);
  }catch{}
  // Reset fields when the signed-in account changes, preventing one
  // account's locally cached cover-letter details from appearing in another.
  setJobDescription(typeof value.jobDescription==='string'?value.jobDescription:'');
  setLetterRole(typeof value.letterRole==='string'?value.letterRole:'');
  setLetterCompany(typeof value.letterCompany==='string'?value.letterCompany:'');
  setLetterTone(typeof value.letterTone==='string'?value.letterTone:'Professional');
  setLetterOutput(typeof value.letterOutput==='string'?value.letterOutput:'');
  setFormsLoadedFor(scope);
 },[ready,scope]);
 useEffect(()=>{
  if(!ready||formsLoadedFor!==scope)return;
  try{localStorage.setItem('resumebuilder:forms:v1:'+scope,JSON.stringify({
   jobDescription,letterRole,letterCompany,letterTone,letterOutput
  }));}catch{}
 },[ready,scope,formsLoadedFor,jobDescription,letterRole,letterCompany,letterTone,letterOutput]);

 const flash=(text:string)=>{setNotice(text);setError('');};
 const auditUser=(action:string,detail:string)=>{if(sb&&user)void fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,detail})}).catch(()=>{});};
 async function saveResume(r:Resume){
  setError('');const item={...r,updatedAt:new Date().toISOString()};
  ++syncVersion.current;if(syncTimer.current){clearTimeout(syncTimer.current);syncTimer.current=null;}
  const cached=cacheResumeDraft(scope,item);
  if(sb&&user){
   setAutosaveStatus('saving');
   const error=await cloudUpsert(item,user.id);
   if(error){setAutosaveStatus('error');setError(error);return;}
  }else if(!cached){setAutosaveStatus('error');setError('Unable to save locally. Browser storage may be full.');return;}
  setResumes(prev=>[item,...prev.filter(x=>x.id!==item.id)]);
  setDraft(item);setSelectedId(item.id);
  setAutosaveStatus(user?'synced':'local');
  flash('Resume saved successfully.');auditUser('resume_saved',item.title);
 }
 async function removeResume(id:string){
  if(!window.confirm('Delete this resume?'))return;
  ++syncVersion.current;if(syncTimer.current){clearTimeout(syncTimer.current);syncTimer.current=null;}
  await syncQueue.current;
  if(sb&&user){const {error:e}=await (sb as any).from('resumes').delete().eq('id',id).eq('user_id',user.id);if(e){setError(e.message);return;}}
  discardCachedResumeDraft(scope,id);
  const remaining=resumes.filter(x=>x.id!==id);setResumes(remaining);if(selectedId===id){const other=remaining[0]||emptyResume();setSelectedId(other.id);setDraft(other);}flash('Resume deleted.');auditUser('resume_deleted',id);
 }
 function startNew(){const r=emptyResume();setDraft(r);setSelectedId(r.id);setAutosaveStatus('idle');go('builder');}
 function editResume(r:Resume){const saved=cachedResumeDraft(scope,r.id);setDraft(structuredClone(saved&&isCacheNewer(saved,r)?saved:r));setSelectedId(r.id);go('builder');}
 function setDraftKey<K extends keyof Resume>(k:K,v:Resume[K]){setDraft(old=>({...old,[k]:v}));}
 async function logATS(){if(sb&&user){const {error:e}=await (sb as any).from('ats_scans').insert({id:uid(),user_id:user.id,resume_id:resumes.some(r=>r.id===activeResume.id)?activeResume.id:null,score:results.score});if(e){setError(e.message);return;}}flash('Resume analysis updated.');auditUser('ats_checked',activeResume.title+' — '+results.score+'%');}
 async function requestAI(task:AiTask,context:string){
  setError('');setNotice('');setBusy(true);
  try{const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task,context})});const data=await res.json();if(!res.ok)throw Error(data.error||'AI unavailable.');return data.output as string;}
  catch(e){setError(e instanceof Error?e.message:'AI unavailable.');return null;}
  finally{setBusy(false);}
 }
 async function loginGoogle(){
  if(!sb){setError('Create and connect your new Supabase project to enable login.');return;}
  const {error:e}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:authReturnUrl('/auth/callback')}});
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
 async function signOut(){
  if(!sb||!user){window.location.assign('/login');return;}
  const {error:e}=await sb.auth.signOut();
  if(e){setError('Unable to sign out: '+e.message);return;}
  setMobileNav(false);
  setProfileMenuOpen(false);
  setUser(null);
  // Return to public login instead of leaving a logged-out user in demo mode.
  window.location.assign('/login');
 }
 const title:Record<Section,string>={dashboard:'Dashboard',builder:'Build Resume',resumes:'My Resumes',ats:'ATS Checker',interview:'Interview Practice',letters:'Cover Letter',templates:'Templates',settings:'Settings'};
 const filteredResumes=resumes.filter(r=>(r.title+' '+r.name+' '+r.skills).toLowerCase().includes(search.toLowerCase()));
 if(user&&mfaState!=='verified'){
  return <main className="mfa-auth-page">
   <section className="mfa-auth-card">
    <div className="mfa-auth-brand"><span className="brand-icon"><BrandMark size={20}/></span> ResumeBuilder</div>
    {mfaState==='checking'&&<p><LoaderCircle size={18} className="spin"/> Checking your account security…</p>}
    {mfaState==='required'&&<MfaPanel user={user} mode="challenge" onVerified={()=>setMfaState('verified')} onSignOut={signOut}/>}
    {mfaState==='error'&&<>
     <h2>Unable to verify account security</h2>
     <p role="alert">{mfaError}</p>
     <button className="outline-button" onClick={()=>void verifyMfaState(user)}>Retry Security Check</button>
     <button className="outline-button" onClick={()=>void signOut()}>Sign Out</button>
    </>}
   </section>
  </main>;
 }
 return <div className="app-shell resume-client-shell">
  {mobileNav&&<button className="workspace-scrim" aria-label="Close sidebar navigation" onClick={()=>setMobileNav(false)}/>}
  <aside id="mobile-workspace-nav" className={'sidebar '+(mobileNav?'sidebar-open':'')}>
   <div className="brand"><button type="button" className="workspace-brand-home" aria-label={user?"Go to my ResumeBuilder dashboard":"Go to ResumeBuilder home"} onClick={()=>user?go("dashboard"):window.location.assign("/")}><span className="brand-icon"><BrandMark size={49}/></span><span>Resume<span className="brand-bold">Builder</span></span></button><button className="mobile-close icon-button" onClick={()=>setMobileNav(false)} aria-label="Close menu"><X size={19}/></button></div>
   <button className="create-button" onClick={startNew}><Plus size={17}/> Create New Resume <ArrowRight size={16}/></button>
   <div className="side-label">WORKSPACE</div>
   <nav className="side-nav" aria-label="Main navigation">{nav.map(n=>{const Icon=n.icon;return <button key={n.id} onClick={()=>go(n.id)} className={section===n.id?'nav-active':''}><span className="side-nav-icon"><Icon size={18} strokeWidth={1.9}/></span><span>{n.label}</span>{section===n.id&&<span className="active-marker"/>}</button>;})}</nav>
   <div className="side-label recent-label">RECENT DOCUMENTS</div>
   <div className="sidebar-docs">{resumes.slice(0,3).map(r=><button onClick={()=>editResume(r)} key={r.id}><FileText size={14}/><span>{r.title}</span></button>)}{resumes.length===0&&<p>No saved resumes yet</p>}</div>
   {(!configured||isAdmin)&&<div className="sidebar-admin-area">
    <div className="side-label">ADMIN WORKSPACE</div>
    <a className="admin-workspace-link" href="/admin/login" aria-label="Open Admin Login">
     <span className="admin-workspace-symbol"><ShieldCheck size={19} strokeWidth={1.9}/></span>
     <span><strong>Admin Dashboard</strong><small>{configured?'Authorized Admin Login':'Login / Demo Preview'}</small></span>
     <ArrowRight size={16}/>
    </a>
   </div>}
   <div className="sidebar-bottom">
    <div className="sidebar-tip"><span><Sparkles size={18}/></span><strong>Career toolkit</strong><p>Your next opportunity starts with a stronger resume.</p></div>
    <button className="account-button" onClick={()=>{go('settings');}}><span className="avatar">{avatarSrc?<img src={avatarSrc} alt="Your profile picture" />:formattedName.slice(0,1).toUpperCase()}</span><span className="account-text"><strong>{user?.user_metadata?.full_name|| (isDemo?'Christian B. Aring (Demo)':user?.email)}</strong><small>{isDemo?'Demo workspace':'Personal account'}</small></span><Settings2 size={17}/></button>
    {user&&<button type="button" className="sidebar-logout" onClick={()=>void signOut()} aria-label="Sign out of ResumeBuilder"><LogOut size={17}/> Log Out</button>}
   </div>
  </aside>
  <div className="main-area">
   <header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)} aria-label="Open navigation menu" aria-expanded={mobileNav} aria-controls="mobile-workspace-nav"><Menu/></button>
    <div className="breadcrumbs">Workspace <ChevronRight size={15}/><strong>{title[section]}</strong></div>
    <div className="top-actions"><div className="searchbox"><Search size={17}/><input placeholder="Search resumes..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')go('resumes');}}/></div><span className="top-separator"/><div className="workspace-account-menu"><button type="button" onClick={()=>user?setProfileMenuOpen(open=>!open):window.location.assign('/login')} className="profile-chip" aria-haspopup={user?'menu':undefined} aria-expanded={user?profileMenuOpen:undefined}><span className="avatar mini">{avatarSrc?<img src={avatarSrc} alt="Your profile picture"/>:formattedName.slice(0,1).toUpperCase()}</span><span>{user?'My Account':'Demo Mode'}</span><ChevronDown size={14}/></button>{user&&profileMenuOpen&&<div className="workspace-account-dropdown" role="menu"><button type="button" role="menuitem" onClick={()=>{setSettingsFocus('account');go('settings');}}><UserRound size={16}/> My Profile &amp; Settings</button><button type="button" role="menuitem" onClick={()=>{setSettingsFocus('security');go('settings');}}><ShieldCheck size={16}/> Account Security</button><button type="button" role="menuitem" onClick={()=>void signOut()}><LogOut size={16}/> Sign Out</button></div>}</div>{user&&<button type="button" className="topbar-logout" onClick={()=>void signOut()} aria-label="Log out of ResumeBuilder"><LogOut size={16}/><span className="topbar-logout-label">Log Out</span></button>}</div>
   </header>
   <main className="content">
    {!ready&&<div className="inline-info"><LoaderCircle className="spin" size={18}/> Loading workspace…</div>}
    {!!error&&<div role="alert" className="alert alert-error">{error}<button onClick={()=>setError('')} aria-label="Dismiss"><X size={16}/></button></div>}
    {!!notice&&<div role="status" className="alert alert-success"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
    {isDemo&&ready&&<div className="demo-notice"><Sparkles size={16}/><span>Preview mode: sample content and local browser storage. Connect a new Supabase project for private account storage and AI features.</span><button onClick={()=>window.location.assign('/signup')}>Connect account <ArrowRight size={14}/></button></div>}
    {section==='dashboard'&&<div className="client-dashboard"><div className="client-dashboard-heading"><div><h1>Welcome back, <span>{cap(formattedName)}!</span> 👋</h1><p>AI Resume Builder &amp; Career Tools</p><small>Professional resumes, ATS checks, interview practice, at modern photo-ready templates.</small></div><div className="dashboard-main-actions">{(!configured||isAdmin)&&<a className="dashboard-admin-link" href="/admin/login"><ShieldCheck size={16}/> {configured?'Admin Login':'Admin Login / Preview'} <ArrowRight size={15}/></a>}<button className="purple-button" onClick={startNew}><Plus size={17}/> Create New Resume</button></div></div>
<div className="client-stat-grid">{[{label:'My Resumes',value:resumes.length,icon:FileText,go:'resumes' as Section},{label:'ATS Score (Latest)',value:currentScore+'%',icon:ShieldCheck,go:'ats' as Section},{label:'Templates',value:UNIQUE_RESUME_TEMPLATES.length,icon:BookOpen,go:'templates' as Section},{label:'Photo Layouts',value:UNIQUE_RESUME_TEMPLATES.filter(t=>PHOTO_READY_TEMPLATES.has(t.id)).length,icon:UserRound,go:'templates' as Section}].map(stat=>{const Icon=stat.icon;return <button key={stat.label} className="client-stat" onClick={()=>go(stat.go)}><span className="client-stat-icon"><Icon size={23}/></span><div><small>{stat.label}</small><strong>{stat.value}</strong></div></button>})}</div>
<div className="client-feature-row"><section className="client-purple-hero"><div><h2>Create a Professional<br/> Resume with AI ✨</h2><p>Build an ATS-friendly resume in minutes with the power of AI.</p><button onClick={startNew}>Create Resume <ArrowRight size={17}/></button></div><div className="client-resume-graphic"><div><span className="mock-avatar">{formattedName.slice(0,1)}</span><strong>{user?.user_metadata?.full_name||'Christian B. Aring'}</strong><small>IT Professional</small><i/><i/><i/><i/></div><span><CheckCircle2 size={15}/> ATS Ready</span></div></section><section className="client-progress"><h3>Your Progress</h3><div className="client-progress-ring" style={{'--progress':currentScore+'%'} as React.CSSProperties}><strong>{currentScore}%</strong></div><div className="client-check"><CheckCircle2/> Build a Resume</div><div className="client-check"><CheckCircle2/> Run ATS Check</div><div className="client-check"><span/> Practice Interview</div><div className="client-check"><span/> Choose a Template</div></section></div>
<div className="client-shortcuts"><h2>Quick Actions</h2><div>{([{id:'builder',label:'Build Resume',desc:'Generate with AI',icon:FileText},{id:'ats',label:'ATS Checker',desc:'Improve your score',icon:ShieldCheck},{id:'templates',label:'Templates',desc:'Photo-ready designs',icon:BookOpen},{id:'interview',label:'Interview Practice',desc:'AI mock interview',icon:MessageCircle},{id:'letters',label:'Cover Letter',desc:'Create in seconds',icon:Mail}] as const).map(a=>{const Icon=a.icon;return <button key={a.id} onClick={()=>go(a.id)}><span><Icon size={22}/></span><span><strong>{a.label}</strong><small>{a.desc}</small></span></button>})}</div></div>
<div className="client-bottom-row"><section className="panel"><div className="panel-head"><div><FolderOpen size={18}/><strong>Recent Resumes</strong></div><button onClick={()=>go('resumes')}>View all <ArrowRight size={14}/></button></div>{resumes.slice(0,3).map(r=><button className="doc-row" key={r.id} onClick={()=>editResume(r)}><span className="doc-icon"><FileText size={18}/></span><span className="doc-name"><strong>{r.title}</strong><small>Resume · Edited {new Date(r.updatedAt).toLocaleDateString()}</small></span><span className="doc-score">ATS: {atsScore(r).score}%</span></button>)}{!resumes.length&&<p className="empty-small">Create your first resume</p>}</section><section className="panel client-next-steps"><div className="panel-head"><div><Flag size={18}/><strong>Next Steps</strong></div></div><button onClick={()=>go('interview')}><CheckCircle2 size={18}/><span><strong>Prepare for interview</strong><small>Practice with AI based on your target role.</small></span></button><button onClick={()=>go('ats')}><Target size={18}/><span><strong>Optimize resume keywords</strong><small>Improve your ATS score (current: {currentScore}%).</small></span></button><button onClick={()=>go('templates')}><BookOpen size={18}/><span><strong>Explore resume templates</strong><small>Choose a professional layout with an optional photo.</small></span></button></section></div>
</div>}
{section==='builder'&&<><div className="resume-autosave-status" role="status"><CheckCircle2 size={16}/>{autosaveStatus==='saving'?'Saving to your account…':autosaveStatus==='synced'?'Changes saved to your account':autosaveStatus==='local'?'Draft auto-saved on this device':autosaveStatus==='error'?'Auto-save failed — use Save Draft or check connection':'Changes are saved automatically as you type'}</div><ResumeWizard draft={draft} setDraft={setDraft} save={saveResume} runAI={requestAI} busy={busy} preview={<ResumeDocument resume={draft}/>} storageScope={scope} onBack={()=>go('resumes')} isDemo={isDemo}/></>}
{section==='templates'&&<TemplateGallery resume={(draft.name||draft.summary||draft.skills)?draft:sampleResume} onUse={(id,accentColor,backgroundColor)=>{setDraft(old=>({...old,template:id,accentColor,backgroundColor}));go('builder');flash('Layout and colors selected. You can change them before saving.');}}/>}
{section==='resumes'&&<><div className="page-heading"><div><div className="eyebrow">YOUR DOCUMENTS</div><h1>My Resumes</h1><p>Create versions tailored to different roles and companies.</p></div><button className="black-button" onClick={startNew}><Plus size={16}/> New Resume</button></div>
     <div className="resumes-grid">{filteredResumes.map(r=><article className="panel resume-card" key={r.id}><div className="rt-saved-preview"><div className="rt-preview-stage"><div className="rt-preview-viewport"><ResumeDocument resume={r} miniature/></div></div></div><div className="resume-card-body"><div><h3>{r.title}</h3><p>{r.experience.find(e=>e.role.trim())?.role||'General professional resume'}</p></div><span className="muted-badge"><span className="green-dot"/> {atsScore(r).score}% score</span></div><div className="resume-card-footer"><small>Edited {new Date(r.updatedAt).toLocaleDateString()}</small><div><button onClick={()=>void removeResume(r.id)} aria-label={'Delete '+r.title}><Trash2 size={16}/></button><button onClick={()=>editResume(r)} className="small-dark">Edit <ArrowRight size={15}/></button></div></div></article>)}
      <button className="new-resume-card" onClick={startNew}><span><Plus size={23}/></span><strong>Create a new resume</strong><small>Start with a blank template</small></button></div>
     {filteredResumes.length===0&&<p className="muted-copy">No saved resumes match your search.</p>}
    </>}
    {section==='ats'&&<><div className="page-heading"><div><div className="eyebrow">SMART RESUME ANALYSIS</div><h1>ATS Resume Checker</h1><p>Understand your resume’s completeness and its keywords relative to a job description.</p></div></div><div className="two-column"><div className="panel padded"><h2 className="card-heading"><FileCheck2 size={20}/> Scan your resume</h2><label className="field"><span>Select resume</span><select value={activeResume.id} onChange={e=>setSelectedId(e.target.value)}>{resumes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}{resumes.length===0&&<option value={draft.id}>Unsaved resume</option>}</select></label><label className="field"><span>Paste job description (optional)</span><textarea rows={13} value={jobDescription} onChange={e=>setJobDescription(e.target.value)} placeholder="Paste a job description to compare relevant keywords against your resume..."/></label><div className="inline-info"><Lightbulb size={17}/> This is a heuristic readiness score, not an official ATS pass probability.</div><button className="black-button" onClick={()=>void logATS()}>Analyze Resume <ArrowRight size={16}/></button></div>
     <div className="panel padded"><h2 className="card-heading"><BarChart3 size={20}/> Your Analysis</h2><div className="ats-summary"><div className="ats-circle" style={{'--score':results.score+'%'} as React.CSSProperties}><strong>{results.score}<small>/100</small></strong></div><div><h3>{results.score>=80?'Looking good!':results.score>=55?'Good progress':'Room to improve'}</h3><p>Estimated content and keyword readiness based on your entered information.</p></div></div><h3 className="minor-title">Recommendations</h3><div className="tips">{results.suggestions.map((s,i)=><div key={i}><CheckCircle2 size={18}/><p>{s}</p></div>)}</div>{jobDescription&&<><h3 className="minor-title">Keywords found</h3><div className="tag-list">{results.matched.length?results.matched.map(x=><span className="tag tag-green" key={x}>{x}</span>):<small>No matching terms yet.</small>}</div><h3 className="minor-title">Potential missing keywords</h3><div className="tag-list">{results.missing.map(x=><span className="tag" key={x}>{x}</span>)}</div></>}<button className="outline-button" onClick={()=>editResume(activeResume)}>Improve Resume <ArrowRight size={16}/></button></div></div>
    </>}
    {section==='interview'&&<InterviewStudio key={scope} resumes={[activeResume,...resumes.filter(r=>r.id!==activeResume.id)]} activeResumeId={activeResume.id} userId={scope} userName={user?.user_metadata?.full_name||activeResume.name||user?.email?.split('@')[0]||''} runAI={requestAI} busy={busy} signedIn={!!user}/>}

{section==='letters'&&<><div className="page-heading"><div><div className="eyebrow">CREATE TAILORED LETTERS</div><h1>Cover Letter</h1><p>{isDemo?'Try the editor and preview. Exporting is available after sign-in.':'Generate a tailored cover letter for your job application.'}</p></div></div><div className="two-column cover-letter-layout">
 <section className="panel padded"><h2 className="card-heading"><Mail size={19}/> Job Details</h2><Field label="Job Title" value={letterRole} onChange={setLetterRole} placeholder="e.g. Web Developer"/><Field label="Company (Optional)" value={letterCompany} onChange={setLetterCompany} placeholder="e.g. Technology Company"/><label className="field"><span>Choose Your Resume</span><select value={activeResume.id} onChange={e=>setSelectedId(e.target.value)}>{resumes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}{!resumes.length&&<option value={draft.id}>{draft.title}</option>}</select></label><label className="field"><span>Tone</span><select value={letterTone} onChange={e=>setLetterTone(e.target.value)}>{['Professional','Confident','Friendly','Concise','Formal'].map(x=><option key={x}>{x}</option>)}</select></label>
 {isDemo?<div className="cover-demo-locked"><LockKeyhole size={20}/><strong>AI generation is locked in Demo Mode</strong><p>Use the editor to try your cover letter. Sign in to generate with AI, copy, or download the final letter.</p><a href="/signup">Create Free Account <ArrowRight size={15}/></a></div>:<button className="purple-button cover-generate-button" disabled={!letterRole.trim()||busy} onClick={async()=>{const out=await requestAI('coverletter',JSON.stringify({targetRole:letterRole,company:letterCompany,tone:letterTone,resume:activeResume}));if(out)setLetterOutput(out);}}><Sparkles size={17}/>{busy?'Generating...':'Generate with AI'} <ArrowRight size={16}/></button>}
 <p className="muted-copy">{isDemo?'Demo writing stays on this device. Preview only; no export.':'AI uses your resume information. Always proofread the final letter for accuracy.'}</p></section>
 <section className={'panel padded cover-letter-preview'+(isDemo?' cover-letter-preview--demo':'')}><div className="panel-head"><div><FileText size={18}/><strong>{isDemo?'Cover Letter · Demo Preview':'Generated Cover Letter'}</strong></div><div>{isDemo?<span className="cover-demo-badge"><LockKeyhole size={13}/> Preview only</span>:letterOutput&&<><button onClick={()=>{void navigator.clipboard.writeText(letterOutput).then(()=>flash('Cover letter copied.')).catch(()=>setError('Clipboard access unavailable.'));}}><Copy size={15}/> Copy</button><button onClick={()=>{const file=new Blob([letterOutput],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download='resumebuilder-cover-letter.txt';a.click();URL.revokeObjectURL(url);}}><ArrowDownToLine size={15}/> Download</button></>}</div></div>
 {isDemo?<><div className="cover-demo-editor"><textarea aria-label="Editable demo cover letter" rows={17} className="cover-letter-text" value={demoLetter} onChange={e=>setDemoLetter(e.target.value)} onCopy={e=>{e.preventDefault();flash('Demo preview only. Sign in to copy or download your cover letter.');}}/><div className="cover-demo-watermark" aria-hidden="true"><span>DEMO · PREVIEW ONLY</span><span>DEMO · PREVIEW ONLY</span></div></div><p className="cover-demo-preview-note"><LockKeyhole size={14}/> You can edit and preview this letter, but copying and downloading are disabled in Demo Mode. Screenshots cannot be fully blocked by a website.</p></>:letterOutput?<textarea aria-label="Editable generated cover letter" rows={17} className="cover-letter-text" value={letterOutput} onChange={e=>setLetterOutput(e.target.value)}/>:<div className="cover-letter-placeholder"><span>Dear Hiring Manager,</span><p>I am writing to express my interest in the position. My experience and relevant skills would make me a strong candidate for this opportunity.</p><i/><i/><i/><p>Sincerely,</p><p>{activeResume.name||'Your Name'}</p></div>}</section></div></>}

{section==='settings'&&<SettingsPanel user={user} resumes={resumes} signOut={signOut} initialTab={settingsFocus}/>}
   </main>
  </div>
  {showAuth&&<div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAuth(false);}}><div className="auth-modal" role="dialog" aria-modal="true" aria-label="Sign in"><button className="modal-close icon-button" onClick={()=>setShowAuth(false)}><X size={19}/></button><span className="brand-icon"><FileText size={21}/></span><h2>Welcome to ResumeBuilder</h2><p>Sign in to keep resumes private and unlock AI-powered tools.</p>{!configured&&<div className="inline-info">No Supabase project is connected yet. You can continue using the demo.</div>}
    {user?<><div className="auth-current">Signed in as {user.email}</div><button className="outline-button full" onClick={()=>void signOut()}><LogOut size={16}/> Sign out</button></>:<><button className="google-button" disabled={!configured} onClick={()=>void loginGoogle()}><span className="google-g">G</span> Continue with Google</button><div className="or-line"><span>or continue with email</span></div><label className="field"><span>Email address</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>{sentOtp&&<label className="field"><span>6-digit email OTP</span><input inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Enter the code from email"/></label>}<button className="black-button full" disabled={!configured||!email.includes('@')} onClick={()=>void (sentOtp?verifyEmailOtp():sendEmailOtp())}>{sentOtp?'Verify code':'Send email code'} <ArrowRight size={16}/></button><small className="auth-note">For code-based OTP, customize the Supabase email template to include the verification token.</small></>}
    <button className="demo-link" onClick={()=>setShowAuth(false)}>Continue in demo mode</button>
   </div></div>}
  </div>;
}
