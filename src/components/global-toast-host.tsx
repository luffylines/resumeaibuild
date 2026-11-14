'use client';
import {useEffect,useRef,useState} from 'react';
import {AlertCircle,CheckCircle2,Info,X} from 'lucide-react';
import {TOAST_EVENT,TOAST_NEXT_PAGE} from '@/lib/toast';
import type {ToastKind,ToastPayload} from '@/lib/toast';

type Item={id:number;kind:ToastKind;message:string;title:string};
const DEFAULT_TITLE:Record<ToastKind,string>={success:'Success',error:'Something went wrong',info:'Notice'};
export default function GlobalToastHost(){
 const [items,setItems]=useState<Item[]>([]);
 const counter=useRef(0);
 const timers=useRef(new Map<number,ReturnType<typeof setTimeout>>());
 const last=useRef<{key:string;time:number}>({key:'',time:0});
 useEffect(()=>{
  const currentTimers=timers.current;
  const dismiss=(id:number)=>{
   const timer=currentTimers.get(id);
   if(timer)clearTimeout(timer);
   currentTimers.delete(id);
   setItems(previous=>previous.filter(item=>item.id!==id));
  };
  const receive=(event:Event)=>{
   const payload=(event as CustomEvent<ToastPayload>).detail;
   if(!payload||!['success','error','info'].includes(payload.kind)||typeof payload.message!=='string')return;
   const message=payload.message.trim().slice(0,400);
   if(!message)return;
   const key=payload.kind+':'+message;
   const now=Date.now();
   // Components may mirror the same error via both a parent and a child.
   if(last.current.key===key&&now-last.current.time<1300)return;
   last.current={key,time:now};
   const id=++counter.current;
   const title=(payload.title||DEFAULT_TITLE[payload.kind]).trim().slice(0,65);
   setItems(previous=>[...previous.slice(-2),{id,kind:payload.kind,message,title}]);
   currentTimers.set(id,setTimeout(()=>dismiss(id),5000));
  };
  window.addEventListener(TOAST_EVENT,receive);
  try{
   const once=sessionStorage.getItem(TOAST_NEXT_PAGE);
   if(once){
    sessionStorage.removeItem(TOAST_NEXT_PAGE);
    const value=JSON.parse(once) as {message?:string;at?:number};
    if(typeof value.message==='string'&&value.at&&Date.now()-value.at<45000){
     receive(new CustomEvent(TOAST_EVENT,{detail:{kind:'success',message:value.message}}));
    }
   }
  }catch{}
  return()=>{
   window.removeEventListener(TOAST_EVENT,receive);
   currentTimers.forEach(timer=>clearTimeout(timer));
   currentTimers.clear();
  };
 },[]);
 const remove=(id:number)=>{
  const timer=timers.current.get(id);if(timer)clearTimeout(timer);
  timers.current.delete(id);
  setItems(previous=>previous.filter(item=>item.id!==id));
 };
 if(!items.length)return null;
 return <div className="rb-toast-stack" aria-label="Notifications" data-testid="global-toast-stack">
  {items.map(item=><section key={item.id} className={'rb-toast rb-toast--'+item.kind} role={item.kind==='error'?'alert':'status'} data-testid={'global-'+item.kind+'-toast'}>
   <span className="rb-toast-icon" aria-hidden="true">{item.kind==='success'?<CheckCircle2 size={20}/>:item.kind==='error'?<AlertCircle size={20}/>:<Info size={20}/>}</span>
   <div className="rb-toast-copy"><strong>{item.title}</strong><span>{item.message}</span></div>
   <button type="button" className="rb-toast-close" aria-label={'Dismiss '+item.kind+' notification'} onClick={()=>remove(item.id)}><X size={18}/></button>
   <span className="rb-toast-progress" aria-hidden="true"/>
  </section>)}
 </div>;
}
