import test from 'node:test';
import assert from 'node:assert/strict';
import { importGateway } from '../worker/import-gateway.mjs';

const id = 'a'.repeat(32), token = 'b'.repeat(64);
function request({ method = 'POST', path = '', headers = {}, body = { id, url: 'https://youtube.com/watch?v=example' } } = {}) {
  return new Request(`https://velhoksi.test/api/imports${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Import-Token': token, ...headers }, body: method === 'POST' ? JSON.stringify(body) : undefined });
}
test('gateway strips untrusted upstream headers and returns uncached streamed media', async () => {
  let forwarded;
  const env = { MEDIA_IMPORT: { getByName: name => { assert.equal(name, 'imports-0'); return { fetch: async r => { forwarded = r; return new Response('media', { headers: { 'Content-Type': 'audio/mp4', 'Set-Cookie': 'bad' } }); } }; } } };
  const response = await importGateway(request({ headers: { 'X-Gateway-Token': 'bad', 'X-Import-Owner': 'spoof', 'CF-Connecting-IP': '1.2.3.4' } }), env);
  assert.equal(await response.text(), 'media');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(forwarded.headers.get('X-Gateway-Token'), null);
  assert.equal(forwarded.headers.get('X-Import-Owner'), '1.2.3.4');
  assert.equal(Number(forwarded.headers.get('Content-Length')), new TextEncoder().encode(await forwarded.text()).length);
});
test('invalid requests and exhausted rate limits do not start a container', async () => {
  const env = { MEDIA_IMPORT: { getByName: () => { throw new Error('must not run'); } }, IMPORT_RATE_LIMIT: { limit: async () => ({ success: false }) } };
  for (const [req, status] of [
    [request({ headers: { Origin: 'https://elsewhere.test' } }), 403],
    [request({ headers: { 'X-Import-Token': 'bad' } }), 403],
    [request({ body: { id, url: 'x'.repeat(5000) } }), 413],
    [request({ body: { id, url: 'file:///etc/passwd' } }), 400],
    [request({ body: { id, url: 'https://user:secret@example.org/media.mp3' } }), 400],
    [request({ body: { id, url: 'https://example.org:8091/media.mp3' } }), 400],
    [request({ method: 'GET' }), 405],
    [request({ path: `/${id}/not-real`, method: 'GET' }), 404],
    [request(), 429],
  ]) assert.equal((await importGateway(req, env)).status, status);
});
