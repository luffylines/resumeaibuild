'use client';
import type {User} from '@supabase/supabase-js';
import type {Resume} from '@/lib/types';

/** A small profile image saved to this browser, scoped to one signed-in user. */
export function photoKey(userId:string){return 'resumebuilder:profile-photo:v1:'+userId;}
export function readProfilePhoto(userId:string):string{
 if(typeof window==='undefined')return '';
 try{
  const photo=localStorage.getItem(photoKey(userId))||'';
  return /^data:image\/(jpeg|png|webp);base64,/i.test(photo)?photo:'';
 }catch{return '';}
}
export function clearProfilePhoto(userId:string){
 try{localStorage.removeItem(photoKey(userId));window.dispatchEvent(new Event('resumebuilder:avatar-changed'));}catch{}
}
export async function saveProfilePhoto(userId:string,file:File):Promise<string>{
 if(!userId||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Please select a JPEG, PNG or WebP image.');
 if(file.size>5*1024*1024)throw Error('Profile photo must be less than 5 MB.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();
  await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(Error('Could not read photo.'));img.src=url;});
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const context=canvas.getContext('2d');if(!context)throw Error('Photo conversion is unavailable.');
  const side=Math.min(img.naturalHeight,img.naturalWidth);
  context.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,256,256);
  const data=canvas.toDataURL('image/jpeg',.75);
  try{localStorage.setItem(photoKey(userId),data);}catch{throw Error('Your browser could not save the photo. Free up site storage and retry.');}
  window.dispatchEvent(new Event('resumebuilder:avatar-changed'));
  return data;
 }finally{URL.revokeObjectURL(url);}
}
export function accountAvatar(user:User|null,resumes:Resume[]=[],custom=''):string{
 if(custom)return custom;
 const metadata=user?.user_metadata as Record<string,unknown>|undefined;
 for(const value of [metadata?.avatar_url,metadata?.picture]){
  if(typeof value==='string'&&/^https:\/\/[^\s]+$/i.test(value))return value;
 }
 return resumes.find(r=>r.photo&&/^data:image\/(jpeg|png|webp);base64,/i.test(r.photo))?.photo||'';
}
