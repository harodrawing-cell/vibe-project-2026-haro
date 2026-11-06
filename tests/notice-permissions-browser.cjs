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


    const inject = function () {
      const posts=()=>JSON.parse(sessionStorage.getItem('permission-posts')||'null')||{
        owner:{id:'owner',title:'작성자 게시글',content:'원래 본문',category:'공지사항',author:'동일이름',authorUid:'owner',imageUrl:'',createdAt:'2026-11-06T00:00:00.000Z',updatedAt:'2026-11-06T00:00:00.000Z'},
        legacy:{id:'legacy',title:'기존 글',content:'본문',category:'공지사항',author:'동일이름',imageUrl:'',createdAt:'2026-11-06T00:00:00.000Z',updatedAt:'2026-11-06T00:00:00.000Z'}
      };
      const user=()=>JSON.parse(sessionStorage.getItem('permission-user')||'null');
      let account,repository;
      Object.defineProperty(window,'HaroAccount',{get:()=>account,set:original=>{account={...original,
        getUser:async()=>user(),isAdmin:async()=>user()?.admin===true,
        requireLogin:async()=>{if(!user())throw new Error('로그인 필요');return user();},
        getCurrentUserName:async()=>user()?.name||'방문자',
        subscribe:callback=>{callback(user());return ()=>{};},
      };}});
      Object.defineProperty(window,'HaroNoticeRepository',{get:()=>repository,set:original=>{repository={...original,
        getById:async id=>posts()[id]||null,getList:async()=>Object.values(posts()),
        update:async(id,changes)=>{const data=posts();if(!HaroNoticeCommon.canManagePost(user(),data[id]))throw new Error('권한 없음');data[id]={...data[id],...HaroNoticeCommon.validateInput({...data[id],...changes}),updatedAt:new Date().toISOString()};sessionStorage.setItem('permission-posts',JSON.stringify(data));return data[id];},
        remove:async id=>{if(!HaroNoticeCommon.canManagePost(user(),posts()[id]))throw new Error('권한 없음');sessionStorage.setItem('delete-calls',String(Number(sessionStorage.getItem('delete-calls')||0)+1));await new Promise(resolve=>setTimeout(resolve,150));if(sessionStorage.getItem('delete-fail'))throw new Error('삭제 실패 테스트');const data=posts();delete data[id];sessionStorage.setItem('permission-posts',JSON.stringify(data));},
      };}});
    };
    await cdp('Page.addScriptToEvaluateOnNewDocument',{source:'('+inject.toString()+')()'});
    const setUser=async user=>evaluate('sessionStorage.setItem("permission-user",'+JSON.stringify(JSON.stringify(user))+')');
    const visible=()=>evaluate("!document.getElementById('notice-edit-link').hidden && !document.getElementById('notice-delete').hidden");
    await navigate('notice-detail.html?id=owner');assert.equal(await visible(),false);
    await setUser({uid:'other',name:'동일이름',admin:false});
    await navigate('notice-detail.html?id=owner');assert.equal(await visible(),false);
    await navigate('notice-edit.html?id=owner');assert.equal(await evaluate("document.getElementById('notice-form-panel').hidden"),true);
    await setUser({uid:'owner',name:'동일이름',admin:false});
    await navigate('notice-detail.html?id=owner');assert.equal(await visible(),true);
    await navigate('notice-detail.html?id=legacy');assert.equal(await visible(),false);
    await navigate('notice-edit.html?id=owner');assert.equal(await evaluate("document.getElementById('notice-title').value"),'작성자 게시글');
    await value('notice-title','작성자가 수정한 제목');await value('notice-body','수정 본문');
    await evaluate("document.getElementById('notice-form').requestSubmit()");await waitPath('notice-detail.html');
    assert.equal(await read('notice-detail-title'),'작성자가 수정한 제목');assert.equal(await evaluate("new URLSearchParams(location.search).get('id')"),'owner');
    await navigate('notice-edit.html?id=owner');await value('notice-title','취소할 제목');await evaluate('window.confirm=()=>true');await click('notice-cancel');await waitPath('notice-detail.html');assert.equal(await read('notice-detail-title'),'작성자가 수정한 제목');
    await setUser({uid:'admin',name:'관리자',admin:true});
    await navigate('notice-detail.html?id=legacy');assert.equal(await visible(),true);
    for(const width of [1920,1024,768,390,320]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await navigate('notice-detail.html?id=owner');
      const layout=await evaluate("(()=>{const e=[...document.querySelector('.notice-detail-actions').children].map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,h:r.height}});return {e,overflow:document.documentElement.scrollWidth>innerWidth,width:innerWidth}})()");
      assert.equal(layout.overflow,false);assert.ok(layout.e[0].right<=layout.e[1].left);assert.ok(layout.e[1].right<=layout.e[2].left);assert.ok(layout.e[2].right<=width);assert.ok(layout.e.every(e=>e.h===44));assert.equal(layout.e[0].top,layout.e[2].top);
    }
    await evaluate("window.confirm=message=>{sessionStorage.setItem('confirm-message',message);return false}");await click('notice-delete');await pause(100);
    assert.equal(await evaluate("sessionStorage.getItem('confirm-message')"),'이 게시글을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.');assert.ok(await evaluate("HaroNoticeRepository.getById('owner')"));
    await evaluate("sessionStorage.setItem('delete-fail','true');window.confirm=()=>true");await click('notice-delete');await pause(250);assert.ok((await read('notice-message')).includes('삭제 실패'));assert.equal(await evaluate("document.getElementById('notice-delete').disabled"),false);
    await evaluate("sessionStorage.removeItem('delete-fail');sessionStorage.setItem('delete-calls','0');document.getElementById('notice-delete').click();document.getElementById('notice-delete').click()");await waitPath('notice-list.html');
    assert.equal(await evaluate("sessionStorage.getItem('delete-calls')"),'1');assert.equal(await evaluate("HaroNoticeRepository.getById('owner')"),null);
    assert.deepEqual(errors,[]);console.log('PASS: guest/other UID/owner/admin/legacy, edit save/cancel, delete confirm/cancel/failure/double click, 1920/1024/768/390/320; isolated mock data only');
  }finally{if(socket)socket.close();if(browser)browser.kill();if(server)server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
