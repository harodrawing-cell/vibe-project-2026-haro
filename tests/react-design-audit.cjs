const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const output = 'test-results/react-final';
fs.mkdirSync(output,{recursive:true});
const pages = [
  ['home','index.html','/'],
  ['notice','pages/notice/notice-list.html','/notice'],
  ['qna','pages/notice/qna.html','/qna'],
  ['login','pages/notice/login.html','/login'],
  ['signup','pages/notice/signup.html','/signup'],
  ['goods','pages/goods/goods-detail.html?id=haro-note','/goods?id=haro-note'],
  ['cart','pages/cart/cart.html','/cart'],
];
const account = `({subscribe(fn){fn(null);return()=>{}},getUser:async()=>null,isAdmin:async()=>false,getCurrentUserName:async()=>'방문자',requireLogin:async()=>{throw Error('로그인 필요')}})`;
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const rows=[];
 try{
  for(const width of [1920,1024,768,390])for(const [name,original,react]of pages)for(const version of ['original','react']){
   const context=await browser.newContext({viewport:{width,height:1080},reducedMotion:'reduce'});
   await context.addInitScript(()=>{Math.random=()=>0.37});
   await context.route(/https:\/\/.*(?:googleapis|firebaseio|firebaseapp)\.com\//,r=>r.abort());
   await context.route('**/js/services/account-service.js*',r=>r.fulfill({contentType:'application/javascript',body:`window.HaroAccount=${account};`}));
   await context.route('**/js/services/notice-repository.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.HaroNoticeRepository={getList:async()=>[]};'}));
   await context.route('**/js/services/qna-repository.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.HaroQnaRepository={getList:async()=>[],subscribeList(fn){fn([]);return()=>{}}};'}));
   await context.route('**/src/services/account.js*',r=>r.fulfill({contentType:'application/javascript',body:`export default ${account};`}));
   for(const service of ['notices','qna'])await context.route(`**/src/services/${service}.js*`,r=>r.fulfill({contentType:'application/javascript',body:'export default {getList:async()=>[],subscribeList(fn){fn([]);return()=>{}}};'}));
   await context.route('**/swiper@12/swiper-bundle.min.js',r=>r.fulfill({path:path.resolve('node_modules/swiper/swiper-bundle.min.js'),contentType:'application/javascript'}));
   await context.route('**/swiper@12/swiper-bundle.min.css',r=>r.fulfill({path:path.resolve('node_modules/swiper/swiper-bundle.min.css'),contentType:'text/css'}));
   const page=await context.newPage();
   await page.goto('http://127.0.0.1:5173/'+(version==='react'?'react.html#'+react:original),{waitUntil:'networkidle'});
   if(name==='home')for(const id of ['about','emoticon','story','goods']){await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForTimeout(100)}
   await page.evaluate(async()=>{const images=[...document.querySelectorAll('main img')];images.forEach(img=>img.loading='eager');await Promise.race([Promise.all(images.filter(img=>img.src).map(img=>img.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,3000))]);scrollTo(0,0)});
   const metrics=await page.evaluate(()=>{
    const selectors=['main','.site-header__inner','.notice-content','.notice-page__heading','.product-panel','.cart-empty','#top','#about','#emoticon','#story','#goods'];
    return {scrollWidth:document.documentElement.scrollWidth,mainText:document.querySelector('main').innerText.replace(/\s+/g,' ').trim(),rects:Object.fromEntries(selectors.map(selector=>{const el=document.querySelector(selector);if(!el)return[selector,null];const r=el.getBoundingClientRect();return[selector,{x:r.x,y:r.y,width:r.width,height:r.height}]}))};
   });
   rows.push({width,page:name,version,...metrics});
   await page.screenshot({path:`${output}/${name}-${version}-${width}.png`,fullPage:true});
   if(name==='home'&&[1920,390].includes(width)){
    await page.locator('#site-search-toggle').click();await page.waitForTimeout(100);
    const search=await page.locator('#search-overlay').evaluate(el=>({text:el.innerText.replace(/\s+/g,' ').trim(),socialLinks:el.querySelectorAll('.search-overlay__socials a').length}));
    rows.push({width,page:'search',version,...search});
    await page.screenshot({path:`${output}/search-${version}-${width}.png`});
   }
   await context.close();
  }
 }finally{await browser.close();fs.writeFileSync(`${output}/design-report.json`,JSON.stringify(rows,null,2))}
 const summary=[];
 for(const row of rows.filter(r=>r.version==='original'&&r.rects)){
  const react=rows.find(r=>r.width===row.width&&r.page===row.page&&r.version==='react');
  summary.push({width:row.width,page:row.page,mainHeightDelta:Math.round((react.rects.main.height-row.rects.main.height)*100)/100,textEqual:react.mainText===row.mainText,reactOverflow:react.scrollWidth>row.width});
 }
 console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
