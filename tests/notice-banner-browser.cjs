/* Run with node tests/notice-browser.cjs. Uses installed Chrome and Node CDP;
 * no third-party test packages or changes to a normal browser profile. */
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'haro-notice-qa-'));
  let browser, server, socket;
  try {
    server = spawn(process.execPath, ['scripts/preview.cjs'], { env: { ...process.env, PORT: '8097' }, windowsHide: true, stdio: 'pipe' });
    server.on('error', error => console.error(error.message));
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch('http://127.0.0.1:8097/notice.html')).ok) break; } catch {}
      await pause(100);
    }
    const executable = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    browser = spawn(executable, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'pipe' });
    browser.on('error', error => console.error(error.message));
    let port;
    for (let i = 0; i < 100; i++) {
      try { port = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch {}
      await pause(100);
    }
    if (!port) throw new Error('Chrome debugging endpoint unavailable');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await once(socket, 'open');
    let sequence = 0;
    const waiting = new Map();
    const errors = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && waiting.has(message.id)) {
        const { resolve, reject, timer } = waiting.get(message.id);
        clearTimeout(timer);
        waiting.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    });
    const cdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`Timed out: ${method}`)); }, 15000);
      waiting.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const navigate = async route => {
      await cdp('Page.navigate', { url: `http://127.0.0.1:8097/pages/notice/${route}` });
      await pause(250);
      for (let i = 0; i < 80; i++) {
        try { if (await evaluate("document.readyState === 'complete' && document.body.dataset.ready === 'true'")) return; } catch {}
        await pause(100);
      }
      throw new Error('Page failed to load');
    };
    const waitUrl = async part => {
      for (let i = 0; i < 100; i++) {
        try { if (await evaluate(`location.search.includes(${JSON.stringify(part)}) && document.readyState === 'complete' && document.body.dataset.ready === 'true'`)) return; } catch {}
        await pause(100);
      }
      throw new Error(`Navigation failed: ${part}`);
    };
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    const go = async route => {
      await cdp('Page.navigate',{url:'http://127.0.0.1:8097/'+route});
      await pause(200);
      for(let i=0;i<100;i++) {
        try {if(await evaluate("document.readyState==='complete' && !!window.HaroNoticeRepository"))break;}catch{}
        await pause(100);
      }
      await evaluate('window.HaroNoticeBanner ? HaroNoticeBanner.refresh() : Promise.resolve()');
    };
    const title=()=>evaluate("document.querySelector('.notice-banner__title').textContent");
    const count=()=>evaluate("document.querySelector('.notice-banner__counter').textContent");
    await go('index.html');
    // The user-requested sample migration is tested before isolating the single-post case.
    assert.deepEqual(await evaluate("HaroNoticeRepository.getList({}).then(posts=>HaroNoticeCommon.categories.map(category=>posts.filter(p=>p.category===category&&p.title.startsWith('[샘플]')).length))"), [3,3,3,3]);
    await evaluate("(async()=>{await HaroNoticeAuth.devSetAdmin(true);for(const p of await HaroNoticeRepository.getList({}))if(p.title.startsWith('[샘플]'))await HaroNoticeRepository.remove(p.id);await HaroNoticeAuth.devSetAdmin(false);await HaroNoticeBanner.refresh()})()");
    assert.equal(await count(),'1/1');
    assert.equal(await evaluate("document.querySelector('[data-notice-pause]').disabled"),true);
    await evaluate('(async()=>{await HaroNoticeAuth.devSetAdmin(true);for(const p of await HaroNoticeRepository.getList({}))await HaroNoticeRepository.remove(p.id);await HaroNoticeBanner.refresh()})()');
    assert.equal(await evaluate("document.querySelector('.notice-banner').hidden"),true);
    assert.equal(await evaluate("document.documentElement.classList.contains('has-notice-banner')"),false);
    await evaluate(`(async()=>{for(let i=0;i<4;i++){await HaroNoticeRepository.create({category:i%2?'굿즈':'공지사항',title:i===3?'긴 공지 제목 '.repeat(12):'실제 테스트 공지 '+i,content:'테스트 본문',imageUrl:''});await new Promise(r=>setTimeout(r,5))}await HaroNoticeBanner.refresh()})()`);
    const expected=await evaluate('HaroNoticeRepository.getList({}).then(posts=>posts.slice(0,3).map(p=>({id:p.id,title:p.title})))');
    assert.equal(await title(),expected[0].title);
    assert.equal(await count(),'1/3');
    const savedData=await evaluate('HaroNoticeRepository.getList({}).then(JSON.stringify)');
    await pause(4250);
    assert.equal(await count(),'2/3');
    assert.equal(await title(),expected[1].title);
    await evaluate("document.querySelector('[data-notice-pause]').click()");
    assert.match(await evaluate("document.querySelector('[data-notice-pause]').getAttribute('aria-label')"),/재생/);
    await pause(4250);
    assert.equal(await count(),'2/3');
    await evaluate("document.querySelector('[data-notice-pause]').click()");
    await pause(4250);
    assert.equal(await count(),'3/3');
    await pause(4250);
    assert.equal(await count(),'1/3');
    assert.equal(await evaluate('HaroNoticeRepository.getList({}).then(JSON.stringify)'),savedData);
    console.log('PASS same source top 3, zero/single records, 4-second order, pause/play, wrap and no data writes');
    // Use an isolated output folder; normal browser profiles and committed screenshots are untouched.
    const shots=path.join(profile,'screenshots'); await fs.mkdir(shots);
    for(const width of [1920,1024,768,390]) {
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await go('index.html');
      const geometry=await evaluate(`(()=>{const b=document.querySelector('.notice-banner'),r=b.getBoundingClientRect(),h=document.querySelector('.site-header').getBoundingClientRect(),a=b.querySelector('.notice-banner__title'),cs=[...b.querySelectorAll('button')].map(x=>x.getBoundingClientRect());return {top:r.top,height:r.height,bottom:r.bottom,headerTop:h.top,headerBottom:h.bottom,pageWidth:document.documentElement.scrollWidth,mainTop:document.querySelector('main').getBoundingClientRect().top,ellipsis:getComputedStyle(a).textOverflow,buttons:cs.map(x=>({left:x.left,right:x.right,height:x.height})),href:a.href}})()`);
      assert.equal(geometry.top,0); assert.equal(geometry.headerTop,44);
      assert.equal(geometry.height,44);
      const contentTop = await evaluate("document.querySelector('main').getBoundingClientRect().top + parseFloat(getComputedStyle(document.querySelector('main')).paddingTop)");
      assert.ok(contentTop>=geometry.headerBottom, JSON.stringify({geometry,contentTop}));
      assert.ok(geometry.pageWidth<=width);
      assert.equal(geometry.ellipsis,'ellipsis');
      const alignment = await evaluate("(()=>{const i=document.querySelector('.notice-banner__inner').getBoundingClientRect(),t=document.querySelector('.notice-banner__title').getBoundingClientRect(),c=document.querySelector('.notice-banner__controls').getBoundingClientRect();return {center:(t.left+t.right)/2,expected:(i.left+i.right)/2,right:c.right,edge:i.right}})()");
      assert.ok(Math.abs(alignment.center-alignment.expected)<1);
      assert.ok(Math.abs(alignment.right-alignment.edge)<1);
      assert.ok(geometry.buttons[0].right<=geometry.buttons[1].left);
      if(width<=768)assert.ok(geometry.buttons.every(b=>b.height>=44));
      const url=new URL(geometry.href);assert.equal(url.pathname,'/pages/notice/notice-detail.html');assert.equal(url.searchParams.get('id'),expected[0].id);
      if(width<=768) {
        await evaluate("document.querySelector('.site-nav__toggle').click()");await pause(100);
        assert.equal(await evaluate("document.querySelector('.notice-banner').inert"),true);
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.notice-banner')).visibility"),'hidden');
        await evaluate("document.querySelector('.site-nav__toggle').click()");await pause(100);
      }
      await evaluate("document.getElementById('site-search-toggle').click()");await pause(100);
      assert.equal(await evaluate("document.querySelector('.notice-banner').inert && !document.getElementById('search-overlay').hidden"),true);
      await evaluate("document.querySelector('.search-overlay__close').click()");await pause(100);
      assert.equal(await evaluate("document.querySelector('.notice-banner').inert"),false);
      await evaluate("document.querySelector('.site-header').style.transform='translateY(-100%)'");await pause(100);
      assert.equal(await evaluate("document.querySelector('.notice-banner').getBoundingClientRect().top"),0);
      await evaluate("document.querySelector('.site-header').style.transform=''");await pause(100);
      const shot=await cdp('Page.captureScreenshot',{format:'png'});
      // Persist only a small, explicit QA artifact for review.
      await fs.mkdir('tests/banner-screenshots',{recursive:true});
      await fs.writeFile(`tests/banner-screenshots/banner-${width}.png`,Buffer.from(shot.data,'base64'));
      console.log('PASS fixed banner/header, body offset, truncation, search/menu and header hide/show',width);
    }
    await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await go('index.html');
    assert.match(await evaluate("document.querySelector('[data-notice-pause]').getAttribute('aria-label')"),/재생/);
    await pause(4250);
    assert.equal(await count(),'1/3');
    const before=await evaluate("parseFloat(getComputedStyle(document.querySelector('main')).marginTop)");
    await evaluate("document.querySelector('[data-notice-close]').click()");
    await pause(100);
    const after=await evaluate("parseFloat(getComputedStyle(document.querySelector('main')).marginTop)");
    assert.equal(await evaluate("document.querySelector('.site-header').getBoundingClientRect().top"),0);
    assert.equal(before-after,44,JSON.stringify({before,after,state:await evaluate("({hidden:document.querySelector('.notice-banner').hidden,root:document.documentElement.className,closed:sessionStorage.getItem('haro-notice-banner-closed-v1')})")}));
    assert.equal(await evaluate("document.querySelector('.notice-banner').hidden"),true);
    await cdp('Page.reload'); await pause(500);
    for(let i=0;i<80;i++){try{if(await evaluate("!!window.HaroNoticeBanner && !document.querySelector('.notice-banner').hidden"))break;}catch{}await pause(100);}
    assert.equal(await evaluate("document.querySelector('.notice-banner').hidden"),false);
    assert.equal(await evaluate("document.querySelector('.site-header').getBoundingClientRect().top"),44);
    await evaluate("document.querySelector('.notice-banner__label').click()"); await pause(500);
    assert.equal(await evaluate("location.pathname"),'/pages/notice/notice-list.html');
    await go('pages/notice/notice-list.html');
    assert.equal(await evaluate("document.querySelector('.notice-banner')"),null);

    await go('pages/notice/notice-list.html?category='+encodeURIComponent('굿즈'));
    assert.equal(await evaluate("document.querySelector('.notice-banner')"),null);
    await go('index.html');
    assert.equal(await title(),expected[0].title);
    assert.equal(await count(),'1/3');
    assert.equal(await evaluate("new URL(document.querySelector('.notice-banner__title').href).searchParams.get('id')"),expected[0].id);
    await evaluate("document.querySelector('.notice-banner__title').click()");
    await pause(500);
    assert.equal(await evaluate("new URLSearchParams(location.search).get('id')"),expected[0].id);
    assert.equal(await evaluate("document.getElementById('notice-detail-title').textContent"),expected[0].title);
    await go('pages/notice/notice-write.html');
    assert.equal(await evaluate("document.querySelector('.notice-banner')"),null);
    await go('pages/notice/notice-edit.html?id='+expected[0].id);
    assert.equal(await evaluate("document.querySelector('.notice-banner')"),null);
    await go('index.html');
    await evaluate('HaroNoticeBanner.destroy()');
    assert.equal(await evaluate("document.querySelector('.notice-banner')===null && !document.documentElement.classList.contains('has-notice-banner')"),true);
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS reduced motion, close offset/reload restoration, filter independence, real-ID navigation, shared pages, cleanup and no uncaught errors');
  } finally {
    if (socket) socket.close();
    if (browser) browser.kill();
    if (server) server.kill();
    await pause(1000);
    const resolved = path.resolve(profile);
    if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('haro-notice-qa-')) {
      await fs.rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
