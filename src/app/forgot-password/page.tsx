'use client';
import {useState} from 'react';
import Link from 'next/link';
import {BrandMark} from '@/components/brand-icons';
import {ArrowLeft,ArrowRight,CheckCircle2,FileText,KeyRound,Mail} from 'lucide-react';
import {browserSupabase,configured} from '@/lib/supabase';
export default function ForgotPassword(){
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const send=async()=>{const sb=browserSupabase();if(!sb){setError('Connect your dedicated Supabase project first.');return;}setBusy(true);setError('');setMessage('');try{const {error:e}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/auth/reset'});if(e)throw e;setMessage('If this account exists, password reset instructions were sent to the email address.');}catch(e){setError(e instanceof Error?e.message:'Unable to send email.');}finally{setBusy(false);}};
 return <main className="password-page"><div className="password-card"><Link href="/" className="public-logo"><span className="public-logo-mark"><BrandMark size={19}/></span>ResumeBuilder</Link><span className="password-icon"><KeyRound size={24}/></span><h1>Forgot Your Password?</h1><p>Enter your email address and we’ll send you a secure password reset link.</p><label className="auth-input">Email address<input value={email} type="email" onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>{error&&<div className="auth-error" role="alert">{error}</div>}{message&&<div className="auth-success" role="status"><CheckCircle2 size={17}/>{message}</div>}<button disabled={busy||!configured||!email.includes('@')} className="public-primary auth-submit" onClick={()=>void send()}><Mail size={17}/>{busy?'Sending...':'Send Reset Link'}<ArrowRight size={17}/></button><Link className="auth-demo-link" href="/login"><ArrowLeft size={15}/> Back to Log In</Link></div></main>;
}
