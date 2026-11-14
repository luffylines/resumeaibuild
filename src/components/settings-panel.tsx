'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import type {Resume} from '@/lib/types';
import {AlertCircle,ArrowRight,Bell,Camera,Check,CheckCircle2,Cloud,KeyRound,Lock,LogOut,Mail,Settings2,ShieldCheck,Sparkles,UserRound,WalletCards,X,UploadCloud,LoaderCircle} from 'lucide-react';
import {browserSupabase} from '@/lib/supabase';
import {GoogleIcon} from '@/components/brand-icons';
import {accountAvatar,isProfilePhotoPending,loadProfilePhoto,readProfilePhoto,removeProfilePhoto,retryProfilePhotoSync,saveProfilePhoto} from '@/lib/profile-photo';
import MfaPanel from '@/components/mfa-panel';

type Tab='account'|'subscription'|'integrations'|'security'|'notifications';
type Props={user:User|null;resumes:Resume[];signOut:()=>Promise<void>;initialTab?:Tab};
type Provider={name:'Gemini'|'OpenAI'|'Groq';status:'connected'|'unavailable'|'not_configured';model:string;message:string};
const menu:{id:Tab;label:string;icon:typeof UserRound}[]=[
 {id:'account',label:'Account',icon:UserRound},
 {id:'subscription',label:'Subscription',icon:WalletCards},
 {id:'integrations',label:'Integrations',icon:Cloud},
 {id:'security',label:'Security',icon:ShieldCheck},
 {id:'notifications',label:'Notifications',icon:Bell}
];

