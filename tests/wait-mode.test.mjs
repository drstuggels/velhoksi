import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { IDBFactory } from 'fake-indexeddb';
import { createWait } from '../wait/player.mjs';

function setup({ factory, files = [new File(['tone'], 'one.wav', { type: 'audio/wav' }), new File(['tone'], 'two.wav', { type: 'audio/wav' })] } = {}) {
  globalThis.indexedDB = factory;
  const dom = new JSDOM('<input id="volume" value="parent"><section id="wait"></section>', { url: 'https://velhoksi.test/', pretendToBeVisual: true });
  const w = dom.window;
  for (const name of ['window', 'document', 'localStorage', 'MutationObserver', 'Event']) globalThis[name] = name === 'window' ? w : w[name];
  globalThis.innerWidth = 1000;
  globalThis.getComputedStyle = w.getComputedStyle.bind(w);
  globalThis.requestAnimationFrame = w.requestAnimationFrame.bind(w);
  globalThis.cancelAnimationFrame = w.cancelAnimationFrame.bind(w);
  globalThis.ResizeObserver = class { observe() {} };
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.HTMLMediaElement.prototype.load = function () {};
  w.HTMLMediaElement.prototype.pause = function () { this._paused = true; this.dispatchEvent(new w.Event('pause')); };
  w.HTMLMediaElement.prototype.play = async function () { this._paused = false; this.dispatchEvent(new w.Event('play')); };
  Object.defineProperty(w.HTMLMediaElement.prototype, 'paused', { get() { return this._paused !== false; } });
  globalThis.AudioContext = class {
    state = 'running'; currentTime = 0; sampleRate = 48000; destination = {};
    createGain() { return { connect() {}, gain: { value: 1, cancelAndHoldAtTime() {}, linearRampToValueAtTime() {} } }; }
    createMediaElementSource() { return { connect() {} }; }
    async close() { this.state = 'closed'; }
  };
  let volume = .65, exits = 0;
  const host = document.querySelector('#wait');
  const app = createWait(host, { onExit: () => { exits++; app.deactivate(); }, volume: () => volume, onVolume: value => { volume = value; window.dispatchEvent(new w.Event('velhoksi:volume')); } });
  const root = host.shadowRoot;
  const media = root.querySelector('video');
  Object.defineProperties(media, { duration: { value: 16 }, videoWidth: { value: 0 }, readyState: { value: 4 } });
  const input = root.querySelector('#file-input');
  // Node's File produces valid local blob URLs without a network or real decoder.
  Object.defineProperty(input, 'files', { value: files });
  input.dispatchEvent(new w.Event('change'));
  media.onloadedmetadata?.();
  return { dom, w, root, app, media, volume: () => volume, exits: () => exits };
}

test('wait shares volume without touching parent controls, and preserves files/ranges while inactive', async () => {
  const { dom, w, root, app, media, volume, exits } = setup();
  try {
    app.activate();
    const slider = root.querySelector('#volume'); slider.value = '.32'; slider.dispatchEvent(new w.Event('input'));
    assert.equal(volume(), .32); assert.equal(media.volume, .32);
    assert.equal(document.querySelector('#volume').value, 'parent');
    root.querySelector('#add-range').click();
    root.querySelector('#play').click(); await Promise.resolve(); await Promise.resolve();
    assert.equal(app.state().paused, false);
    root.querySelector('#exit-mode').click();
    assert.equal(exits(), 1); assert.equal(app.state().paused, true);
    app.activate();
    assert.equal(app.state().tabs.length, 2); assert.equal(app.state().tabs[0].marks.length, 1);
    assert.equal(app.state().paused, true, 'returning must not autoplay');
  } finally { app.deactivate(); dom.window.close(); }
});

test('leaving wait while the audio device resumes cannot start hidden playback', async () => {
  const { dom, root, app } = setup();
  try {
    let resume;
    const Context = globalThis.AudioContext;
    globalThis.AudioContext = class extends Context { state = 'suspended'; resume() { return new Promise(resolve => { resume = () => { this.state = 'running'; resolve(); }; }); } };
    app.activate(); root.querySelector('#play').click(); app.deactivate(); resume();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    assert.equal(app.state().paused, true);
    assert.equal(app.state().tabs.length, 2);
  } finally { app.deactivate(); dom.window.close(); }
});

test('the deployable player includes an intact codec and resolves its worker under wait', async () => {
  const { readFile, readdir, stat } = await import('node:fs/promises');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const files = await readdir(new URL('../wait/', import.meta.url));
  const converter = await readFile(new URL(`../wait/${files.find(name => name.startsWith('convert-'))}`, import.meta.url), 'utf8');
  const workerPath = converter.match(/"(\/wait\/assets\/worker-[^"]+\.js)"/);
  assert.ok(workerPath, 'worker must resolve from the deployed mode directory');
  assert.ok((await stat(new URL(`..${workerPath[1]}`, import.meta.url))).size > 0);
  const parts = await Promise.all([0, 1].map(part => readFile(new URL(`../wait/codec/core-${part}.bin`, import.meta.url))));
  assert.ok(parts.every(part => part.length < 20 * 1024 * 1024));
  assert.deepEqual(Buffer.concat(parts), await readFile(require.resolve('@ffmpeg/core/wasm')));
});


test('dropping onto filled media appends a tab and restores all files and edits after reload', async () => {
  const factory = new IDBFactory();
  const first = setup({ factory });
  await first.app.restored;
  first.app.activate(); first.root.querySelector('#add-range').click();
  const original = first.app.state().activeTab;
  const drop = new first.w.Event('drop', { bubbles: true, composed: true, cancelable: true });
  Object.defineProperty(drop, 'dataTransfer', { value: { types: ['Files'], files: [new File(['new media'], 'three.wav', { type: 'audio/wav' })] } });
  first.root.querySelector('#stage').dispatchEvent(drop);
  first.media.onloadedmetadata();
  assert.equal(first.app.state().tabs.length, 3);
  assert.notEqual(first.app.state().activeTab, original);
  assert.equal(first.app.state().tabs[0].marks.length, 1);
  await first.app.saved(); first.app.deactivate(); await first.app.saved(); first.dom.window.close();
  const second = setup({ factory, files: [] });
  try {
    await second.app.restored; second.media.onloadedmetadata(); second.app.activate();
    assert.deepEqual(second.app.state().tabs.map(tab => tab.name), ['one.wav', 'two.wav', 'three.wav']);
    assert.equal(second.app.state().tabs[0].marks.length, 1);
    assert.equal(second.app.state().tabs.find(tab => tab.id === second.app.state().activeTab).name, 'three.wav');
    assert.equal(second.app.state().paused, true);
    second.root.querySelector('[aria-label="close three.wav"]').click(); await second.app.saved();
  } finally { second.app.deactivate(); await second.app.saved(); second.dom.window.close(); }
  const third = setup({ factory, files: [] });
  try { await third.app.restored; assert.equal(third.app.state().tabs.length, 2); await third.app.resetSaved(); }
  finally { third.app.deactivate(); await third.app.saved(); third.dom.window.close(); }
  const fourth = setup({ factory, files: [] });
  try { await fourth.app.restored; assert.equal(fourth.app.state().tabs.length, 0, 'app reset removes saved media'); }
  finally { fourth.app.deactivate(); await fourth.app.saved(); fourth.dom.window.close(); }
});
