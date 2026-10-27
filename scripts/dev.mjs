import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { Readable } from 'node:stream';
import { importGateway } from '../worker/import-gateway.mjs';

const root = resolve(import.meta.dirname, '..');
const port = Number(process.env.VELHOKSI_PORT || 8087);
const importPort = Number(process.env.VELHOKSI_IMPORT_PORT || 8091);
const python = resolve(root, 'media-import/.venv/bin/python');
if (!existsSync(python)) {
  console.error('Set up the importer first: uv venv media-import/.venv --python 3.12 && uv pip install --python media-import/.venv/bin/python -r media-import/requirements.txt');
  process.exit(1);
}
const child = spawn(python, ['media-import/server.py'], { cwd: root, stdio: 'inherit', env: { ...process.env, IMPORT_DATA: resolve(root, 'media-import/.data'), IMPORT_BIND: '127.0.0.1', PORT: String(importPort) } });
child.on('exit', code => { if (code) process.exit(code); });
const allowed = (await readFile(resolve(root, '.assetsignore'), 'utf8')).split('\n').filter(l => l.startsWith('!')).map(l => l.slice(1));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.flac': 'audio/flac', '.opus': 'audio/ogg', '.txt': 'text/plain' };
const env = { MEDIA_IMPORT: { getByName: () => ({ fetch: request => {
  const u = new URL(request.url); u.host = `127.0.0.1:${importPort}`;
  return fetch(new Request(u, request));
} }) } };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${port}`}`);
    if (url.pathname.startsWith('/api/imports')) {
      const init = { method: req.method, headers: req.headers };
      if (!['GET', 'HEAD'].includes(req.method)) { init.body = Readable.toWeb(req); init.duplex = 'half'; }
      const response = await importGateway(new Request(url, init), env);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) Readable.fromWeb(response.body).pipe(res); else res.end();
      return;
    }
    const path = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = resolve(root, `.${path}`);
    if (!file.startsWith(root + sep) || !allowed.some(p => p.endsWith('/') ? path.startsWith(p) : p === path)) { res.writeHead(404); res.end(); return; }
    const info = await stat(file);
    if (!info.isFile()) throw new Error();
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
    createReadStream(file).pipe(res);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
server.on('error', error => { console.error(error.message); child.kill('SIGTERM'); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Wait + media importer: http://127.0.0.1:${port}/?mode=wait`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { child.kill('SIGTERM'); server.close(); process.exit(0); });
