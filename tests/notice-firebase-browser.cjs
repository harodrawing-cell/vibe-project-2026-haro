/* Run with node tests/notice-browser.cjs. Uses installed Chrome and Node CDP;
 * no third-party test packages or changes to a normal browser profile. */
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { once } = require('node:events');

if (!process.env.HARO_ADMIN_PASSWORD) throw new Error('Set HARO_ADMIN_PASSWORD for the deployed admin account before running this live test.');
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
    const waitPath = async suffix => {
      for (let i = 0; i < 100; i++) {
        await pause(100);
        try { if (await evaluate(`location.pathname.endsWith(${JSON.stringify(suffix)}) && document.body.dataset.ready === 'true'`)) return; } catch {}
      }
      throw new Error('Navigation failed: ' + suffix);
    };
    const click = id => evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
    const value = (id, text) => evaluate(`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(text)}`);
    const read = id => evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);

    let createdId;
    try {
      await navigate('notice-list.html');
      const message = await read('notice-message');
      assert.equal(message, '', 'Firebase list: ' + message);
      await evaluate('HaroAccount.login("admin",'+JSON.stringify(process.env.HARO_ADMIN_PASSWORD)+')');
      const post = await evaluate("HaroNoticeRepository.create({category:HaroNoticeCommon.categories[0],title:'[QA] Firebase connection',content:'Temporary QA record; removed after verification.',imageUrl:'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'})");
      createdId=post.id;
      assert.ok(createdId);
      await navigate('notice-detail.html?id='+encodeURIComponent(createdId));
      assert.ok((await evaluate('document.body.textContent')).includes('[QA] Firebase connection'));
      const changed = await evaluate('HaroNoticeRepository.update('+JSON.stringify(createdId)+",{title:'[QA] Updated'})");
      assert.equal(changed.imageUrl,post.imageUrl);
      await navigate('notice-list.html');
      assert.ok((await read('notice-list')).includes('[QA] Updated'));
      for (const width of [1920,1024,768,390]) {
        await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
        await cdp('Page.navigate', { url: 'http://127.0.0.1:8097/' });
        let bannerReady = false;
        for (let attempt = 0; attempt < 80; attempt++) {
          await pause(100);
          try {
            if (await evaluate("document.readyState === 'complete' && !!window.HaroNoticeBanner")) {
              bannerReady = true;
              break;
            }
          } catch {}
        }
        assert.ok(bannerReady, 'Homepage banner initialized');
        await evaluate('HaroNoticeBanner.refresh()');
        const links = await evaluate("({list:document.querySelector('.notice-banner__label').pathname,title:document.querySelector('.notice-banner__title').pathname,id:new URL(document.querySelector('.notice-banner__title').href).searchParams.get('id'),overflow:document.documentElement.scrollWidth>innerWidth})");
        assert.equal(links.list, '/pages/notice/notice-list.html');
        assert.equal(links.title, '/pages/notice/notice-detail.html');
        assert.ok(links.id);
        assert.equal(links.overflow, false, 'Homepage horizontal overflow');
        await navigate('notice-list.html');
        const size=await evaluate('({scroll:document.documentElement.scrollWidth,width:innerWidth})');
        assert.ok(size.scroll<=size.width,JSON.stringify(size));
        await navigate('notice-write.html');
        assert.equal(await evaluate("document.getElementById('notice-form-panel').hidden"),false);
        const form=await evaluate('({scroll:document.documentElement.scrollWidth,width:innerWidth})');
        assert.ok(form.scroll<=form.width,JSON.stringify(form));
      }
      // A failed save must keep the draft and re-enable controls.
      await value('notice-title','Draft title');
      await value('notice-body','Draft body');
      await evaluate("HaroNoticeRepository.create=async()=>{throw new Error('Simulated failure')};document.getElementById('notice-form').requestSubmit()");
      await pause(200);
      assert.equal(await evaluate("document.getElementById('notice-title').value"),'Draft title');
      assert.equal(await evaluate("document.getElementById('notice-submit').disabled"),false);
      await evaluate('HaroAccount.login("admin",'+JSON.stringify(process.env.HARO_ADMIN_PASSWORD)+')');
      await evaluate('HaroNoticeRepository.remove('+JSON.stringify(createdId)+')');
      assert.equal(await evaluate('HaroNoticeRepository.getById('+JSON.stringify(createdId)+')'),null);
      createdId=null;
      assert.deepEqual(errors,[]);
      console.log('PASS: live Firestore CRUD, Base64 preservation, list/detail/form, failure draft preservation, responsive 1920/1024/768/390');
    } finally {
      if(createdId) {
        await evaluate('HaroNoticeRepository.remove('+JSON.stringify(createdId)+')').catch(e=>console.error('Temporary record cleanup required:',createdId,e.message));
      }
    }
  } finally {
    if(socket)socket.close();
    if(browser)browser.kill();
    if(server)server.kill();
    // Retain isolated OS temporary profile; never touch the user browser profile.
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
