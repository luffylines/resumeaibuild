'use client';
import {useEffect} from 'react';

export type ToastKind='success'|'error'|'info';
export type ToastPayload={kind:ToastKind;message:string;title?:string;durationMs?:number};
export const TOAST_EVENT='resumebuilder:toast:v1';
export const TOAST_NEXT_PAGE='resumebuilder:toast:next:v1';
const MAX_LENGTH=400;
function cleanText(message:unknown){return String(message||'').trim().slice(0,MAX_LENGTH);}
export function showToast(payload:ToastPayload){
 if(typeof window==='undefined')return;
 const message=cleanText(payload.message);
 if(!message)return;
 window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT,{detail:{...payload,message,durationMs:5000}}));
}
export const toast={
 success:(message:string)=>showToast({kind:'success',message}),
 error:(message:string)=>showToast({kind:'error',message}),
 info:(message:string)=>showToast({kind:'info',message})
};
/** Login/signup redirects unload the current page before a user can read a
 * success message. Only short, non-sensitive success text is persisted once.
 */
export function toastAfterRedirect(message:string){
 if(typeof window==='undefined')return;
 const value=cleanText(message);
 if(!value)return;
 try{window.sessionStorage.setItem(TOAST_NEXT_PAGE,JSON.stringify({message:value,at:Date.now()}));}catch{}
}
/** Mirror page-local error/success state to the shared root notification UI. */

/** Subscribe to text state without altering existing inline validation/UI. */
export function useToastMessages(error:string,success:string){
 useEffect(()=>{if(error)showToast({kind:'error',message:error});},[error]);
 useEffect(()=>{if(success)showToast({kind:'success',message:success});},[success]);
}

/** An operation can report success or failure through one legacy status
 * field. Do not toast live progress updates unless they indicate an outcome.
 */
export function useToastOutcome(message:string){
 useEffect(()=>{
  if(!message)return;
  if(/(?:fail|error|unable|could not|not available|unavailable|denied|blocked|invalid|too large|choose (?:a |an |another)|requires |must |no speech|does not support|did not start|check .*permission)/i.test(message)){
   showToast({kind:'error',message});return;
  }
  if(/(?:saved|downloaded|exported|completed|added|removed|generated|created|copied|restored|successfully|ready|enabled|verified)/i.test(message)){
   showToast({kind:'success',message});
  }
 },[message]);
}
