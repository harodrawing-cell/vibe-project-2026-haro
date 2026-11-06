const test = require('node:test');
const assert = require('node:assert/strict');
const { createRepository } = require('../js/notice-firebase.js');
function setup() {
  const records = new Map();
  let admin = true, failure = null;
  const snapshot = id => ({ id, exists: () => records.has(id), data: () => records.get(id) });
  const sdk = {
    doc: (_, collection, id) => id,
    collection: () => 'notices',
    getDocsFromServer: async () => ({ docs: [...records.keys()].map(snapshot) }),
    getDocFromServer: async id => snapshot(id),
    setDoc: async (id, post) => records.set(id, post),
    runTransaction: async (_, operation) => operation({
      get: async id => snapshot(id), set: (id, post) => records.set(id, post), delete: id => records.delete(id),
    }),
  };
  const auth = { requireAdmin: async () => { if (!admin) throw new Error('관리자 테스트 모드'); }, getCurrentUserName: async () => '관리자' };
  const repository = createRepository({ auth, connect: async () => { if (failure) throw failure; return { sdk, db: {} }; } });
  return { repository, records, setAdmin: value => { admin = value; }, fail: code => { failure = { code }; } };
}
const input = { category: '공지사항', title: '테스트 제목', content: '본문', imageUrl: 'data:image/webp;base64,YQ==' };
test('Firestore CRUD preserves images, identity, timestamps and category filtering without seeding', async () => {
  const { repository: r, records } = setup();
  await r.seedIfNeeded();
  assert.deepEqual(await r.getList(), []);
  const post = await r.create(input);
  assert.equal(records.size, 1);
  assert.equal((await r.getById(post.id)).imageUrl, input.imageUrl);
  assert.equal((await r.getList({ category: '굿즈' })).length, 0);
  assert.equal((await r.getList({ category: '공지사항' })).length, 1);
  const updated = await r.update(post.id, { title: '수정', author: '위조', createdAt: '위조', id: '위조' });
  assert.equal(updated.id, post.id);
  assert.equal(updated.author, post.author);
  assert.equal(updated.createdAt, post.createdAt);
  assert.equal(updated.imageUrl, input.imageUrl);
  await r.update(post.id, { imageUrl: '' });
  assert.equal((await r.getById(post.id)).imageUrl, '');
  await r.remove(post.id);
  assert.equal(await r.getById(post.id), null);
  await assert.rejects(r.update(post.id, input), /없습니다/);
  await assert.rejects(r.remove(post.id), /없습니다/);
  await assert.rejects(r.getById('../bad'), /ID/);
});
test('writes reject unauthorized, invalid and oversized input before changing data', async () => {
  const s = setup(), r = s.repository;
  await assert.rejects(r.create({ ...input, title: '' }), /제목/);
  await assert.rejects(r.create({ ...input, imageUrl: 'https://example.com/' + 'a'.repeat(950000) }), /저장 한도/);
  assert.equal(s.records.size, 0);
  const post = await r.create(input);
  s.setAdmin(false);
  await assert.rejects(r.create(input), /테스트 모드/);
  await assert.rejects(r.update(post.id, { title: '수정' }), /테스트 모드/);
  await assert.rejects(r.remove(post.id), /테스트 모드/);
  assert.deepEqual(await r.getById(post.id), post);
});
test('connection and permission errors are actionable and never fall back to local data', async () => {
  const s = setup();
  s.fail('permission-denied');
  await assert.rejects(s.repository.getList(), /Firestore 규칙/);
  s.fail('unavailable');
  await assert.rejects(s.repository.create(input), /입력 내용은 유지/);
  assert.equal(s.records.size, 0);
});
