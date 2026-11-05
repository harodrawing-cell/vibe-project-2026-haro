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
      if (message.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(message.params.exceptionDetails));
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
    const go=async route=>{
      await cdp('Page.navigate',{url:'http://127.0.0.1:8097/'+route});await pause(250);
      for(let i=0;i<100;i++){
        try{if(await evaluate("document.readyState==='complete' && !!window.HaroShop && !!document.querySelector('.site-cart') && (!document.querySelector('.shop-page') || document.body.dataset.shopReady==='true')"))return;}catch{}
        await pause(100);
      }
      throw new Error('Shop page not ready: '+route);
    };
    const waitFor=async expression=>{for(let i=0;i<80;i++){try{if(await evaluate(expression))return;}catch{}await pause(100);}throw new Error('Not ready: '+expression)};
    const click=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
    const set=(id,value)=>evaluate(`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(value)}`);
    const text=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);
    await go('index.html');
    assert.equal(await evaluate("document.querySelector('.site-cart__badge').hidden"),true);
    const products=await evaluate('HaroShop.getCatalog().then(x=>x.products)');
    assert.equal(await evaluate("document.querySelectorAll('.goods-card__link').length"),8);
    for(const product of products){
      await go('index.html');
      await evaluate(`document.querySelector('.goods-card[data-product-id="${product.id}"] a').click()`);
      await waitFor("document.body.dataset.shopReady==='true'");
      assert.equal(await evaluate("new URLSearchParams(location.search).get('id')"),product.id);
      assert.equal(await text('product-name'),product.name);
      assert.equal(await text('product-price'),product.price===null?'가격 미등록':'4,500원');
      assert.equal(await evaluate("document.getElementById('product-add').disabled"),product.price===null);
      assert.equal(await evaluate("new URL(document.getElementById('product-main-image').src).pathname"),'/'+product.images[0]);
      await evaluate("document.getElementById('product-main-image').decode()");
    }
    console.log('PASS all eight existing cards -> matching JSON product, image/name/price and missing-price guard');
    await go('pages/goods/goods-detail.html?id=haro-note');
    const firstImage=await evaluate("document.getElementById('product-main-image').src");
    await evaluate("document.querySelectorAll('#product-thumbnails button')[1].click()");
    assert.notEqual(await evaluate("document.getElementById('product-main-image').src"),firstImage);
    assert.equal(await evaluate("document.querySelectorAll('#product-thumbnails [aria-pressed=true]').length"),1);
    await click('product-increase');await click('product-increase');
    assert.equal(await text('product-total'),'13,500원');
    await evaluate("document.getElementById('product-form').requestSubmit()");
    await waitFor("document.querySelector('.site-cart__badge').textContent==='3'");
    await evaluate("document.getElementById('product-form').requestSubmit()");
    await waitFor("document.querySelector('.site-cart__badge').textContent==='6'");
    assert.equal(await evaluate('HaroShop.getCart().then(x=>x.items.length)'),1);
    await set('product-quantity','0');await evaluate("document.getElementById('product-form').requestSubmit()");
    await waitFor("document.getElementById('shop-message').textContent.includes('수량')");
    assert.equal(await evaluate('HaroShop.getCount()'),6);
    await set('product-quantity','1');
    await evaluate("window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('quota')};document.getElementById('product-form').requestSubmit()");
    await waitFor("document.getElementById('shop-message').textContent.includes('저장하지 못했습니다')");
    assert.equal(await evaluate('HaroShop.getCount()'),6);
    await evaluate('Storage.prototype.setItem=window.savedSetItem');
    console.log('PASS thumbnails, live total, add/merge, quantity validation and failed-write preservation');
    for(const route of ['index.html','pages/notice/notice.html','pages/notice/notice-list.html','pages/notice/notice-detail.html?id=missing','pages/notice/notice-write.html','pages/notice/notice-edit.html?id=missing','pages/goods/goods-detail.html?id=haro-note','pages/cart/cart.html']){
      await go(route);
      assert.equal(await evaluate("document.querySelector('.site-cart__badge').textContent"),'6',route);
      assert.equal(await evaluate("document.querySelector('.site-cart__badge').hidden"),false,route);
    }
    assert.equal(await text('cart-total'),'30,000원');
    const secondTarget = await cdp('Target.createTarget',{url:'http://127.0.0.1:8097/index.html'});
    const secondInfo = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(target=>target.id===secondTarget.targetId);
    const secondSocket = new WebSocket(secondInfo.webSocketDebuggerUrl);
    await once(secondSocket,'open');
    let secondaryId=0;
    const secondEvaluate=expression=>new Promise((resolve,reject)=>{
      const id=++secondaryId;
      const timer=setTimeout(()=>{secondSocket.removeEventListener('message',receive);reject(new Error('Secondary page timeout'));},10000);
      function receive(event){const response=JSON.parse(event.data);if(response.id!==id)return;clearTimeout(timer);secondSocket.removeEventListener('message',receive);if(response.error||response.result.exceptionDetails)reject(new Error(JSON.stringify(response)));else resolve(response.result.result.value);}
      secondSocket.addEventListener('message',receive);
      secondSocket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
    });
    try {
      await secondEvaluate("(async()=>{for(let i=0;i<80&&!window.HaroShop;i++)await new Promise(r=>setTimeout(r,100));await HaroShop.add('haro-note','white-105-148',1)})()");
      await waitFor("document.querySelector('.site-cart__badge').textContent==='7' && document.getElementById('cart-total').textContent==='34,500원'");
      await secondEvaluate("HaroShop.setQuantity('haro-note','white-105-148',6)");
      await waitFor("document.querySelector('.site-cart__badge').textContent==='6' && document.getElementById('cart-total').textContent==='30,000원'");
    } finally { secondSocket.close(); await cdp('Target.closeTarget',{targetId:secondTarget.targetId}); }
    console.log('PASS live badge and cart totals update across browser tabs');
    const shots=path.join(os.tmpdir(),'haro-shop-preview');await fs.mkdir(shots,{recursive:true});
    for(const width of [1920,1024,768,390]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      for(const route of ['index.html','pages/notice/notice-list.html','pages/goods/goods-detail.html?id=haro-note','pages/cart/cart.html']){
        await go(route);
        assert.ok(await evaluate(`document.documentElement.scrollWidth<=${width}`),route+' overflow '+width);
        const header=await evaluate("(()=>{const cart=document.querySelector('.site-cart').getBoundingClientRect(),search=document.querySelector('.site-search__toggle').getBoundingClientRect();return {cart:{left:cart.left,right:cart.right},search:{left:search.left,right:search.right},height:cart.height}})()");
        assert.ok(header.cart.left>=header.search.right);
        assert.ok(header.cart.right<=width);
        assert.ok(header.height>=42);
        if(route==='index.html'){
          const cards=await evaluate("[...document.querySelectorAll('.goods-card')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))");
          // Compare to the current project's original unwrapped card structure,
          // rather than older historical pixel measurements.
          const originalGeometry = await evaluate("(()=>{document.querySelectorAll('.goods-card__link').forEach(link=>link.replaceWith(...link.childNodes));return [...document.querySelectorAll('.goods-card')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))})()");
          assert.ok(cards.every((card,i)=>Math.abs(card.width-originalGeometry[i].width)<.1 && Math.abs(card.height-originalGeometry[i].height)<.1),JSON.stringify({cards,originalGeometry}));
          assert.ok(cards.every(card=>Math.abs(card.height-cards[0].height)<1));
          if(await evaluate("!!document.querySelector('[data-goods-swiper]').swiper")){
            assert.equal(await evaluate("document.querySelector('[data-goods-swiper]').swiper.params.autoplay.delay"),4000);
          }
        }
        if(route.includes('goods-detail')||route.includes('cart.html')){
          const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
          await fs.writeFile(path.join(shots,(route.includes('goods-detail')?'detail':'cart')+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
        }
      }
      await go('index.html');
      if(width<=768){await evaluate("document.querySelector('.site-nav__toggle').click()");assert.equal(await evaluate("document.querySelector('.site-nav__toggle').getAttribute('aria-expanded')"),'true');await evaluate("document.querySelector('.site-nav__toggle').click()");}
      await evaluate("document.getElementById('site-search-toggle').click()");
      assert.equal(await evaluate("document.getElementById('search-overlay').hidden"),false);
      await evaluate("document.querySelector('.search-overlay__close').click()");
      console.log('PASS responsive detail/cart/badge, existing card geometry, menu and search',width);
    }
    await go('pages/cart/cart.html');
    await evaluate("const input=document.querySelector('#cart-items input');input.value='2';input.dispatchEvent(new Event('change',{bubbles:true}))");
    await waitFor("document.getElementById('cart-total').textContent==='12,000원'");
    assert.equal(await evaluate("document.querySelector('.site-cart__badge').textContent"),'2');
    await evaluate("document.querySelector('#cart-items button[aria-label$=늘리기]').click()");
    await waitFor("document.getElementById('cart-total').textContent==='16,500원'");
    await go('pages/cart/cart.html');
    assert.equal(await text('cart-total'),'16,500원');
    assert.equal(await evaluate("document.querySelector('#cart-items input').value"),'3');
    await evaluate("document.querySelector('.cart-item__remove').click()");
    await waitFor("!document.getElementById('cart-empty').hidden");
    assert.match(await text('cart-empty'),/선택한 상품이 없습니다/);
    assert.equal(await evaluate("document.querySelector('.site-cart__badge').hidden"),true);
    await go('pages/cart/cart.html');
    assert.equal(await evaluate("document.getElementById('cart-empty').hidden"),false);
    await go('pages/goods/goods-detail.html?id=missing');
    assert.match(await text('shop-message'),/찾을 수 없습니다/);
    assert.equal(await evaluate("document.getElementById('product-panel').hidden"),true);
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS quantity update, reload persistence, removal, empty state, missing product and no uncaught errors');
    console.log('Screenshots: '+shots);
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
