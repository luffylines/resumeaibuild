'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,CheckCircle2,Eye,EyeOff,KeyRound,LoaderCircle,Lock,LogIn,UserRoundPlus,Mail,ShieldCheck,Sparkles,Clock3,RefreshCw,ClipboardPaste} from 'lucide-react';
import {browserSupabase,configured} from '@/lib/supabase';
import {authReturnUrl} from '@/lib/auth-return-url';
import {useToastMessages,toastAfterRedirect} from '@/lib/toast';
import {BrandMark,GoogleIcon} from '@/components/brand-icons';

type Mode='login'|'signup';
const OTP_COOLDOWN='resumebuilder:auth:next-otp-send';
const REQUEST_DELAY=60;
const OAUTH_ERRORS:Record<string,string>={
 auth:'Google sign-in could not be completed. Check the Google provider and redirect URLs in Supabase.',
 oauth_denied:'Google sign-in was cancelled or denied. Please try again.',
 oauth_provider:'Google sign-in is not enabled or configured correctly in the ResumeBuilder Supabase project.',
 oauth_exchange_failed:'Google sign-in could not create a session. Check the Supabase callback URL, browser cookies, and allowed redirect URLs.'
};
function authErrorMessage(reason:unknown):string{
 const e=reason&&typeof reason==='object'?reason as {message?:string;status?:number;code?:string}:{};
 const m=(e.message||'Something went wrong.').trim();
 const lower=m.toLowerCase();
 if(e.status===429||/rate limit|too many requests|security purposes.*seconds|over email send/i.test(lower)){
  return 'Too many requests. Supabase has temporarily limited this operation. Wait before retrying. If email delivery is failing, configure verified Resend SMTP in Supabase Authentication.';
 }
 if(/email address not authorized/i.test(lower))return 'This email cannot receive messages from the Supabase test email service. Configure Resend custom SMTP in Supabase first.';
 if(/email not confirmed/i.test(lower))return 'Please verify your email first. Check your inbox and spam folder; you can also use Google sign-in.';
 if(/invalid login credentials/i.test(lower))return 'Incorrect email or password, or this account has not been registered. Check your credentials or reset your password.';
 if(/provider.*not enabled|unsupported provider/i.test(lower))return OAUTH_ERRORS.oauth_provider;
 if(/email provider is disabled|email signups are disabled|signup.*disabled/i.test(lower))return 'Email registration is disabled in Supabase. Enable Email sign-in and Allow new users to sign up under Authentication settings.';
 return m.slice(0,220);
}
function readCooldown():number{
 try{return Math.max(0,Math.ceil((Number(sessionStorage.getItem(OTP_COOLDOWN)||0)-Date.now())/1000));}catch{return 0;}
}
function startCooldown():void{
 try{sessionStorage.setItem(OTP_COOLDOWN,String(Date.now()+REQUEST_DELAY*1000));}catch{}
}

