const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

const root = path.resolve(__dirname, '..');
const names = ['notice.html', 'notice-list.html', 'notice-detail.html', 'notice-edit.html', 'notice-write.html'];

test('NOTICE files and all static local asset links resolve from pages/notice', () => {
  assert.deepEqual(fs.readdirSync(root).filter(name => name.endsWith('.html')), ['index.html']);
  for (const name of names) {
    assert.ok(!fs.existsSync(path.join(root, 'pages', name)), 'intermediate path still exists');
    const file = path.join(root, 'pages', 'notice', name);
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|tel:|data:|#)/.test(match[1])) continue;
      const resolved = fileURLToPath(new URL(match[1], pathToFileURL(file)));
      assert.ok(fs.existsSync(resolved), `${name}: missing ${match[1]}`);
    }
    assert.match(html, /href="\.\.\/\.\.\/index\.html#top"/);
    assert.match(html, /src="\.\.\/\.\.\/js\/services\/notice-repository\.js"/);
  }
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /href="\.\/pages\/notice\/notice-list\.html"/);
});

test('preview serves canonical pages and redirects old URLs with queries intact', async () => {
  const server = spawn(process.execPath, ['scripts/preview.cjs'], {
    cwd: root, env: { ...process.env, PORT: '0' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Preview startup timeout')), 10000);
      server.once('error', error => { clearTimeout(timer); reject(error); });
      server.once('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited ${code}`)); });
      server.stdout.on('data', data => {
        const match = String(data).match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
      });
    });
    for (const name of names) {
      const canonical = `/pages/notice/${name}`;
      const page = await fetch(base + canonical);
      assert.equal(page.status, 200);
      const html = await page.text();
      for (const match of html.matchAll(/(?:href|src)="(\.\.\/\.\.\/[^"#?]+)[^"]*"/g)) {
        const resource = await fetch(new URL(match[1], base + canonical), { method: 'HEAD' });
        assert.equal(resource.status, 200, `${name}: ${match[1]}`);
      }
      for (const prefix of ['/', '/pages/']) {
        const query = '?id=existing-id&view=detail&q=%ED%95%98%EB%A1%9C&page=2';
        const response = await fetch(base + prefix + name + query, { redirect: 'manual' });
        assert.equal(response.status, 308);
        assert.equal(response.headers.get('location'), canonical + query);
      }
    }
    assert.equal((await fetch(base + '/pages/notice/notice-detail.html?id=one', { method: 'HEAD' })).status, 200);
    assert.equal((await fetch(base + '/pages/notice/not-found.html')).status, 404);
  } finally {
    const exit = once(server, 'exit');
    server.kill();
    await exit;
  }
});
