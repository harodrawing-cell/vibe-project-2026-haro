const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve('test-results/react');
fs.mkdirSync(output, {recursive:true});
const origin = process.env.HARO_TEST_URL || 'http://127.0.0.1:5173/react.html';
const report = { startedAt:new Date().toISOString(), widths:[], checks:[], consoleErrors:[], pageErrors:[], brokenAssets:[] };
const accountMock = `
let user=null; const listeners=new Set(); let failures=0;
const publish=()=>listeners.forEach(fn=>fn(user));
window.__setUser=value=>{user=value;publish()};
export default {
 normalizeId:value=>{const id=value.trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_]{3,19}$/.test(id))throw Error('아이디를 확인해 주세요.');return id},
 subscribe(fn){listeners.add(fn);fn(user);return()=>listeners.delete(fn)},getUser:async()=>user,
 requireLogin:async()=>{if(!user)throw Error('로그인 필요');return user},requireAdmin:async()=>{if(!user?.admin)throw Error('관리자 필요')},
 checkId:async value=>value!=='taken',register:async()=>({success:true}),
 login:async(name,password)=>{if(password!=='correct123'){failures++;throw Object.assign(Error('실패'),{code:name==='network'?'auth/network-request-failed':'auth/invalid-credential'})}user={uid:name,name:'테스트 회원',admin:name==='admin'};publish()},
 logout:async()=>{user=null;publish()}
};`;
const repoMock = qna => `
import account from '/src/services/account.js';
let rows=Array.from({length:${qna ? 10 : 13}},(_,i)=>({id:'post-'+i,category:${JSON.stringify(qna ? '기타 문의' : '공지사항')},title:'테스트 제목 '+i,content:'테스트 본문 '+i,author:'테스트 회원',authorUid:'owner',imageUrl:'',isPublic:i!==1,createdAt:'2026-11-07T00:00:00.000Z',updatedAt:'2026-11-07T00:00:00.000Z',status:'waiting',answer:{content:'',author:'',authorUid:''}}));
function metadata(row){return ${qna ? "!row.isPublic?{...row,title:'비공개 질문입니다',author:'비공개',content:undefined,answer:undefined}:row" : 'row'}}
const api={getList:async()=>rows.map(metadata),subscribeList(fn){fn(rows.map(metadata));return()=>{}},
 getById:async id=>{const row=rows.find(p=>p.id===id);const user=await account.getUser();if(${qna}&&row&&!row.isPublic&&user?.uid!==row.authorUid&&!user?.admin)throw Error('비공개 질문입니다. 작성자와 관리자만 확인할 수 있습니다.');return row},
 create:async input=>{const user=await account.requireLogin();const row={...rows[0],...input,id:'created',author:user.name,authorUid:user.uid};rows.unshift(row);return row},
 update:async(id,input)=>{const row=rows.find(p=>p.id===id);const user=await account.requireLogin();if(user.uid!==row.authorUid&&(${qna}||!user.admin))throw Error('권한 없음');Object.assign(row,input);return row},
 remove:async id=>{rows=rows.filter(p=>p.id!==id)},saveAnswer:async(id,content)=>{const row=rows.find(p=>p.id===id);row.answer={content,author:'관리자',authorUid:'admin',updatedAt:'2026-11-07'};row.status='answered'},removeAnswer:async id=>{const row=rows.find(p=>p.id===id);row.answer={content:''};row.status='waiting'}
};export default api;`;
async function main() {
  const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try {
    const context = await browser.newContext({ viewport:{width:1920,height:1080},reducedMotion:'reduce' });
    await context.route('**/src/services/account.js*',route=>route.fulfill({contentType:'application/javascript',body:"export { default } from '/test-account.js';"}));
    await context.route('**/src/services/notices.js*',route=>route.fulfill({contentType:'application/javascript',body:repoMock(false)}));
    await context.route('**/src/services/qna.js*',route=>route.fulfill({contentType:'application/javascript',body:repoMock(true)}));
    // No test can send a request to the production database or Authentication.
    await context.route(/https:\/\/.*(?:googleapis|firebaseio|firebaseapp)\.com\//,route=>route.abort());
    await context.route('**/test-account.js',route=>route.fulfill({contentType:'application/javascript',body:accountMock}));
    const page = await context.newPage();
    page.on('pageerror',e=>report.pageErrors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
    page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin==='http://127.0.0.1:5173')report.brokenAssets.push({url:r.url(),status:r.status()})});
    await page.goto(origin,{waitUntil:'networkidle'});
    await page.locator('.hero__button-look:not(:disabled)').waitFor();
    for (const width of [1920,1024,768,390]) {
      await page.setViewportSize({width,height:1080});
      for (const route of ['/', '/notice','/qna','/login','/signup','/goods?id=haro-note','/cart']) {
        await page.goto(origin+'#'+route,{waitUntil:'networkidle'});
        await page.locator('main').waitFor();
        const layout = await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,main:document.querySelector('main').getBoundingClientRect().toJSON()}));
        assert.ok(layout.scroll<=width+1,`${width} ${route} overflow ${layout.scroll}`);
        if(route==='/') {
          assert.equal(await page.locator('[data-story-grid] img').count(),4);
          await page.screenshot({path:path.join(output,`home-${width}.png`),fullPage:true});
        }
        report.widths.push({width,route,scrollWidth:layout.scroll});
      }
    }
    await page.goto(origin+'#/',{waitUntil:'networkidle'});
    await page.locator('.hero__button-look:not(:disabled)').click();
    await page.locator('#hero-box.is-open').waitFor();
    assert.match(await page.locator('#hero-box-frame').getAttribute('src'),/BOX_012/);
    const color = await page.locator('.hero__button-look').evaluate(el=>({color:getComputedStyle(el).color,fill:getComputedStyle(el).webkitTextFillColor}));
    assert.equal(color.color,'rgb(32, 32, 32)'); assert.equal(color.fill,color.color);
    report.checks.push('HERO final frame and iPhone text-fill CSS');
    await page.locator('.site-nav__toggle').click(); await page.keyboard.press('Escape'); assert.equal(await page.locator('.site-nav__toggle').getAttribute('aria-expanded'),'false');
    await page.locator('#site-search-toggle').click(); await page.locator('#site-search-input').waitFor({state:'visible'}); await page.keyboard.press('Escape'); assert.equal(await page.locator('#search-overlay').isVisible(),false);
    await page.getByRole('button',{name:'공지 배너 닫기'}).click(); assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('has-notice-banner')),false);
    report.checks.push('mobile menu Escape, search Escape, banner close and gap removal');
    await page.goto(origin+'#/goods?id=haro-note',{waitUntil:'networkidle'}); await page.locator('#product-option').selectOption('white-105-148'); await page.locator('#product-quantity').fill('2'); await page.getByRole('button',{name:'장바구니 담기',exact:true}).click(); await page.getByText('장바구니에 담았습니다.',{exact:true}).waitFor();
    await page.getByRole('link',{name:'장바구니 보기',exact:true}).click(); await page.locator('.cart-summary').waitFor(); assert.match(await page.locator('.cart-summary').innerText(),/12,000원/);
    await page.getByRole('button',{name:/수량 늘리기/}).click(); await page.getByText('16,500원',{exact:true}).waitFor(); await page.reload({waitUntil:'networkidle'}); assert.match(await page.locator('.cart-summary').innerText(),/16,500원/);
    await page.getByRole('button',{name:/장바구니에서 삭제/}).click(); await page.getByText('장바구니가 비어 있습니다.',{exact:true}).waitFor();
    report.checks.push('cart add, totals, quantity, reload persistence, removal');
    await page.goto(origin+'#/goods?id=lazy-sticker',{waitUntil:'networkidle'}); assert.equal(await page.getByRole('button',{name:'장바구니 담기',exact:true}).isDisabled(),true);
    await page.goto(origin+'#/notice',{waitUntil:'networkidle'}); await page.getByLabel('제목 또는 내용 검색').fill('제목 12'); await page.getByRole('button',{name:'검색',exact:true}).click(); await page.waitForFunction(()=>document.querySelectorAll('#notice-list li').length===1);
    await page.goto(origin+'#/notice/detail?id=post-0',{waitUntil:'networkidle'}); await page.getByRole('heading',{name:'테스트 제목 0'}).waitFor(); assert.equal(await page.getByRole('link',{name:'수정',exact:true}).count(),0);
    await page.evaluate(()=>window.__setUser({uid:'owner',name:'테스트 회원',admin:false})); await page.getByRole('link',{name:'수정',exact:true}).waitFor(); await page.getByRole('link',{name:'수정',exact:true}).click(); await page.locator('#board-title').fill('수정 제목'); await page.getByRole('button',{name:'저장',exact:true}).click(); await page.getByRole('heading',{name:'수정 제목'}).waitFor();
    page.once('dialog',d=>d.dismiss()); await page.getByRole('button',{name:'삭제',exact:true}).click(); assert.equal(await page.getByRole('heading',{name:'수정 제목'}).count(),1);
    page.once('dialog',d=>d.accept()); await page.getByRole('button',{name:'삭제',exact:true}).click(); await page.waitForURL(/deleted=1/);
    report.checks.push('NOTICE search, guest/owner edit visibility, edit same ID, delete cancel/confirm');
    await page.goto(origin+'#/qna/detail?id=post-1',{waitUntil:'networkidle'}); await page.evaluate(()=>window.__setUser(null)); await page.getByText('비공개 질문입니다. 작성자와 관리자만 확인할 수 있습니다.',{exact:true}).waitFor(); assert.equal(await page.locator('#qna-detail-panel').count(),0);
    await page.evaluate(()=>window.__setUser({uid:'owner',name:'테스트 회원',admin:false})); await page.getByRole('heading',{name:'테스트 제목 1'}).waitFor();
    await page.evaluate(()=>window.__setUser({uid:'admin',name:'관리자',admin:true})); await page.getByRole('button',{name:'답변 작성',exact:true}).click(); await page.locator('#qna-answer-input').fill('관리자 답변 테스트'); await page.getByRole('button',{name:'답변 저장',exact:true}).click(); await page.getByText('관리자 답변 테스트',{exact:true}).waitFor();
    report.checks.push('Q&A private guest denial, owner access, administrator reply');
    await page.goto(origin+'#/login',{waitUntil:'networkidle'}); await page.locator('#account-username').fill('owner'); await page.locator('#account-password').fill('wrong123'); await page.locator('#login-form button[type=submit]').click(); await page.getByText('아이디 또는 비밀번호가 올바르지 않습니다.',{exact:true}).waitFor(); await page.locator('#login-form button[type=submit]').click(); await page.getByRole('button',{name:'비밀번호 찾기'}).waitFor(); await page.getByRole('button',{name:'비밀번호 찾기'}).click(); await page.locator('.account-recovery').waitFor({state:'visible'});
    await page.goto(origin+'#/signup',{waitUntil:'networkidle'}); await page.locator('#signup-name').fill('테스트'); await page.locator('#account-username').fill('newmember'); await page.locator('#account-password').fill('correct123'); await page.locator('#signup-email').fill('test@example.com'); await page.getByRole('button',{name:'중복 확인'}).click(); await page.getByText('사용할 수 있는 아이디입니다.',{exact:true}).waitFor(); await page.locator('#signup-form button[type=submit]').click(); await page.getByRole('heading',{name:'회원가입이 완료되었습니다!'}).waitFor();
    report.checks.push('login first/second credential errors, manual recovery, signup duplicate check and completion');
    await page.evaluate(()=>window.__setUser({uid:'owner',name:'테스트 회원',admin:false}));
    for(const width of [1920,1024,768,390]) {
      await page.setViewportSize({width,height:1080});
      for(const route of ['/notice/write','/notice/edit?id=post-2','/notice/detail?id=post-2','/qna/write','/qna/edit?id=post-2','/qna/detail?id=post-2']) {
        await page.goto(origin+'#'+route,{waitUntil:'networkidle'});
        await page.locator(route.includes('/detail')?'main article':'#board-title').waitFor();
        const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);
        assert.ok(scroll<=width+1,`${width} ${route} overflow ${scroll}`);
        report.widths.push({width,route,scrollWidth:scroll});
      }
    }
    await page.goto(origin+'#/notice/write',{waitUntil:'networkidle'});
    await page.locator('#notice-image').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
    await page.waitForFunction(()=>document.querySelector('.notice-image-preview')?.src.startsWith('data:image/webp;base64,'));
    page.once('dialog',d=>d.accept()); await page.getByRole('button',{name:'취소',exact:true}).click();
    report.checks.push('authorized detail/write/edit layouts at all four widths and Canvas WebP attachment conversion');
    await page.goto(origin+'#/',{waitUntil:'networkidle'}); await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('.hero__button-look:not(:disabled)').waitFor();
    const start=Date.now(); await page.locator('.hero__button-look').click(); await page.locator('#hero-box.is-open').waitFor();
    assert.ok(Date.now()-start>=1450,'HERO should retain its 1.5 second timing');
    report.checks.push('HERO normal motion duration 1.5 seconds');
    for(const width of [1920,390,1024,768,1920]) {
      await page.setViewportSize({width,height:1080});
      await page.locator('#goods').scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
    }
    const beforeSlide=await page.locator('.goods__viewport').evaluate(el=>el.swiper.realIndex);
    await page.getByRole('button',{name:'다음 상품',exact:true}).click();
    await page.waitForTimeout(450);
    assert.notEqual(await page.locator('.goods__viewport').evaluate(el=>el.swiper.realIndex),beforeSlide);
    report.checks.push('Swiper live desktop/mobile breakpoint changes and next navigation');
    assert.deepEqual(report.pageErrors,[]); assert.deepEqual(report.brokenAssets,[]);
    await context.close();
    // Smoke-test the actual build with requests to production services blocked.
    const built = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await built.route(/https:\/\/.*(?:googleapis|firebaseio|firebaseapp)\.com\//,r=>r.abort());
    const preview = await built.newPage(); const buildErrors=[];
    preview.on('pageerror',e=>buildErrors.push(e.message));
    for(const route of ['/', '/notice','/qna','/login','/signup','/goods?id=haro-note','/cart']) {
      await preview.goto('http://127.0.0.1:4173/#'+route,{waitUntil:'domcontentloaded'}); await preview.locator('main').waitFor(); await preview.reload({waitUntil:'domcontentloaded'}); await preview.locator('main').waitFor();
    }
    assert.deepEqual(buildErrors,[]); report.checks.push('production hash routes direct access and refresh');
    await built.close();
  } finally { await browser.close(); fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)); }
  console.log(JSON.stringify({layouts:report.widths.length,checks:report.checks,consoleErrors:report.consoleErrors,pageErrors:report.pageErrors,brokenAssets:report.brokenAssets},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
