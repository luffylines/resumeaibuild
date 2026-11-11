'use client';
import type {User} from '@supabase/supabase-js';
import type {Resume} from '@/lib/types';
import {browserSupabase} from '@/lib/supabase';

const BUCKET='profile-avatars';
export function photoKey(userId:string){return 'resumebuilder:profile-photo:v1:'+userId;}
function photoPath(userId:string){return userId+'/avatar.jpg';}

export function readProfilePhoto(userId:string):string{
 if(typeof window==='undefined'||!userId)return '';
 try{
  const photo=localStorage.getItem(photoKey(userId))||'';
  return /^data:image\/(jpeg|png|webp);base64,/i.test(photo)?photo:'';
 }catch{return '';}
}
function announceAvatarChanged(){
 if(typeof window!=='undefined')window.dispatchEvent(new Event('resumebuilder:avatar-changed'));
}

/** Fetch a short-lived URL from a PRIVATE Storage bucket. This works across
 * browsers once docs/PROFILE_PHOTO_STORAGE.md has been set up in the correct
 * ResumeBuilder Supabase project. Older local photos remain a fallback.
 */
export async function loadProfilePhoto(userId:string):Promise<string>{
 const local=readProfilePhoto(userId);
 const sb=browserSupabase();
 if(!sb||!userId)return local;
 try{
  const {data:{user},error}=await sb.auth.getUser();
  if(error||user?.id!==userId)return local;
  const signed=await sb.storage.from(BUCKET).createSignedUrl(photoPath(userId),3600);
  if(!signed.error&&signed.data?.signedUrl)return signed.data.signedUrl;
 }catch{/* Keep locally stored picture if private bucket isn't ready yet. */}
 return local;
}

function rememberPhoto(userId:string,image:string){
 try{localStorage.setItem(photoKey(userId),image);}catch{/* Cloud storage may still succeed. */}
 announceAvatarChanged();
}

export type ProfilePhotoSave={image:string;cloudSaved:boolean;detail:string};

/** Store immediately on this device; store in the user's private Supabase
 * Storage folder as well whenever the actual project bucket is configured.
 * A local-only fallback MUST be reported to the caller, not called "synced".
 */
export async function saveProfilePhoto(userId:string,file:File):Promise<ProfilePhotoSave>{
 if(!userId||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Select a JPEG, PNG or WebP picture.');
 if(file.size>5*1024*1024)throw Error('Profile photo must be under 5 MB.');
 const url=URL.createObjectURL(file);
 let image='';
 try{
  const picture=new Image();
  await new Promise<void>((resolve,reject)=>{picture.onload=()=>resolve();picture.onerror=()=>reject(Error('Unable to open that photo.'));picture.src=url;});
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image processing is not available.');
  const size=Math.min(picture.naturalWidth,picture.naturalHeight);
  ctx.drawImage(picture,(picture.naturalWidth-size)/2,(picture.naturalHeight-size)/2,size,size,0,0,256,256);
  image=canvas.toDataURL('image/jpeg',0.82);
 }finally{URL.revokeObjectURL(url);}
 rememberPhoto(userId,image);
 const sb=browserSupabase();
 if(!sb)return {image,cloudSaved:false,detail:'Photo saved on this device only. Supabase is not connected.'};
 try{
  const {data:{user},error:authError}=await sb.auth.getUser();
  if(authError||user?.id!==userId)throw Error('Please sign in again to sync your profile image.');
  const buffer=await fetch(image).then(r=>r.blob());
  const upload=await sb.storage.from(BUCKET).upload(photoPath(userId),buffer,{
   contentType:'image/jpeg',cacheControl:'120',upsert:true
  });
  if(upload.error)throw upload.error;
  return {image,cloudSaved:true,detail:'Profile photo saved to your account. It will be available after sign-in on other devices.'};
 }catch(error){
  const message=error instanceof Error?error.message:'Unable to sync photo.';
  return {image,cloudSaved:false,detail:'Photo saved on this browser, but cloud sync failed: '+message+'. Configure the private profile-avatars bucket in the ResumeBuilder Supabase project.'};
 }
}

export async function removeProfilePhoto(userId:string):Promise<{cloudRemoved:boolean;detail:string}>{
 const sb=browserSupabase();
 let cloudRemoved=false;
 let reason='';
 if(sb){
  try{
   const {data:{user},error}=await sb.auth.getUser();
   if(error||user?.id!==userId)throw Error('Sign in again before removing the account photo.');
   const res=await sb.storage.from(BUCKET).remove([photoPath(userId)]);
   if(res.error)throw res.error;
   cloudRemoved=true;
  }catch(error){reason=error instanceof Error?error.message:'Cloud removal failed.';}
 }
 try{localStorage.removeItem(photoKey(userId));}catch{}
 announceAvatarChanged();
 return {cloudRemoved,detail:cloudRemoved?'Profile photo removed from your account.':reason?'Local photo cleared, but cloud removal failed: '+reason:'Local photo cleared.'};
}
export function accountAvatar(_user:User|null,_resumes:Resume[]=[],custom=''):string{
 return custom||'/images/avatar.png';
}
