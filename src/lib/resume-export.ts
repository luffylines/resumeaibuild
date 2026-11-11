'use client';
import type {Resume} from '@/lib/types';
import {getResumeTemplate,PHOTO_READY_TEMPLATES} from '@/lib/templates';
import {getResumeSections} from '@/lib/resume-sections';

function cleanName(r:Resume){return (r.name||r.title||'resume').replace(/[^\p{L}\p{N}\-_ ]/gu,'').trim().replace(/\s+/g,'_').slice(0,65)||'resume';}
function download(blob:Blob,file:string){
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=file;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function safeHex(value:string|undefined,fall:string){return /^#[0-9a-f]{6}$/i.test(value||'')?value!:fall;}
/** Always derive export content from the same template-aware sections as the live preview. */
function makeBlocks(r:Resume){
 return getResumeSections(r).map(section=>({
  name:section.title.toUpperCase(),
  entries:section.entries.map(entry=>({
   title:entry.title,
   subtitle:entry.subtitle,
   body:section.kind==='skills'
    ?entry.body.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean).join('  •  ')
    :entry.body
  }))
 }));
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
export async function exportResumePDFText(resume:Resume){
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
export async function exportResumeDOCXEditable(resume:Resume){
 const {
  Document,Packer,Paragraph,TextRun,AlignmentType,BorderStyle,HeadingLevel,ImageRun
 }=await import('docx');
 const template=getResumeTemplate(resume.template);
 const accent=safeHex(resume.accentColor,template.accent).slice(1);
 const paras:InstanceType<typeof Paragraph>[]=[];
 paras.push(new Paragraph({alignment:AlignmentType.LEFT,spacing:{after:140},children:[
  new TextRun({text:resume.name||'YOUR NAME',bold:true,size:34,color:accent,font:'Aptos Display'})
 ]}));
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
   if(e.body)paras.push(new Paragraph({spacing:{after:140},children:[new TextRun({text:e.body,size:19})]}));
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

/**
 * Render the actual resume on a temporary A4-sized surface in the viewport.
 * Avoid capturing the offscreen wrapper: its negative coordinates and inherited
 * clipping can produce an empty/partially drawn PNG on some browsers.
 */
export async function exportResumePNG(resume:Resume,element:HTMLElement|null){
 if(!element)throw Error('Resume preview is not ready for PNG export.');
 const source=(element.matches('.resume-document')?element:element.querySelector('.resume-document')) as HTMLElement|null;
 if(!source)throw Error('Resume document could not be found for export.');
 const {toBlob}=await import('html-to-image');
 const background=safeHex(resume.backgroundColor,'#FFFFFF');
 const mount=document.createElement('div');
 mount.className='resume-png-capture-stage';
 mount.setAttribute('aria-hidden','true');
 mount.style.cssText=[
  'position:fixed','left:0','top:0','width:794px','height:auto',
  'z-index:-100','pointer-events:none','opacity:1','overflow:visible',
  'background:'+background
 ].join(';');
 const cloned=source.cloneNode(true) as HTMLElement;
 cloned.style.setProperty('width','794px','important');
 cloned.style.setProperty('max-width','none','important');
 cloned.style.setProperty('min-width','794px','important');
 cloned.style.setProperty('min-height','1123px','important');
 cloned.style.setProperty('height','auto','important');
 cloned.style.setProperty('margin','0','important');
 cloned.style.setProperty('box-shadow','none','important');
 cloned.style.setProperty('transform','none','important');
 cloned.style.setProperty('overflow','visible','important');
 cloned.style.setProperty('--rd-page-bg',background);
 mount.appendChild(cloned);
 document.body.appendChild(mount);
 try{
  await document.fonts.ready;
  // Give layout and any optional portrait image a chance to settle before
  // html-to-image serializes the full document into its SVG foreignObject.
  await Promise.all([...cloned.querySelectorAll('img')].map(img=>{
   if(img.complete)return Promise.resolve();
   return new Promise<void>(resolve=>{
    img.addEventListener('load',()=>resolve(),{once:true});
    img.addEventListener('error',()=>resolve(),{once:true});
   });
  }));
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  const width=794;
  const height=Math.max(1123,Math.ceil(cloned.scrollHeight),Math.ceil(cloned.getBoundingClientRect().height));
  if(height>14000)throw Error('This resume is too long for one PNG. Use Download PDF for a multi-page version.');
  const blob=await toBlob(cloned,{
   pixelRatio:2,width,height,backgroundColor:background,
   cacheBust:false,
   filter:node=>!(node instanceof HTMLElement&&node.dataset.exportIgnore==='true')
  });
  if(!blob||blob.size<1200)throw Error('PNG rendering was incomplete. Try again or use PDF.');
  download(blob,cleanName(resume)+'.png');
 }finally{
  mount.remove();
 }
}


/**
 * Pixel-faithful export of the live ResumeDocument, including the selected
 * template, color, photo and two-column / sidebar decorations. Unlike the
 * separate editable formats, these visual exports intentionally rasterize
 * the template to guarantee an identical appearance.
 */
async function renderResumeArtwork(resume:Resume,element:HTMLElement|null):Promise<Blob>{
 if(!element)throw Error('Open the resume preview before exporting.');
 const source=(element.matches('.resume-document')?element:element.querySelector('.resume-document')) as HTMLElement|null;
 if(!source)throw Error('Resume document was not found.');
 const {toBlob}=await import('html-to-image');
 const background=safeHex(resume.backgroundColor,'#FFFFFF');
 const stage=document.createElement('div');
 stage.style.cssText=[
  'position:fixed','left:0','top:0','width:794px',
  'z-index:-100','pointer-events:none','opacity:1','overflow:visible',
  'background:'+background
 ].join(';');
 stage.className='resume-png-capture-stage';
 const clone=source.cloneNode(true) as HTMLElement;
 // The preview is scaled in the wizard. Render the SAME design at A4 width
 // rather than resizing a small screenshot.
 Object.assign(clone.style,{width:'794px',maxWidth:'none',minWidth:'794px',minHeight:'1123px',height:'auto',margin:'0',boxShadow:'none',transform:'none',overflow:'visible'});
 clone.style.setProperty('--rd-page-bg',background);
 stage.appendChild(clone);
 document.body.appendChild(stage);
 try{
  await document.fonts.ready;
  await Promise.all([...clone.querySelectorAll('img')].map(img=>{
   if(img.complete)return Promise.resolve();
   return new Promise<void>(resolve=>{
    img.addEventListener('load',()=>resolve(),{once:true});
    img.addEventListener('error',()=>resolve(),{once:true});
   });
  }));
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  const height=Math.max(1123,Math.ceil(clone.scrollHeight),Math.ceil(clone.getBoundingClientRect().height));
  if(height>12500)throw Error('This resume is too long for a single image render. Reduce its length and retry.');
  const blob=await toBlob(clone,{
   pixelRatio:2,width:794,height,backgroundColor:background,
   cacheBust:false,
   filter:node=>!(node instanceof HTMLElement&&node.dataset.exportIgnore==='true')
  });
  if(!blob||blob.size<1200)throw Error('Could not render the selected template. Please retry.');
  return blob;
 }finally{stage.remove();}
}

async function visualA4Pages(resume:Resume,element:HTMLElement|null):Promise<Uint8Array[]>{
 const artwork=await renderResumeArtwork(resume,element);
 const bitmap=await createImageBitmap(artwork);
 try{
  const width=bitmap.width;
  const pageHeight=Math.round(width*1123/794);
  const count=Math.ceil(bitmap.height/pageHeight);
  const pages:Uint8Array[]=[];
  for(let i=0;i<count;i++){
   const canvas=document.createElement('canvas');
   canvas.width=width;canvas.height=pageHeight;
   const ctx=canvas.getContext('2d');
   if(!ctx)throw Error('Image export is not supported by this browser.');
   ctx.fillStyle=safeHex(resume.backgroundColor,'#FFFFFF');
   ctx.fillRect(0,0,width,pageHeight);
   const top=i*pageHeight;
   const crop=Math.min(pageHeight,bitmap.height-top);
   ctx.drawImage(bitmap,0,top,width,crop,0,0,width,crop);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Unable to render document page.')),'image/png'));
   pages.push(new Uint8Array(await blob.arrayBuffer()));
   canvas.width=0;canvas.height=0;
  }
  return pages;
 }finally{bitmap.close();}
}

/** The normal PDF export is visually identical to the chosen design. */
export async function exportResumePDF(resume:Resume,preview:HTMLElement|null){
 const {PDFDocument}=await import('pdf-lib');
 const doc=await PDFDocument.create();
 doc.setTitle((resume.name||'Resume')+' - Resume');
 doc.setAuthor(resume.name||'ResumeBuilder');
 const pages=await visualA4Pages(resume,preview);
 for(const bytes of pages){
  const image=await doc.embedPng(bytes);
  const page=doc.addPage([595.28,841.89]);
  page.drawImage(image,{x:0,y:0,width:595.28,height:841.89});
 }
 const pdf=await doc.save();
 download(new Blob([new Uint8Array(pdf).buffer as ArrayBuffer],{type:'application/pdf'}),cleanName(resume)+'.pdf');
}

/**
 * Visually matched Word export. Artwork is inserted as full-page images,
 * so unlike the alternative editable DOCX export its resume text is not
 * individually editable. Users can choose either format explicitly.
 */
export async function exportResumeDOCX(resume:Resume,preview:HTMLElement|null){
 const {Document,Packer,Paragraph,ImageRun,AlignmentType}=await import('docx');
 const pages=await visualA4Pages(resume,preview);
 const paragraphs=pages.map((data,index)=>new Paragraph({
  alignment:AlignmentType.CENTER,
  pageBreakBefore:index>0,
  spacing:{before:0,after:0},
  children:[new ImageRun({data,type:'png',transformation:{width:770,height:1089}})]
 }));
 const doc=new Document({
  creator:'ResumeBuilder',title:(resume.name||'Resume')+' - Visual Resume',
  sections:[{
   properties:{page:{size:{width:11906,height:16838},margin:{top:100,bottom:100,left:100,right:100}}},
   children:paragraphs
  }]
 });
 download(await Packer.toBlob(doc),cleanName(resume)+'.docx');
}
