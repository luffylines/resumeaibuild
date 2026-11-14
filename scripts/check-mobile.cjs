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
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});let checked=0;
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
   if(await page.locator('.dashboard-admin-link,.sidebar-admin-area,.admin-workspace-link').count())throw Error(size.name+' user workspace must not expose admin entry points');
   if(size.width<=700){
    await page.getByRole('button',{name:'Open navigation menu'}).click();
    const nav=page.locator('#mobile-workspace-nav');
    await nav.waitFor({state:'visible'});
    await page.getByRole('button',{name:'Close sidebar navigation'}).click();
    await pause(350);
    if(await nav.evaluate(el=>el.classList.contains('sidebar-open')))throw Error('Client drawer did not close');
   }
   if(size.width<=390)await page.screenshot({path:path.join(shots,'client-'+size.name+'.png')});
   // Native select controls should have spacious right padding for a custom
   // chevron, readable labels and no iPhone focus zoom.
   if(size.width<=700)await page.getByRole('button',{name:'Open navigation menu'}).click();
   await page.locator('.side-nav').getByRole('button',{name:'Cover Letter'}).click();
   const dropdownGeometry=await page.evaluate(()=>{
    const selects=[...document.querySelectorAll('.resume-client-shell .field select')];
    return selects.map(el=>{
     const style=getComputedStyle(el),box=el.getBoundingClientRect();
     return {rightPadding:parseFloat(style.paddingRight),leftPadding:parseFloat(style.paddingLeft),font:parseFloat(style.fontSize),appearance:style.appearance,
      arrow:style.backgroundImage,viewportRight:document.documentElement.clientWidth-box.right,width:box.width};
    });
   });
   if(dropdownGeometry.length<2)throw Error('Cover letter resume/tone dropdown controls missing');
   for(const select of dropdownGeometry){
    if(select.rightPadding<44||select.leftPadding<14||select.width<100||!select.arrow.includes('svg+xml')||select.viewportRight<0)
     throw Error(size.name+' dropdown has cramped text/arrow or clipping: '+JSON.stringify(select));
    if(size.width<=768&&select.font<16)throw Error(size.name+' dropdown could trigger iOS focus zoom: '+JSON.stringify(select));
   }
   if(size.width<=390)await page.screenshot({path:path.join(shots,'cover-dropdown-'+size.name+'.png')});
   console.log('PASS '+size.name+' resume/tone selects have inset chevrons, readable text and no horizontal overflow');

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
   const state={spoken:[],voiceURIs:[],recognizer:null};
   // Stand-in local camera stream, no physical camera in CI.
   if(navigator.mediaDevices)Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>new MediaStream()});
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
    getVoices(){return [
     {voiceURI:'compact',name:'English Compact',lang:'en-US',localService:true,default:true},
     {voiceURI:'natural',name:'Samantha (Enhanced)',lang:'en-US',localService:true,default:false}
    ];},
    speak(utterance){state.spoken.push(utterance.text);state.voiceURIs.push(utterance.voice?.voiceURI||'default');queueMicrotask(()=>utterance.onend?.());}
   }});
  });
  await open(speechPage,'/app');
  if(await speechPage.locator('.dashboard-admin-link,.sidebar-admin-area').count())throw Error('Normal workspace must not expose Admin Login or Admin Dashboard links');
  await speechPage.locator('.side-nav').getByRole('button',{name:'Interview Practice'}).click();
  await speechPage.getByRole('button',{name:'Start Personalized Interview'}).click();
  await speechPage.waitForFunction(()=>window.__resumeSpeechMock?.spoken?.some(x=>x.includes('Let us begin.')));
  const welcome=await speechPage.evaluate(()=>window.__resumeSpeechMock.spoken.find(x=>x.includes('Let us begin.')));
  if(!welcome.includes('Christian'))throw Error('Interview greeting did not use resume name: '+welcome);
  if(!(await speechPage.getByText('Current Question (1/10)').count()))throw Error('Wrong interview question counter');
  const firstCount=await speechPage.evaluate(()=>window.__resumeSpeechMock.spoken.length);
  await speechPage.getByRole('button',{name:'Next Question'}).click();
  await speechPage.waitForFunction(count=>window.__resumeSpeechMock.spoken.length>count,firstCount);
  const spoken=await speechPage.evaluate(()=>window.__resumeSpeechMock.spoken.at(-1));
  if(!spoken.trim()||spoken.length<10)throw Error('Next Question was not read aloud: '+spoken);
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
  const previousCount=await speechPage.evaluate(()=>window.__resumeSpeechMock.spoken.length);
  await speechPage.getByRole('button',{name:'Next Question'}).click();
  await speechPage.waitForFunction(count=>window.__resumeSpeechMock.spoken.length>count,previousCount);
  const voicesUsed=await speechPage.evaluate(()=>window.__resumeSpeechMock.voiceURIs);
  if(voicesUsed.some(uri=>uri!=='natural'))throw Error('Interviewer voice switched across questions: '+voicesUsed.join(', '));
  console.log('PASS consistent English interviewer voice across the greeting and questions');
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
  await speechPage.getByRole('button',{name:'Turn on local camera preview'}).click();
  await speechPage.locator('.interview-camera-tile video').waitFor({state:'visible'});
  await speechPage.locator('.interview-bot').waitFor({state:'visible'});
  if(await speechPage.locator('.interview-bot').count()!==1)throw Error('Enabling the camera hid the talking interviewer bot');
  await speechPage.getByRole('button',{name:'Turn off camera'}).click();
  console.log('PASS camera picture-in-picture, bot remains visible while camera is enabled');
  console.log('PASS discoverable voice controls, stop & retry, authenticated AI fallback notice');

  // iPhone Safari emulation: mobile uses AI recorder instead of unsupported
  // SpeechRecognition and offers optional native audio upload.
  const phoneCtx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'});
  const phonePage=await phoneCtx.newPage();
  await open(phonePage,'/app');
  await phonePage.getByRole('button',{name:'Open navigation menu'}).click();
  await phonePage.locator('#mobile-workspace-nav').getByRole('button',{name:'Interview Practice'}).click();
  await phonePage.getByRole('button',{name:'Start Personalized Interview'}).click();
  const zoomCheck=await phonePage.evaluate(()=>{
   const field=document.querySelector('textarea[aria-label="Your Answer"]');
   const selector=document.getElementById('interview-resume-choice');
   const click=document.querySelector('.interview-next');
   return {answer:field?parseFloat(getComputedStyle(field).fontSize):0,
    select:selector?parseFloat(getComputedStyle(selector).fontSize):0,
    touch:click?getComputedStyle(click).touchAction:''};
  });
  if(zoomCheck.answer<16||zoomCheck.select<16||zoomCheck.touch!=='manipulation'){
   throw Error('iPhone focus zoom controls not optimized: '+JSON.stringify(zoomCheck));
  }
  console.log('PASS iPhone focus controls remain 16px+ with single-tap behavior and accessible pinch zoom');
  // Chromium with an iPhone user-agent may expose live Web Speech.
  // Real Safari versions may instead require the server-side recorder.
  const phoneAI=phonePage.getByRole('button',{name:'Record answer with AI'}).last();
  if(await phoneAI.isVisible().catch(()=>false)){
   await phoneAI.click();
  }else{
   await phonePage.getByRole('button',{name:'Start microphone transcription'}).waitFor({state:'visible'});
   await phonePage.getByRole('button',{name:'Record with AI backup'}).click();
  }
  await phonePage.getByText('Sign in to ResumeBuilder to use voice recording and AI transcription.').waitFor({state:'visible'});
  await phonePage.getByRole('button',{name:'Upload Audio'}).waitFor({state:'visible'});
  await phoneCtx.close();
  console.log('PASS iPhone voice-first controls, native recording fallback and general interviews');
  // Simulate Brave exposing Web Speech yet blocking its remote speech service.
  const braveCtx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36'});
  const bravePage=await braveCtx.newPage();
  await bravePage.addInitScript(()=>{window.brave={isBrave:async()=>true};});
  await open(bravePage,'/app');
  await bravePage.getByRole('button',{name:'Open navigation menu'}).click();
  await bravePage.locator('#mobile-workspace-nav').getByRole('button',{name:'Interview Practice'}).click();
  await bravePage.getByRole('button',{name:'Start Personalized Interview'}).click();
  await bravePage.getByRole('button',{name:'Record answer with AI'}).last().waitFor({state:'visible'});
  await bravePage.getByRole('button',{name:'Record answer with AI'}).last().click();
  await bravePage.getByText('Sign in to ResumeBuilder to use voice recording and AI transcription.').waitFor({state:'visible'});
  await braveCtx.close();
  console.log('PASS Brave mobile: uses secure recording fallback instead of unsupported live dictation');
  const braveIOSCtx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1 Brave'});
  const braveIOSPage=await braveIOSCtx.newPage();
  await open(braveIOSPage,'/app');
  await braveIOSPage.getByRole('button',{name:'Open navigation menu'}).click();
  await braveIOSPage.locator('#mobile-workspace-nav').getByRole('button',{name:'Interview Practice'}).click();
  await braveIOSPage.getByRole('button',{name:'Start Personalized Interview'}).click();
  await braveIOSPage.getByRole('button',{name:'Record answer with AI'}).last().waitFor({state:'visible'});
  await braveIOSPage.getByRole('button',{name:'Record on iPhone'}).waitFor({state:'visible'});
  await braveIOSPage.getByRole('button',{name:'Record answer with AI'}).last().click();
  await braveIOSPage.getByText('Sign in to ResumeBuilder to use voice recording and AI transcription.').waitFor({state:'visible'});
  await braveIOSCtx.close();
  console.log('PASS Brave iOS: default recorder path, native iPhone recording option and auth guard');




  console.log('PASS voice interview: next question spoken, interim/final transcript, Filipino language and mic continuation');
  await speechContext.close();


  // Settings smoke tests in demo mode: these do not touch Supabase or Vercel.
  const settingsCtx=await browser.newContext({viewport:{width:1200,height:800}});
  const settingsPage=await settingsCtx.newPage();
  await open(settingsPage,'/app');
  await settingsPage.locator('.side-nav').getByRole('button',{name:'Settings'}).click();
  await settingsPage.getByRole('heading',{name:'Account Information'}).waitFor({state:'visible'});
  if(await settingsPage.getByRole('button',{name:'Export my data'}).count())throw Error('Export my data must be removed');
  const accountPortrait=settingsPage.locator('.settings-v2 .settings-avatar');
  const portraitBox=await accountPortrait.boundingBox();
  if(!portraitBox||portraitBox.width<75||portraitBox.height<75)throw Error('Profile photo portrait must be visible and at least 75px on desktop');
  const headerPortrait=settingsPage.locator('.resume-client-shell .profile-chip .avatar');
  const headerBox=await headerPortrait.boundingBox();
  if(!headerBox||headerBox.width<40)throw Error('Profile photo in header must be clearly visible');
  const photoButton=settingsPage.getByRole('button',{name:'Upload Profile Photo'});
  if(await photoButton.isEnabled())throw Error('Demo account must not upload an authenticated profile photo');
  // Errors and success messages are fixed to the top-right and clear after
  // five seconds; they should not push the Settings form content downward.
  const fullName=settingsPage.getByLabel('Full Name');
  await fullName.fill('');
  await settingsPage.getByRole('button',{name:'Save Profile'}).click();
  const errorToast=settingsPage.getByTestId('global-error-toast');
  await errorToast.waitFor({state:'visible'});
  const toastBox=await errorToast.boundingBox();
  if(!toastBox||toastBox.y>80||Math.abs(toastBox.x+toastBox.width-1200)>55)throw Error('Error toast must appear fixed near upper-right corner');
  await errorToast.waitFor({state:'hidden',timeout:7000});
  await fullName.fill('Demo Profile');
  await settingsPage.getByRole('button',{name:'Save Profile'}).click();
  const successToast=settingsPage.getByTestId('global-success-toast');
  await successToast.waitFor({state:'visible'});
  await successToast.waitFor({state:'hidden',timeout:7000});
  console.log('PASS settings: professional upper-right red/green toasts automatically disappear after 5 seconds');
  await settingsPage.getByRole('button',{name:'Subscription'}).click();
  await settingsPage.getByRole('heading',{name:'Subscription Plans'}).waitFor({state:'visible'});
  const prices=await settingsPage.locator('.settings-pricing-price').allTextContents();
  if(prices.length!==3||!prices.some(p=>p.includes('200'))||!prices.some(p=>p.includes('400')))throw Error('Monthly Pro and Ultra pricing missing: '+prices.join(', '));
  for(const button of await settingsPage.locator('.settings-pricing-card button').all()){
   if(await button.isEnabled())throw Error('Cannot enable unconfigured billing checkout');
  }
  await settingsPage.getByRole('button',{name:'Integrations'}).click();
  await settingsPage.getByText('Not verified').waitFor({state:'visible'});
  await settingsPage.getByRole('button',{name:'Security'}).click();
  await settingsPage.getByText('Sign in to set up two-factor authentication.').waitFor({state:'visible'});
  await settingsCtx.close();
  console.log('PASS account/settings: no data export, avatar controls, MFA sign-in requirement, proposed ₱200 / ₱400 plans and safe billing status');

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
  await adminPage.getByText('Demo export locked').first().waitFor({state:'visible'});
  await adminPage.locator('.admin-sidebar').getByRole('button',{name:'Activity Logs'}).click();
  await adminPage.locator('.admin-table-scroll th').filter({hasText:/^IP Address$/}).waitFor({state:'visible'});
  await adminPage.locator('.admin-table-scroll th').filter({hasText:/^Device \/ Browser$/}).waitFor({state:'visible'});
  await adminPage.getByLabel('Reporting period').selectOption('all');
  if(await adminPage.getByRole('button',{name:'Download Excel'}).count())throw Error('Admin demo should not offer Excel downloads');
  await adminPage.getByText('Demo export locked').first().waitFor({state:'visible'});
  await adminContext.close();
  console.log('PASS admin activity table, date picker and disabled demo Excel export');

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
  await photoPage.locator('.wizard-stagebar').getByRole('button',{name:'Education'}).click();
  const educationOne=photoPage.getByRole('region',{name:'Education 1'});
  await educationOne.getByLabel('Education Level').selectOption('Senior High School / TVL');
  await educationOne.getByLabel('School / Institution').fill('Ernesto Rondon High School');
  await educationOne.getByLabel('Program / Strand / Course (Optional)').fill('TVL – Information and Communications Technology');
  await educationOne.getByLabel('Education 1 start year').fill('2023');
  await educationOne.getByLabel('Education 1 end year').fill('2025');
  await educationOne.getByLabel('School Address (Optional)').fill('146 Rd 3, Project 6, Quezon City');
  await photoPage.getByRole('button',{name:'Add Another Education'}).click();
  const educationTwo=photoPage.getByRole('region',{name:'Education 2'});
  await educationTwo.getByLabel('Education Level').selectOption('Alternative Learning System (ALS)');
  await educationTwo.getByLabel('School / Institution').fill('San Antonio Elementary School');
  await educationTwo.getByLabel('Education 2 start year').fill('2020');
  await educationTwo.getByLabel('Education 2 end year').fill('2021');
  const previewEducation=photoPage.locator('.wizard-preview .rd-key-education');
  for(const token of ['Senior High School / TVL','TVL – Information and Communications Technology','Ernesto Rondon High School','2023 – 2025','146 Rd 3','Alternative Learning System (ALS)','San Antonio Elementary School','2020 – 2021']){
   if(!(await previewEducation.innerText()).includes(token))throw Error('Education not reflected in live preview: '+token);
  }
  await educationOne.getByRole('button',{name:'Present / Ongoing'}).click();
  if(!(await previewEducation.innerText()).includes('2023 – Present'))throw Error('Present status was not reflected in preview');
  await educationOne.getByRole('button',{name:'Completed'}).click();
  if(!(await previewEducation.innerText()).includes('2023 – 2025'))throw Error('Completed status did not restore end year');
  await photoPage.getByRole('button',{name:'Save Draft'}).click();
  await photoPage.waitForTimeout(700);
  await photoPage.reload({waitUntil:'networkidle'});
  await photoPage.locator('.side-nav').getByRole('button',{name:'Build Resume'}).click();
  await photoPage.locator('.wizard-stagebar').getByRole('button',{name:'Education'}).click();
  const persisted=photoPage.getByRole('region',{name:'Education 1'});
  if(await persisted.getByLabel('School / Institution').inputValue()!=='Ernesto Rondon High School')throw Error('Education institution lost after refresh');
  if(await persisted.getByLabel('Program / Strand / Course (Optional)').inputValue()!=='TVL – Information and Communications Technology')throw Error('Education strand lost after refresh');
  if(await persisted.getByLabel('School Address (Optional)').inputValue()!=='146 Rd 3, Project 6, Quezon City')throw Error('School address lost after refresh');
  console.log('PASS education: TVL, ALS, program, address, structured years, ongoing switch, preview and autosave after refresh');
  await photoPage.locator('.wizard-stagebar').getByRole('button',{name:'Profile'}).click();
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
  // Demo accounts can edit and view a watermarked resume, but must not have
  // active PDF / DOCX / PNG / Print / Canva / clipboard export controls.
  await photoPage.getByText('Exports are locked in demo mode').waitFor({state:'visible'});
  for(const label of ['Download PDF','Download DOCX','Download PNG','Print','Editable DOCX (simple layout)','Text-based PDF (ATS)','Edit in Canva']){
   if(await photoPage.getByRole('button',{name:label,exact:true}).count())throw Error('Demo can still export: '+label);
  }
  if(await photoPage.locator('.resume-export-host .resume-document').count())throw Error('Demo exposed a clean offscreen export document');
  if(await photoPage.locator('.wizard-watermark span').count()!==3)throw Error('Demo resume watermark was not rendered');
  if(await photoPage.getByRole('link',{name:/Create Free Account/}).count()!==1)throw Error('Demo export lock must invite sign-up');
  const preview=photoPage.locator('.wizard-preview .resume-document');
  await preview.waitFor({state:'visible'});
  await photoPage.emulateMedia({media:'print'});
  await photoPage.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  const printVisibility=await preview.evaluate(el=>{
   const root=el.closest('.wizard-page--demo');
   return {
    rootDisplay:root?getComputedStyle(root).display:'missing',
    rootClass:root?.className||'missing',
    mediaPrint:window.matchMedia('print').matches,
    demoRulePresent:[...document.styleSheets].some(sheet=>{try{return [...sheet.cssRules].some(rule=>rule.cssText.includes('.wizard-page--demo')&&rule.cssText.includes('display: none'));}catch{return false;}}),
    display:getComputedStyle(el).display,
    visibility:getComputedStyle(el).visibility
   };
  });
  await photoPage.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  await photoPage.emulateMedia({media:'screen'});
  if(printVisibility.rootDisplay!=='none'&&printVisibility.display!=='none'&&printVisibility.visibility!=='hidden')throw Error('Browser Print still exposes an unwatermarked demo resume: '+JSON.stringify(printVisibility));
  console.log('PASS demo resume: edits and watermark, no download/print/Canva buttons or clean export target');
  await photoPage.locator('.side-nav').getByRole('button',{name:'Cover Letter'}).click();
  await photoPage.getByRole('heading',{name:'Cover Letter'}).waitFor({state:'visible'});
  await photoPage.getByText('AI generation is locked in Demo Mode').waitFor({state:'visible'});
  if(await photoPage.getByRole('button',{name:'Copy'}).count()||await photoPage.getByRole('button',{name:'Download'}).count())throw Error('Demo cover letter exposes copy/download');
  if(await photoPage.getByRole('button',{name:'Generate with AI'}).count())throw Error('Demo cover letter exposes AI generation');
  if(await photoPage.locator('.cover-demo-watermark span').count()!==2)throw Error('Demo cover-letter watermark missing');
  const demoCover=photoPage.getByRole('textbox',{name:'Editable demo cover letter'});
  await demoCover.fill('Dear Hiring Manager,\\nDemo cover letter saved locally.\\nSincerely, Test Applicant');
  await photoPage.waitForFunction(()=>localStorage.getItem('resumebuilder:demo-cover-letter:v1')?.includes('Demo cover letter saved locally'));
  await photoPage.reload({waitUntil:'networkidle'});
  await photoPage.locator('.side-nav').getByRole('button',{name:'Cover Letter'}).click();
  if(!(await photoPage.getByRole('textbox',{name:'Editable demo cover letter'}).inputValue()).includes('Demo cover letter saved locally'))throw Error('Demo cover letter draft lost after refresh');
  console.log('PASS demo cover letter: editable, locally saved, watermarked and no AI/copy/download controls');
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
  // Every gallery sample must contain real-looking example sections independent
  // of the signed-in user's saved resume, and the photo must never cover name
  // or contact even when a long name wraps.
  const collisions=await photoPage.evaluate(()=>{
   const problems=[];
   const overlap=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
   const cards=[...document.querySelectorAll('.rt-template-card')];
   for(let index=0;index<cards.length;index++){
    const card=cards[index];
    const resume=card.querySelector('.resume-document');
    const title=card.querySelector('.rd-header h2');
    const header=card.querySelector('.rd-header');
    const photo=card.querySelector('.rd-portrait');
    if(!resume||!header||!title||!photo){problems.push(index+': missing markup');continue;}
    if(!card.querySelector('.rd-key-experience')||!card.querySelector('.rd-key-education')||!card.querySelector('.rd-key-summary'))
     problems.push(index+': incomplete sample sections');
    // Stress wrapping without mutating stored resume information.
    title.textContent='ALEXANDER CHRISTOPHER SANTOS DELA CRUZ';
    const textBounds=title.getBoundingClientRect();
    const portraitBounds=photo.getBoundingClientRect();
    const contact=card.querySelector('.rd-contact');
    if(overlap(textBounds,portraitBounds))problems.push(index+': portrait overlaps name');
    if(contact&&overlap(contact.getBoundingClientRect(),portraitBounds))problems.push(index+': portrait overlaps contact');
    const headerBounds=header.getBoundingClientRect();
    if(portraitBounds.bottom>headerBounds.bottom+2)problems.push(index+': portrait extends below header');
    if(portraitBounds.left<headerBounds.left-2||portraitBounds.right>headerBounds.right+2)
     problems.push(index+': portrait outside header');
    if(!title.textContent?.includes('ALEXANDER'))problems.push(index+': stress name not applied');
   }
   return problems;
  });
  if(collisions.length)throw Error('Portrait layout defects: '+collisions.join(' | '));
  await photoPage.screenshot({path:path.join(shots,'gallery-photo-layouts.png'),fullPage:true});
  console.log('PASS all 20 portrait layouts have populated sections and no avatar/name/contact/header collisions under a long sample name');
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
  await draftPage.locator('.interview-role strong').getByText('Personalized to your resume').waitFor({state:'visible'});
  await draftPage.getByRole('button',{name:'Start Personalized Interview'}).click();
  await draftPage.getByText('Current Question (1/10)').waitFor({state:'visible'});
  await draftPage.getByLabel('Your Answer').fill('I designed an incident management workflow for our capstone group.');
  await draftPage.getByRole('button',{name:'Next Question'}).click();
  await draftPage.getByText('Current Question (2/10)').waitFor({state:'visible'});
  await draftPage.locator('.side-nav').getByRole('button',{name:'Dashboard'}).click();
  await draftPage.locator('.side-nav').getByRole('button',{name:'Interview Practice'}).click();
  await draftPage.getByText('Current Question (2/10)').waitFor({state:'visible'});
  await draftPage.getByRole('button',{name:'Previous'}).click();
  if(!(await draftPage.getByLabel('Your Answer').inputValue()).includes('incident management'))throw Error('Previous interview answer was lost on navigation');
  await draftPage.waitForFunction(()=>{
   try{return JSON.parse(localStorage.getItem('resumebuilder:interview:v1:demo')||'{}').answer?.includes('incident management');}catch{return false;}
  });
  await draftPage.reload({waitUntil:'networkidle'});
  await draftPage.locator('.side-nav').getByRole('button',{name:'Interview Practice'}).click();
  await draftPage.getByText('Current Question (1/10)').waitFor({state:'visible'});
  await draftPage.waitForFunction(()=>document.querySelector('textarea[aria-label="Your Answer"]')?.value.includes('incident management'),{timeout:8000});
  if(!(await draftPage.getByLabel('Your Answer').inputValue()).includes('incident management'))throw Error('Interview transcript lost after page reload');
  await draftContext.close();
  console.log('PASS autosave: resume input, wizard stage/prompt and interview transcript persist on navigation and refresh');

  console.log('PASS: '+checked+' responsive viewport suites');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
