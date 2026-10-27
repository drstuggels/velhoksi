import test from 'node:test';
import assert from 'node:assert/strict';
import { ImportContainer } from '../worker/container-runtime.mjs';

function container() {
  return {
    images: { importer: 'image:new' }, running: false, image: null, starts: 0, stops: 0,
    async inspect() { assert.ok(this.running, 'Do not wait on inspection before cold startup'); await new Promise(resolve => setTimeout(resolve, 5)); return this.running ? { image: this.image } : null; },
    start(options) { assert.equal(this.running, false); this.starts++; this.running = true; this.image = options.image; assert.equal(options.enableInternet, true); },
    async destroy() { this.stops++; this.running = false; },
    monitor() { return new Promise(() => {}); },
    async setInactivityTimeout(ms) { assert.equal(ms, 35 * 60 * 1000); },
    getTcpPort(port) { assert.equal(port, 8091); return { fetch: async request => new Response(typeof request === 'string' ? 'healthy' : await request.text()) }; },
  };
}
test('concurrent cold requests share one startup and forward their bodies', async () => {
  const backend = container(), runtime = new ImportContainer(backend);
  const responses = await Promise.all(['one', 'two'].map(body => runtime.fetch(new Request('http://container/api/imports', { method: 'POST', body }))));
  assert.deepEqual(await Promise.all(responses.map(response => response.text())), ['one', 'two']);
  assert.equal(backend.starts, 1);
});
test('a stopped container restarts and an existing stale image is replaced', async () => {
  const backend = container(); backend.running = true; backend.image = 'image:old';
  const runtime = new ImportContainer(backend);
  await runtime.fetch(new Request('http://container/status'));
  assert.equal(backend.stops, 1); assert.equal(backend.image, 'image:new');
  backend.running = false;
  await runtime.fetch(new Request('http://container/status'));
  assert.equal(backend.starts, 2);
});
test('a failed startup can be retried', async () => {
  const backend = container(), start = backend.start;
  backend.start = () => { backend.start = start; throw Error('temporarily unavailable'); };
  const runtime = new ImportContainer(backend);
  await assert.rejects(runtime.fetch(new Request('http://container/status')), /temporarily unavailable/);
  const response = await runtime.fetch(new Request('http://container/status'));
  assert.equal(response.status, 200); assert.equal(backend.starts, 1);
});
