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
   await open(page,'/admin');await checkOverflow(page,size.name,'/admin');
   if(size.width<=840){
    await page.getByRole('button',{name:'Open admin menu'}).click();
    const nav=page.locator('#admin-mobile-nav');await nav.waitFor({state:'visible'});
    await page.getByRole('button',{name:'Close admin navigation'}).click();
    await pause(350);if(await nav.evaluate(el=>el.classList.contains('menu-open')))throw Error('Admin drawer did not close');
   }
   if(size.width<=390)await page.screenshot({path:path.join(shots,'admin-'+size.name+'.png')});
   await open(page,'/guide');await checkOverflow(page,size.name,'/guide');
   await open(page,'/demo');await checkOverflow(page,size.name,'/demo');
   await context.close();checked++;console.log('PASS '+size.name+' ('+size.width+' x '+size.height+') public, login, client, templates, admin, guide, demo');
  }
  console.log('PASS: '+checked+' responsive viewport suites');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
