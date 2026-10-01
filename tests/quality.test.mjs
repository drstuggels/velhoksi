import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { recordingFor, supportsOpus } from '../ear-training/quality.mjs';
import { SampleEngine } from '../ear-training/audio.mjs';

const region = { file: 'note.flac', root: 60, low: 36, high: 84, velLow: 1, velHigh: 127, offset: .02 };
const catalog = {
  files: { 'note.flac': { bytes: 1000 } },
  qualities: { 'note.flac': { variants: {
    balanced: { file: 'opus/balanced/note.opus', bytes: 200 },
    high: { file: 'opus/high/note.opus', bytes: 400 },
    saver: { file: 'opus/saver/note.opus', bytes: 1200 },
  } } },
  instruments: { piano: { regions: [region], releaseRegions: [region] } },
};
const settings = { instrument: 'piano', velocity: 78, quality: 'balanced' };
const engineFor = () => {
  const engine = new SampleEngine();
  engine.manifest = async () => catalog;
  return engine;
};

test('quality selection never increases a recording’s download size', () => {
  assert.equal(recordingFor(catalog, 'note.flac', 'balanced').bytes, 200);
  for (const quality of ['original', 'saver', 'unknown']) {
    assert.equal(recordingFor(catalog, 'note.flac', quality).file, 'note.flac');
  }
  assert.equal(recordingFor(catalog, 'note.flac', 'balanced', false).file, 'note.flac');
  assert.equal(recordingFor({ files: catalog.files }, 'note.flac', 'balanced').file, 'note.flac');
});

test('Opus capability is decoded once, and a failed probe falls back', async t => {
  let probes = 0;
  const previous = globalThis.OfflineAudioContext;
  globalThis.OfflineAudioContext = class {
    async decodeAudioData(bytes) {
      probes++;
      assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'OggS');
      return { length: 960 };
    }
  };
  t.after(() => { globalThis.OfflineAudioContext = previous; });
  assert.deepEqual(await Promise.all([supportsOpus(), supportsOpus()]), [true, true]);
  assert.equal(probes, 1);
  globalThis.OfflineAudioContext = class { async decodeAudioData() { throw new Error('unsupported'); } };
  const unsupported = await import('../ear-training/quality.mjs?unsupported');
  assert.equal(await unsupported.supportsOpus(), false);
});

test('derived loops use the decoded variant identity; FLAC fallback preserves mapping', async () => {
  const engine = engineFor();
  const loopSettings = { ...settings, instrument: 'pipe-organ' };
  engine.manifest = async () => ({ ...catalog, instruments: { 'pipe-organ': { family: 'organs', sustainLoop: 'crossfade',
    regions: [{ ...region, loopStart: .1, loopEnd: .8, loopCrossfade: .06 }] } } });
  const loaded = [], derived = [];
  engine.buffer = async file => { loaded.push(file); return { file }; };
  engine.sustainedBuffer = (file, buffer) => { derived.push(file); return buffer; };
  const [balanced] = await engine.prepare([60], loopSettings);
  assert.equal(balanced.layers[0].region.file, 'opus/balanced/note.opus');
  assert.deepEqual(derived, ['opus/balanced/note.opus']);
  assert.equal(region.file, 'note.flac', 'the original mapping stays immutable');
  engine.buffer = async file => {
    loaded.push(file);
    if (file.endsWith('.opus')) throw new Error('unavailable');
    return { file };
  };
  const [fallback] = await engine.prepare([60], loopSettings);
  assert.equal(fallback.layers[0].region.file, 'note.flac');
  assert.equal(fallback.layers[0].offset, .02);
  assert.ok(loaded.includes('note.flac'));
  engine.buffer = async () => { throw new DOMException('cancelled', 'AbortError'); };
  await assert.rejects(engine.prepare([60], loopSettings), { name: 'AbortError' });
});

