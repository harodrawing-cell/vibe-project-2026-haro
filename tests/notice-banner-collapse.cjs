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
    await cdp('Page.enable'); await cdp('Runtime.enable');
    await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    async function openBanner(){
      await cdp('Page.navigate',{url:'http://127.0.0.1:8097/index.html'});await pause(300);
      for(let i=0;i<80;i++){try{if(await evaluate("document.readyState==='complete' && !!window.HaroNoticeBanner"))break;}catch{}await pause(100);}
      await evaluate("sessionStorage.removeItem('haro-notice-banner-closed-v1')");
      await cdp('Page.navigate',{url:'http://127.0.0.1:8097/index.html'});await pause(300);
      for(let i=0;i<80;i++){try{if(await evaluate("document.readyState==='complete' && !!window.HaroNoticeBanner && !document.querySelector('.notice-banner').hidden"))break;}catch{}await pause(100);}
    }
    const position=()=>evaluate("(()=>({scroll:scrollY,header:document.querySelector('.site-header').getBoundingClientRect().top,hero:document.querySelector('.hero').getBoundingClientRect().top,footer:document.querySelector('.site-footer').getBoundingClientRect().top}))()");
    for(const width of [1920,1024,768,390]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      for(const scroll of [0,300]){
        await openBanner();
        await evaluate(`window.scrollTo({top:${scroll},behavior:'instant'})`);await pause(100);
        const before=await position();
        await evaluate("document.querySelector('[data-notice-close]').focus({preventScroll:true});document.querySelector('[data-notice-close]').click()");await pause(150);
        const after=await position();
        assert.equal(after.header,0);
        assert.equal(before.hero-after.hero,44,JSON.stringify({width,before,after}));
        assert.equal(before.footer-after.footer,44,JSON.stringify({width,before,after}));
        assert.equal(after.scroll,before.scroll);
        assert.equal(await evaluate("document.querySelector('.notice-banner').hidden"),true);
        console.log('PASS whole-page upward shift',width,scroll);
      }
    }
    assert.equal(errors.length,0,errors.join('\n'));
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
