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


    await navigate('login.html');
    assert.equal(await read('login-title'),'로그인');
    assert.equal(await evaluate("document.querySelector('.account-header button').textContent"),'로그인');
    assert.equal(await evaluate("typeof HaroNoticeAuth.devSetAdmin"),'undefined');
    assert.equal(await evaluate('HaroNoticeAuth.isAdmin()'),false);
    // UI integration below uses a test-only account double; no production user is created.
    const inject = function () {
      let service;
      Object.defineProperty(window,'HaroAccount',{get(){return service;},set(original){
        const current=()=>JSON.parse(sessionStorage.getItem('qa-user')||'null');
        service={...original,
          async getUser(){return current();},
          async isAdmin(){return current()?.admin===true;},
          async requireLogin(){if(!current())throw new Error('로그인 필요');return current();},
          async requireAdmin(){if(!current()?.admin)throw new Error('관리자만 사용할 수 있습니다.');},
          async getCurrentUserName(){return current()?.name||'방문자';},
          subscribe(listener){listener(current());return ()=>{};},
          async checkId(id){return !['admin','taken01'].includes(id);},
          async register(input){if(input.email==='used@example.com')throw new Error('이미 사용 중인 이메일입니다.');return {success:true};},
          async login(id,password){if(password!=='password123')throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');sessionStorage.setItem('qa-user',JSON.stringify({uid:'qa',name:id==='admin'?'관리자':'테스트사용자',admin:id==='admin'}));},
          async logout(){sessionStorage.removeItem('qa-user');},
        };
      }});
    };
    await cdp('Page.addScriptToEvaluateOnNewDocument',{source:'('+inject.toString()+')()'});
    for(const width of [1920,1024,768,390]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await navigate('login.html');
      assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
      const overlap=await evaluate("(()=>{const a=document.querySelector('.account-header').getBoundingClientRect(),b=document.querySelector('.site-header__actions').getBoundingClientRect();return a.left<b.right-1 && a.right>b.left+1})()");
      assert.equal(overlap,false,'Header action overlap at '+width);
      if(width===390||width===1920){const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile(path.join(os.tmpdir(),'haro-login-'+width+'.png'),Buffer.from(shot.data,'base64'));}
    }
    await evaluate("document.querySelector('a[href=\"./signup.html\"]').click()");
    await waitPath('signup.html');
    assert.equal(await evaluate("document.getElementById('login-form')"),null);
    for(const width of [1920,1024,768,390]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await navigate('signup.html');
      assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
    }
    await value('signup-name','테스트사용자');
    await value('signup-username','taken01');
    await click('check-username');await pause(100);
    assert.ok((await read('signup-id-status')).includes('이미 사용'));
    await value('signup-username','member01');
    await evaluate("document.getElementById('signup-username').dispatchEvent(new Event('input'))");
    await click('check-username');await pause(100);
    assert.ok((await read('signup-id-status')).includes('사용할 수 있는'));
    await value('signup-password','password123');
    await value('signup-email','used@example.com');
    await evaluate("document.getElementById('signup-form').requestSubmit()");await pause(100);
    assert.ok((await read('account-message')).includes('이미 사용 중인 이메일'));
    await value('signup-email','new@example.com');
    await evaluate("document.getElementById('signup-form').requestSubmit()");await pause(100);
    assert.ok((await read('account-message')).includes('회원가입이 완료'));
    await evaluate("document.querySelector('a[href=\"./login.html\"]').click()");
    await waitPath('login.html');
    assert.equal(await evaluate("document.getElementById('signup-form')"),null);
    await value('login-username','member01');
    await value('login-password','wrongpass');
    await evaluate("document.getElementById('login-form').requestSubmit()");await pause(100);
    assert.ok((await read('account-message')).includes('올바르지'));
    await value('login-password','password123');
    await evaluate("document.getElementById('login-form').requestSubmit()");
    await waitPath('notice-list.html');
    assert.ok((await evaluate("document.getElementById('notice-write-link').href")).endsWith('/notice-write.html'));
    assert.ok((await evaluate("document.querySelector('.account-header').textContent")).includes('테스트사용자님 환영합니다'));
    await navigate('notice-write.html');
    assert.equal(await evaluate("document.getElementById('notice-form-panel').hidden"),false);
    for(const width of [1920,1024,768,390]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await navigate('login.html');
      assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
      const layout=await evaluate("(()=>{const a=document.querySelector('.account-header').getBoundingClientRect(),b=document.querySelector('.site-header__actions').getBoundingClientRect();return {overlap:a.left<b.right-1 && a.right>b.left+1,right:a.right,width:innerWidth}})()");
      assert.equal(layout.overlap,false,'Logged-in header overlap '+width);
      assert.ok(layout.right<=layout.width);
    }
    assert.equal(await evaluate("document.querySelector('.account-header button').textContent"),'로그아웃');
    assert.equal(await evaluate("document.querySelectorAll('.account-header__action').length"),1);
    // Reset only the test account double before checking a different role.
    await evaluate("document.querySelector('.account-header button').click()");await pause(300);
    await navigate('login.html');
    assert.equal(await evaluate("document.querySelector('.account-header button').textContent"),'로그인');
    await value('login-username','admin');await value('login-password','password123');
    await evaluate("document.getElementById('login-form').requestSubmit()");await waitPath('notice-list.html');
    assert.ok((await evaluate("document.getElementById('notice-write-link').href")).endsWith('/notice-write.html'));
    await navigate('notice-write.html');
    assert.equal(await evaluate("document.getElementById('notice-form-panel').hidden"),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: real guest initialization; mocked registration, duplicates, login/logout, member/admin UI and 1920/1024/768/390 responsive headers');
  } finally {
    if(socket)socket.close();if(browser)browser.kill();if(server)server.kill();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
