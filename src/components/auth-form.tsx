'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,Eye,EyeOff,FileText,KeyRound,LoaderCircle,Lock,Mail,ShieldCheck,Sparkles} from 'lucide-react';
import {browserSupabase,configured} from '@/lib/supabase';
export default function AuthForm({mode}:{mode:'login'|'signup'}){
 const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false);const [otpMode,setOtpMode]=useState(mode==='signup');const [code,setCode]=useState('');const [sent,setSent]=useState(false);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
 const sb=browserSupabase();
 useEffect(()=>{if(!sb)return;void sb.auth.getUser().then(({data})=>{if(data.user)window.location.assign('/app');});},[sb]);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setMessage('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Something went wrong.');}finally{setBusy(false);}};
 const google=()=>run(async()=>{if(!sb)throw Error('Please configure a new Supabase project first.');const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/auth/callback'}});if(error)throw error;});
 const submit=()=>run(async()=>{
  if(!sb)throw Error('Supabase is not connected. Create a separate ResumeBuilder project first.');
  if(!email.includes('@'))throw Error('Please enter a valid email address.');
  if(otpMode){const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:mode==='signup'}});if(error)throw error;setSent(true);setMessage('A verification code was sent if this email is eligible. Please check your inbox.');return;}
  if(password.length<6)throw Error('Password must contain at least 6 characters.');
  if(mode==='signup'){
   const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name.trim()},emailRedirectTo:location.origin+'/auth/callback'}});
   if(error)throw error;
   if(data.session)window.location.assign('/app');else setMessage('Check your inbox to confirm your email address before logging in.');
  } else {const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;window.location.assign('/app');}
 });
 const verify=()=>run(async()=>{if(!sb)throw Error('Supabase not connected.');const {error}=await sb.auth.verifyOtp({email,token:code,type:'email'});if(error)throw error;window.location.assign('/app');});
 return <main className="auth-screen"><Link className="auth-back-brand" href="/"><span className="public-logo-mark"><FileText size={18}/></span> ResumeBuilder</Link>
 <section className="auth-story"><span className="public-pill"><Sparkles size={15}/> Your career starts here</span><h1>Create a professional resume <span>with confidence.</span></h1><p>Everything from building your resume to practicing for interviews, all in one simple workspace.</p><div className="auth-story-preview"><div className="auth-story-paper"><strong>CHRISTIAN B. ARING</strong><small>IT PROFESSIONAL</small><i/><i/><i/><b>EXPERIENCE</b><i/><i/><b>SKILLS</b><i/></div><div className="auth-story-score"><CheckCircle2 size={20}/> ATS-friendly resume</div></div><div className="auth-benefits"><span><CheckCircle2/> Build with AI</span><span><CheckCircle2/> Check ATS readiness</span><span><CheckCircle2/> Track job applications</span></div></section>
 <section className="auth-form-area"><div className="auth-form-card"><div className="auth-form-icon"><Lock size={21}/></div><h2>{mode==='signup'?'Create an Account':'Log In to ResumeBuilder'}</h2><p>{mode==='signup'?'Get started with ResumeBuilder':'Welcome back! Sign in to continue your progress.'}</p>{!configured&&<div className="auth-warning">Supabase is not configured yet. You can explore the demo or connect your new project.</div>}
 <button type="button" className="auth-google" disabled={!configured||busy} onClick={()=>void google()}><span>G</span> Continue with Google</button><div className="auth-divider"><span>or continue with email</span></div>
 {mode==='signup'&&!otpMode&&<label className="auth-input">Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" autoComplete="name"/></label>}
 <label className="auth-input">Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email"/></label>
 {!otpMode&&<label className="auth-input">Password<div className="password-box"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode==='signup'?'new-password':'current-password'}/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
 {otpMode&&sent&&<label className="auth-input">6-digit verification code<div className="otp-code-box"><input id="resume-otp" inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} autoComplete="one-time-code" aria-label="Six-digit email verification code"/><div aria-hidden="true" className="otp-six">{Array.from({length:6},(_,i)=><span key={i}>{code[i]||'·'}</span>)}</div></div></label>}
 {!otpMode&&mode==='login'&&<div className="auth-forgot-link"><Link href="/forgot-password">Forgot password?</Link></div>}
 {error&&<div role="alert" className="auth-error">{error}</div>}{message&&<div role="status" className="auth-success">{message}</div>}
 <button className="public-primary auth-submit" disabled={busy||!configured||!email||(otpMode&&sent&&code.length!==6)} onClick={()=>void (otpMode&&sent?verify():submit())}>{busy?<LoaderCircle size={18} className="spin"/>:otpMode&&sent?<ShieldCheck size={17}/>:mode==='signup'?<Mail size={17}/>:<KeyRound size={17}/>} {otpMode?(sent?'Verify OTP':'Send OTP Code'):mode==='signup'?'Create Account':'Log In'} <ArrowRight size={17}/></button>
 <button type="button" className="auth-mode-switch" onClick={()=>{setOtpMode(x=>!x);setSent(false);setError('');setMessage('');}}>{otpMode?'Use a password instead':'Use an email OTP instead'}</button>
 <div className="auth-switch">{mode==='signup'?<>Already have an account? <Link href="/login">Log In</Link></>:<>New to ResumeBuilder? <Link href="/signup">Create an account</Link></>}</div><p className="auth-help"><ShieldCheck size={14}/> Your account data is private. Email OTP requires a configured Supabase email template.</p><Link className="auth-demo-link" href="/app">Explore demo workspace <ArrowRight size={14}/></Link></div></section>
 </main>
}
