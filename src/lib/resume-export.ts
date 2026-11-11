'use client';
import type {Resume} from '@/lib/types';
import {getResumeTemplate,PHOTO_READY_TEMPLATES} from '@/lib/templates';

function cleanName(r:Resume){return (r.name||r.title||'resume').replace(/[^\p{L}\p{N}\-_ ]/gu,'').trim().replace(/\s+/g,'_').slice(0,65)||'resume';}
function download(blob:Blob,file:string){
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=file;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function safeHex(value:string|undefined,fall:string){return /^#[0-9a-f]{6}$/i.test(value||'')?value!:fall;}
function makeBlocks(r:Resume){
 return [
  {name:'PROFESSIONAL SUMMARY',entries:r.summary?[{title:'',subtitle:'',body:r.summary}]:[]},
  {name:'WORK EXPERIENCE',entries:r.experience.filter(e=>e.role||e.company||e.details).map(e=>({title:[e.role,e.company].filter(Boolean).join(' · '),subtitle:e.dates,body:e.details}))},
  {name:'EDUCATION',entries:r.education.filter(e=>e.degree||e.school).map(e=>({title:e.degree,subtitle:[e.school,e.dates].filter(Boolean).join(' · '),body:''}))},
  {name:'SKILLS',entries:r.skills?[{title:'',subtitle:'',body:r.skills.split(',').map(s=>s.trim()).filter(Boolean).join('  •  ')}]:[]}
 ].filter(s=>s.entries.length);
}
function normalizePdf(s:string){return s.replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/[•]/g,'·').replace(/[^\u0020-\u00FF\n]/g,'?');}
function breakText(text:string,width:number,measure:(text:string)=>number){
 const lines:string[]=[];for(const paragraph of text.split(/\r?\n/)){
  if(!paragraph.trim()){lines.push('');continue;}
  let line='';for(const word of paragraph.split(/\s+/)){
   if(measure(line?line+' '+word:word)>width&&line){lines.push(line);line=word;}
   else line=line?line+' '+word:word;
  }
  lines.push(line);
 }return lines;
}
export async function exportResumePDF(resume:Resume){
 const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');
 const doc=await PDFDocument.create();
 doc.setTitle((resume.name||'Resume')+' - Resume');
 doc.setAuthor(resume.name||'ResumeBuilder');
 const template=getResumeTemplate(resume.template);
 const ac=safeHex(resume.accentColor,template.accent),bg=safeHex(resume.backgroundColor,'#FFFFFF');
 const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
 const ink=color('#272433'),muted=color('#606477'),accent=color(ac);
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const W=595.28,H=841.89,M=48;
 let page=doc.addPage([W,H]),y=H-M;
 const pageBg=()=>{page.drawRectangle({x:0,y:0,width:W,height:H,color:color(bg)});};
 pageBg();
 const draw=(text:string,x:number,baseline:number,size:number,b=false,c=ink)=>{
  page.drawText(normalizePdf(text).replace(/\n/g,' '),{x,y:baseline,size,font:b?bold:regular,color:c});
 };
 const line=()=>page.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:.65,color:accent,opacity:.45});
 const nextPage=(heightNeeded:number)=>{
  if(y-heightNeeded>43)return;
  page=doc.addPage([W,H]);pageBg();y=H-M;
 };
 const paragraph=(text:string,size=10,indent=0,b=false,fg=ink)=>{
  const font=b?bold:regular,usable=W-2*M-indent;
  const lines=breakText(normalizePdf(text),usable,t=>font.widthOfTextAtSize(t,size));
  for(const l of lines){nextPage(size*1.55);if(l)draw(l,M+indent,y,size,b,fg);y-=size*1.55;}
 };
 const isBand=template.layout==='band';
 const isPhoto=PHOTO_READY_TEMPLATES.has(template.id)&&/^data:image\/(jpeg|png);base64,/i.test(resume.photo||'');
 if(isBand){
  page.drawRectangle({x:0,y:H-160,width:W,height:160,color:accent});y=H-65;
 }
 const headerText=isBand?rgb(1,1,1):ink;
 const photoSide=isPhoto?112:0;
 const name=normalizePdf(resume.name||'YOUR NAME');
 const nameSize=Math.min(25,Math.max(15,465/(bold.widthOfTextAtSize(name,24)||1)*24));
 draw(name,M,y,nameSize,true,headerText);y-=31;
 if(resume.targetRole){draw(resume.targetRole,M,y,12,true,isBand?rgb(.9,.91,1):accent);y-=24;}
 const contacts=[resume.email,resume.phone,resume.location,resume.portfolio].filter(Boolean).map(normalizePdf);
 let contactLines=breakText(contacts.join('  |  '),W-2*M-photoSide,t=>regular.widthOfTextAtSize(t,9));
 for(const l of contactLines){draw(l,M,y,9,false,isBand?rgb(1,1,1):muted);y-=14;}
 if(isPhoto){
  try{
   const data=resume.photo!.split(',')[1];
   const binary=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
   const image=resume.photo!.startsWith('data:image/png')?await doc.embedPng(binary):await doc.embedJpg(binary);
   page.drawImage(image,{x:W-M-94,y:H-146,width:94,height:94});
  }catch{}
 }
 y=isBand?Math.min(y-18,H-178):y-26;
 const sections=makeBlocks(resume);
 for(const section of sections){
  nextPage(62);draw(section.name,M,y,10.5,true,accent);y-=10;line();y-=19;
  for(const entry of section.entries){
   nextPage(52);
   if(entry.title){paragraph(entry.title,10.2,0,true);y-=2;}
   if(entry.subtitle){paragraph(entry.subtitle,9.4,0,false,muted);y-=2;}
   if(entry.body){paragraph(entry.body,9.7,0);y-=8;}else y-=7;
  }
  y-=11;
 }
 const bytes=await doc.save();
 download(new Blob([new Uint8Array(bytes).buffer as ArrayBuffer],{type:'application/pdf'}),cleanName(resume)+'.pdf');
}
export async function exportResumeDOCX(resume:Resume){
 const {
  Document,Packer,Paragraph,TextRun,AlignmentType,BorderStyle,HeadingLevel,ImageRun
 }=await import('docx');
 const template=getResumeTemplate(resume.template);
 const accent=safeHex(resume.accentColor,template.accent).slice(1);
 const paras:InstanceType<typeof Paragraph>[]=[];
 paras.push(new Paragraph({alignment:AlignmentType.LEFT,spacing:{after:140},children:[
  new TextRun({text:resume.name||'YOUR NAME',bold:true,size:34,color:accent,font:'Aptos Display'})
 ]}));
 if(resume.targetRole)paras.push(new Paragraph({spacing:{after:110},children:[new TextRun({text:resume.targetRole,size:23,color:accent,bold:true})]}));
 const contact=[resume.email,resume.phone,resume.location,resume.portfolio].filter(Boolean).join('  |  ');
 if(contact)paras.push(new Paragraph({spacing:{after:235},children:[new TextRun({text:contact,size:17,color:'596276'})]}));
 if(resume.photo&&PHOTO_READY_TEMPLATES.has(template.id)){
  try{
   const raw=Uint8Array.from(atob(resume.photo.split(',')[1]),c=>c.charCodeAt(0));
   paras.push(new Paragraph({spacing:{after:130},children:[new ImageRun({data:raw,transformation:{width:90,height:90},type:'jpg'})]}));
  }catch{}
 }
 for(const section of makeBlocks(resume)){
  paras.push(new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:205,after:120},border:{bottom:{color:accent,space:7,size:5,style:BorderStyle.SINGLE}},children:[new TextRun({text:section.name,bold:true,color:accent,size:19})]}));
  for(const e of section.entries){
   if(e.title)paras.push(new Paragraph({spacing:{after:55},children:[new TextRun({text:e.title,bold:true,size:20})]}));
   if(e.subtitle)paras.push(new Paragraph({spacing:{after:55},children:[new TextRun({text:e.subtitle,color:'667085',size:17})]}));
   if(e.body)paras.push(new Paragraph({spacing:{after:140},children:[new TextRun({text:e.body,size:19,breakLine:false})]}));
  }
 }
 const doc=new Document({
  creator:'ResumeBuilder',
  title:(resume.name||'Resume')+' - Resume',
  sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:850,bottom:850,left:850,right:850}}},children:paras}]
 });
 const bytes=await Packer.toBlob(doc);
 download(bytes,cleanName(resume)+'.docx');
}
export async function exportResumePNG(resume:Resume,element:HTMLElement|null){
 if(!element)throw Error('Resume preview is not ready for PNG export.');
 const {toBlob}=await import('html-to-image');
 await document.fonts.ready;
 const blob=await toBlob(element,{pixelRatio:2,backgroundColor:safeHex(resume.backgroundColor,'#FFFFFF'),cacheBust:false,filter:node=>!(node instanceof HTMLElement&&node.dataset.exportIgnore==='true')});
 if(!blob)throw Error('Could not render PNG.');
 download(blob,cleanName(resume)+'.png');
}
