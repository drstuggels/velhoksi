import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { WorkspaceStorage, type Workspace } from '../src/storage.ts';

function workspace(): Workspace {
  const file = new File(['original data'], 'practice.avi', { type: 'video/avi', lastModified: 123 });
  return { active: 'a', tabs: [{ id: 'a', file, playbackFile: new File(['converted data'], 'practice.mp4', { type: 'video/mp4' }), position: 1.25, speed: 75, volume: .4, muted: true, duration: 4, view: { zoom: 2, x: .1, y: 0 }, selected: 'm', loop: 'm', marks: [{ id: 'm', kind: 'range', name: 'phrase', start: 1, end: 2 }] }] };
}

test('IndexedDB retains file bytes, conversion, active tab and practice edits', async () => {
  const factory = new IDBFactory(), storage = new WorkspaceStorage('test', factory), before = workspace();
  await storage.load(); await storage.save(before);
  const after = await new WorkspaceStorage('test', factory).load();
  assert.equal(after.tabs[0].file.name, 'practice.avi'); assert.equal(after.tabs[0].file.lastModified, 123);
  assert.equal(await after.tabs[0].file.text(), 'original data');
  assert.equal(await after.tabs[0].playbackFile.text(), 'converted data');
  assert.equal(after.active, 'a'); assert.equal(after.tabs[0].position, 1.25);
  assert.deepEqual(after.tabs[0].marks, before.tabs[0].marks); assert.deepEqual(after.tabs[0].view, before.tabs[0].view);
});

test('queued saves snapshot edits and closing a tab removes its media', async () => {
  const factory = new IDBFactory(), storage = new WorkspaceStorage('test', factory), state = workspace();
  await storage.load();
  const first = storage.save(state); state.tabs[0].marks[0].name = 'edited';
  const second = storage.save(state), removed = storage.save({ active: null, tabs: [] });
  await Promise.all([first, second, removed]);
  assert.deepEqual(await new WorkspaceStorage('test', factory).load(), { active: null, tabs: [] });
  const db = await new Promise<IDBDatabase>(resolve => { const r = factory.open('test'); r.onsuccess = () => resolve(r.result); });
  const count = await new Promise<number>(resolve => { const r = db.transaction('files').objectStore('files').count(); r.onsuccess = () => resolve(r.result); });
  assert.equal(count, 0); db.close();
});

test('a failed media write preserves the last committed workspace', async () => {
  const factory = new IDBFactory(), storage = new WorkspaceStorage('test', factory), state = workspace();
  await storage.load(); await storage.save(state);
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) {
    if (this.name === 'files') throw new DOMException('full', 'QuotaExceededError');
    return put.apply(this, args);
  };
  try {
    state.tabs[0].file = new File(['replacement'], 'new.avi'); state.tabs[0].position = 3;
    await assert.rejects(storage.save(state), { name: 'QuotaExceededError' });
  } finally { IDBObjectStore.prototype.put = put; }
  const after = await new WorkspaceStorage('test', factory).load();
  assert.equal(await after.tabs[0].file.text(), 'original data'); assert.equal(after.tabs[0].position, 1.25);
});

test('import provenance and id survive reload alongside existing local-file tabs', async () => {
  const factory = new IDBFactory(), storage = new WorkspaceStorage('imports', factory), state = workspace();
  state.tabs[0].importId = 'import-id';
  state.tabs[0].provenance = { inputUrl: 'https://open.spotify.com/track/example', sourceUrl: 'https://youtube.com/watch?v=example', sourceId: 'example', provider: 'spotify', title: 'Remember', artist: 'Hank Mobley', matchedTitle: 'Remember', importedAt: '2026-10-27T00:00:00Z' };
  await storage.load(); await storage.save(state);
  const restored = await new WorkspaceStorage('imports', factory).load();
  assert.deepEqual(restored.tabs[0].provenance, state.tabs[0].provenance);
  assert.equal(restored.tabs[0].importId, 'import-id');
});
