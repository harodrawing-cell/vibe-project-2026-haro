const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const result=[];
async function reveal(page) {
  for (const id of ['about','emoticon','story','goods']) {
    await page.locator('#'+id).scrollIntoViewIfNeeded();
    await page.waitForTimeout(180);
  }
  await page.evaluate(async()=>{const images=[...document.querySelectorAll('main img')];images.forEach(img=>img.loading='eager');await Promise.race([Promise.all(images.filter(img=>img.src).map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,5000))]);window.scrollTo(0,0)});
  await page.waitForTimeout(100);
}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  for(const width of [1920,1024,768,390]) {
   for(const version of ['original','react']) {
    const context=await browser.newContext({viewport:{width,height:1080},reducedMotion:'reduce'});
    await context.route(/https:\/\/.*(?:googleapis|firebaseio|firebaseapp)\.com\//,r=>r.abort());
    if(version==='original') {
     await context.route('**/js/services/account-service.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.HaroAccount={subscribe(fn){fn(null);return()=>{}},getUser:async()=>null,isAdmin:async()=>false};"}));
     await context.route('**/js/services/notice-repository.js',r=>r.fulfill({contentType:'application/javascript',body:'window.HaroNoticeRepository={getList:async()=>[]};'}));
     await context.route('**/swiper@12/swiper-bundle.min.js',r=>r.fulfill({path:path.resolve('node_modules/swiper/swiper-bundle.min.js'),contentType:'application/javascript'}));
     await context.route('**/swiper@12/swiper-bundle.min.css',r=>r.fulfill({path:path.resolve('node_modules/swiper/swiper-bundle.min.css'),contentType:'text/css'}));
    } else {
     await context.route('**/src/services/account.js*',r=>r.fulfill({contentType:'application/javascript',body:'export default {subscribe(fn){fn(null);return()=>{}},getUser:async()=>null};'}));
     await context.route('**/src/services/notices.js*',r=>r.fulfill({contentType:'application/javascript',body:'export default {getList:async()=>[]};'}));
    }
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:5173/'+(version==='react'?'react.html':'index.html'),{waitUntil:'networkidle'});
    await reveal(page);
    const metrics=await page.evaluate(()=>Object.fromEntries(['top','about','emoticon','story','goods'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,{x:r.x,y:r.y,width:r.width,height:r.height}]})));
    result.push({width,version,metrics});
    await page.screenshot({path:`test-results/react/${version}-comparison-${width}.png`,fullPage:true});
    if(version==='react') {
     const images=await page.evaluate(()=>[...document.querySelectorAll('main img')].filter(img=>!img.naturalWidth).map(img=>img.src));
     if(images.length)throw Error('Broken React images: '+images.join(','));
    }
    await context.close();
   }
  }
  fs.writeFileSync('test-results/react/comparison.json',JSON.stringify(result,null,2));
  for(const width of [1920,1024,768,390]){
   const [original,react]=result.filter(v=>v.width===width);
   console.log(width,JSON.stringify(Object.fromEntries(Object.keys(original.metrics).map(id=>[id,{heightDelta:react.metrics[id].height-original.metrics[id].height,topDelta:react.metrics[id].y-original.metrics[id].y}]))));
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
