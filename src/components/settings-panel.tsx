'use client';
import {useEffect,useRef,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import type {Resume} from '@/lib/types';
import {ArrowRight,Bell,Camera,Check,CheckCircle2,Cloud,KeyRound,Lock,LogOut,Mail,Settings2,ShieldCheck,Sparkles,UserRound,WalletCards,X,UploadCloud,LoaderCircle} from 'lucide-react';
import {browserSupabase} from '@/lib/supabase';
import {GoogleIcon} from '@/components/brand-icons';
import {accountAvatar,clearProfilePhoto,readProfilePhoto,saveProfilePhoto} from '@/lib/profile-photo';
import MfaPanel from '@/components/mfa-panel';

type Tab='account'|'subscription'|'integrations'|'security'|'notifications';
type Props={user:User|null;resumes:Resume[];signOut:()=>Promise<void>};
type Provider={name:'Gemini'|'OpenAI'|'Groq';status:'connected'|'unavailable'|'not_configured';model:string;message:string};
const menu:{id:Tab;label:string;icon:typeof UserRound}[]=[
 {id:'account',label:'Account',icon:UserRound},
 {id:'subscription',label:'Subscription',icon:WalletCards},
 {id:'integrations',label:'Integrations',icon:Cloud},
 {id:'security',label:'Security',icon:ShieldCheck},
 {id:'notifications',label:'Notifications',icon:Bell}
];

export default function SettingsPanel({user,resumes,signOut}:Props){
 const [tab,setTab]=useState<Tab>('account');
 const [name,setName]=useState(user?.user_metadata?.full_name||'');
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [photo,setPhoto]=useState('');
 const photoInput=useRef<HTMLInputElement|null>(null);
 const [aiProviders,setAiProviders]=useState<Provider[]|null>(null);
 const [aiLoading,setAiLoading]=useState(false);
 const [aiCheckedAt,setAiCheckedAt]=useState('');
 const [notify,setNotify]=useState<Record<string,boolean>>(()=>{
  if(typeof window==='undefined')return {interview:true,resumes:true,product:false};
  try{return JSON.parse(localStorage.getItem('resume_notification_prefs')||'{"interview":true,"resumes":true,"product":false}') as Record<string,boolean>;}catch{return {interview:true,resumes:true,product:false};}
 });
 const sb=browserSupabase();
 useEffect(()=>{
  setName(user?.user_metadata?.full_name||'');
  setPhoto(user?.id?readProfilePhoto(user.id):'');
 },[user?.id,user?.user_metadata?.full_name]);
 useEffect(()=>{
  if(tab!=='integrations'||!user)return;
  let active=true;
  const controller=new AbortController();
  setAiLoading(true);setAiProviders(null);
  void fetch('/api/ai/status',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
   .then(async r=>{
    const data=await r.json();
    if(!r.ok)throw Error(typeof data?.error==='string'?data.error:'Cannot check AI connectivity.');
    if(active){setAiProviders(data.providers||[]);setAiCheckedAt(data.checkedAt||'');setError('');}
   })
   .catch(e=>{if(active&&e?.name!=='AbortError')setError(e instanceof Error?e.message:'Cannot check AI connectivity.');})
   .finally(()=>{if(active)setAiLoading(false);});
  return()=>{active=false;controller.abort();};
 },[tab,user?.id]);
 const providers=user?.app_metadata?.providers as string[]|undefined;
 const activePhoto=accountAvatar(user,resumes,photo);
 const saveName=async()=>{
  if(!name.trim()){setError('Please enter your name.');return;}
  setBusy(true);setError('');setNotice('');
  try{
   if(user&&sb){
    const {error:e}=await sb.auth.updateUser({data:{full_name:name.trim()}});
    if(e)throw e;
   }else localStorage.setItem('resume_demo_name',name.trim());
   setNotice('Profile saved.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to update profile.');}
  finally{setBusy(false);}
 };
 const setProfileImage=async(file:File|undefined)=>{
  if(!file)return;
  if(!user){setError('Sign in before updating your profile photo.');return;}
  setBusy(true);setError('');setNotice('');
  try{
   const saved=await saveProfilePhoto(user.id,file);
   setPhoto(saved);
   setNotice('Profile photo updated on this device. Cloud sync is not yet connected to your other Supabase project.');
  }catch(e){setError(e instanceof Error?e.message:'Could not save profile photo.');}
  finally{setBusy(false);if(photoInput.current)photoInput.current.value='';}
 };
 const resetPassword=async()=>{
  if(!user?.email||!sb){setError('Sign in to request a password reset email.');return;}
  setBusy(true);setError('');setNotice('');
  try{
   const {error:e}=await sb.auth.resetPasswordForEmail(user.email,{redirectTo:window.location.origin+'/auth/reset'});
   if(e)throw e;
   setNotice('Password reset instructions requested. Check your inbox and spam folder.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to send reset email.');}
  finally{setBusy(false);}
 };
 const toggle=(key:string)=>{
  const next={...notify,[key]:!notify[key]};
  setNotify(next);
  localStorage.setItem('resume_notification_prefs',JSON.stringify(next));
  setNotice('Saved notification preference on this device.');
 };
 const providerStatus=(provider:Provider)=>
  provider.status==='connected'?'Connected':provider.status==='not_configured'?'Not configured':'Connection failed';
 return <div className="settings-v2">
  <div className="page-heading"><div><div className="eyebrow">MY ACCOUNT</div><h1>Settings</h1><p>Manage your account, subscription and integrations.</p></div></div>
  <div className="settings-v2-layout">
   <nav className="settings-v2-nav" aria-label="Settings sections">{menu.map(n=>{const Icon=n.icon;return <button key={n.id} onClick={()=>{setTab(n.id);setNotice('');setError('');}} className={tab===n.id?'selected':''} aria-current={tab===n.id?'page':undefined}><span className="settings-tab-icon"><Icon size={18} strokeWidth={1.9}/></span>{n.label}<ArrowRight size={14}/></button>;})}</nav>
   <section className="settings-v2-panel panel">
    {notice&&<p className="settings-v2-notice" role="status"><CheckCircle2 size={17}/>{notice}</p>}
    {error&&<p className="settings-v2-error" role="alert">{error}</p>}
    {tab==='account'&&<>
     <header><h2>Account Information</h2><p>Update how your profile appears inside ResumeBuilder.</p></header>
     <div className="settings-profile">
      <span className="settings-avatar">{activePhoto?<img src={activePhoto} alt="Profile picture"/>:(name||user?.email||'U').slice(0,1).toUpperCase()}</span>
      <div><strong>{name||user?.email?.split('@')[0]||'Demo User'}</strong><small>{user?.email||'Preview Account · Demo workspace'}</small></div>
     </div>
     <div className="settings-photo-tools">
      <input type="file" ref={photoInput} hidden accept="image/jpeg,image/png,image/webp" onChange={e=>void setProfileImage(e.target.files?.[0])}/>
      <button type="button" className="outline-button" disabled={busy||!user} onClick={()=>photoInput.current?.click()}><Camera size={16}/> Upload Profile Photo</button>
      {photo&&<button type="button" className="outline-button" disabled={busy} onClick={()=>{if(!user)return;clearProfilePhoto(user.id);setPhoto('');setNotice('Local photo removed.');}}><X size={16}/> Remove Photo</button>}
     </div>
     <label className="settings-input">Full Name<input value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label>
     <label className="settings-input">Email Address<input disabled value={user?.email||'demo@example.com'} readOnly/></label>
     <div className="settings-actions">
      <button className="purple-button" disabled={busy} onClick={()=>void saveName()}><Check size={16}/> Save Profile</button>
      {user&&<button className="outline-button" onClick={()=>void signOut()}><LogOut size={16}/> Sign Out</button>}
     </div>
     <p className="settings-footnote">Uploaded profile photos are stored on this browser only for now. Connected Google profile pictures may appear automatically. Cross-device photo syncing needs the Storage bucket in your actual ResumeBuilder Supabase project.</p>
    </>}
    {tab==='subscription'&&<>
     <header><h2>Subscription Plans</h2><p>Choose the tools that fit your career goals. Prices are proposed monthly amounts.</p></header>
     <div className="settings-pricing-grid">
      {[
       {name:'Free',price:0,description:'Start building your career documents.',features:['Resume builder and templates','Basic resume downloads','ATS checker access','Interview practice preview']},
       {name:'Pro',price:200,description:'More tools for active applicants.',features:['Everything in Free','Expanded AI resume assistance (planned)','More AI interview practice (planned)','Additional document features (planned)']},
       {name:'Ultra',price:400,description:'A complete career preparation workspace.',features:['Everything in Pro','Priority AI generation (planned)','Advanced interview insights (planned)','Premium templates and tools (planned)']}
      ].map(plan=><article key={plan.name} className={'settings-pricing-card'+(plan.name==='Pro'?' highlighted':'')}>
       <span className="settings-pricing-name">{plan.name==='Pro'&&<Sparkles size={15}/>} {plan.name}</span>
       <strong className="settings-pricing-price">₱{plan.price.toLocaleString('en-PH')}<small> / month</small></strong>
       <p>{plan.description}</p>
       <ul>{plan.features.map(feature=><li key={feature}><CheckCircle2 size={15}/>{feature}</li>)}</ul>
       <button type="button" disabled className={plan.name==='Free'?'outline-button':'purple-button'}>{plan.name==='Free'?'Current free access':'Billing not yet available'}</button>
      </article>)}
     </div>
     <p className="settings-footnote">Plan cards are previews. No checkout, payment collection, recurring billing, subscription activation, or premium feature gating is enabled. Actual payment integration and server-verified entitlements must be set up in the correct Vercel/Supabase projects before launch.</p>
    </>}
    {tab==='integrations'&&<>
     <header><h2>Connected Accounts</h2><p>Provider connections are checked on the server. No API keys are displayed.</p></header>
     <div className="settings-integrations">
      <div><span className="google-logo"><GoogleIcon size={22}/></span><span><strong>Google</strong><small>Google account sign-in</small></span><span className={providers?.includes('google')?'connected':'not-connected'}>{providers?.includes('google')?'Connected':'Not connected'}</span></div>
      <div><span className="service-logo"><Cloud size={19}/></span><span><strong>Supabase Authentication</strong><small>Account sign-in and resume storage</small></span><span className={user?'connected':'not-connected'}>{user?'Connected':'Demo'}</span></div>
      {aiLoading&&<div className="settings-ai-check"><LoaderCircle size={18} className="spin"/> Checking configured AI providers…</div>}
      {aiProviders?.map(provider=><div key={provider.name}>
       <span className="service-logo"><Sparkles size={19}/></span>
       <span><strong>{provider.name} AI</strong><small>{provider.model} · {provider.message}</small></span>
       <span className={provider.status==='connected'?'connected':'not-connected'}>{providerStatus(provider)}</span>
      </div>)}
      {!aiLoading&&!aiProviders&&<div><span className="service-logo"><Sparkles size={19}/></span><span><strong>AI Provider</strong><small>{user?'Unable to verify provider connections.':'Sign in to check server credentials.'}</small></span><span className="not-connected">Not verified</span></div>}
     </div>
     <p className="settings-footnote">Connected means the provider accepted a non-generation credentials request. Actual text/audio generation may still fail from quota, availability, or model access. {aiCheckedAt?'Last checked: '+new Date(aiCheckedAt).toLocaleString()+'. ':''}Configure API credentials in the actual ResumeBuilder Vercel project; none are stored in your browser.</p>
    </>}
    {tab==='security'&&<>
     <header><h2>Security &amp; Access</h2><p>Protect your account and manage authentication.</p></header>
     <div className="settings-security-item"><span><Lock size={20}/></span><div><strong>Reset your password</strong><p>Receive a secure password reset link by email.</p></div><button className="outline-button" disabled={busy||!user} onClick={()=>void resetPassword()}>Send Reset Link <ArrowRight size={15}/></button></div>
     <div className="settings-security-item"><span><ShieldCheck size={20}/></span><div><strong>Email verification</strong><p>Supabase verifies your email address during sign-in or signup.</p></div><span className={user?.email_confirmed_at?'connected':'not-connected'}>{user?.email_confirmed_at?'Verified':'Not verified'}</span></div>
     <MfaPanel user={user}/>
     {user&&<button className="outline-button settings-security-signout" onClick={()=>void signOut()}><LogOut size={16}/> Sign Out</button>}
    </>}
    {tab==='notifications'&&<>
     <header><h2>Notification Preferences</h2><p>Choose which reminders you would like to see in the future.</p></header>
     {[{key:'interview',title:'Interview Reminders',desc:'Notifications about interview preparation'},{key:'resumes',title:'Resume Editing Tips',desc:'Future notices about resume improvements'},{key:'product',title:'Product News',desc:'News about ResumeBuilder features'}].map(n=><div key={n.key} className="settings-toggle-row"><div><strong>{n.title}</strong><small>{n.desc}</small></div><button role="switch" aria-checked={!!notify[n.key]} onClick={()=>toggle(n.key)} className={'settings-toggle '+(notify[n.key]?'on':'')} aria-label={'Toggle '+n.title}><span/></button></div>)}
     <p className="settings-footnote">Preferences are stored in your current browser. Email notification delivery is not configured.</p>
    </>}
   </section>
  </div>
 </div>;
}
