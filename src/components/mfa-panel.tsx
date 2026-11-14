'use client';
import {useEffect,useRef,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {Check,CheckCircle2,Copy,KeyRound,LoaderCircle,RotateCcw,ShieldCheck,ShieldOff,Smartphone,X} from 'lucide-react';
import {browserSupabase} from '@/lib/supabase';
import {useToastMessages} from '@/lib/toast';

import {classifyFactors,removeUnverifiedFactors} from '@/lib/mfa-factors';
import type {MfaFactor as Factor,MfaFactorList as FactorList} from '@/lib/mfa-factors';

type Pending={id:string;qr:string;secret:string};
type Props={user:User|null;mode?:'settings'|'challenge';onVerified?:()=>void;onSignOut?:()=>Promise<void>};

function qrSource(qr:string){
 if(qr.startsWith('data:image/svg+xml')||qr.startsWith('data:image/png'))return qr;
 if(qr.trimStart().startsWith('<svg'))return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr);
 return '';
}

/** Actual Supabase TOTP setup:
 * enroll (unverified) -> scan QR or enter secret -> challenge -> verify
 * -> check VERIFIED factor. Cancelling/restarting unenrolls only unverified
 * factors, preventing the stale "already exists" enrollment error.
 */
export default function MfaPanel({user,mode='settings',onVerified,onSignOut}:Props){
 const sb=browserSupabase();
 const [factors,setFactors]=useState<Factor[]>([]);
 const [unfinished,setUnfinished]=useState<Factor[]>([]);
 const [pending,setPending]=useState<Pending|null>(null);
 const [code,setCode]=useState('');
 const lastAttemptRef=useRef('');
 const verifyInFlightRef=useRef(false);
 const successTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [loading,setLoading]=useState(false);
 const [initializing,setInitializing]=useState(true);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 useToastMessages(error,message);
 const [codeState,setCodeState]=useState<'idle'|'invalid'|'verified'>('idle');
 const [aal,setAal]=useState<'aal1'|'aal2'|'unknown'>('unknown');
 const refresh=async()=>{
  if(!sb||!user)return;
  const [list,level]=await Promise.all([sb.auth.mfa.listFactors(),sb.auth.mfa.getAuthenticatorAssuranceLevel()]);
  if(list.error)throw list.error;
  if(level.error)throw level.error;
  const factors=classifyFactors(list.data as FactorList);
  setFactors(factors.verified);
  setUnfinished(factors.unverified);
  setAal(level.data.currentLevel||'unknown');
  return factors;
 };
 useEffect(()=>{
  let live=true;
  setInitializing(true);setPending(null);setCode('');setCodeState('idle');lastAttemptRef.current='';
  if(!sb||!user){setInitializing(false);return;}
  void (async()=>{
   try{
    const [list,level]=await Promise.all([sb.auth.mfa.listFactors(),sb.auth.mfa.getAuthenticatorAssuranceLevel()]);
    if(!live)return;
    if(list.error)throw list.error;
    if(level.error)throw level.error;
    const factors=classifyFactors(list.data as FactorList);
    setFactors(factors.verified);setUnfinished(factors.unverified);
    setAal(level.data.currentLevel||'unknown');
   }catch(e){if(live)setError(e instanceof Error?e.message:'Could not load your security settings.');}
   finally{if(live)setInitializing(false);}
  })();
  return()=>{live=false;if(successTimerRef.current)clearTimeout(successTimerRef.current);};
 },[sb,user?.id]);

 const clearUnverified=async(items:Factor[])=>{
  if(!sb)return;
  await removeUnverifiedFactors(items,async factorId=>{
   const removed=await sb.auth.mfa.unenroll({factorId});
   if(removed.error)throw removed.error;
  });
 };
 const begin=async()=>{
  if(!sb||!user||loading||mode!=='settings')return;
  setLoading(true);setError('');setMessage('');setCodeState('idle');lastAttemptRef.current='';
  try{
   const latest=await sb.auth.mfa.listFactors();
   if(latest.error)throw latest.error;
   const existing=classifyFactors(latest.data as FactorList);
   if(existing.verified.length){
    setFactors(existing.verified);setUnfinished(existing.unverified);
    setMessage('Your authenticator is already verified. No additional setup is needed.');
    return;
   }
   // The secret from a previous, unverified attempt cannot be retrieved again.
   // Remove ONLY stale unverified factors, then issue a fresh, scannable QR.
   await clearUnverified(existing.unverified);
   const result=await sb.auth.mfa.enroll({
    factorType:'totp',
    friendlyName:'ResumeBuilder Authenticator '+Date.now().toString(36)
   });
   if(result.error)throw result.error;
   setPending({id:result.data.id,qr:result.data.totp.qr_code,secret:result.data.totp.secret});
   setCode('');setUnfinished([]);
   setMessage('Setup started — not enabled yet. Scan the QR code or enter the key manually, then submit the six-digit code from your authenticator.');
  }catch(e){
   setError((e instanceof Error?e.message:'Could not start authenticator setup.')+' If a setup is incomplete, use Restart Setup to receive a new QR code.');
   await refresh().catch(()=>{});
  }finally{setLoading(false);}
 };
 const cancel=async()=>{
  if(!sb||!pending||loading)return;
  setLoading(true);setError('');setMessage('');
  try{
   const result=await sb.auth.mfa.unenroll({factorId:pending.id});
   if(result.error)throw result.error;
   setPending(null);setCode('');setCodeState('idle');lastAttemptRef.current='';
   await refresh();
   setMessage('Unverified setup cancelled. Two-factor authentication was not enabled.');
  }catch(e){setError(e instanceof Error?e.message:'Could not cancel pending setup.');}
  finally{setLoading(false);}
 };
 const verify=async(attemptCode=code)=>{
  if(!sb||loading||verifyInFlightRef.current)return;
  verifyInFlightRef.current=true;
  const factorId=mode==='challenge'?factors[0]?.id:pending?.id;
  if(!factorId){verifyInFlightRef.current=false;setError('No authenticator has been set up. Select Set Up 2FA first.');return;}
  if(!/^\d{6}$/.test(attemptCode)){verifyInFlightRef.current=false;setCodeState('invalid');setError('Enter all six digits from the authenticator app.');return;}
  setLoading(true);setError('');setMessage('');setCodeState('idle');
  try{
   const challenge=await sb.auth.mfa.challenge({factorId});
   if(challenge.error)throw challenge.error;
   const result=await sb.auth.mfa.verify({factorId,challengeId:challenge.data.id,code:attemptCode});
   if(result.error)throw result.error;
   // Check the actual server status; do not mark a pending factor as active
   // just because a button was pressed or a QR was scanned.
   const actual=await refresh();
   if(mode==='settings'&&!actual?.verified.some(f=>f.id===factorId)){
    throw Error('The code was accepted, but Supabase has not yet confirmed the factor as verified. Refresh and try again.');
   }
   setCodeState('verified');setPending(null);
   setMessage(mode==='settings'?'Two-factor authentication is now enabled and verified.':'Authenticator verified. Opening your workspace…');
   if(mode==='challenge'){
    successTimerRef.current=setTimeout(()=>{onVerified?.();successTimerRef.current=null;},750);
   }else{
    setCode('');
    onVerified?.();
   }
  }catch(e){
   setCodeState('invalid');
   setError(e instanceof Error?e.message:'Incorrect or expired code. Wait for a fresh code in the authenticator app and try again.');
  }finally{verifyInFlightRef.current=false;setLoading(false);}
 };
 const disable=async(factorId:string)=>{
  if(!sb||!window.confirm('Remove this verified authenticator? Your account will be less protected.'))return;
  setLoading(true);setError('');setMessage('');
  try{
   const result=await sb.auth.mfa.unenroll({factorId});
   if(result.error)throw result.error;
   await sb.auth.refreshSession();
   await refresh();
   setMessage('Authenticator removed from your account.');
  }catch(e){setError(e instanceof Error?e.message:'You must verify the authenticator before removing an enabled factor.');}
  finally{setLoading(false);}
 };
 // A completed TOTP entry is submitted once, automatically.
 // Wrong codes turn red and cannot retrigger until the input changes.
 useEffect(()=>{
  if(!code||code.length!==6){
   lastAttemptRef.current='';
   return;
  }
  if(initializing||loading||codeState!=='idle')return;
  if(mode==='settings'&&!pending)return;
  if(mode==='challenge'&&!factors.length)return;
  if(lastAttemptRef.current===code)return;
  lastAttemptRef.current=code;
  void verify(code);
 },[code,mode,pending?.id,factors.length,loading,initializing,codeState]);

 const copyKey=async()=>{
  if(!pending)return;
  try{await navigator.clipboard.writeText(pending.secret);setMessage('Setup key copied. Paste it into your authenticator app.');}
  catch{setMessage('Select and copy the setup key manually.');}
 };
 if(!user)return <p className="settings-footnote">Sign in to set up two-factor authentication.</p>;
 if(initializing)return <div className="mfa-panel"><LoaderCircle size={17} className="spin"/> Loading security settings…</div>;
 return <div className="mfa-panel" aria-label="Authenticator two-factor authentication">
  <div className="mfa-panel-heading"><ShieldCheck size={22}/><div><strong>{mode==='challenge'?'Complete two-factor sign in':'Authenticator app (2FA)'}</strong><small>{factors.length?'Verified authenticator is enabled for this account.':'Enable 2FA by scanning the QR code and verifying a six-digit authenticator code.'}</small></div></div>
  {error&&<p className="settings-v2-error" role="alert">{error}</p>}
  {message&&<p className="settings-v2-notice" role="status"><CheckCircle2 size={17}/>{message}</p>}
  {mode==='challenge'&&factors.length>0&&<p className="mfa-note">Enter the six-digit code from your authenticator to finish signing in.</p>}
  {mode==='settings'&&factors.length>0&&<div className="mfa-enrolled"><span className="connected"><CheckCircle2 size={14}/> 2FA Enabled &amp; Verified</span>{factors.map(f=><div key={f.id} className="mfa-factor-row"><Smartphone size={18}/><span>{f.friendly_name||'Authenticator app'}</span><button type="button" disabled={loading||aal!=='aal2'} onClick={()=>void disable(f.id)}><ShieldOff size={15}/> Remove</button></div>)}{aal!=='aal2'&&<p className="mfa-note">Complete your authenticator challenge before removing a verified factor.</p>}</div>}
  {mode==='challenge'&&factors.length===0&&<p className="mfa-note">No verified authenticator was found. Sign out and sign in again if this screen continues to appear.</p>}
  {mode==='settings'&&!factors.length&&!pending&&<>
   {unfinished.length>0&&<p className="mfa-note" role="status">Your previous authenticator setup was never verified. Two-factor authentication is still off. Select Restart Setup to safely replace only the incomplete setup and receive a new QR code.</p>}
   <button className="purple-button" type="button" disabled={loading} onClick={()=>void begin()}>{loading?<LoaderCircle size={16} className="spin"/>:unfinished.length?<RotateCcw size={16}/>:<KeyRound size={16}/>} {unfinished.length?'Restart Setup':'Set Up 2FA'}</button>
  </>}
  {pending&&mode==='settings'&&<div className="mfa-enroll">
   <span className="mfa-status-pending"><ShieldCheck size={15}/> Setup in progress · Not enabled yet</span>
   <p>Step 1: Open Google Authenticator or Microsoft Authenticator. Scan this QR code, or add the account using the key below.</p>
   {qrSource(pending.qr)?<img src={qrSource(pending.qr)} alt="Authenticator setup QR code" width={192} height={192}/>:<p role="alert">QR preview unavailable. Use the manual setup key instead.</p>}
   <details><summary>Can't scan? Use the manual setup key</summary><div className="mfa-manual-key"><code>{pending.secret}</code><button type="button" onClick={()=>void copyKey()}><Copy size={15}/> Copy key</button></div></details>
   <p>Step 2: Your authenticator will show a new six-digit code about every 30 seconds. Enter that code below to finish enabling 2FA.</p>
   <button className="outline-button" type="button" onClick={()=>void cancel()} disabled={loading}><X size={15}/> Cancel Setup</button>
  </div>}
  {((mode==='challenge'&&factors.length>0)||(mode==='settings'&&!!pending))&&<div className="mfa-verify">
   <div className="mfa-otp-heading"><label htmlFor={'mfa-code-'+mode}>Six-digit authenticator code</label><span>{codeState==='verified'?'Verified':codeState==='invalid'?'Invalid code':'Secure verification'}</span></div>
   <div className={'mfa-otp-box mfa-otp-'+codeState}>
    <input id={'mfa-code-'+mode} value={code} onChange={e=>{const next=e.target.value.replace(/\D/g,'').slice(0,6);setCode(next);setCodeState('idle');setError('');if(next.length<6)lastAttemptRef.current='';}} onPaste={e=>{
      const raw=e.clipboardData.getData('text');const match=raw.match(/(?:^|\D)(\d{6})(?=\D|$)/)?.[1]||raw.replace(/\D/g,'').slice(0,6);
      if(match){e.preventDefault();setCode(match);setCodeState('idle');setError('');if(match!==lastAttemptRef.current)lastAttemptRef.current='';}
    }} inputMode="numeric" type="text" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
      aria-label="Six-digit authenticator code" aria-invalid={codeState==='invalid'} aria-describedby="mfa-auto-hint"/>
    <div className="mfa-otp-digits" aria-hidden="true">{Array.from({length:6},(_,i)=><span key={i} className={code[i]?'filled':''}>{code[i]||'·'}</span>)}</div>
   </div>
   <p className="mfa-auto-hint" id="mfa-auto-hint">{loading?'Checking your code with Supabase…':codeState==='invalid'?'Incorrect or expired code. Enter a fresh six-digit code.':codeState==='verified'?'Verified successfully.': 'The code verifies automatically after the sixth digit. You can also paste it.'}</p>
   <button className="mfa-verify-button" disabled={loading||code.length!==6||codeState==='verified'} type="button" onClick={()=>void verify(code)}>{loading?<LoaderCircle size={18} className="spin"/>:codeState==='verified'?<CheckCircle2 size={18}/>:<ShieldCheck size={18}/>} {loading?'Verifying your code…':codeState==='verified'?'Verification successful':mode==='challenge'?'Verify & Continue':'Verify & Enable 2FA'}</button>
  </div>}
  {mode==='challenge'&&onSignOut&&<button className="outline-button" type="button" onClick={()=>void onSignOut()} disabled={loading}>Sign Out</button>}
  <p className="settings-footnote">Your 2FA is only active when Supabase verifies the six-digit authenticator code. Never share the QR code or manual setup key. You can configure a backup authenticator device after activation.</p>
 </div>;
}