export default function SettingsPanel({user,resumes,signOut,initialTab='account'}:Props){
 const [tab,setTab]=useState<Tab>(initialTab);
 const [name,setName]=useState(user?.user_metadata?.full_name||'');
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [photo,setPhoto]=useState('');
 const [photoStatus,setPhotoStatus]=useState<'none'|'loading'|'uploading'|'synced'|'local-only'>('none');
 const photoInput=useRef<HTMLInputElement|null>(null);
 const photoInputId=useId();
 const photoLoadVersion=useRef(0);
 const [photoFileName,setPhotoFileName]=useState('');
 // Every error and success toast disappears after 5 seconds. Clear the
 // timer when a newer message arrives, avoiding old timers clearing new text.
 useEffect(()=>{
  if(!notice)return;
  const timer=window.setTimeout(()=>setNotice(''),5000);
  return()=>window.clearTimeout(timer);
 },[notice]);
 useEffect(()=>{
  if(!error)return;
  const timer=window.setTimeout(()=>setError(''),5000);
  return()=>window.clearTimeout(timer);
 },[error]);
 const [aiProviders,setAiProviders]=useState<Provider[]|null>(null);
 const [aiLoading,setAiLoading]=useState(false);
 const [aiCheckedAt,setAiCheckedAt]=useState('');
 const [notify,setNotify]=useState<Record<string,boolean>>(()=>{
  if(typeof window==='undefined')return {interview:true,resumes:true,product:false};
  try{return JSON.parse(localStorage.getItem('resume_notification_prefs')||'{"interview":true,"resumes":true,"product":false}') as Record<string,boolean>;}catch{return {interview:true,resumes:true,product:false};}
 });
 const sb=browserSupabase();
 useEffect(()=>{setName(user?.user_metadata?.full_name||'');},[user?.id,user?.user_metadata?.full_name]);
 useEffect(()=>{
  const id=user?.id;
  const version=++photoLoadVersion.current;
  const cached=id?readProfilePhoto(id):'';
  setPhoto(cached);
  setPhotoStatus(!id?'none':isProfilePhotoPending(id)?'local-only':'loading');
  if(!id)return;
  let active=true;
  void loadProfilePhoto(id).then(image=>{
   // A selected picture must NEVER be replaced by a stale request that
   // started before the user chose the file.
   if(!active||version!==photoLoadVersion.current)return;
   setPhoto(image||readProfilePhoto(id));
   setPhotoStatus(isProfilePhotoPending(id)?'local-only':image&&/^https?:\/\//.test(image)?'synced':'none');
  }).catch(()=>{
   if(active&&version===photoLoadVersion.current){
    setPhoto(readProfilePhoto(id));
    setPhotoStatus(isProfilePhotoPending(id)?'local-only':'none');
   }
  });
  return()=>{active=false;};
 },[user?.id]);
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
  setPhotoFileName(file.name);
  const version=++photoLoadVersion.current;
  if(!user){setError('Sign in before updating your profile photo.');return;}
  setBusy(true);setError('');setNotice('');setPhotoStatus('uploading');
  try{
   const saved=await saveProfilePhoto(user.id,file,image=>{
    if(version!==photoLoadVersion.current)return;
    setPhoto(image);
    setPhotoStatus('uploading');
   });
   if(version!==photoLoadVersion.current)return;
   setPhoto(saved.image);
   setPhotoStatus(saved.cloudSaved?'synced':'local-only');
   if(saved.cloudSaved)setNotice(saved.detail);
   else setError(saved.detail);
  }catch(e){
   if(version!==photoLoadVersion.current)return;
   setPhotoStatus(isProfilePhotoPending(user.id)?'local-only':'none');
   setError(e instanceof Error?e.message:'Could not process or save your profile photo.');
  }finally{setBusy(false);}
 };
 const retryCloudPhoto=async()=>{
  if(!user)return;
  setBusy(true);setError('');setNotice('');setPhotoStatus('uploading');
  try{
   const saved=await retryProfilePhotoSync(user.id);
   setPhoto(saved.image);setPhotoStatus('synced');setNotice(saved.detail);
  }catch(e){
   setPhotoStatus('local-only');
   setError(e instanceof Error?e.message:'Unable to sync your photo to the account.');
  }finally{setBusy(false);}
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
  {(error||notice)&&<div className="settings-toast-stack" aria-label="Account notifications">
   {error&&<div className="settings-toast settings-toast--error" role="alert" data-testid="account-error-toast">
    <span className="settings-toast-icon"><AlertCircle size={20}/></span>
    <span className="settings-toast-copy"><strong>Action failed</strong><span>{error}</span></span>
    <button type="button" className="settings-toast-close" aria-label="Dismiss error message" onClick={()=>setError('')}><X size={18}/></button>
    <span className="settings-toast-timer" aria-hidden="true"/>
   </div>}
   {notice&&<div className="settings-toast settings-toast--success" role="status" data-testid="account-success-toast">
    <span className="settings-toast-icon"><CheckCircle2 size={20}/></span>
    <span className="settings-toast-copy"><strong>Success</strong><span>{notice}</span></span>
    <button type="button" className="settings-toast-close" aria-label="Dismiss success message" onClick={()=>setNotice('')}><X size={18}/></button>
    <span className="settings-toast-timer" aria-hidden="true"/>
   </div>}
  </div>}
  <div className="page-heading"><div><div className="eyebrow">MY ACCOUNT</div><h1>Settings</h1><p>Manage your account, subscription and integrations.</p></div></div>
  <div className="settings-v2-layout">
   <nav className="settings-v2-nav" aria-label="Settings sections">{menu.map(n=>{const Icon=n.icon;return <button key={n.id} onClick={()=>{setTab(n.id);setNotice('');setError('');}} className={tab===n.id?'selected':''} aria-current={tab===n.id?'page':undefined}><span className="settings-tab-icon"><Icon size={18} strokeWidth={1.9}/></span>{n.label}<ArrowRight size={14}/></button>;})}</nav>
   <section className="settings-v2-panel panel">
    {tab==='account'&&<>
     <header><h2>Account Information</h2><p>Update how your profile appears inside ResumeBuilder.</p></header>
     <div className="settings-profile">
      <span className="settings-avatar">{activePhoto?<img src={activePhoto} alt="Profile picture"/>:(name||user?.email||'U').slice(0,1).toUpperCase()}</span>
      <div><strong>{name||user?.email?.split('@')[0]||'Demo User'}</strong><small>{user?.email||'Preview Account · Demo workspace'}</small></div>
     </div>
     <div className="settings-photo-tools">
      <input id={photoInputId} type="file" ref={photoInput} className="settings-photo-file-input" tabIndex={-1} aria-hidden="true" disabled={busy||!user} accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e=>{
       const file=e.currentTarget.files?.[0];
       e.currentTarget.value=''; // Allows choosing the same image again.
       void setProfileImage(file);
      }}/>
      <label htmlFor={photoInputId} role="button" tabIndex={busy||!user?-1:0} aria-disabled={busy||!user} className={'outline-button settings-photo-upload-label'+(busy||!user?' is-disabled':'')} onKeyDown={e=>{
       if((e.key==='Enter'||e.key===' ')&&!busy&&user){e.preventDefault();photoInput.current?.click();}
      }}><Camera size={16}/> {photoStatus==='uploading'?'Saving Photo…':photo?'Change Profile Photo':'Upload Profile Photo'}</label>
      {photoStatus==='local-only'&&user&&<button type="button" className="outline-button settings-photo-retry" disabled={busy} onClick={()=>void retryCloudPhoto()}><UploadCloud size={16}/> Retry Cloud Sync</button>}
      {photo&&<button type="button" className="outline-button" disabled={busy} onClick={()=>void (async()=>{
   if(!user)return;setBusy(true);setError('');setNotice('');
   try{
    const result=await removeProfilePhoto(user.id);
    if(result.localRemoved){setPhoto('');setPhotoStatus('none');setNotice(result.detail);}
    else setError(result.detail);
   }catch(e){setError(e instanceof Error?e.message:'Unable to remove photo.');}
   finally{setBusy(false);}
  })()}><X size={16}/> Remove Photo</button>}
     </div>
     {photoFileName&&<p className="settings-photo-file-name" role="status">Selected: <strong>{photoFileName}</strong></p>}
     {user&&photoStatus!=='none'&&<p className={'settings-photo-status settings-photo-status--'+photoStatus} role="status">
      {photoStatus==='uploading'?<><LoaderCircle size={16} className="spin"/> Uploading and verifying your picture…</>:
       photoStatus==='synced'?<><CheckCircle2 size={16}/> Saved to your account — available after refresh and on your other devices.</>:
       photoStatus==='local-only'?<><UploadCloud size={16}/> Saved on this browser only. Cloud sync is not complete; retry after configuring private Storage.</>:
       <><LoaderCircle size={16} className="spin"/> Checking saved profile picture…</>}
     </p>}
     <label className="settings-input">Full Name<input value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label>
     <label className="settings-input">Email Address<input disabled value={user?.email||'demo@example.com'} readOnly/></label>
     <div className="settings-actions">
      <button className="purple-button" disabled={busy} onClick={()=>void saveName()}><Check size={16}/> Save Profile</button>
      {user&&<button className="outline-button" onClick={()=>void signOut()}><LogOut size={16}/> Sign Out</button>}
     </div>
     <p className="settings-footnote">Photos upload automatically as soon as you select one. <strong>Save Profile</strong> updates your name only. To keep your picture after signing in on another device, the private <code>profile-avatars</code> Storage bucket must be configured in the dedicated ResumeBuilder Supabase project. Until cloud sync is verified, the app shows a local-only warning and a Retry Cloud Sync button.</p>
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
