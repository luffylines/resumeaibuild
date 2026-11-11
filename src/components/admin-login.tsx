'use client';
import Link from 'next/link';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,Eye,EyeOff,LockKeyhole,ShieldCheck,LoaderCircle,Mail,KeyRound,PlayCircle} from 'lucide-react';
import {BrandMark} from '@/components/brand-icons';
import {browserSupabase,configured} from '@/lib/supabase';

export default function AdminLogin(){
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [visible,setVisible]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!configured){setError('Connect your new ResumeBuilder Supabase project to enable real admin login.');return;}
  setError('');setBusy(true);
  const sb=browserSupabase();
  if(!sb){setError('The database connection is not configured.');setBusy(false);return;}
  try{
   const {data,error:loginError}=await sb.auth.signInWithPassword({email:email.trim(),password});
   if(loginError||!data.user)throw new Error(loginError?.message||'Invalid credentials.');
   const {data:role,error:roleError}=await (sb as any).from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();
   if(roleError||!role){await sb.auth.signOut();throw new Error('This account does not have admin permission. Ask the project owner to assign your user ID in Supabase.');}
   // Server re-verifies membership. A failed optional login audit does not
   // grant or remove admin permission.
   try{await fetch('/api/admin/login-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'admin_login'})});}catch{}
   window.location.assign('/admin');
  }catch(ex){setError(ex instanceof Error?ex.message:'Unable to sign in.');setBusy(false);}
 }
 return <main className="admin-login-page">
  <div className="admin-login-head"><Link href="/" className="public-logo"><span className="public-logo-mark"><BrandMark size={20}/></span> ResumeBuilder</Link><Link href="/app"><ArrowLeft size={16}/> User Workspace</Link></div>
  <div className="admin-login-layout">
   <aside className="admin-login-story"><span className="admin-login-pill"><ShieldCheck size={17}/> RESTRICTED ADMIN PORTAL</span><h1>Manage your platform with confidence.</h1><p>An exclusive workspace for account management, activity monitoring, audit trails and platform operations.</p><div className="admin-login-story-art"><span><ShieldCheck size={52}/></span><div><strong>Secure by design</strong><small>Authentication + server-verified administrator role</small></div></div><p className="admin-login-security"><LockKeyhole size={17}/> Administrator access is granted manually in your separate Supabase project.</p></aside>
   <section className="admin-login-card"><span className="admin-login-icon"><LockKeyhole size={23}/></span><h2>Administrator Login</h2><p>Sign in with your authorized ResumeBuilder admin account.</p>
    {error&&<div className="admin-login-error" role="alert">{error}</div>}
    {configured?<form onSubmit={e=>void submit(e)}><label><span><Mail size={15}/> Admin Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="username" required/></label><label><span><KeyRound size={15}/> Password</span><div className="admin-login-password"><input type={visible?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required minLength={6}/><button type="button" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(x=>!x)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label><button type="submit" className="admin-login-submit" disabled={busy||!email.trim()||!password}>{busy?<LoaderCircle className="spin" size={18}/>:<LockKeyhole size={18}/>} {busy?'Verifying account…':'Log In to Admin Dashboard'} <ArrowRight size={17}/></button></form>:
     <div className="admin-login-demo-warning"><ShieldCheck size={19}/><span>Live admin login is not ready until you configure a NEW ResumeBuilder Supabase project. The preview contains example data only.</span></div>}
    <div className="admin-login-bottom"><Link href="/forgot-password">Forgot password?</Link><Link href="/app">Return to User Dashboard</Link></div>
    {!configured&&<Link href="/admin/preview" className="admin-preview-action"><PlayCircle size={18}/> Explore sample Admin Dashboard <ArrowRight size={16}/></Link>}
    <div className="admin-login-assurance"><ShieldCheck size={16}/> Credentials and administrator role are checked with Supabase, never hardcoded in this website.</div>
   </section>
  </div>
 </main>;
}
