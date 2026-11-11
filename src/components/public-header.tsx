'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ArrowRight,Menu,X} from 'lucide-react';
import {BrandMark} from '@/components/brand-icons';

const items=[['Home','#home'],['Features','#features'],['How It Works','#how-it-works'],['Pricing','#pricing'],['Templates','#templates'],['FAQ','#faq']] as const;

export default function PublicHeader(){
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  if(!open)return;
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};
  const onResize=()=>{if(window.innerWidth>840)setOpen(false);};
  const old=document.body.style.overflow;
  document.body.style.overflow='hidden';
  document.addEventListener('keydown',onKey);
  window.addEventListener('resize',onResize);
  return ()=>{document.body.style.overflow=old;document.removeEventListener('keydown',onKey);window.removeEventListener('resize',onResize);};
 },[open]);
 return <>
  <header className="public-header">
   <div className="public-nav">
    <Link href="/" className="public-logo" onClick={()=>setOpen(false)}><span className="public-logo-mark"><BrandMark size={20}/></span><span>ResumeBuilder</span></Link>
    <nav className="public-desktop-links" aria-label="Primary navigation">{items.map(([title,href])=><a href={href} key={href}>{title}</a>)}</nav>
    <div className="public-ctas"><Link className="public-outline" href="/login">Log In</Link><Link className="public-primary" href="/signup">Sign Up Free <ArrowRight size={16}/></Link></div>
    <div className="public-mobile-actions">
     <Link className="public-mobile-signup" href="/signup">Sign Up</Link>
     <button className="public-hamburger" type="button" aria-label={open?'Close navigation menu':'Open navigation menu'} aria-expanded={open} aria-controls="public-mobile-panel" onClick={()=>setOpen(v=>!v)}>{open?<X size={23}/>:<Menu size={23}/>}</button>
    </div>
   </div>
  </header>
  {open&&<><button type="button" className="public-mobile-scrim" aria-label="Close navigation menu" onClick={()=>setOpen(false)}/><nav id="public-mobile-panel" className="public-mobile-panel" aria-label="Mobile navigation">
   <div className="public-mobile-panel-title">EXPLORE RESUMEBUILDER</div>
   {items.map(([title,href],i)=><a href={href} key={href} onClick={()=>setOpen(false)}><span>{title}</span><ArrowRight size={16}/></a>)}
   <div className="public-mobile-panel-actions"><Link className="public-outline" href="/login" onClick={()=>setOpen(false)}>Log In</Link><Link className="public-primary" href="/signup" onClick={()=>setOpen(false)}>Create Account <ArrowRight size={17}/></Link></div>
  </nav></>}
 </>;
}
