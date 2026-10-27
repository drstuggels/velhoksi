import test from 'node:test';
import assert from 'node:assert/strict';
import { ImportClient, type ImportJob } from '../src/import-client.ts';

const source = { inputUrl: 'https://open.spotify.com/track/test', sourceUrl: 'https://youtube.com/watch?v=test', sourceId: 'test', provider: 'spotify', title: 'Remember', artist: 'Hank Mobley', matchedTitle: 'Remember', importedAt: '2026-10-27T00:00:00Z' };
const ready = { id: 'a'.repeat(32), state: 'ready', message: 'ready', bytes: 4, filename: 'Remember.m4a', mime: 'audio/mp4', provenance: source } as ImportJob;
function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } } as Storage;
}
test('downloads bytes, preserves provenance, acknowledges only after local handoff', async () => {
  const saved = storage(); let received = false; const calls: string[] = [];
  const fetcher = async (url: unknown, init?: RequestInit) => {
    const path = String(url); calls.push(`${init?.method} ${path}`);
    assert.equal(init?.cache, 'no-store');
    if (init?.method === 'DELETE') { assert.ok(received); return Response.json({}); }
    if (path.endsWith('/file')) return new Response('data');
    return Response.json(ready);
  };
  const client = new ImportClient(() => {}, async (file, provenance) => {
    assert.equal(await file.text(), 'data'); assert.deepEqual(provenance, source); received = true;
  }, saved, fetcher as typeof fetch);
  await client.begin('https://youtube.com/watch?v=test');
  assert.ok(received); assert.equal(saved.getItem('wait:pending-import'), null);
  assert.equal(calls.filter(c => c.startsWith('DELETE')).length, 1);
});
test('cancelled resolution cannot resurrect a job or add media', async () => {
  let resolve!: (response: Response) => void;
  const fetcher = async (_url: unknown, init?: RequestInit) => init?.method === 'DELETE' ? Response.json({}) : new Promise<Response>(r => { resolve = r; });
  const states: (ImportJob | null)[] = []; let added = 0;
  const client = new ImportClient(job => states.push(job), async () => { added++; }, storage(), fetcher as typeof fetch);
  const beginning = client.begin('https://youtube.com/watch?v=test');
  await new Promise(r => setTimeout(r, 0));
  await client.cancel(); resolve(Response.json(ready)); await beginning;
  assert.equal(added, 0); assert.equal(states.at(-1), null);
});
test('truncated downloads stay resumable and never reach the player', async () => {
  const saved = storage(); let added = 0; let error = '';
  const fetcher = async (url: unknown) => String(url).endsWith('/file') ? new Response('bad') : Response.json(ready);
  const client = new ImportClient((_job, message) => { if (message) error = message; }, async () => { added++; }, saved, fetcher as typeof fetch);
  await client.begin('https://youtube.com/watch?v=test');
  assert.equal(added, 0); assert.match(error, /interrupted/); assert.ok(saved.getItem('wait:pending-import'));
});

test('static-only development servers explain how to enable imports', async () => {
  let error = '';
  const client = new ImportClient((_job, message) => { if (message) error = message; }, async () => {
    assert.fail('A static server cannot provide imported media');
  }, storage(), (async () => new Response('<html>Unsupported method</html>', { status: 501 })) as typeof fetch);
  await client.begin('https://youtube.com/watch?v=test');
  assert.match(error, /restart it with pnpm dev/);
});

test('cancel aborts a handoff waiting for workspace restoration', async () => {
  let continueRestore!: () => void; let entered!: () => void;
  const enteredHandoff = new Promise<void>(resolve => { entered = resolve; });
  let added = 0;
  const fetcher = async (url: unknown, init?: RequestInit) => init?.method === 'DELETE' ? Response.json({}) : String(url).endsWith('/file') ? new Response('data') : Response.json(ready);
  const client = new ImportClient(() => {}, async (_file, _source, _id, signal) => {
    entered();
    await new Promise<void>(resolve => { continueRestore = resolve; });
    signal.throwIfAborted(); added++;
  }, storage(), fetcher as typeof fetch);
  const beginning = client.begin('https://youtube.com/watch?v=test');
  await enteredHandoff; await client.cancel(); continueRestore(); await beginning;
  assert.equal(added, 0);
});
