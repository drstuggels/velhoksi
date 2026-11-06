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

test('pause pins the live position when the decoder falls back to an older seek, and respects a manual seek', async () => {
  const { dom, root, app, media } = setup();
  let position = 0, bufferedFrom = 0;
  Object.defineProperty(media, 'currentTime', {
    get: () => position,
    set(value) { position = value; bufferedFrom = value; },
  });
  const pause = media.pause.bind(media);
  media.pause = () => {
    pause();
    // Model the delayed paused clock update observed with AAC in WebKit.
    queueMicrotask(() => { position = bufferedFrom; });
  };
  const play = async () => { root.querySelector('#play').click(); await Promise.resolve(); await Promise.resolve(); };
  try {
    app.activate(); await play();
    position = 6.375; bufferedFrom = 6.1;
    await play();
    assert.equal(media.paused, true);
    assert.equal(media.currentTime, 6.375, 'pausing must not fall back to the older decoder position');
    await play();
    assert.equal(media.paused, false);
    assert.equal(media.currentTime, 6.375);
    assert.equal(bufferedFrom, 6.375, 'resume must flush audio retained before the pause position');
    await play();
    root.querySelector('#forward').click();
    await play();
    assert.equal(media.currentTime, 11.375, 'a paused seek must replace the resume position');
  } finally { app.deactivate(); dom.window.close(); }
});

test('loop boundary buttons and shortcuts navigate ranges without starting playback', async () => {
  const { dom, w, root, app, media } = setup();
  const seek = seconds => {
    root.querySelector('#seek').value = String(seconds);
    root.querySelector('#seek').dispatchEvent(new w.Event('input'));
  };
  try {
    app.activate();
    assert.equal(root.querySelector('#loop-back').disabled, true);
    assert.equal(root.querySelector('#loop-forward').disabled, true);
    seek(2); root.querySelector('#add-range').click(); // 2–6
    seek(10); root.querySelector('#add-range').click(); // 10–14
    seek(4); root.querySelector('#loop-back').click(); assert.equal(media.currentTime, 2);
    root.querySelector('#loop-forward').click(); assert.equal(media.currentTime, 6);
    seek(8); root.querySelector('#loop-back').click(); assert.equal(media.currentTime, 6);
    seek(8);
    root.querySelector('.wait-body').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    assert.equal(media.currentTime, 10);
    seek(0); assert.equal(root.querySelector('#loop-back').disabled, true);
    seek(16); assert.equal(root.querySelector('#loop-forward').disabled, true);
    root.querySelector('.mark-loop').click(); // Enable the first range.
    root.querySelector('#loop-forward').click();
    assert.equal(media.currentTime, 6);
    assert.equal(media.paused, true);
    const tab = app.state().tabs[0];
    assert.equal(tab.loop, tab.marks[0].id, 'boundary jumps preserve the enabled loop');
  } finally { app.deactivate(); dom.window.close(); }
});

test('waveform zoom and pan remap seeking and markers without changing playback', async () => {
  const { dom, w, root, app, media } = setup();
  const input = (id, value) => { const field = root.querySelector(id); field.value = String(value); field.dispatchEvent(new w.Event('input')); };
  try {
    app.activate(); input('#seek', 8); root.querySelector('#add-range').click();
    root.querySelector('#wave-zoom-in').click(); root.querySelector('#wave-zoom-in').click();
    assert.equal(root.querySelector('#wave-zoom-value').textContent, '4×');
    assert.equal(Number(root.querySelector('#seek').min), 6);
    assert.equal(Number(root.querySelector('#seek').max), 10);
    assert.equal(root.querySelector('#playhead').style.left, '50%');
    assert.equal(root.querySelector('.marker-track').style.left, '50%');
    input('#wave-pan', 10);
    assert.equal(media.currentTime, 8, 'panning changes only the view');
    assert.equal(root.querySelector('#playhead').hidden, true);
    input('#seek', 12);
    assert.equal(media.currentTime, 12);
    assert.equal(root.querySelector('#playhead').style.left, '50%');
    assert.equal(media.paused, true);
    root.querySelectorAll('[role=tab]')[1].click(); media.onloadedmetadata();
    assert.equal(root.querySelector('#wave-zoom-value').textContent, '1×', 'each file has its own waveform view');
    root.querySelectorAll('[role=tab]')[0].click(); media.onloadedmetadata();
    assert.equal(root.querySelector('#wave-zoom-value').textContent, '4×');
    assert.equal(media.currentTime, 12, 'restoring the view does not overwrite the saved playhead');
    root.querySelector('#wave-zoom-fit').click();
    assert.equal(Number(root.querySelector('#seek').min), 0);
    assert.equal(Number(root.querySelector('#seek').max), 16);
    assert.equal(root.querySelector('#wave-window').hidden, true);
  } finally { app.deactivate(); dom.window.close(); }
});

test('waveform zoom and visible range survive a workspace reload', async () => {
  const factory = new IDBFactory(), first = setup({ factory });
  try {
    await first.app.restored; first.app.activate();
    first.media.currentTime = 8;
    first.root.querySelector('#wave-zoom-in').click();
    first.root.querySelector('#wave-zoom-in').click();
    const pan = first.root.querySelector('#wave-pan'); pan.value = '10'; pan.dispatchEvent(new first.w.Event('input'));
    first.app.deactivate(); await first.app.saved();
  } finally { first.dom.window.close(); }
  const second = setup({ factory, files: [] });
  try {
    await second.app.restored; second.media.onloadedmetadata(); second.app.activate();
    assert.equal(second.root.querySelector('#wave-zoom-value').textContent, '4×');
    assert.equal(second.root.querySelector('#seek').min, '10');
    assert.equal(second.root.querySelector('#seek').max, '14');
    assert.equal(second.media.currentTime, 8);
  } finally { second.app.deactivate(); await second.app.saved(); second.dom.window.close(); }
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
