const test = require('node:test');
const assert = require('node:assert/strict');
const { createRepository, STORAGE_KEYS } = require('../js/notice-repository.js');
const { createAuth } = require('../js/notice-auth.js');
const common = require('../js/notice-common.js');
function memory() {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
}
function fixture() {
  const storage = memory(), session = memory();
  storage.setItem(STORAGE_KEYS.CATEGORY_SAMPLES, '1');
  const auth = createAuth(() => session);
  const repository = createRepository({ getStorage: () => storage, auth });
  return { storage, session, auth, repository };
}
const input = { category: '굿즈', title: 'New notice', content: 'New content', imageUrl: '' };
test('all repository interfaces return Promises; admin is required for all mutations', async () => {
  const { repository: repo, auth } = fixture();
  const result = repo.getList({});
  assert.ok(result instanceof Promise);
  const [post] = await result;
  await assert.rejects(repo.create(input), /관리자/);
  await assert.rejects(repo.update(post.id, input), /관리자/);
  await assert.rejects(repo.remove(post.id), /관리자/);
  await auth.devSetAdmin(true);
  await repo.update(post.id, input);
  await auth.devSetAdmin(false);
  await assert.rejects(repo.update(post.id, input), /관리자/);
});
test('legacy records migrate with ID, author, dates, body and original image preserved', async () => {
  const { repository: repo, storage } = fixture();
  const legacy = { id: 'old-id', category: '공지사항', title: '기존 글', body: '기존 본문\n둘째 줄', author: '기존 작성자', image: { name: 'old.png', src: 'data:image/png;base64,AAAA' }, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: null };
  storage.setItem(STORAGE_KEYS.LEGACY, JSON.stringify([legacy]));
  const post = await repo.getById('old-id');
  assert.equal(post.content, legacy.body);
  assert.equal(post.imageUrl, legacy.image.src);
  assert.equal(post.author, legacy.author);
  assert.equal(post.updatedAt, legacy.createdAt);
  assert.deepEqual(Object.keys(post).sort(), ['id','category','title','content','author','imageUrl','createdAt','updatedAt'].sort());
  assert.equal(storage.getItem(STORAGE_KEYS.LEGACY), JSON.stringify([legacy]));
});
test('update preserves immutable fields and supports image keep/replace/remove plus partial changes', async () => {
  const { repository: repo, auth, storage } = fixture();
  await auth.devSetAdmin(true);
  const post = await repo.create({ ...input, imageUrl: 'data:image/webp;base64,AAAA' });
  await new Promise(resolve => setTimeout(resolve, 5));
  const next = await repo.update(post.id, { title: 'Updated', id: 'wrong', author: 'wrong', createdAt: 'wrong' });
  assert.equal(next.id, post.id);
  assert.equal(next.author, post.author);
  assert.equal(next.createdAt, post.createdAt);
  assert.notEqual(next.updatedAt, post.updatedAt);
  assert.equal(next.imageUrl, post.imageUrl);
  await repo.update(post.id, { imageUrl: 'data:image/webp;base64,BBBB' });
  assert.equal((await repo.getById(post.id)).imageUrl, 'data:image/webp;base64,BBBB');
  await repo.update(post.id, { imageUrl: '' });
  assert.equal((await repo.getById(post.id)).imageUrl, '');
  const reload = createRepository({ getStorage: () => storage, auth });
  assert.equal((await reload.getById(post.id)).title, 'Updated');
});
test('whitespace and invalid values never save; missing IDs return null or reject mutations', async () => {
  const { repository: repo, auth, storage } = fixture();
  await auth.devSetAdmin(true);
  await repo.seedIfNeeded();
  const raw = storage.getItem(STORAGE_KEYS.POSTS);
  for (const patch of [{ title: '  ' }, { content: '\n ' }, { category: 'invalid' }, { imageUrl: 'javascript:alert(1)' }, { title: 'a'.repeat(121) }]) {
    await assert.rejects(repo.create({ ...input, ...patch }));
  }
  assert.equal(storage.getItem(STORAGE_KEYS.POSTS), raw);
  assert.equal(await repo.getById('missing'), null);
  await assert.rejects(repo.update('missing', input), /없습니다/);
  await assert.rejects(repo.remove('missing'), /없습니다/);
});
test('category filtering, concurrent creates and deletion keep data consistent without reseeding', async () => {
  const { repository: repo, auth, storage } = fixture();
  await auth.devSetAdmin(true);
  await Promise.all(Array.from({ length: 12 }, (_, i) => repo.create({ ...input, title: 'Notice ' + i })));
  assert.equal((await repo.getList({})).length, 13);
  assert.equal((await repo.getList({ category: '굿즈' })).length, 12);
  for (const post of await repo.getList({})) await repo.remove(post.id);
  assert.deepEqual(await repo.getList({}), []);
  storage.removeItem(STORAGE_KEYS.POSTS);
  await repo.seedIfNeeded();
  assert.deepEqual(await repo.getList({}), []);
});
test('quota failures preserve data; invalid JSON and legacy data are never overwritten', async () => {
  const { repository: repo, auth, storage } = fixture();
  await auth.devSetAdmin(true);
  const [post] = await repo.getList({});
  const before = storage.getItem(STORAGE_KEYS.POSTS);
  const setItem = storage.setItem;
  storage.setItem = () => { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; };
  await assert.rejects(repo.update(post.id, input), /저장 공간이 부족/);
  assert.equal(storage.getItem(STORAGE_KEYS.POSTS), before);
  storage.setItem = setItem;
  storage.setItem(STORAGE_KEYS.POSTS, '{broken');
  await assert.rejects(repo.getList({}), /보존/);
  assert.equal(storage.getItem(STORAGE_KEYS.POSTS), '{broken');
  const legacy = fixture();
  legacy.storage.setItem(STORAGE_KEYS.LEGACY, '{bad');
  await assert.rejects(legacy.repository.getList({}), /이전하지 못했습니다/);
  assert.equal(legacy.storage.getItem(STORAGE_KEYS.POSTS), null);
});
test('input file validation rejects unsupported, empty and oversized images', () => {
  for (const file of [{type:'image/svg+xml',size:1},{type:'image/png',size:0},{type:'image/webp',size:5*1024*1024+1}]) assert.throws(() => common.validateFile(file));
  assert.doesNotThrow(() => common.validateFile({type:'image/jpeg',size:5*1024*1024}));
});

test('requested category samples add three each once, preserving existing records and deletions', async () => {
  const { repository: repo, auth, storage } = fixture();
  storage.removeItem(STORAGE_KEYS.CATEGORY_SAMPLES);
  const posts = await repo.getList({});
  assert.equal(posts.length, 13);
  for (const category of common.categories) {
    const samples = posts.filter(post => post.category === category && post.title.startsWith('[샘플]'));
    assert.equal(samples.length, 3);
    assert.ok(samples.every(post => post.content.includes('샘플 게시글')));
  }
  const original = posts.find(post => !post.title.startsWith('[샘플]'));
  const reload = createRepository({ getStorage: () => storage, auth });
  assert.equal((await reload.getList({})).length, 13);
  assert.deepEqual(await reload.getById(original.id), original);
  await auth.devSetAdmin(true);
  await repo.remove(posts[0].id);
  assert.equal((await reload.getList({})).length, 12);
  for (const post of await repo.getList({})) await repo.remove(post.id);
  assert.deepEqual(await reload.getList({}), []);
});