test('offline inventory separates selected-quality completion from total disk use', async t => {
  const previous = globalThis.caches;
  const base = new URL('../audio/samples/', import.meta.url);
  globalThis.caches = { open: async () => ({ keys: async () => ['note.flac', 'opus/balanced/note.opus'].map(file => ({ url: new URL(file, base).href })) }) };
  t.after(() => { globalThis.caches = previous; });
  const engine = engineFor();
  const balanced = await engine.cacheInfo('balanced');
  assert.equal(balanced.bytes, 1200);
  assert.equal(balanced.instruments.piano.count, 1);
  assert.equal(balanced.instruments.piano.size, 200);
  const high = await engine.cacheInfo('high');
  assert.equal(high.instruments.piano.count, 0);
  assert.equal(high.instruments.piano.size, 400);
  const downloaded = [];
  engine.fetchSample = async (file, storage) => downloaded.push({ file, storage });
  await engine.downloadInstrument('piano', () => {}, () => false, 'balanced');
  assert.deepEqual(downloaded, [{ file: 'opus/balanced/note.opus', storage: true }]);
});

test('prefetch stores compressed files without decoding or advancing recorded takes', async t => {
  const previous = globalThis.caches;
  globalThis.caches = {};
  t.after(() => { globalThis.caches = previous; });
  const engine = engineFor();
  const fetched = [];
  engine.fetchSample = async (file, storage) => fetched.push({ file, storage });
  engine.unlock = engine.buffer = () => assert.fail('prefetch must not open audio or decode');
  await engine.prefetch([60, 67], settings);
  assert.deepEqual(fetched, [{ file: 'opus/balanced/note.opus', storage: true }]);
  assert.equal(engine.roundRobin.size, 0);
  engine.activeLoads = 1;
  fetched.length = 0;
  await engine.prefetch([60], settings);
  assert.deepEqual(fetched, [], 'foreground loads take priority');
  engine.activeLoads = 0;
  engine.manifest = async () => ({ ...catalog, files: { 'note.flac': { bytes: 13 * 1024 * 1024 } } });
  await engine.prefetch([60], { ...settings, quality: 'original' });
  assert.deepEqual(fetched, [], 'oversized speculative downloads are skipped');
});

test('clearing recordings aborts and drains the in-flight speculative disk write', async t => {
  const previous = globalThis.caches;
  let deleted = false, finish;
  globalThis.caches = { delete: async () => { deleted = true; } };
  t.after(() => { globalThis.caches = previous; });
  const engine = engineFor();
  const started = new Promise(resolve => {
    engine.fetchSample = (_file, _storage, signal) => new Promise(done => {
      finish = () => { assert.equal(signal.aborted, true); done(); };
      resolve();
    });
  });
  engine.prefetch([60], settings);
  await started;
  const clear = engine.clearCache();
  assert.equal(deleted, false);
  finish();
  await clear;
  assert.equal(deleted, true);
  assert.equal(engine.warming.size, 0);
});

test('shipped alternatives match their hashes and original source identities', () => {
  const base = new URL('../audio/samples/', import.meta.url);
  const originals = JSON.parse(fs.readFileSync(new URL('manifest.json', base)));
  const qualities = JSON.parse(fs.readFileSync(new URL('qualities.json', base)));
  assert.deepEqual(Object.keys(qualities.files).sort(), Object.keys(originals.files).sort());
  for (const [file, entry] of Object.entries(qualities.files)) {
    assert.equal(entry.sourceSha256, originals.files[file].sha256);
    for (const variant of Object.values(entry.variants)) {
      const data = fs.readFileSync(new URL(variant.file, base));
      assert.equal(data.subarray(0, 4).toString(), 'OggS');
      assert.equal(data.length, variant.bytes);
      assert.ok(data.length < originals.files[file].bytes);
      assert.equal(crypto.createHash('sha256').update(data).digest('hex'), variant.sha256);
    }
  }
});