export default function AuthForm({mode}:{mode:Mode}){
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 // New users get a conventional email/password registration first;
 // OTP is available, but the built-in Supabase mail quota is extremely low.
 const [otpMode,setOtpMode]=useState(false);
 const [code,setCode]=useState('');
 const [otpState,setOtpState]=useState<'idle'|'invalid'|'verified'>('idle');
 const [pasteNotice,setPasteNotice]=useState('');
 const otpInputRef=useRef<HTMLInputElement|null>(null);
 const [sent,setSent]=useState(false);
 const waitingForCode=sent&&(otpMode||mode==='signup');
 const [remaining,setRemaining]=useState(0);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 useToastMessages(error,message);
 const sb=browserSupabase();
 const logLogin=()=>fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'user_logged_in',detail:'User signed in to ResumeBuilder'})}).catch(()=>{});
 useEffect(()=>{
  setRemaining(readCooldown());
  const timer=window.setInterval(()=>setRemaining(readCooldown()),1000);
  return()=>window.clearInterval(timer);
 },[]);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const code=params.get('error');
  if(mode==='login'&&code)setError(OAUTH_ERRORS[code]||'Authentication was not completed. Try again.');
 },[mode]);
 useEffect(()=>{
  if(!sb)return;
  void sb.auth.getUser().then(({data})=>{if(data.user)window.location.assign('/app');});
 },[sb]);
 const run=async(fn:()=>Promise<void>)=>{
  if(busy)return;
  setBusy(true);setError('');setMessage('');
  try{await fn();}catch(e){
   const msg=authErrorMessage(e);
   if(msg.startsWith('Too many requests.')){startCooldown();setRemaining(readCooldown());}
   setError(msg);
  }finally{setBusy(false);}
 };
 const google=()=>run(async()=>{
  if(!sb)throw Error('Supabase is not connected to this website.');
  const {error:e}=await sb.auth.signInWithOAuth({
   provider:'google',
   options:{redirectTo:authReturnUrl('/auth/callback'),queryParams:{prompt:'select_account'}}
  });
  if(e)throw e;
 });
 const submit=()=>run(async()=>{
  if(!sb)throw Error('Supabase is not connected. Configure the dedicated ResumeBuilder project.');
  const normalized=email.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw Error('Enter a valid email address.');
  if(mode==='signup'&&!name.trim())throw Error('Enter your full name to create an account.');
  if(otpMode){
   if(remaining>0)throw Error('Please wait '+remaining+' seconds before requesting another email code.');
   const {error:e}=await sb.auth.signInWithOtp({
    email:normalized,
    options:{shouldCreateUser:mode==='signup',emailRedirectTo:authReturnUrl('/auth/callback'),
      ...(mode==='signup'?{data:{full_name:name.trim()}}:{})}
   });
   if(e)throw e;
   startCooldown();setRemaining(readCooldown());setSent(true);setCode('');setOtpState('idle');
   setMessage('Email code requested. Check your inbox or spam folder. If no email arrives, the Supabase Auth SMTP service may still need configuration.');
   return;
  }
  if(password.length<8)throw Error('Use a password with at least 8 characters.');
  if(mode==='signup'){
   const {data,error:e}=await sb.auth.signUp({
    email:normalized,password,options:{data:{full_name:name.trim()},emailRedirectTo:authReturnUrl('/auth/callback')}
   });
   if(e)throw e;
   if(data.session){
    await logLogin();window.location.assign('/app');
   }else{
    startCooldown();setRemaining(readCooldown());setSent(true);setCode('');setOtpState('idle');
    setMessage('We sent a verification message to your email. Enter the 6-digit code to activate your account. Your ResumeBuilder Supabase Confirm Sign Up template must include the six-digit {{ .Token }} variable.');
   }
  }else{
   const {error:e}=await sb.auth.signInWithPassword({email:normalized,password});
   if(e)throw e;
   await logLogin();window.location.assign('/app');
  }
 });
 const verify=()=>run(async()=>{
  if(!sb)throw Error('Supabase is not connected.');
  if(!/^\d{6}$/.test(code))throw Error('Enter a six-digit verification code.');
  try{
   const {error:e}=await sb.auth.verifyOtp({email:email.trim().toLowerCase(),token:code.trim(),type:'email'});
   if(e)throw e;
   setOtpState('verified');
   setMessage('Email verified! Opening your ResumeBuilder dashboard…');
   await logLogin();
   await new Promise(resolve=>setTimeout(resolve,700));
   window.location.assign('/app');
  }catch(e){
   setOtpState('invalid');
   throw e;
  }
 });
 function switchMethod(){
  setOtpMode(v=>!v);setSent(false);setCode('');setPassword('');setOtpState('idle');
  setError('');setMessage('');
 }
 const pasteCode=async()=>{
  try{
   if(!navigator.clipboard?.readText)throw Error('Clipboard access is unavailable.');
   const text=await navigator.clipboard.readText();
   const found=text.match(/(?:^|\D)(\d{6})(?=\D|$)/)?.[1]||text.replace(/\D/g,'').slice(0,6);
   if(found.length!==6){setPasteNotice('The clipboard does not contain a six-digit code. Copy the digits from your email, then paste.');otpInputRef.current?.focus();return;}
   setCode(found);setOtpState('idle');setError('');setPasteNotice('Code pasted. Select Verify Code to continue.');
  }catch{
   setPasteNotice('Your browser blocked reading the clipboard. Long-press the code box, then choose Paste.');
   otpInputRef.current?.focus();
  }
 };
 return <main className="auth-screen">
  <Link className="auth-back-brand" href="/"><span className="public-logo-mark"><BrandMark size={18}/></span> ResumeBuilder</Link>
  <section className="auth-story">
   <span className="public-pill"><Sparkles size={15}/> Your career starts here</span>
   <h1>Create a professional resume <span>with confidence.</span></h1>
   <p>Everything from building your resume to practicing for interviews, all in one simple workspace.</p>
   <div className="auth-story-preview"><div className="auth-story-paper"><strong>CHRISTIAN B. ARING</strong><small>IT PROFESSIONAL</small><i/><i/><i/><b>EXPERIENCE</b><i/><i/><b>SKILLS</b><i/></div><div className="auth-story-score"><CheckCircle2 size={20}/> ATS-friendly resume</div></div>
   <div className="auth-benefits"><span><CheckCircle2/> Build with AI</span><span><CheckCircle2/> Check ATS readiness</span><span><CheckCircle2/> Professional templates</span></div>
  </section>
  <section className="auth-form-area"><div className="auth-form-card">
   <div className="auth-form-icon">{mode==='signup'?<UserRoundPlus size={22} strokeWidth={1.9}/>:<LogIn size={22} strokeWidth={1.9}/>}</div>
   <h2>{mode==='signup'?'Create an Account':'Log In to ResumeBuilder'}</h2>
   <p>{mode==='signup'?'Get started with ResumeBuilder':'Welcome back! Sign in to continue your progress.'}</p>
   {!configured&&<div className="auth-warning">Supabase is not configured on this website yet.</div>}
   <button type="button" className="auth-google" aria-label="Continue with Google" disabled={!configured||busy} onClick={()=>void google()}>
    <GoogleIcon size={20}/> Continue with Google
   </button>
   <div className="auth-divider"><span>or continue with email</span></div>
   {mode==='signup'&&<label className="auth-input">Full name
    <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" autoComplete="name"/>
   </label>}
   <label className="auth-input">Email address
    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email"/>
   </label>
   {!otpMode&&<label className="auth-input">Password
    <div className="password-box"><Lock className="auth-password-icon" size={18} strokeWidth={1.8}/>
     <input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode==='signup'?'new-password':'current-password'}/>
     <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button>
    </div>
   </label>}
   {waitingForCode&&<div className="auth-otp-field">
    <div className="auth-otp-heading"><label htmlFor="resume-otp">6-digit email verification code</label><span>{otpState==='verified'?'Verified':otpState==='invalid'?'Try again':'Secure verification'}</span></div>
    <div className={'otp-code-box otp-state-'+otpState}>
     <input id="resume-otp" ref={otpInputRef} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
      value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,'').slice(0,6));setOtpState('idle');setError('');setPasteNotice('');}}
      onPaste={e=>{const value=e.clipboardData.getData('text');const digits=value.match(/(?:^|\D)(\d{6})(?=\D|$)/)?.[1]||value.replace(/\D/g,'').slice(0,6);if(digits){e.preventDefault();setCode(digits);setOtpState('idle');setError('');setPasteNotice('Code pasted.');}}}
      autoComplete="one-time-code" aria-label="Six-digit email verification code" aria-invalid={otpState==='invalid'} aria-describedby="otp-help"/>
     <div aria-hidden="true" className="otp-six">{Array.from({length:6},(_,i)=><span className={code[i]?'filled':''} key={i}>{code[i]||'·'}</span>)}</div>
    </div>
    <div className="auth-otp-assist"><p id="otp-help">{otpState==='invalid'?'That code was not accepted. Check your email and try again.':otpState==='verified'?'The code was confirmed by Supabase.':'Copy the code from your email and paste it here, or type all six digits.'}</p>
     <button type="button" className="auth-otp-paste" disabled={busy||otpState==='verified'} onClick={()=>void pasteCode()}><ClipboardPaste size={16}/> Paste code</button>
    </div>
    {pasteNotice&&<div className="auth-otp-paste-notice" role="status">{pasteNotice}</div>}
   </div>}
   {!otpMode&&mode==='login'&&<div className="auth-forgot-link"><Link href="/forgot-password">Forgot password?</Link></div>}
   {error&&<div role="alert" className="auth-error">{error}</div>}
   {message&&<div role="status" className="auth-success">{message}</div>}
   {waitingForCode&&remaining>0&&<div className="auth-cooldown" role="status"><Clock3 size={15}/> New email code available in {remaining}s. You can still enter a code already received.</div>}
   <button className="public-primary auth-submit" disabled={busy||!configured||!email.trim()||(!waitingForCode&&!otpMode&&password.length<8)||(waitingForCode&&code.length!==6)||(otpMode&&!sent&&remaining>0)}
    onClick={()=>void(waitingForCode?verify():submit())}>
    {busy?<LoaderCircle size={18} className="spin"/>:waitingForCode?<ShieldCheck size={17}/>:mode==='signup'?<Mail size={17}/>:<KeyRound size={17}/>}
    {busy?'Working…':waitingForCode?'Verify Code':otpMode?(remaining>0?'Wait '+remaining+'s':'Send OTP Code'):mode==='signup'?'Create Account':'Log In'}
    <ArrowRight size={17}/>
   </button>
   {waitingForCode&&<button type="button" className="auth-resend" disabled={busy||remaining>0} onClick={()=>void run(async()=>{
    if(!sb)throw Error('Supabase is not connected.');
    const address=email.trim().toLowerCase();
    if(otpMode){
     const {error:e}=await sb.auth.signInWithOtp({email:address,options:{shouldCreateUser:mode==='signup',emailRedirectTo:authReturnUrl('/auth/callback')}});
     if(e)throw e;
    }else{
     const {error:e}=await sb.auth.resend({type:'signup',email:address,options:{emailRedirectTo:authReturnUrl('/auth/callback')}});
     if(e)throw e;
    }
    setCode('');setOtpState('idle');startCooldown();setRemaining(readCooldown());
    setMessage('A new code has been requested. Check your inbox and spam folder.');
   })}>
    <RefreshCw size={15}/>{remaining>0?'Resend code in '+remaining+'s':'Resend verification code'}
   </button>}
   {!waitingForCode&&<button type="button" className="auth-mode-switch" disabled={busy} onClick={switchMethod}>{otpMode?'Use email and password instead':'Use an email OTP instead'}</button>}
   <div className="auth-switch">{mode==='signup'?<>Already have an account? <Link href="/login">Log In</Link></>:<>New to ResumeBuilder? <Link href="/signup">Create an account</Link></>}</div>
   <p className="auth-help"><ShieldCheck size={14}/> Confirmation and OTP emails are sent through Supabase Auth. Connect Resend as custom SMTP to deliver them.</p>
   <Link className="auth-demo-link" href="/app">Explore demo workspace <ArrowRight size={14}/></Link>
  </div></section>
 </main>;
}
