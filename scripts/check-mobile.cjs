// Responsive behavior smoke test using Chromium mobile emulation (not physical devices).
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const shots=path.join(process.cwd(),'test-screenshots');
fs.mkdirSync(shots,{recursive:true});
const sizes=[{name:'android-small',width:360,height:780},{name:'iphone',width:390,height:844},{name:'tablet',width:768,height:1024},{name:'laptop',width:1024,height:768},{name:'desktop',width:1440,height:900}];
async function open(page,route){const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:30000});if(response.status()!==200)throw Error(route+' returned '+response.status());}
async function checkOverflow(page,name,route){const m=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,body:document.body.scrollWidth}));if(m.scroll-m.viewport>3){
 const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.right>document.documentElement.clientWidth+2&&r.width>0;}).map(el=>({tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(0,75):'',text:el.textContent.trim().slice(0,30),right:Math.round(el.getBoundingClientRect().right)})).slice(0,15));
 throw Error(name+' '+route+' overflows by '+(m.scroll-m.viewport)+' px (body '+m.body+'). Offenders: '+JSON.stringify(offenders));
}}
const pause=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let checked=0;
 try{
  for(const size of sizes){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,isMobile:size.width<=768,hasTouch:size.width<=768});
   const page=await context.newPage();
   page.on('pageerror',err=>{process.stderr.write('Browser error '+size.name+': '+err.message+'\n');});
   await open(page,'/');
   await checkOverflow(page,size.name,'/');
   if(size.width<=840){
    const hamburger=page.getByRole('button',{name:'Open navigation menu'});
    await hamburger.waitFor({state:'visible'});
    await hamburger.click();
    const drawer=page.locator('#public-mobile-panel');await drawer.waitFor({state:'visible'});
    await drawer.getByRole('link',{name:'Features'}).click();
    await drawer.waitFor({state:'hidden'});
   }
   if(size.width<=390)await page.screenshot({path:path.join(shots,'public-'+size.name+'.png'),fullPage:true});
   await open(page,'/login');
   if(await page.locator('.auth-google svg path').count()!==4)throw Error('Google logo not rendered with 4 colors');
   await checkOverflow(page,size.name,'/login');
   if(size.width<=390)await page.screenshot({path:path.join(shots,'login-'+size.name+'.png')});
   await open(page,'/app');
   await checkOverflow(page,size.name,'/app');
   if(size.width<=700){
    await page.getByRole('button',{name:'Open navigation menu'}).click();
    const nav=page.locator('#mobile-workspace-nav');
    await nav.waitFor({state:'visible'});
    await page.getByRole('button',{name:'Close sidebar navigation'}).click();
    await pause(350);
    if(await nav.evaluate(el=>el.classList.contains('sidebar-open')))throw Error('Client drawer did not close');
   }
   if(size.width<=390)await page.screenshot({path:path.join(shots,'client-'+size.name+'.png')});
   await open(page,'/app?section=templates');await checkOverflow(page,size.name,'/app?section=templates');
   await open(page,'/admin/preview');await checkOverflow(page,size.name,'/admin/preview');
   if(size.width<=840){
    await page.getByRole('button',{name:'Open admin menu'}).click();
    const nav=page.locator('#admin-mobile-nav');await nav.waitFor({state:'visible'});
    await page.getByRole('button',{name:'Close admin navigation'}).click();
    await pause(350);if(await nav.evaluate(el=>el.classList.contains('menu-open')))throw Error('Admin drawer did not close');
   }
   if(size.width<=390)await page.screenshot({path:path.join(shots,'admin-'+size.name+'.png')});
   await open(page,'/admin/login');await checkOverflow(page,size.name,'/admin/login');
   await open(page,'/guide');await checkOverflow(page,size.name,'/guide');
   await open(page,'/demo');await checkOverflow(page,size.name,'/demo');
   await context.close();checked++;console.log('PASS '+size.name+' ('+size.width+' x '+size.height+') public, login, client, templates, admin, guide, demo');
  }

  // Client-side speech is verified with a deterministic browser mock. This checks
  // our Next Question and textarea behavior, not real-world transcription accuracy.
  const speechContext=await browser.newContext({viewport:{width:1280,height:850}});
  const speechPage=await speechContext.newPage();
  await speechPage.addInitScript(()=>{
   const state={spoken:[],recognizer:null};
   window.__resumeSpeechMock=state;
   class FakeUtterance{constructor(text){this.text=text;this.onend=null;this.onerror=null;}}
   class FakeRecognition{
    constructor(){this.lang='en-US';this.continuous=false;this.interimResults=false;this.maxAlternatives=1;this.onstart=null;this.onend=null;this.onresult=null;this.onerror=null;}
    start(){state.recognizer=this;this.onstart?.();}
    stop(){this.onend?.();}
    emit(transcript,isFinal){
     const result=[{transcript}];
     result.isFinal=isFinal;
     this.onresult?.({resultIndex:0,results:[result]});
    }
   }
   window.SpeechSynthesisUtterance=FakeUtterance;
   window.SpeechRecognition=FakeRecognition;
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    cancel(){},
    speak(utterance){state.spoken.push(utterance.text);queueMicrotask(()=>utterance.onend?.());}
   }});
  });
  await open(speechPage,'/app');
  if(!(await speechPage.locator('.dashboard-admin-link').count()))throw Error('Missing Admin Preview access on demo client dashboard');
  await speechPage.locator('.side-nav').getByRole('button',{name:'Interview Practice'}).click();
  await speechPage.getByRole('button',{name:'Next Question'}).click();
  await speechPage.waitForFunction(()=>window.__resumeSpeechMock?.spoken?.length===1);
  const spoken=await speechPage.evaluate(()=>window.__resumeSpeechMock.spoken[0]);
  if(!spoken.includes('challenging project'))throw Error('Next Question did not automatically speak the new question: '+spoken);
  await speechPage.getByRole('button',{name:'Start microphone transcription'}).click();
  await speechPage.evaluate(()=>window.__resumeSpeechMock.recognizer.emit('I led a team project using Laravel',false));
  await speechPage.waitForFunction(()=>document.querySelector('textarea[aria-label="Your Answer"]')?.value==='I led a team project using Laravel');
  await speechPage.evaluate(()=>window.__resumeSpeechMock.recognizer.emit('I led a team project using Laravel',true));
  const finalAnswer=await speechPage.locator('textarea[aria-label="Your Answer"]').inputValue();
  if(finalAnswer!=='I led a team project using Laravel')throw Error('Speech transcript was duplicated or lost: '+finalAnswer);
  await speechPage.locator('#interview-language').selectOption('fil-PH');
  await speechPage.getByRole('button',{name:'Start microphone transcription'}).click();
  const locale=await speechPage.evaluate(()=>window.__resumeSpeechMock.recognizer.lang);
  if(locale!=='fil-PH')throw Error('Speech language switch not applied');
  await speechPage.getByRole('button',{name:'Next Question'}).click();
  await speechPage.waitForFunction(()=>window.__resumeSpeechMock.spoken.length===2);
  await speechPage.waitForFunction(()=>!!window.__resumeSpeechMock.recognizer&&window.__resumeSpeechMock.recognizer.lang==='fil-PH');
  await speechPage.waitForFunction(()=>document.querySelector('textarea[aria-label="Your Answer"]')?.value==='');
  console.log('PASS voice interview: next question spoken, interim/final transcript, Filipino language and mic continuation');
  await speechContext.close();

  const adminContext=await browser.newContext({viewport:{width:1280,height:800}});
  const adminPage=await adminContext.newPage();
  await open(adminPage,'/admin/preview');
  await adminPage.getByRole('heading',{name:'Admin Dashboard'}).waitFor({state:'visible'});
  await adminPage.locator('.admin-sidebar').getByRole('button',{name:'Job Posts'}).click();
  await adminPage.getByRole('button',{name:'Add Job Post'}).click();
  await adminPage.getByRole('dialog',{name:'Job editor'}).waitFor({state:'visible'});
  await adminPage.getByRole('button',{name:'Close'}).click();
  await adminPage.locator('.admin-sidebar').getByRole('button',{name:'Activity Logs'}).click();
  await adminPage.getByRole('columnheader',{name:'IP Address'}).waitFor({state:'visible'});
  await adminPage.getByRole('columnheader',{name:'Device / Browser'}).waitFor({state:'visible'});
  await adminPage.getByLabel('Reporting period').selectOption('all');
  const downloadWait=adminPage.waitForEvent('download',{timeout:30000});
  await adminPage.getByRole('button',{name:'Download Excel'}).click();
  const excelDownload=await downloadWait;
  if(!excelDownload.suggestedFilename().endsWith('.xlsx'))throw Error('Expected real Excel xlsx export');
  const bytes=fs.readFileSync(await excelDownload.path());
  if(bytes.subarray(0,2).toString()!=='PK')throw Error('Export was not a valid ZIP-based XLSX file');
  await adminContext.close();
  console.log('PASS admin activity table, date picker and demo XLSX export');

  const loginContext=await browser.newContext({viewport:{width:390,height:844}});
  const loginPage=await loginContext.newPage();
  await loginPage.goto(base+'/admin',{waitUntil:'networkidle'});
  if(!loginPage.url().endsWith('/admin/login'))throw Error('Unauthenticated Admin route should redirect to admin/login');
  await loginPage.getByRole('heading',{name:'Administrator Login'}).waitFor({state:'visible'});
  await loginContext.close();
  console.log('PASS unauthenticated admin redirect and dedicated login screen');

  const photoContext=await browser.newContext({viewport:{width:1280,height:850}});
  const photoPage=await photoContext.newPage();
  await open(photoPage,'/app');
  await photoPage.locator('.side-nav').getByRole('button',{name:'Build Resume'}).click();
  const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YqGRGgAAAAASUVORK5CYII=','base64');
  await photoPage.locator('.wizard-photo-upload input[type="file"]').setInputFiles({name:'headshot.png',mimeType:'image/png',buffer:tinyPng});
  await photoPage.locator('.wizard-photo-thumb img').waitFor({state:'visible',timeout:10000});
  await photoPage.getByRole('button',{name:'Remove'}).click();
  await photoPage.locator('.wizard-photo-thumb img').waitFor({state:'hidden'});
  await photoPage.locator('.wizard-stagebar').getByRole('button',{name:'Generate'}).click();
  await photoPage.locator('.rt-wizard-template-grid button').last().waitFor({state:'visible'});
  await open(photoPage,'/app?section=templates');
  const count=await photoPage.locator('.rt-template-card').count();
  if(count!==28)throw Error('Expected 28 resume templates, found '+count);
  await photoContext.close();
  console.log('PASS photo upload/remove and 28 original resume template cards');
  console.log('PASS Admin Dashboard preview, navigation and job post editor');

  console.log('PASS: '+checked+' responsive viewport suites');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
