'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Eye,EyeOff,LockKeyhole,ShieldCheck,LoaderCircle,Mail,KeyRound,PlayCircle,AlertCircle,CheckCircle2} from 'lucide-react';
import {BrandMark,GoogleIcon} from '@/components/brand-icons';
import {browserSupabase,configured} from '@/lib/supabase';
import {authReturnUrl} from '@/lib/auth-return-url';

const oauthMessages:Record<string,string>={
 auth:'Google sign-in was not completed. Check the ResumeBuilder Supabase authentication configuration.',
 oauth_denied:'Google sign-in was cancelled or denied. Choose your Google account and try again.',
 oauth_provider:'Google sign-in is not enabled or correctly configured in the dedicated ResumeBuilder Supabase project.',
 oauth_exchange_failed:'Google authentication could not establish a session. Check the OAuth callback URL, allowed redirect URLs and cookies.',
 not_admin:'Google sign-in succeeded, but this account is not an authorized ResumeBuilder administrator. Contact the project owner to grant admin access to your Supabase user ID.',
 admin_role_unavailable:'We could not verify your admin role. Check the admin_users table and its SELECT policy in the dedicated ResumeBuilder Supabase project.'
};
function passwordError(error:unknown){
 const e=error&&typeof error==='object'?error as {message?:string;code?:string;status?:number}:{};
 const message=(e.message||'Unable to log in.').trim();
 if(e.code==='invalid_credentials'||/invalid login credentials/i.test(message))return 'Email/password sign-in was not accepted by Supabase. Make sure this email is registered in the ResumeBuilder project. If you created the account with Google, use Continue with Google or reset your password.';
 if(e.code==='email_not_confirmed'||/email not confirmed/i.test(message))return 'Your email is not verified yet. Complete the email confirmation before logging in.';
 if(e.status===429||/rate.limit|too many requests/i.test(message))return 'Too many sign-in attempts. Wait before trying again, or use password recovery.';
 if(e.code==='email_provider_disabled')return 'Email/password sign-in is disabled for this Supabase project. Use Google or contact the project owner.';
 return 'Unable to sign in. Check your account, authentication settings, or try password recovery.';
}

