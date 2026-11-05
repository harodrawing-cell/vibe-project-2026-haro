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
    await navigate('notice-list.html');
    // Verify the requested content batch, then isolate the existing CRUD scenarios.
    assert.deepEqual(await evaluate("HaroNoticeRepository.getList({}).then(posts=>HaroNoticeCommon.categories.map(category=>posts.filter(p=>p.category===category&&p.title.startsWith('[샘플]')).length))"), [3,3,3,3]);
    await evaluate("document.querySelector('#notice-list li a').scrollIntoView({block:'center',behavior:'instant'})");
    const hoverPoint = await evaluate("(()=>{const r=document.querySelector('#notice-list li').getBoundingClientRect();return {x:r.left+12,y:r.top+r.height/2}})()");
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...hoverPoint });
    await pause(250);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('#notice-list li')).backgroundColor"), 'rgb(204, 204, 204)');
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
    await evaluate("(async()=>{await HaroNoticeAuth.devSetAdmin(true);for(const p of await HaroNoticeRepository.getList({}))if(p.title.startsWith('[샘플]'))await HaroNoticeRepository.remove(p.id);await HaroNoticeAuth.devSetAdmin(false)})()");
    await navigate('notice-list.html');
    console.log('PASS three samples per category and #ccc list hover');
    assert.equal(await evaluate("document.getElementById('notice-write-link').hidden"), true);
    assert.equal(await evaluate("document.querySelectorAll('#notice-categories a').length"), 5);
    const firstId = await evaluate("new URL(document.querySelector('#notice-list a').href).searchParams.get('id')");
    await navigate('notice-edit.html?id=' + firstId);
    assert.equal(await evaluate("document.getElementById('notice-form-panel').hidden"), true);
    await navigate('notice-detail.html?id=' + firstId);
    assert.equal(await evaluate("document.getElementById('notice-edit-link').hidden && document.getElementById('notice-delete').hidden"), true);
    await navigate('notice-list.html');
    await click('notice-admin');
    await pause(500);
    assert.equal(await evaluate("document.getElementById('notice-write-link').hidden"), false);
    await navigate('notice-edit.html?id=' + firstId);
    assert.equal(await evaluate("document.getElementById('notice-author').readOnly"), true);
    await fs.mkdir('tests/notice-screenshots', { recursive: true });
    for (const width of [1920, 1024, 768, 390]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      await pause(100);
      const layout = await evaluate(`(() => {
        const form = document.getElementById('notice-form').getBoundingClientRect();
        const category = document.getElementById('notice-category').getBoundingClientRect();
        const author = document.getElementById('notice-author').getBoundingClientRect();
        return { pageWidth: document.documentElement.scrollWidth, formWidth: form.width, categoryTop: category.top, authorTop: author.top,
          buttons: [...document.querySelectorAll('#notice-form .notice-actions button')].map(el=>el.getBoundingClientRect().height) };
      })()`);
      assert.ok(layout.pageWidth <= width);
      assert.ok(layout.formWidth <= 900);
      assert.ok(layout.buttons.every(height=>height>=48));
      if (width <= 768) assert.ok(layout.authorTop > layout.categoryTop); else assert.equal(layout.authorTop, layout.categoryTop);
      const shot = await cdp('Page.captureScreenshot', {format:'png',captureBeyondViewport:true});
      await fs.writeFile(`tests/notice-screenshots/edit-${width}.png`, Buffer.from(shot.data,'base64'));
      console.log('PASS edit layout', width, JSON.stringify(layout));
    }
    await value('notice-title', '   ');
    await evaluate("document.getElementById('notice-form').requestSubmit()");
    assert.equal(await evaluate('document.activeElement.id'), 'notice-title');
    await value('notice-title', '<img src=x onerror=alert(1)> 수정 확인');
    await value('notice-body', '<script>window.xss=true</script>\n둘째 줄');
    await evaluate("window.setItemOriginal=Storage.prototype.setItem; Storage.prototype.setItem=function(){const e=new Error('quota');e.name='QuotaExceededError';throw e}; document.getElementById('notice-form').requestSubmit()");
    await pause(150);
    assert.match(await read('notice-message'), /저장 공간이 부족/);
    assert.equal(await evaluate("document.getElementById('notice-title').value"), '<img src=x onerror=alert(1)> 수정 확인');
    await evaluate("Storage.prototype.setItem=window.setItemOriginal; document.getElementById('notice-form').requestSubmit()");
    await waitPath('notice-detail.html');
    assert.equal(await evaluate("new URLSearchParams(location.search).get('id')"), firstId);
    assert.equal(await read('notice-detail-title'), '<img src=x onerror=alert(1)> 수정 확인');
    assert.equal(await evaluate("document.querySelector('#notice-detail-title img')===null && document.querySelector('#notice-detail-body script')===null && !window.xss"), true);
    console.log('PASS whitespace, quota failure retention, immutable ID, detail redirect and textContent XSS protection');
    await navigate('notice-edit.html?id=' + firstId);
    // Generate an input wider than 1200px without external assets.
    const source = await evaluate("(()=>{const c=document.createElement('canvas');c.width=2400;c.height=1800;const x=c.getContext('2d');x.fillStyle='orange';x.fillRect(0,0,c.width,c.height);return c.toDataURL('image/png').split(',')[1]})()");
    const inputPath = path.join(profile, 'large-image.png');
    await fs.writeFile(inputPath, Buffer.from(source,'base64'));
    async function upload(file) {
      await cdp('DOM.enable');
      const doc = await cdp('DOM.getDocument');
      const node = await cdp('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#notice-image'});
      await cdp('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[file]});
      for(let i=0;i<80;i++) {
        await pause(100);
        if(await evaluate("!document.getElementById('notice-submit').disabled")) break;
      }
    }
    await upload(inputPath);
    const imageInfo = await evaluate("(()=>{const i=document.getElementById('notice-image-preview');return {hidden:i.hidden,url:i.src,width:i.naturalWidth,height:i.naturalHeight}})()");
    assert.equal(imageInfo.hidden,false);
    assert.ok(imageInfo.url.startsWith('data:image/webp;base64,'));
    assert.equal(imageInfo.width,1200);
    assert.equal(imageInfo.height,900);
    await evaluate("document.getElementById('notice-form').requestSubmit()");
    await waitPath('notice-detail.html');
    const persistedImage = await evaluate("document.getElementById('notice-detail-image').src");
    assert.equal(persistedImage,imageInfo.url);
    await navigate('notice-edit.html?id=' + firstId);
    await value('notice-title','이미지 유지 수정');
    await evaluate("document.getElementById('notice-form').requestSubmit()");
    await waitPath('notice-detail.html');
    assert.equal(await evaluate("document.getElementById('notice-detail-image').src"),persistedImage);
    await navigate('notice-edit.html?id=' + firstId);
    const replacement = await evaluate("(()=>{const c=document.createElement('canvas');c.width=100;c.height=80;return c.toDataURL('image/png').split(',')[1]})()");
    const replacementPath=path.join(profile,'replacement.png');
    await fs.writeFile(replacementPath,Buffer.from(replacement,'base64'));
    await upload(replacementPath);
    await evaluate("document.getElementById('notice-form').requestSubmit()");
    await waitPath('notice-detail.html');
    assert.notEqual(await evaluate("document.getElementById('notice-detail-image').src"),persistedImage);
    await navigate('notice-edit.html?id=' + firstId);
    await click('notice-image-remove');
    await evaluate("document.getElementById('notice-form').requestSubmit()");
    await waitPath('notice-detail.html');
    assert.equal(await evaluate("document.getElementById('notice-detail-image').hidden"),true);
    console.log('PASS 2400px PNG -> 1200px WebP, image keep/replace/remove persistence');
    await navigate('notice-edit.html?id=' + firstId);
    await value('notice-title','취소할 수정');
    assert.equal(await evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented})()"),true);
    await evaluate('window.confirm=()=>false');
    await click('notice-cancel');
    assert.equal(await evaluate('location.pathname.endsWith("notice-edit.html")'),true);
    await evaluate('window.confirm=()=>true');
    await click('notice-cancel');
    await waitPath('notice-detail.html');
    assert.equal(await read('notice-detail-title'),'이미지 유지 수정');
    console.log('PASS dirty cancel confirmation and beforeunload warning');
    await navigate('notice-write.html');
    await value('notice-title','작성 확인');
    await value('notice-body','새 본문');
    await evaluate("window.calls=0;const create=HaroNoticeRepository.create;HaroNoticeRepository.create=async input=>{window.calls++;await new Promise(r=>setTimeout(r,300));return create(input)};document.getElementById('notice-form').requestSubmit();document.getElementById('notice-form').requestSubmit()");
    assert.equal(await evaluate('window.calls'),1);
    assert.equal(await evaluate("document.getElementById('notice-submit').disabled"),true);
    await waitPath('notice-detail.html');
    assert.notEqual(await evaluate("new URLSearchParams(location.search).get('id')"),firstId);
    await evaluate("(async()=>{for(let i=0;i<12;i++) await HaroNoticeRepository.create({category:i%2?'굿즈':'이모티콘',title:'검색용 '+i,content:'본문',imageUrl:''})})()");
    await navigate('notice-list.html');
    assert.equal(await evaluate("document.querySelectorAll('#notice-list li').length"),10);
    await navigate('notice-list.html?page=2');
    assert.equal(await evaluate("document.querySelectorAll('#notice-list li').length"),4);
    await navigate('notice-list.html?category=' + encodeURIComponent('굿즈'));
    assert.equal(await evaluate("document.querySelectorAll('#notice-list li').length"),6);
    await value('notice-query','검색용 3');
    await evaluate("document.getElementById('notice-search').requestSubmit()");
    await pause(500);
    assert.equal(await evaluate("document.querySelectorAll('#notice-list li').length"),1);
    assert.equal(await evaluate("document.querySelector('#notice-list a').textContent"),'검색용 3');
    console.log('PASS duplicate submission guard, create, category tabs, ten-item pagination and search');
    for (const width of [1920,1024,768,390]) {
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      for(const route of ['notice-list.html','notice-detail.html?id='+firstId,'notice-write.html']) {
        await navigate(route);
        assert.ok(await evaluate(`document.documentElement.scrollWidth<=${width}`),route+' overflow '+width);
      }
      console.log('PASS list/detail/write responsive',width);
    }
    await navigate('notice-edit.html?id=missing');
    assert.match(await read('notice-message'),/없습니다/);
    await navigate('notice-edit.html?id=' + firstId);
    await evaluate('HaroNoticeAuth.devSetAdmin(false)');
    await value('notice-title','권한 해제 후 수정');
    await evaluate("document.getElementById('notice-form').requestSubmit()");
    await pause(150);
    assert.match(await read('notice-message'),/관리자/);
    assert.equal(await evaluate("document.getElementById('notice-title').value"),'권한 해제 후 수정');
    await evaluate('window.confirm=()=>true');
    await click('notice-cancel');
    await waitPath('notice-detail.html');
    await navigate('notice-list.html');
    await click('notice-admin');
    await pause(500);
    await navigate('notice-detail.html?id=' + firstId);
    await evaluate('window.confirm=()=>false');
    await click('notice-delete');
    assert.equal(await evaluate('location.pathname.endsWith("notice-detail.html")'),true);
    await evaluate('window.confirm=()=>true');
    await click('notice-delete');
    await waitPath('notice-list.html');
    assert.equal(await evaluate(`HaroNoticeRepository.getById(${JSON.stringify(firstId)})`),null);
    // All-delete leaves an empty board; the seed flag prevents resurrection.
    await evaluate('(async()=>{for(const p of await HaroNoticeRepository.getList({}))await HaroNoticeRepository.remove(p.id)})()');
    await navigate('notice-list.html');
    assert.equal(await evaluate('HaroNoticeRepository.getList({}).then(p=>p.length)'),0);
    assert.match(await read('notice-list'),/등록된 공지사항이 없습니다/);
    await navigate('notice.html?view=list');
    assert.equal(await evaluate('location.pathname.endsWith("notice-list.html")'),true);
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS missing ID, revoked admin, delete confirmation, all-delete no reseed, legacy route, no uncaught JS errors');
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
