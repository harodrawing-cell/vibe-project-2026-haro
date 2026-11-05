const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8080);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405).end();
    return;
  }
  try {
    const requestUrl = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(requestUrl.pathname);
    // Keep old root URLs and the intermediate pages/ URLs working after relocation.
    // Other static hosts need equivalent redirect rules (see README).
    const legacyNotice = pathname.match(/^\/(?:pages\/)?(notice(?:-(?:list|detail|edit|write))?\.html)$/);
    if (legacyNotice) {
      response.writeHead(308, {
        Location: `/pages/notice/${legacyNotice[1]}${requestUrl.search}`,
        'Cache-Control': 'no-store',
      }).end();
      return;
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => part.startsWith('.'))) {
      response.writeHead(403).end();
      return;
    }
    const realFile = await fs.realpath(file);
    const realRelative = path.relative(root, realFile);
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
      response.writeHead(403).end();
      return;
    }
    const data = await fs.readFile(realFile);
    response.writeHead(200, {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is in use. Set PORT to another port and try again.`
    : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`HARO preview: http://127.0.0.1:${server.address().port}/ (Ctrl+C to stop)`);
});