export default function AdminLogin(){
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [visible,setVisible]=useState(false);
 const [busy,setBusy]=useState<'password'|'google'|null>(null);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const sb=browserSupabase();

 useEffect(()=>{
  const reason=new URLSearchParams(window.location.search).get('error');
  if(reason)setError(oauthMessages[reason]||'Administrator sign-in was not completed. Please try again.');
 },[]);

 const accessCheck=async()=>{
  const response=await fetch('/api/admin/access-check',{credentials:'same-origin',cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.authorized){
   if(response.status===401)throw new Error('Your Supabase session was not available to the server. Check cookies and ensure you are on the correct ResumeBuilder production domain.');
   throw new Error(typeof data.error==='string'?data.error:'Your account is not authorized for administrator access.');
  }
 };

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy)return;
  if(!configured){setError('Connect the dedicated ResumeBuilder Supabase project first.');return;}
  setError('');setNotice('');setBusy('password');
  if(!sb){setError('ResumeBuilder Supabase authentication is not configured.');setBusy(null);return;}
  try{
   const {data,error:loginError}=await sb.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
   if(loginError||!data.user)throw {kind:'password',error:loginError};
   await accessCheck();
   setNotice('Admin account verified. Opening your dashboard…');
   // Role is also verified on the server by /admin and every admin API.
   try{await fetch('/api/admin/login-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'admin_login'})});}catch{}
   window.location.assign('/admin');
  }catch(reason){
   const err=reason&&typeof reason==='object'?reason as {kind?:string;error?:unknown}:{};
   setError(err.kind==='password'?passwordError(err.error):reason instanceof Error?reason.message:'Unable to sign in. Try again.');
   setBusy(null);
  }
 }

 async function signInGoogle(){
  if(busy)return;
  setError('');setNotice('');setBusy('google');
  try{
   if(!sb)throw Error('ResumeBuilder Supabase authentication is not configured.');
   const redirect=authReturnUrl('/auth/callback')+'?next=admin';
   const {error:oauthError}=await sb.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:redirect,queryParams:{prompt:'select_account'}}
   });
   if(oauthError)throw oauthError;
   // Browser redirects to Google; callback verifies admin membership server-side.
  }catch(reason){
   const message=reason instanceof Error?reason.message:'';
   setError(/provider.*not enabled|unsupported provider/i.test(message)?oauthMessages.oauth_provider:
    /redirect|callback|pkce|code verifier/i.test(message)?oauthMessages.oauth_exchange_failed:
    /rate.limit|too many requests/i.test(message)?'Google sign-in is temporarily rate-limited. Try again later.':
    'Unable to start Google sign-in. Check the ResumeBuilder Google provider and callback URL configuration.');
   setBusy(null);
  }
 }
 return <main className="admin-login-page">
  <div className="admin-login-head"><Link href="/" className="public-logo"><span className="public-logo-mark"><BrandMark size={46}/></span> ResumeBuilder</Link><Link href="/app"><ArrowLeft size={16}/> User Workspace</Link></div>
  <div className="admin-login-layout">
   <aside className="admin-login-story"><span className="admin-login-pill"><ShieldCheck size={17}/> RESTRICTED ADMIN PORTAL</span><h1>Manage your platform with confidence.</h1><p>An exclusive workspace for account management, activity monitoring, audit trails and platform operations.</p><div className="admin-login-story-art"><span><ShieldCheck size={52}/></span><div><strong>Secure by design</strong><small>Google or password authentication + server-verified admin access</small></div></div><p className="admin-login-security"><LockKeyhole size={17}/> Administrator access must be granted by the owner of your ResumeBuilder Supabase project.</p></aside>
   <section className="admin-login-card"><span className="admin-login-icon"><LockKeyhole size={23}/></span><h2>Administrator Login</h2><p>Sign in with a verified ResumeBuilder account that has administrator permission.</p>
    {error&&<div className="admin-login-error" role="alert"><AlertCircle size={17}/><span>{error}</span></div>}
    {notice&&<div className="admin-login-success" role="status"><CheckCircle2 size={17}/>{notice}</div>}
    {configured?<div className="admin-login-auth-options">
      <button className="admin-login-google" type="button" onClick={()=>void signInGoogle()} disabled={!!busy}><GoogleIcon size={21}/><span>{busy==='google'?'Connecting to Google…':'Continue with Google'}</span>{busy==='google'&&<LoaderCircle size={17} className="spin"/>}</button>
      <div className="admin-login-divider"><span>or sign in with email</span></div>
      <form onSubmit={e=>void submit(e)}><label><span><Mail size={15}/> Admin Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="username" required/></label><label><span><KeyRound size={15}/> Password</span><div className="admin-login-password"><input type={visible?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required minLength={6}/><button type="button" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(x=>!x)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label><button type="submit" className="admin-login-submit" disabled={!!busy||!email.trim()||!password}>{busy==='password'?<LoaderCircle className="spin" size={18}/>:<LockKeyhole size={18}/>} {busy==='password'?'Verifying your account…':'Log In to Admin Dashboard'} <ArrowRight size={17}/></button></form>
     </div>:<div className="admin-login-demo-warning"><ShieldCheck size={19}/><span>Live administrator login is unavailable until the dedicated ResumeBuilder Supabase project is configured.</span></div>}
    <div className="admin-login-bottom"><Link href="/forgot-password">Forgot password?</Link><Link href="/app">Return to User Dashboard</Link></div>
    {!configured&&<Link href="/admin/preview" className="admin-preview-action"><PlayCircle size={18}/> Explore sample Admin Dashboard <ArrowRight size={16}/></Link>}
    <div className="admin-login-assurance"><ShieldCheck size={16}/> Google authentication alone does not grant administrator access. Admin role permissions are checked on the server.</div>
   </section>
  </div>
 </main>;
}
