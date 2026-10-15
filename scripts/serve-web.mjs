/**
 * Tiny zero-dependency static server for previewing the exported web build.
 *
 * Usage:
 *   npx expo export --platform web --output-dir .tmp/web
 *   node scripts/serve-web.mjs .tmp/web 8081
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.tmp/web');
const port = Number(process.argv[3] ?? 8081);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

if (!existsSync(root)) {
  console.error(`No such directory: ${root}`);
  process.exit(1);
}

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  // Contain path traversal: the resolved file must stay inside `root`.
  const candidate = resolve(join(root, normalize(url)));
  if (!candidate.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  const file =
    existsSync(candidate) && statSync(candidate).isFile()
      ? candidate
      : join(root, 'index.html'); // SPA fallback

  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});