'use client';
import {useEffect,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {CheckCircle2,KeyRound,LoaderCircle,ShieldCheck,ShieldOff,Smartphone,X} from 'lucide-react';
import {browserSupabase} from '@/lib/supabase';

type Factor={id:string;friendly_name?:string;status?:string};
type Pending={id:string;qr:string;secret:string};
type Props={user:User|null;mode?:'settings'|'challenge';onVerified?:()=>void;onSignOut?:()=>Promise<void>};

/** Supabase TOTP enroll/challenge/verify. UI state is not an MFA bypass:
 * protected APIs must still check the AAL claim on the server.
 */
export default function MfaPanel({user,mode='settings',onVerified,onSignOut}:Props){
 const sb=browserSupabase();
 const [factors,setFactors]=useState<Factor[]>([]);
 const [pending,setPending]=useState<Pending|null>(null);
 const [code,setCode]=useState('');
 const [loading,setLoading]=useState(false);
 const [initializing,setInitializing]=useState(true);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [aal,setAal]=useState<'aal1'|'aal2'|'unknown'>('unknown');
 const refresh=async()=>{
  if(!sb||!user){setInitializing(false);return;}
  const [list,level]=await Promise.all([sb.auth.mfa.listFactors(),sb.auth.mfa.getAuthenticatorAssuranceLevel()]);
  if(list.error)throw list.error;
  if(level.error)throw level.error;
  setFactors(list.data.totp.filter(f=>f.status==='verified'));
  setAal(level.data.currentLevel||'unknown');
 };
 useEffect(()=>{
  let live=true;
  if(!sb||!user){setInitializing(false);return;}
  void (async()=>{
   try{
    const [list,level]=await Promise.all([sb.auth.mfa.listFactors(),sb.auth.mfa.getAuthenticatorAssuranceLevel()]);
    if(!live)return;
    if(list.error)throw list.error;
    if(level.error)throw level.error;
    setFactors(list.data.totp.filter(f=>f.status==='verified'));
    setAal(level.data.currentLevel||'unknown');
   }catch(e){if(live)setError(e instanceof Error?e.message:'Could not load your security settings.');}
   finally{if(live)setInitializing(false);}
  })();
  return()=>{live=false;};
 },[sb,user?.id]);
 const begin=async()=>{
  if(!sb||!user)return;
  setLoading(true);setError('');setMessage('');
  try{
   const result=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'ResumeBuilder Authenticator'});
   if(result.error)throw result.error;
   setPending({id:result.data.id,qr:result.data.totp.qr_code,secret:result.data.totp.secret});
   setCode('');
  }catch(e){setError(e instanceof Error?e.message:'Could not start authenticator setup.');}
  finally{setLoading(false);}
 };
 const verify=async()=>{
  if(!sb)return;
  const factorId=mode==='challenge'?factors[0]?.id:pending?.id;
  if(!factorId){setError('No authenticator found. Please set it up first.');return;}
  if(!/^\d{6}$/.test(code)){setError('Enter the six-digit code from your authenticator app.');return;}
  setLoading(true);setError('');setMessage('');
  try{
   const challenge=await sb.auth.mfa.challenge({factorId});
   if(challenge.error)throw challenge.error;
   const result=await sb.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});
   if(result.error)throw result.error;
   setPending(null);setCode('');setAal('aal2');
   await refresh();
   setMessage('Two-factor authentication verified.');
   onVerified?.();
  }catch(e){setError(e instanceof Error?e.message:'Incorrect or expired code. Please try again.');}
  finally{setLoading(false);}
 };
 const disable=async(factorId:string)=>{
  if(!sb||!window.confirm('Remove this authenticator? Your account will have less protection.'))return;
  setLoading(true);setError('');setMessage('');
  try{
   const result=await sb.auth.mfa.unenroll({factorId});
   if(result.error)throw result.error;
   await sb.auth.refreshSession();
   await refresh();
   setMessage('Authenticator removed from your account.');
  }catch(e){setError(e instanceof Error?e.message:'Could not remove authenticator. Verify 2FA first.');}
  finally{setLoading(false);}
 };
 if(!user)return <p className="settings-footnote">Sign in to set up two-factor authentication.</p>;
 if(initializing)return <div className="mfa-panel"><LoaderCircle size={17} className="spin"/> Loading security settings…</div>;
 return <div className="mfa-panel" aria-label="Authenticator two-factor authentication">
  <div className="mfa-panel-heading"><ShieldCheck size={22}/><div><strong>{mode==='challenge'?'Complete two-factor sign in':'Authenticator app (2FA)'}</strong><small>{factors.length? 'An authenticator is enrolled on this account.':'Protect your account with Google Authenticator, Microsoft Authenticator or another TOTP app.'}</small></div></div>
  {error&&<p className="settings-v2-error" role="alert">{error}</p>}
  {message&&<p className="settings-v2-notice" role="status"><CheckCircle2 size={17}/>{message}</p>}
  {mode==='challenge'&&factors.length>0&&<p className="mfa-note">Enter the current six-digit code to continue to your account. This is required after your normal sign in.</p>}
  {mode==='settings'&&factors.length>0&&<div className="mfa-enrolled"><span className="connected"><CheckCircle2 size={14}/> 2FA Enabled</span>{factors.map(f=><div key={f.id} className="mfa-factor-row"><Smartphone size={18}/><span>{f.friendly_name||'Authenticator app'}</span><button type="button" disabled={loading||aal!=='aal2'} onClick={()=>void disable(f.id)}><ShieldOff size={15}/> Remove</button></div>)}{aal!=='aal2'&&<p className="mfa-note">Verify your authenticator first before removing it.</p>}</div>}
  {mode==='challenge'&&factors.length===0&&<p className="mfa-note">No verified TOTP factor was found. Sign out and contact support if your account still requests a code.</p>}
  {mode==='settings'&&factors.length===0&&!pending&&<button className="purple-button" type="button" disabled={loading} onClick={()=>void begin()}><KeyRound size={16}/> {loading?'Preparing…':'Set Up 2FA'}</button>}
  {pending&&mode==='settings'&&<div className="mfa-enroll">
   <p>Scan this QR code with your authenticator app, then enter its six-digit code.</p>
   {pending.qr.startsWith('data:image/')&&<img src={pending.qr} alt="Scan to connect authenticator app" width={192} height={192}/>}
   <details><summary>Can't scan? Enter the setup key manually</summary><code>{pending.secret}</code></details>
   <button className="outline-button" type="button" onClick={()=>{setPending(null);setCode('');}} disabled={loading}><X size={15}/> Cancel Setup</button>
  </div>}
  {(mode==='challenge'&&factors.length>0||mode==='settings'&&pending)&&<div className="mfa-verify">
   <label htmlFor={'mfa-code-'+mode}>Six-digit authenticator code</label>
   <input id={'mfa-code-'+mode} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" placeholder="000000" maxLength={6}/>
   <button className="purple-button" disabled={loading||code.length!==6} type="button" onClick={()=>void verify()}>{loading?<LoaderCircle size={16} className="spin"/>:<ShieldCheck size={16}/>} {mode==='challenge'?'Verify and Continue':'Enable 2FA'}</button>
  </div>}
  {mode==='challenge'&&onSignOut&&<button className="outline-button" type="button" onClick={()=>void onSignOut()} disabled={loading}>Sign Out</button>}
  <p className="settings-footnote">Do not share the QR code or secret. Supabase Auth verifies codes; they are not saved in the browser. Add another authenticator device before losing access to your current one.</p>
 </div>;
}
