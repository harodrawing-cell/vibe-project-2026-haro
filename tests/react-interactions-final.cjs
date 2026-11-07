const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const output='test-results/react-final';
fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const report=[];
 try{
  for(const base of ['http://127.0.0.1:5173/react.html','http://127.0.0.1:4173/']){
   const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});
   await context.route(/https:\/\/.*(?:googleapis|firebaseio|firebaseapp)\.com\//,r=>r.abort());
   const page=await context.newPage();
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.locator('.hero__button-look:not(:disabled)').waitFor();
   await page.evaluate(()=>{
    const image=document.querySelector('#hero-box-frame'),box=document.querySelector('#hero-box'),start=performance.now();
    window.__frames=[{file:image.src.split('/').pop(),elapsed:0}];
    window.__frameObserver=new MutationObserver(()=>window.__frames.push({file:image.src.split('/').pop(),elapsed:performance.now()-start}));
    window.__frameObserver.observe(image,{attributes:true,attributeFilter:['src']});
    window.__phaseObserver=new MutationObserver(()=>{if(box.classList.contains('is-open'))window.__duration=performance.now()-start});
    window.__phaseObserver.observe(box,{attributes:true,attributeFilter:['class']});
    document.querySelector('.hero__button-look').click();
   });
   await page.locator('#hero-box.is-open').waitFor();
   const animation=await page.evaluate(()=>{window.__frameObserver.disconnect();window.__phaseObserver.disconnect();return{frames:window.__frames,duration:window.__duration}});
   animation.transientEmptySrcEvents=animation.frames.filter(f=>!f.file).length;
   animation.frameSequence=animation.frames.map(f=>f.file).filter(file=>/^BOX_\d{3}\.png$/.test(file)).filter((file,i,all)=>i===0||file!==all[i-1]);
   assert.deepEqual(animation.frameSequence,Array.from({length:12},(_,i)=>`BOX_${String(i+1).padStart(3,'0')}.png`));
   assert.ok(animation.duration>=1450&&animation.duration<2300);
   await page.locator('#about').scrollIntoViewIfNeeded();await page.locator('#hero-box:not(.is-open)').waitFor();
   const sliders=[];
   for(const kind of ['emoticon','goods']){
    await page.locator('#'+kind).scrollIntoViewIfNeeded();
    const viewport=page.locator(kind==='goods'?'.goods__viewport':'.emoticon__gallery');
    const before=await viewport.evaluate(el=>el.swiper.realIndex);
    await page.locator(`[data-${kind}-next]`).click();await page.waitForTimeout(650);
    const next=await viewport.evaluate(el=>el.swiper.realIndex);
    assert.notEqual(next,before);
    await page.locator(`[data-${kind}-prev]`).click();await page.waitForTimeout(650);
    sliders.push({kind,before,next,back:await viewport.evaluate(el=>el.swiper.realIndex)});
   }
   await page.goto(base+'#/goods?id=haro-note',{waitUntil:'domcontentloaded'});await page.locator('#product-option').selectOption('white-105-148');await page.locator('#product-quantity').fill('2');await page.getByRole('button',{name:'장바구니 담기',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.site-cart__badge')?.textContent==='2');
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('haro-cart-v1')));
   assert.equal(stored.length,1);assert.equal(stored[0].quantity,2);
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.site-cart__badge')?.textContent==='2');
   await page.goto(base+'#/cart',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/수량 늘리기/}).click();await page.waitForFunction(()=>document.querySelector('.site-cart__badge')?.textContent==='3');await page.getByText('16,500원',{exact:true}).waitFor();
   const summary=await page.locator('.cart-summary').innerText();
   report.push({base,animation,sliders,cart:{storedQuantity:stored[0].quantity,badgeAfterReload:2,badgeAfterIncrease:3,total:16500,summary},isolatedBrowserStorage:true});
   await context.close();
  }
 }finally{await browser.close();fs.writeFileSync(`${output}/interactions-report.json`,JSON.stringify(report,null,2))}
 console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
