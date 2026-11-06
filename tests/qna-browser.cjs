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
  let browser, server, socket, testEnvironment;
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
      throw new Error('Page failed to load: '+route+' '+JSON.stringify(await evaluate('({url:location.href,ready:document.readyState,body:document.body?.dataset,message:document.getElementById("qna-message")?.textContent,trace:window.qnaTrace})'))+' errors:'+JSON.stringify(errors));
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


    if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw new Error('Local emulator required. No production data allowed.');
    const resolve=name=>require(require.resolve(name,{paths:[process.env.HARO_RULES_MODULES||process.cwd()]}));
    const {initializeTestEnvironment}=resolve('@firebase/rules-unit-testing'),sdk=resolve('firebase/firestore');
    const common=require('../js/services/qna-common.js');
    const {createRepository}=require('../js/services/qna-repository.js');
    const [host,emulatorPort]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
    testEnvironment=await initializeTestEnvironment({projectId:'demo-haro-qna-web',firestore:{host,port:Number(emulatorPort),rules:await fs.readFile('firebase/firestore.rules','utf8')}});
    await testEnvironment.clearFirestore();
    await testEnvironment.withSecurityRulesDisabled(async context=>{
      const db=context.firestore(),batch=sdk.writeBatch(db);
      for(const uid of ['owner','other','admin'])batch.set(sdk.doc(db,'users',uid),{name:uid==='admin'?'관리자':'질문회원',username:uid,email:uid+'@example.com',role:uid==='admin'?'admin':'user',createdAt:'2026-11-06T00:00:00.000Z'});
      batch.set(sdk.doc(db,'admins','admin'),{enabled:true});
      for(let i=0;i<16;i++){
        const id='fixture-'+i,question={category:common.categories[i%5],title:i===0?'노출되면 안 되는 비밀제목':'공개 질문 '+i,content:i===0?'보호할 비공개 본문':'화면 검증용 질문 본문',author:'질문회원',authorUid:'owner',isPublic:i!==0,createdAt:new Date(Date.UTC(2026,10,1,i)).toISOString(),updatedAt:new Date(Date.UTC(2026,10,1,i)).toISOString()};
        batch.set(sdk.doc(db,'qnaDetails',id),question);batch.set(sdk.doc(db,'qnaList',id),common.metadata(question));batch.set(sdk.doc(db,'qnaAnswers',id),common.emptyAnswer());
      }
      await batch.commit();
    });
    const userFor=uid=>uid?{uid,name:uid==='admin'?'관리자':'질문회원',admin:uid==='admin'}:null;
    const nodeRepo=uid=>{const user=userFor(uid);return createRepository({connect:async()=>({sdk,db:testEnvironment.authenticatedContext(uid,{email:uid+'@members.haro.invalid'}).firestore()}),auth:{getUser:async()=>user,requireLogin:async()=>user,requireAdmin:async()=>{if(!user.admin)throw new Error('관리자');}}});};
    const injection=function(port){
      const current=()=>JSON.parse(sessionStorage.getItem('qna-test-user')||'null');let firebase,account;
      Object.defineProperty(window,'HaroNoticeFirebase',{get:()=>firebase,set:original=>{
        let client;firebase={...original,getClient:()=>client||(client=Promise.all([import('https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js')]).then(([app,sdk])=>{
          const instance=app.initializeApp({projectId:'demo-haro-qna-web',apiKey:'demo-key',appId:'demo-qna'},'qna-test');const db=sdk.initializeFirestore(instance,{experimentalForceLongPolling:true}),user=current();sdk.connectFirestoreEmulator(db,'127.0.0.1',port,user?{mockUserToken:{sub:user.uid,email:user.uid+'@members.haro.invalid'}}:undefined);const tracedSdk={...sdk,getDocFromServer:async ref=>{window.qnaTrace=window.qnaTrace||[];window.qnaTrace.push('start:'+ref.path);try{const result=await sdk.getDocFromServer(ref);window.qnaTrace.push('done:'+ref.path);return result;}catch(error){window.qnaTrace.push('error:'+error.code+':'+ref.path);throw error;}}};return {app:instance,sdk:tracedSdk,db};
        }))};
      }});
      Object.defineProperty(window,'HaroAccount',{get:()=>account,set:original=>{account={...original,
        getUser:async()=>current(),isAdmin:async()=>!!current()?.admin,
        requireLogin:async()=>{if(!current())throw new Error('로그인 후 질문을 작성해 주세요.');return current();},
        requireAdmin:async()=>{if(!current()?.admin)throw new Error('관리자만 답변할 수 있습니다.');},
        getCurrentUserName:async()=>current()?.name||'방문자',subscribe:callback=>{callback(current());return ()=>{};},
        login:async username=>sessionStorage.setItem('qna-test-user',JSON.stringify({uid:username,name:username==='admin'?'관리자':'질문회원',admin:username==='admin'})),
        logout:async()=>sessionStorage.removeItem('qna-test-user'),
      };}});
    };
    await cdp('Page.addScriptToEvaluateOnNewDocument',{source:'('+injection.toString()+')('+Number(emulatorPort)+')'});
    const setUser=uid=>evaluate('sessionStorage.setItem("qna-test-user",'+JSON.stringify(JSON.stringify(userFor(uid)))+')');
    const until=async expression=>{for(let i=0;i<100;i++){try{if(await evaluate(expression))return;}catch{}await pause(100);}throw new Error('Timed out: '+expression);};
    await navigate('qna.html');assert.equal(await read('qna-message'),'');assert.equal(await evaluate("document.querySelectorAll('#qna-list li').length"),7);
    await navigate('qna.html?page=3');assert.equal(await evaluate("document.querySelectorAll('#qna-list li').length"),2);assert.ok((await read('qna-list')).includes('비공개 질문입니다'));assert.ok(!(await read('qna-list')).includes('비밀제목'));
    await navigate('qna.html?q='+encodeURIComponent('비밀제목'));assert.ok((await read('qna-list')).includes('검색 결과가 없습니다'));
    await navigate('qna.html?category='+encodeURIComponent('굿즈 문의'));assert.ok(!(await read('qna-list')).includes('이모티콘 문의'));
    await navigate('qna-detail.html?id=fixture-0');assert.equal(await read('qna-message'),common.privateMessage);assert.equal(await evaluate("document.getElementById('qna-detail-panel').hidden"),true);
    await navigate('qna-write.html');assert.equal(await evaluate("document.getElementById('qna-form-panel').hidden"),true);
    await navigate('login.html?next=qna-write.html');await value('login-username','owner');await value('login-password','test-password');await evaluate("document.getElementById('login-form').requestSubmit()");await waitPath('qna-write.html');assert.equal(await read('qna-message'),'');
    await value('qna-category','굿즈 문의');await value('qna-input-title','UI에서 등록한 비공개 질문');await value('qna-content','비공개 문의 본문');await value('qna-public','false');
    await evaluate("document.getElementById('qna-form').requestSubmit()");await waitPath('qna-detail.html');const createdId=await evaluate("new URLSearchParams(location.search).get('id')");assert.ok(createdId);assert.equal(await read('qna-title'),'UI에서 등록한 비공개 질문');
    assert.equal(await evaluate("document.getElementById('qna-edit').hidden"),false);
    await navigate('qna-edit.html?id='+createdId);assert.equal(await evaluate("document.getElementById('qna-input-title').value"),'UI에서 등록한 비공개 질문');await value('qna-input-title','공개로 수정한 질문');await value('qna-public','true');await evaluate("document.getElementById('qna-form').requestSubmit()");await waitPath('qna-detail.html');assert.equal(await read('qna-title'),'공개로 수정한 질문');
    await setUser('other');await navigate('qna-detail.html?id='+createdId);assert.equal(await evaluate("document.getElementById('qna-edit').hidden"),true);assert.equal(await evaluate("document.getElementById('qna-answer-open').hidden"),true);
    await navigate('qna-edit.html?id='+createdId);assert.equal(await evaluate("document.getElementById('qna-form-panel').hidden"),true);
    await navigate('qna-detail.html?id=fixture-0');assert.equal(await read('qna-message'),common.privateMessage);
    await setUser('admin');await navigate('qna-detail.html?id=fixture-0');assert.equal(await read('qna-body'),'보호할 비공개 본문');assert.equal(await evaluate("document.getElementById('qna-edit').hidden"),true);
    await navigate('qna-detail.html?id='+createdId);await click('qna-answer-open');await value('qna-answer-input','관리자 UI 답변');await evaluate("document.getElementById('qna-answer-form').requestSubmit()");await until("document.getElementById('qna-answer-body').textContent==='관리자 UI 답변'");assert.ok((await read('qna-meta')).includes('답변완료'));
    await click('qna-answer-open');await value('qna-answer-input','관리자 수정 답변');await evaluate("document.getElementById('qna-answer-form').requestSubmit()");await until("document.getElementById('qna-answer-body').textContent==='관리자 수정 답변'");
    await evaluate('window.confirm=()=>false');await click('qna-answer-delete');await pause(100);assert.equal(await read('qna-answer-body'),'관리자 수정 답변');await evaluate('window.confirm=()=>true');await click('qna-answer-delete');await until("document.getElementById('qna-answer-body').textContent.includes('기다리고')");
    await setUser(null);await navigate('qna.html');await nodeRepo('admin').saveAnswer(createdId,'실시간 상태 답변');await until("document.getElementById('qna-list').textContent.includes('답변완료')");
    await setUser('owner');await navigate('qna-edit.html?id='+createdId);await value('qna-content','작성자가 추가 수정');await evaluate("document.getElementById('qna-form').requestSubmit()");await waitPath('qna-detail.html');assert.equal(await read('qna-answer-body'),'실시간 상태 답변');
    for(const width of [1920,1025,1024,769,768,390,320]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      for(const route of ['qna.html','qna-detail.html?id='+createdId,'qna-write.html']){
        await navigate(route);assert.equal(await read('qna-message'),'');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,route+' '+width);
        const overlap=await evaluate("(()=>{const selectors=['.site-header__brand','.site-nav','.site-header__actions','.account-header','.site-nav__toggle'];const boxes=selectors.map(s=>document.querySelector(s)).filter(e=>e&&getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect());return boxes.some((a,i)=>boxes.some((b,j)=>j>i&&a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1));})()");assert.equal(overlap,false,'Header overlap '+width);
        if(route==='qna.html'&&(width===390||width===1920)){const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile(path.join(os.tmpdir(),'haro-qna-'+width+'.png'),Buffer.from(shot.data,'base64'));}
      }
    }
    await navigate('qna-detail.html?id='+createdId);await evaluate('window.confirm=()=>false');await click('qna-delete');await pause(100);assert.ok(await nodeRepo('owner').getById(createdId));
    await evaluate('window.confirm=()=>true');await click('qna-delete');await waitPath('qna.html');assert.equal(await nodeRepo('owner').getById(createdId),null);
    assert.deepEqual(errors,[]);console.log('PASS: real Q&A Firebase SDK + local rules, guest/member/owner/admin flows, search/filter/7-row paging, private masking, login return, question CRUD, reply CRUD/live status, responsive seven widths; demo data only');
  }finally{if(socket)socket.close();if(browser)browser.kill();if(server)server.kill();await testEnvironment?.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
