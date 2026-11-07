const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
test('original frontend/assets/config remain unchanged; authorized Q&A rules have a verified backup', () => {
  const hashes = JSON.parse(readFileSync('document/react-original-hashes.json', 'utf8'));
  for (const [file, expected] of Object.entries(hashes)) {
    if(file==='firebase/firestore.rules'){
      const backup=readFileSync('firebase/backups/20261108/local-before.rules');
      assert.equal(createHash('sha256').update(backup).digest('hex'),expected,'original rules backup');
      const before=backup.toString('utf8'),after=readFileSync(file,'utf8');
      for(const collection of ['users','admins']){
        const block=source=>source.match(new RegExp('^    match /'+collection+'/\\{[^}]+\\} \\{[\\s\\S]*?^    \\}','m'))?.[0];
        assert.ok(block(before));assert.equal(block(after),block(before),`${collection} authorization preserved`);
      }
      const notice=source=>source.match(/^    match \/notices\/\{id\} \{[\s\S]*?^    \}/m)?.[0];
      assert.ok(notice(before));assert.equal(notice(after),notice(before),'NOTICE rules preserved');
    }else assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), expected, file);
  }
});
test('React cart preserves quantities, unavailable prices and corrupt storage without overwriting it', async () => {
  const { createRepository } = await import('../src/services/shop.js');
  const catalog = JSON.parse(readFileSync('data/products.json', 'utf8'));
  const memory = new Map();
  const r = createRepository({ getStorage: () => ({ getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,v) }), loadCatalog: async () => catalog });
  const option = catalog.products.find(p => p.id === 'haro-note').options[0].id;
  await r.add('haro-note', option, 2);
  await r.add('haro-note', option, 1);
  assert.equal((await r.getCart()).quantity, 3);
  assert.equal((await r.getCart()).total, 16500);
  await assert.rejects(r.add('lazy-sticker', 'default', 1), /가격/);
  await assert.rejects(r.setQuantity('haro-note', option, 100), /1~99/);
  memory.set(r.STORAGE_KEY, 'broken');
  await assert.rejects(r.getCart(), /원본 데이터/);
  assert.equal(memory.get(r.STORAGE_KEY), 'broken');
});
test('React NOTICE repository rejects another UID and preserves author identity on edits', async () => {
  const firebase = (await import('../src/services/firebase.js')).default;
  const records = new Map(); let uid = 'owner';
  const snapshot = id => ({ id, exists: () => records.has(id), data: () => records.get(id) });
  const sdk = { doc: (_, collection, id) => id, setDoc: async (id, value) => records.set(id, value), getDocFromServer: async id => snapshot(id), runTransaction: async (_, run) => run({ get: async id => snapshot(id), set: (id,v) => records.set(id,v), delete: id => records.delete(id) }) };
  const r = firebase.createRepository({ auth: { requireLogin: async () => ({ uid, name: '회원', admin: false }) }, connect: async () => ({sdk,db:{}}) });
  const post = await r.create({ category:'공지사항',title:'제목',content:'본문',imageUrl:'' });
  uid = 'stranger'; await assert.rejects(r.update(post.id,{ title:'변경' }), /작성자/); await assert.rejects(r.remove(post.id), /작성자/);
  uid = 'owner'; const changed = await r.update(post.id,{title:'변경',authorUid:'stranger'});
  assert.equal(changed.authorUid,'owner'); assert.equal(changed.createdAt,post.createdAt);
});
test('Q&A metadata never exposes a private title/body/answer; owner check requires UID', async () => {
  const common = (await import('../src/services/qna-common.js')).default;
  const question = { category:'기타 문의',title:'비밀 제목',content:'비밀 내용',answer:'비밀 답변',author:'회원',authorUid:'owner',isPublic:false,createdAt:'2026-11-07',updatedAt:'2026-11-07' };
  const metadata = common.metadata(question);
  assert.equal(metadata.title, common.privateTitle); assert.equal(metadata.author, '비공개');
  assert.equal(metadata.content,undefined); assert.equal(metadata.answer,undefined);
  assert.equal(common.isOwner({uid:'other',name:'회원'},question),false);
});
test('React auth preserves protected role/admins authority and drops a stale signed-out profile', async () => {
  const vm = require('node:vm');
  const docs = new Map([['users/member',{name:'회원',role:'admin'}]]);
  const auth = {currentUser:{uid:'member'},authStateReady:async()=>{}};
  let finish;
  const sdk = {doc:(_,collection,id)=>`${collection}/${id}`,getDocFromServer:async key=>({exists:()=>docs.has(key),data:()=>docs.get(key)})};
  const context = {Promise,Error,Set,Map,firebase:{getClient:async()=>({app:{},sdk,db:{}})},sdkAuth:{getAuth:()=>auth}};
  const source = readFileSync('src/services/account.js','utf8').replace("import firebase from './firebase.js';",'').replace("import('firebase/auth')",'Promise.resolve(sdkAuth)').replace('export default account;','globalThis.service=account;');
  vm.runInNewContext(source,context);
  assert.equal((await context.service.getUser()).admin,true);
  docs.get('users/member').role='user'; assert.equal((await context.service.getUser()).admin,false);
  docs.set('admins/member',{enabled:true}); assert.equal((await context.service.getUser()).admin,true);
  sdk.getDocFromServer=key=>new Promise(resolve=>{finish=()=>resolve({exists:()=>true,data:()=>({name:'회원',role:'admin'})})});
  const pending=context.service.getUser();
  while(!finish)await new Promise(resolve=>setImmediate(resolve));
  auth.currentUser=null; finish(); assert.equal(await pending,null);
});
