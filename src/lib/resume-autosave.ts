import type {Resume} from '@/lib/types';

type Cache={v:1;activeId:string;drafts:Record<string,Resume>};
const PREFIX='resumebuilder:drafts:v1:';
const cacheKey=(scope:string)=>PREFIX+scope;
function valid(r:unknown):r is Resume{
 if(!r||typeof r!=='object')return false;
 const item=r as Record<string,unknown>;
 return typeof item.id==='string'&&item.id.length>0
  &&typeof item.name==='string'&&typeof item.targetRole==='string'
  &&typeof item.title==='string'&&Array.isArray(item.experience)
  &&Array.isArray(item.education);
}
function get(scope:string):Cache{
 if(typeof window==='undefined')return {v:1,activeId:'',drafts:{}};
 try{
  const raw=window.localStorage.getItem(cacheKey(scope));
  if(!raw)return {v:1,activeId:'',drafts:{}};
  const value=JSON.parse(raw) as Partial<Cache>;
  if(value?.v!==1||!value.drafts||typeof value.drafts!=='object')throw Error('Invalid cached draft');
  const drafts=Object.fromEntries(Object.entries(value.drafts).filter(([,r])=>valid(r)));
  return {v:1,activeId:typeof value.activeId==='string'?value.activeId:'',drafts};
 }catch{return {v:1,activeId:'',drafts:{}};}
}
function put(scope:string,value:Cache):boolean{
 if(typeof window==='undefined')return false;
 try{window.localStorage.setItem(cacheKey(scope),JSON.stringify(value));return true;}catch{return false;}
}
export function cacheResumeDraft(scope:string,resume:Resume):boolean{
 if(!valid(resume))return false;
 const old=get(scope);
 const drafts={...old.drafts,[resume.id]:resume};
 // Keep the eight most-recent drafts; avoid unbounded localStorage growth.
 const list=Object.values(drafts).sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0));
 const top=Object.fromEntries(list.slice(0,8).map(r=>[r.id,r]));
 if(put(scope,{v:1,activeId:resume.id,drafts:top}))return true;
 // Large photo data URLs can exceed browser storage limits. Keep other text
 // safely, and report a failure so the UI never claims the photo was saved.
 return false;
}
export function cachedResumeDraft(scope:string,id:string):Resume|null{
 const r=get(scope).drafts[id];
 return valid(r)?r:null;
}
export function latestCachedResumeDraft(scope:string):Resume|null{
 const cache=get(scope);
 return cachedResumeDraft(scope,cache.activeId);
}
export function discardCachedResumeDraft(scope:string,id:string){
 const cache=get(scope);delete cache.drafts[id];
 if(cache.activeId===id)cache.activeId='';
 put(scope,cache);
}
export function isCacheNewer(local:Resume,remote?:Resume|null){
 return !remote||(Date.parse(local.updatedAt)||0)>(Date.parse(remote.updatedAt)||0);
}
