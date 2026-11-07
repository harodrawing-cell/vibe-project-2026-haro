const {createServer}=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve('dist');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith('/haro/')){res.writeHead(404).end();return}
  const target=path.resolve(root,decodeURIComponent(url.pathname.slice(6))||'index.html');
  if(!target.startsWith(root+path.sep)&&target!==path.join(root,'index.html')){res.writeHead(403).end();return}
  if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});fs.createReadStream(target).pipe(res);
});
async function main(){
  const hashes=JSON.parse(fs.readFileSync('document/react-original-hashes.json','utf8'));
  let assets=0;
  for(const [file,hash] of Object.entries(hashes).filter(([file])=>file.startsWith('images/'))){assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash,file);assets++}
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/haro/`;
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const errors=[],missing=[];
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await context.route(/https:\/\/.*(?:googleapis|firebaseio|firebaseapp)\.com\//,r=>r.abort());
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)missing.push(r.url())});
    for(const route of ['/','/notice','/qna','/login','/signup','/goods?id=haro-note','/cart']){
      await page.goto(url+'#'+route,{waitUntil:'domcontentloaded'});await page.locator('main').waitFor();
      await page.reload({waitUntil:'domcontentloaded'});await page.locator('main').waitFor();
      if(route==='/'){await page.waitForFunction(()=>document.querySelector('#hero-box-frame')?.naturalWidth>0);assert.equal(await page.locator('#top').evaluate(el=>getComputedStyle(el).position),'relative')}
      if(route.startsWith('/goods'))await page.waitForFunction(()=>document.querySelector('.product-main-image')?.naturalWidth>0);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
    console.log(JSON.stringify({copiedImages:assets,subdirectory:'/haro/',directRoutesAndRefresh:7,pageErrors:errors,missingAssets:missing},null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1});
