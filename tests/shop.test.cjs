const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRepository, STORAGE_KEY } = require('../js/shop-repository.js');
const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/products.json'), 'utf8'));
function fixture(data = structuredClone(source)) {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const repository = createRepository({ getStorage: () => storage, loadCatalog: async () => data });
  return { repository, storage, data };
}
test('catalog matches all eight original GOODS cards and uses only documented prices', async () => {
  const { repository } = fixture();
  const data = await repository.getCatalog();
  assert.equal(data.products.length, 8);
  assert.equal(data.products.filter(product => product.price === null).length, 7);
  assert.equal(data.products.find(product => product.id === 'haro-note').price, 4500);
  assert.equal(data.shipping.fee, 3000);
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const product of data.products) {
    assert.ok(html.includes(`data-product-id="${product.id}"`));
    assert.ok(html.includes(product.images[0]));
    assert.ok(html.includes(product.name));
    for (const image of product.images) assert.ok(fs.existsSync(path.join(__dirname, '..', image)));
  }
});
test('same product and option merge quantities; prices are resolved from JSON after reload', async () => {
  const { repository: repo, storage, data } = fixture();
  let notifications = 0;
  repo.subscribe(() => notifications++);
  await Promise.all([repo.add('haro-note', 'white-105-148', 2), repo.add('haro-note', 'white-105-148', 1)]);
  const reload = createRepository({ getStorage: () => storage, loadCatalog: async () => data });
  const cart = await reload.getCart();
  assert.equal(cart.items.length, 1);
  assert.equal(cart.quantity, 3);
  assert.equal(cart.subtotal, 13500);
  assert.equal(cart.shipping, 3000);
  assert.equal(cart.total, 16500);
  assert.equal(repo.getCount(), 3);
  assert.equal(notifications, 2);
  assert.deepEqual(Object.keys(JSON.parse(storage.getItem(STORAGE_KEY))[0]).sort(), ['productId', 'optionId', 'quantity'].sort());
});
test('different valid options are separate cart lines', async () => {
  const data = structuredClone(source);
  data.products.find(product => product.id === 'haro-note').options.push({ id: 'fixture-option', label: 'Test-only option' });
  const { repository: repo } = fixture(data);
  await repo.add('haro-note', 'white-105-148', 1);
  await repo.add('haro-note', 'fixture-option', 2);
  assert.equal((await repo.getCart()).items.length, 2);
  assert.equal((await repo.getCart()).quantity, 3);
});
test('quantity updates, deletion and empty-cart totals work', async () => {
  const { repository: repo } = fixture();
  await repo.add('haro-note', 'white-105-148', 1);
  await repo.setQuantity('haro-note', 'white-105-148', 4);
  assert.equal((await repo.getCart()).total, 21000);
  await repo.remove('haro-note', 'white-105-148');
  assert.deepEqual(await repo.getCart(), { items: [], quantity: 0, subtotal: 0, shipping: 0, total: 0, hasUnavailable: false });
  assert.equal(repo.getCount(), 0);
});
test('unknown price, unknown products/options and invalid quantities never write', async () => {
  const { repository: repo, storage } = fixture();
  await assert.rejects(repo.add('lazy-sticker', 'default', 1), /가격/);
  await assert.rejects(repo.add('missing', 'default', 1), /찾을 수 없습니다/);
  await assert.rejects(repo.add('haro-note', 'missing', 1), /옵션/);
  for (const quantity of [0, -1, 1.5, 100, NaN]) await assert.rejects(repo.add('haro-note', 'white-105-148', quantity), /수량/);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  await repo.add('haro-note', 'white-105-148', 99);
  await assert.rejects(repo.add('haro-note', 'white-105-148', 1), /수량/);
  assert.equal(repo.getCount(), 99);
});
test('storage failures and corrupt JSON preserve existing data', async () => {
  const { repository: repo, storage } = fixture();
  await repo.add('haro-note', 'white-105-148', 1);
  const before = storage.getItem(STORAGE_KEY);
  const write = storage.setItem;
  storage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(repo.setQuantity('haro-note', 'white-105-148', 2), /저장하지 못했습니다/);
  assert.equal(storage.getItem(STORAGE_KEY), before);
  storage.setItem = write;
  storage.setItem(STORAGE_KEY, '{bad');
  await assert.rejects(repo.getCart(), /원본 데이터/);
  assert.equal(storage.getItem(STORAGE_KEY), '{bad');
});
test('unavailable saved products stay removable and do not produce fabricated totals', async () => {
  const { repository: repo, storage } = fixture();
  storage.setItem(STORAGE_KEY, JSON.stringify([{ productId: 'gone', optionId: 'gone', quantity: 2 }]));
  const cart = await repo.getCart();
  assert.equal(cart.hasUnavailable, true);
  assert.equal(cart.total, 0);
  assert.equal(cart.items[0].available, false);
  await repo.remove('gone', 'gone');
  assert.equal(repo.getCount(), 0);
});
test('catalog load failure can be retried without overwriting saved cart', async () => {
  const { storage } = fixture();
  let attempts = 0;
  const repo = createRepository({ getStorage: () => storage, loadCatalog: async () => { if (++attempts === 1) throw new Error('offline'); return source; } });
  await assert.rejects(repo.getCatalog(), /offline/);
  assert.equal((await repo.getCatalog()).products.length, 8);
});
