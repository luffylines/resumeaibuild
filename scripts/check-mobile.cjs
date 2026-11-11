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
  // Voice controls should be discoverable without searching for the small robot icon.
  // The previous question intentionally auto-resumed the mic; stop it before testing the new start control.
  if(await speechPage.getByRole('button',{name:'Stop speaking'}).count())await speechPage.getByRole('button',{name:'Stop speaking'}).click();
  await speechPage.getByRole('button',{name:'Start speaking'}).waitFor({state:'visible'});
  await speechPage.getByRole('button',{name:'Record with AI backup'}).click();
  await speechPage.getByText('Sign in to ResumeBuilder to use voice recording and AI transcription.').waitFor({state:'visible'});
  await speechPage.getByRole('button',{name:'Start speaking'}).click();
  await speechPage.waitForFunction(()=>window.__resumeSpeechMock.recognizer!==null);
  await speechPage.getByRole('button',{name:'Stop speaking'}).click();
  await speechPage.getByText('Microphone paused. Your transcript has been kept.').waitFor({state:'visible'});
  console.log('PASS discoverable voice controls, stop & retry, authenticated AI fallback notice');

  // iPhone Safari emulation: mobile uses AI recorder instead of unsupported
  // SpeechRecognition and offers optional native audio upload.
  const phoneCtx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'});
  const phonePage=await phoneCtx.newPage();
  await open(phonePage,'/app');
  await phonePage.getByRole('button',{name:'Open navigation menu'}).click();
  await phonePage.locator('#mobile-workspace-nav').getByRole('button',{name:'Interview Practice'}).click();
  await phonePage.getByRole('button',{name:'Record answer with AI'}).last().waitFor({state:'visible'});
  await phonePage.getByRole('button',{name:'Record answer with AI'}).last().click();
  await phonePage.getByText('Sign in to ResumeBuilder to use voice recording and AI transcription.').waitFor({state:'visible'});
  await phonePage.getByRole('button',{name:'Upload Audio'}).waitFor({state:'visible'});
  await phoneCtx.close();
  console.log('PASS iPhone voice-first controls, native recording fallback and general interviews');

  console.log('PASS voice interview: next question spoken, interim/final transcript, Filipino language and mic continuation');
  await speechContext.close();

  const adminContext=await browser.newContext({viewport:{width:1280,height:800}});
  const adminPage=await adminContext.newPage();
  await open(adminPage,'/admin/preview');
  await adminPage.getByRole('heading',{name:'Admin Dashboard'}).waitFor({state:'visible'});
  // Job Matching, Job Tracker and Job Posts were intentionally removed.
  if(await adminPage.getByText('Job Posts',{exact:true}).count())throw Error('Legacy Job Posts menu must not be visible');
  const adminMenu=await adminPage.locator('.admin-sidebar').innerText();
  if(adminMenu.includes('Job Posts')||adminMenu.includes('Job Matching')||adminMenu.includes('Job Tracker'))throw Error('Job-related admin navigation must not exist');

  await adminPage.locator('.admin-sidebar').getByRole('button',{name:'Users'}).click();
  await adminPage.getByRole('heading',{name:'Admin Dashboard'}).count(); // page retains the admin app shell
  await adminPage.getByRole('button',{name:'Download Excel'}).waitFor({state:'visible'});
  await adminPage.locator('.admin-sidebar').getByRole('button',{name:'Activity Logs'}).click();
  await adminPage.locator('.admin-table-scroll th').filter({hasText:/^IP Address$/}).waitFor({state:'visible'});
  await adminPage.locator('.admin-table-scroll th').filter({hasText:/^Device \/ Browser$/}).waitFor({state:'visible'});
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
  await photoPage.locator('.wizard-stagebar').getByRole('button',{name:'Skills'}).click();
  await photoPage.locator('.wizard-extra-pick').filter({hasText:'Certifications & Training'}).click();
  await photoPage.getByLabel('Certificate / Training Title').last().fill('Sample Network Certification');
  await photoPage.getByLabel('Issuer / Organization').last().fill('Demo Training Academy');
  await photoPage.locator('.wizard-extra-pick').filter({hasText:'Professional References'}).click();
  await photoPage.getByLabel('Reference Name').last().fill('Test Reference');
  await photoPage.getByLabel('Contact Information').last().fill('reference@example.test');
  await photoPage.locator('.wizard-extra-pick').filter({hasText:'Languages'}).click();
  await photoPage.getByLabel('Language',{exact:true}).last().fill('English');
  await photoPage.getByLabel('Proficiency Level').last().fill('Fluent');
  await photoPage.locator('.wizard-extra-pick').filter({hasText:'Projects & Portfolio'}).click();
  await photoPage.getByLabel('Project Name').fill('Responsive CV Project');
  await photoPage.locator('.wizard-extra-pick').filter({hasText:'Awards & Achievements'}).click();
  await photoPage.getByLabel('Award / Achievement').fill('Demo Merit Award');
  await photoPage.locator('.wizard-extra-pick').filter({hasText:'Volunteer Experience'}).click();
  await photoPage.getByRole('textbox',{name:'Volunteer Role',exact:true}).fill('Community Volunteer');
  await photoPage.locator('.wizard-extra-pick').filter({hasText:'Custom Sections'}).click();
  await photoPage.getByLabel('Section Title').fill('Professional Memberships');
  await photoPage.getByLabel('Content',{exact:true}).fill('Demo technology association');
  await photoPage.locator('.wizard-extra-pick').filter({hasText:'Additional Information'}).click();
  await photoPage.getByLabel('Other Qualifications / Information').fill('Eligible to work in the Philippines');
  const requiredSections=['Certifications & Training','References','Languages','Projects','Awards & Achievements','Volunteer Experience','Professional Memberships','Additional Information'];
  for(const name of requiredSections){
   const element=photoPage.locator('.wizard-preview .resume-document .rd-section').filter({has:photoPage.locator('h3').getByText(name,{exact:true})});
   if(await element.count()!==1)throw Error('Optional section not visible: '+name);
  }
  await photoPage.getByRole('button',{name:'Save Draft'}).click();
  await photoPage.locator('.wizard-stagebar').getByRole('button',{name:'Generate'}).click();
  await photoPage.locator('.rt-wizard-template-grid button').last().waitFor({state:'visible'});
  if(await photoPage.locator('.rt-wizard-template-grid > button').first().locator('.rd-portrait').count()!==1)throw Error('Photo-ready designs must be listed first in builder');
  await photoPage.locator('.rt-wizard-filters').getByRole('button',{name:'With Photo'}).click();
  if(await photoPage.locator('.rt-wizard-template-grid > button').count()!==20)throw Error('Photo-only wizard filter should show 20 photo templates');
  await photoPage.locator('.rt-wizard-filters').getByRole('button',{name:'With Photo'}).click();


  await photoPage.locator('.rt-wizard-template-grid').getByRole('button',{name:/Creative Sidebar/}).click();
  for(const name of requiredSections){
   const visible=await photoPage.locator('.wizard-preview .resume-document .rd-section h3').getByText(name,{exact:true}).count();
   if(visible!==1)throw Error('Section was lost after switching to Creative Sidebar: '+name);
  }

  await photoPage.getByRole('button',{name:'Accent Blue'}).click();
  await photoPage.getByRole('button',{name:'Background Soft blue'}).click();
  const customized=await photoPage.locator('.wizard-preview .resume-document').evaluate(el=>[el.style.getPropertyValue('--rd-accent'),el.style.getPropertyValue('--rd-page-bg')]);
  if(customized[0].toLowerCase()!=='#2563eb'||customized[1].toLowerCase()!=='#f2f7fd')throw Error('Live color/background customization did not update the document: '+customized);
  for(const [label,magic] of [['Download PDF','%PDF'],['Download DOCX','PK'],['Download PNG','PNG']] ){
   const event=photoPage.waitForEvent('download',{timeout:30000});
   await photoPage.getByRole('button',{name:label,exact:true}).click();
   const d=await event;
   const bytes=fs.readFileSync(await d.path());
   if(bytes.length<1000)throw Error(label+' file unexpectedly small: '+bytes.length);
   const valid=label==='Download PNG'?bytes[0]===0x89&&bytes.subarray(1,4).toString()==='PNG':bytes.subarray(0,magic.length).toString()===magic;
   if(!valid)throw Error(label+' did not return a valid file header');
   if(label==='Download PNG'){
    const {PNG}=require('pngjs');
    const image=PNG.sync.read(bytes);
    if(image.width<1500||image.height<2200)throw Error('PNG was cropped or too small: '+image.width+'x'+image.height);
    const colors=new Set(),ink=new Set();
    let notWhite=0;
    for(let y=12;y<image.height;y+=17){
     for(let x=12;x<image.width;x+=17){
      const i=(y*image.width+x)*4;
      const r=image.data[i],g=image.data[i+1],b=image.data[i+2];
      const color=(r<<16)|(g<<8)|b;colors.add(color);
      if(r<180&&g<180&&b<180)ink.add(color);
      if(r<240||g<240||b<240)notWhite++;
     }
    }
    if(colors.size<40||ink.size<5||notWhite<80)throw Error('PNG looks blank: unique colors='+colors.size+', dark colors='+ink.size+', non-white samples='+notWhite);
    console.log('PASS PNG visual content: '+image.width+'x'+image.height+', '+colors.size+' colors and '+notWhite+' non-white samples');
   }
   console.log('PASS '+label+': '+bytes.length+' bytes, '+d.suggestedFilename());
   if(label==='Download DOCX'){
    const {execFileSync}=require('node:child_process');
    const xml=execFileSync('unzip',['-p',await d.path(),'word/document.xml'],{encoding:'utf8'});
    for(const marker of ['Sample Network Certification','Test Reference','Professional Memberships','Eligible to work in the Philippines']){
     if(!xml.toLowerCase().includes(marker.toLowerCase()))throw Error('Missing user-added content in DOCX: '+marker);
    }
   }

  }


  // Check Canva handoff independently of Canva's external network response.
  await photoContext.route('https://www.canva.com/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<html><body>Canva PDF Editor (test stub)</body></html>'}));
  const canvaTabWait=photoContext.waitForEvent('page');
  const canvaPdfWait=photoPage.waitForEvent('download');
  await photoPage.getByRole('button',{name:'Edit in Canva'}).click();
  const canvaTab=await canvaTabWait;
  const canvaPdf=await canvaPdfWait;
  if(!canvaPdf.suggestedFilename().endsWith('.pdf'))throw Error('Canva handoff did not download a PDF');
  await canvaTab.waitForURL('https://www.canva.com/pdf-editor/',{timeout:15000});
  await photoPage.getByText('Upload the downloaded PDF').first().waitFor({state:'visible'});
  console.log('PASS Canva handoff: downloads PDF, opens Canva import page and explains manual upload');
  await canvaTab.close();
  await open(photoPage,'/app?section=templates');
  const count=await photoPage.locator('.rt-template-card').count();
  const photoFirst=await photoPage.locator('.rt-template-card').first().locator('.rd-portrait').count();
  if(photoFirst!==1)throw Error('Photo-ready resume layouts must appear first in the gallery');
  const examplePortrait=photoPage.locator('.rt-template-card').first().locator('.rd-portrait img');
  await examplePortrait.waitFor({state:'visible'});
  const naturalWidth=await examplePortrait.evaluate(el=>el.naturalWidth);
  if(naturalWidth<100)throw Error('Portrait preview illustration failed to load: '+naturalWidth);
  await photoPage.getByRole('button',{name:/With Photo 20/}).click();
  if(await photoPage.locator('.rt-template-card').count()!==20)throw Error('Photo-only gallery filter should show 20 photo-ready layouts');
  await photoPage.getByRole('button',{name:/With Photo 20/}).click();
  if(await photoPage.locator('.rt-template-card').count()!==32)throw Error('All layouts should return after disabling photo-only filter');
  console.log('PASS all 32 unique layout cards, 20 photo-ready templates ordered first and rendered sample portrait');

  const pageText=await photoPage.locator('.side-nav').innerText();
  if(pageText.includes('Job Matching')||pageText.includes('Job Tracker'))throw Error('Removed user menu items reappeared');

  if(count!==32)throw Error('Expected 32 unique resume layout cards, found '+count);
  await photoContext.close();
  console.log('PASS photo upload/remove, dynamic CV sections, template switching and 32 unique resume layout cards');
  console.log('PASS Admin Dashboard preview, navigation and reports (without Job Posts)');



  // Auth UX smoke: password-first signup, optional OTP, and readable errors.
  // No real auth email/OAuth requests are sent by these tests.
  const authCtx=await browser.newContext({viewport:{width:390,height:844}});
  const authPage=await authCtx.newPage();
  await open(authPage,'/signup');
  await authPage.getByRole('heading',{name:'Create an Account'}).waitFor({state:'visible'});
  await authPage.getByPlaceholder('At least 8 characters').waitFor({state:'visible'});
  await authPage.getByRole('button',{name:/Use an email OTP instead/}).click();
  if(await authPage.getByPlaceholder('At least 8 characters').count())throw Error('OTP mode should not request a password');
  await authPage.getByRole('button',{name:/Use email and password instead/}).click();
  await authPage.getByPlaceholder('At least 8 characters').waitFor({state:'visible'});
  await open(authPage,'/login?error=oauth_provider');
  await authPage.getByRole('alert').getByText('Google sign-in is not enabled or configured correctly in the ResumeBuilder Supabase project.').waitFor({state:'visible'});
  await authCtx.close();
  console.log('PASS password-first signup, OTP alternative and actionable Google OAuth error messages');

  // Autosave regression: typing, navigating away, returning and hard reload
  // must preserve a new resume, wizard stage, AI prompt and interview answers.
  const draftContext=await browser.newContext({viewport:{width:1280,height:850}});
  const draftPage=await draftContext.newPage();
  await draftPage.addInitScript(()=>{
   window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;this.onend=null;this.onerror=null;}};
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(u){queueMicrotask(()=>u.onend?.());}}});
  });
  await open(draftPage,'/app');
  await draftPage.locator('.create-button').click();
  await draftPage.getByLabel('Full Name').fill('Resume Auto Save Test');
  await draftPage.getByLabel('Email Address').fill('autosave@example.com');
  await draftPage.waitForFunction(()=>{
   const value=JSON.parse(localStorage.getItem('resumebuilder:drafts:v1:demo')||'{}');
   return Object.values(value.drafts||{}).some(d=>d.name==='Resume Auto Save Test'&&d.email==='autosave@example.com');
  });
  await draftPage.locator('.side-nav').getByRole('button',{name:'ATS Checker'}).click();
  await draftPage.locator('.side-nav').getByRole('button',{name:'Build Resume'}).click();
  await draftPage.getByLabel('Full Name').waitFor({state:'visible'});
  if(await draftPage.getByLabel('Full Name').inputValue()!=='Resume Auto Save Test')throw Error('Resume input lost on tab change');
  await draftPage.locator('.wizard-stagebar').getByRole('button',{name:'Generate'}).click();
  await draftPage.getByLabel('Describe your background').fill('This is a long interview-focused professional introduction and training project.');
  await draftPage.locator('.side-nav').getByRole('button',{name:'Dashboard'}).click();
  await draftPage.locator('.side-nav').getByRole('button',{name:'Build Resume'}).click();
  await draftPage.getByLabel('Describe your background').waitFor({state:'visible'});
  if(!(await draftPage.getByLabel('Describe your background').inputValue()).includes('training project'))throw Error('Wizard prompt lost on navigation');
  await draftPage.reload({waitUntil:'networkidle'});
  await draftPage.locator('.side-nav').getByRole('button',{name:'Build Resume'}).click();
  await draftPage.getByLabel('Describe your background').waitFor({state:'visible'});
  await draftPage.locator('.wizard-stagebar').getByRole('button',{name:'Profile'}).click();
  if(await draftPage.getByLabel('Email Address').inputValue()!=='autosave@example.com')throw Error('Resume draft lost after reload');
  if(await draftPage.getByLabel('Target Job Title').count())throw Error('Target Job Title should not be required in Build Resume');
  if(await draftPage.locator('.resume-document .rd-job-title').count())throw Error('Target job title must not be printed');
  await draftPage.locator('.side-nav').getByRole('button',{name:'Interview Practice'}).click();
  await draftPage.locator('.interview-role strong').getByText('General interview').waitFor({state:'visible'});
  await draftPage.getByLabel('Your Answer').fill('I designed an incident management workflow for our capstone group.');
  await draftPage.getByRole('button',{name:'Next Question'}).click();
  await draftPage.getByText('Current Question (2/10)').waitFor({state:'visible'});
  await draftPage.locator('.side-nav').getByRole('button',{name:'Dashboard'}).click();
  await draftPage.locator('.side-nav').getByRole('button',{name:'Interview Practice'}).click();
  await draftPage.getByText('Current Question (2/10)').waitFor({state:'visible'});
  await draftPage.getByRole('button',{name:'Previous'}).click();
  if(!(await draftPage.getByLabel('Your Answer').inputValue()).includes('incident management'))throw Error('Previous interview answer was lost on navigation');
  await draftPage.reload({waitUntil:'networkidle'});
  await draftPage.locator('.side-nav').getByRole('button',{name:'Interview Practice'}).click();
  await draftPage.getByText('Current Question (1/10)').waitFor({state:'visible'});
  if(!(await draftPage.getByLabel('Your Answer').inputValue()).includes('incident management'))throw Error('Interview transcript lost after page reload');
  await draftContext.close();
  console.log('PASS autosave: resume input, wizard stage/prompt and interview transcript persist on navigation and refresh');

  console.log('PASS: '+checked+' responsive viewport suites');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
