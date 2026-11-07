// Final audit: no sign-in, signup, Firestore writes or existing browser profile.
const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const output = 'test-results/react-final';
fs.mkdirSync(output, { recursive: true });
async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const report = { at: new Date().toISOString(), entries: [], firebase: {}, mutationsBlocked: [] };
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    // Listen/batchGet use POST but are read operations. Block actual write endpoints.
    await context.route(/https:\/\/(?:firestore|identitytoolkit)\.googleapis\.com\//, route => {
      const url = route.request().url();
      if (/:(?:commit|batchWrite|signUp|signInWithPassword|signInWithCustomToken|update|delete)(?:\?|$)|\/Write\/channel/.test(url)) {
        report.mutationsBlocked.push(url.replace(/key=[^&]+/, 'key=REDACTED'));
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    for (const url of ['http://127.0.0.1:5173/react.html', 'http://127.0.0.1:4173/']) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.locator('#root main').waitFor();
      const entry = await page.evaluate(() => {
        const container = document.querySelector('#root');
        const key = Object.keys(container).find(key => key.startsWith('__reactContainer$'));
        const main = container.querySelector('main');
        const fiberKey = Object.keys(main).find(key => key.startsWith('__reactFiber$'));
        const components = []; let fiber = main[fiberKey];
        while (fiber) { const type = fiber.elementType; if (typeof type === 'function') components.push(type.displayName || type.name); fiber = fiber.return; }
        return { url: location.href, reactContainer: !!key, reactFiber: !!fiberKey, componentAncestors: components, scripts: [...document.scripts].map(s => s.src).filter(Boolean), rootChildren: container.children.length, htmlContainsLegacyScripts: !!document.querySelector('script[src*="js/main.js"]') };
      });
      assert.equal(entry.reactContainer, true); assert.equal(entry.reactFiber, true); assert.equal(entry.htmlContainsLegacyScripts, false);
      await page.locator('.hero__button-look:not(:disabled)').waitFor();
      await page.locator('.hero__button-look').click(); await page.locator('#hero-box.is-open').waitFor();
      entry.reactInteraction = 'HERO open state rendered';
      report.entries.push(entry);
      await page.screenshot({ path: `${output}/${url.includes('5173') ? 'dev' : 'build'}-entry.png` });
    }
    await page.goto('http://127.0.0.1:5173/react.html', { waitUntil: 'domcontentloaded' });
    report.firebase = await page.evaluate(async () => {
      const limit = async (label, operation) => {
        let timer;
        try { return await Promise.race([operation().then(value => ({ status: 'ok', value })), new Promise(resolve => { timer = setTimeout(() => resolve({ status: 'timeout', label }), 20000); })]); }
        catch (error) { return { status: 'error', code: error.code || '', message: error.message }; }
        finally { clearTimeout(timer); }
      };
      const firebase = (await import('/src/services/firebase.js')).default;
      const account = (await import('/src/services/account.js')).default;
      const qnaRepository = (await import('/src/services/qna.js')).default;
      const client = await firebase.getClient();
      const { sdk, db } = client;
      const summarize = snapshot => ({ count: snapshot.docs.length, empty: snapshot.empty });
      const results = { projectId: client.app.options.projectId, sdk: '12.6.0', authGuest: await limit('Auth guest', () => account.getUser().then(user => ({ signedIn: !!user }))) };
      const [notice, qna, profile, admin] = await Promise.all([
        limit('notices read', () => sdk.getDocsFromServer(sdk.collection(db, 'notices')).then(summarize)),
        limit('qnaList read', async () => {
          const snapshot = await sdk.getDocsFromServer(sdk.collection(db, 'qnaList'));
          const privatePost = snapshot.docs.find(doc => doc.data().isPublic === false);
          const publicPost = snapshot.docs.find(doc => doc.data().isPublic === true);
          let publicDetail = { status: 'not-available' }, privateDetail = { status: 'not-available' }, privateAnswer = { status: 'not-available' };
          if (publicPost) publicDetail = await limit('public Q&A detail', () => sdk.getDocFromServer(sdk.doc(db, 'qnaDetails', publicPost.id)).then(doc => ({ exists: doc.exists() })));
          if (privatePost) {
            privateDetail = await limit('private Q&A detail', () => sdk.getDocFromServer(sdk.doc(db, 'qnaDetails', privatePost.id)).then(doc => ({ exists: doc.exists(), isPublic: doc.exists() ? doc.data().isPublic : null })));
            privateAnswer = await limit('private Q&A answer', () => sdk.getDocFromServer(sdk.doc(db, 'qnaAnswers', privatePost.id)).then(doc => ({ exists: doc.exists() })));
            const rest = async collection => {
              const url = `https://firestore.googleapis.com/v1/projects/${client.app.options.projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(privatePost.id)}?key=${client.app.options.apiKey}`;
              const response = await fetch(url, { credentials: 'omit', cache: 'no-store' });
              const json = await response.json();
              return { httpStatus: response.status, isPublic: json.fields?.isPublic?.booleanValue ?? null, contentFieldPresent: Object.hasOwn(json.fields || {}, 'content'), contentCharacters: json.fields?.content?.stringValue?.length ?? null, titleCharacters: json.fields?.title?.stringValue?.length ?? null, authHeader: false, firebaseIdToken: false, serviceAccount: false, credentials: 'omit' };
            };
            privateDetail.unauthenticatedREST = await limit('private detail REST', () => rest('qnaDetails'));
            privateAnswer.unauthenticatedREST = await limit('private answer REST', () => rest('qnaAnswers'));
            privateDetail.reactRepository = await limit('React private detail guard', () => qnaRepository.getById(privatePost.id).then(post => ({ returned: !!post })));
          }
          return { ...summarize(snapshot), publicDetail, privateDetail, privateAnswer, privateMetadataMasked: snapshot.docs.filter(doc => doc.data().isPublic === false).every(doc => { const v = doc.data(); return v.title === '비공개 질문입니다' && v.author === '비공개' && !('content' in v) && !('answer' in v); }) };
        }),
        limit('guest profile access', () => sdk.getDocFromServer(sdk.doc(db, 'users', 'haro-readonly-audit-20261108')).then(doc => ({ exists: doc.exists() }))),
        limit('guest admin access', () => sdk.getDocFromServer(sdk.doc(db, 'admins', 'haro-readonly-audit-20261108')).then(doc => ({ exists: doc.exists() }))),
      ]);
      Object.assign(results, { notice, qna, guestProfile: profile, guestAdmin: admin });
      results.signupIdLookup = await limit('signup duplicate-ID lookup', () => account.checkId('haro_readonly_2026').then(available => ({ checkCompleted: true, available })));
      results.signupEmailLookup = await limit('signup duplicate-email lookup', () => sdk.getDocFromServer(sdk.doc(db, 'emails', 'haro-readonly-audit-20261108@example.invalid')).then(doc => ({ checkCompleted: true, exists: doc.exists() })));
      results.accountLogin = 'not run: no test credentials, preserves existing authentication state';
      results.signupAndCRUD = 'not run: would change Firebase accounts/documents';
      return results;
    });
    report.findings = [];
    const detail = report.firebase.qna?.value?.privateDetail;
    const answer = report.firebase.qna?.value?.privateAnswer;
    if (detail?.value?.isPublic === false && detail?.unauthenticatedREST?.value?.httpStatus === 200) report.findings.push({ severity: 'critical', code: 'PRIVATE_QNA_READABLE_WITHOUT_AUTH', detail: 'Private Q&A detail returned HTTP 200 without Authorization or cookies.' });
    if (answer?.unauthenticatedREST?.value?.httpStatus === 200) report.findings.push({ severity: 'critical', code: 'PRIVATE_QNA_ANSWER_READABLE_WITHOUT_AUTH', detail: 'Answer for the private question returned HTTP 200 without Authorization or cookies.' });
    report.releaseDecision = report.findings.length ? 'blocked' : 'requires authenticated and device testing';
    report.liveListUI = [];
    for (const base of ['http://127.0.0.1:5173/react.html', 'http://127.0.0.1:4173/']) {
      for (const board of ['notice', 'qna']) {
        await page.goto(`${base}#/${board}`, { waitUntil: 'domcontentloaded' });
        const expected = board === 'notice' ? report.firebase.notice?.value?.count : report.firebase.qna?.value?.count;
        await page.waitForFunction(({board,expected}) => document.getElementById(`${board}-count`)?.textContent.includes(`총 ${expected}개`), {board,expected}, {timeout:15000});
        report.liveListUI.push({base,board,countText:await page.locator(`#${board}-count`).innerText()});
      }
    }
    await context.close();
  } finally { await browser.close(); fs.writeFileSync(`${output}/readonly-report.json`, JSON.stringify(report, null, 2)); }
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
