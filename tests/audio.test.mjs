import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { SampleEngine, selectRegions, pianoOnset } from '../ear-training/audio.mjs';
import { INSTRUMENTS } from '../ear-training/instruments.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('../audio/samples/manifest.json', import.meta.url)));

test('every instrument covers its native range at every velocity, including crossfades', () => {
  for (const entry of INSTRUMENTS) {
    const instrument = manifest.instruments[entry.id];
    assert.deepEqual(entry.range, instrument.range);
    for (let midi = instrument.range[0]; midi <= instrument.range[1]; midi++) for (let velocity = 1; velocity <= 127; velocity++) {
      const layers = selectRegions(instrument, midi, velocity);
      assert.ok(layers.length > 0, `${instrument.name}, ${midi}, ${velocity}`);
      assert.ok(layers.every(({ region, weight }) => midi >= region.low && midi <= region.high && weight > 0 && weight <= 1));
    }
  }
});

test('guitar rotates recorded takes; marimba blends dynamics; out-of-range answers can audition', () => {
  const guitar = manifest.instruments['guitar-electric'];
  const files = new Set(Array.from({ length: 4 }, (_, index) => selectRegions(guitar, 60, 68, { choose: () => index })[0].region.file));
  assert.equal(files.size, 4);
  const marimba = selectRegions(manifest.instruments.marimba, 60, 60);
  assert.equal(marimba.length, 2);
  assert.ok(Math.abs(marimba.reduce((sum, layer) => sum + layer.weight ** 2, 0) - 1) < 1e-6);
  assert.throws(() => selectRegions(manifest.instruments.vibraphone, 40, 68), /range/);
  assert.ok(selectRegions(manifest.instruments.vibraphone, 40, 68, { allowOutside: true }).length);
});

test('replay replaces notes without clearing the reverb; explicit stop still clears it', async () => {
  const engine = new SampleEngine();
  const messages = [];
  engine.context = { currentTime: 10 };
  engine.reverb = { port: { postMessage: message => messages.push(message) } };
  engine.unlock = async () => {};
  engine.configure = () => {};
  engine.prepare = async () => [];
  await engine.play([60, 64]);
  await engine.play([60, 64]);
  assert.deepEqual(messages, []);
  engine.cancel();
  assert.deepEqual(messages, ['reset']);
});

test('lossless recordings match the pinned hashes; original Wurlitzer loops are preserved', () => {
  for (const [file, meta] of Object.entries(manifest.files)) {
    const data = fs.readFileSync(new URL('../audio/samples/' + file, import.meta.url));
    assert.equal(data.subarray(0, 4).toString(), 'fLaC');
    assert.equal(data.length, meta.bytes);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), meta.sha256, file);
  }
  for (const region of manifest.instruments.wurlitzer.regions) {
    assert.ok(region.loopStart > 0);
    assert.ok(region.loopEnd > region.loopStart);
  }
});

test('reverb renders finite stereo tails and resets cleanly at common sample rates', () => {
  const code = fs.readFileSync(new URL('../vendor/dattorro/dattorroReverb.js', import.meta.url), 'utf8');
  for (const rate of [44100, 48000, 96000]) {
    let Processor;
    const sandbox = { sampleRate: rate, AudioWorkletProcessor: class { constructor() { this.port = {}; } }, registerProcessor: (_, cls) => Processor = cls, Float32Array, Int32Array, Math };
    vm.runInNewContext(code, sandbox);
    const effect = new Processor();
    const params = Object.fromEntries(Processor.parameterDescriptors.map(p => [p.name, [p.defaultValue]]));
    params.dry = [0]; params.wet = [1]; params.excursionDepth = [0];
    let energy = 0;
    let peak = 0;
    for (let block = 0; block < 1200; block++) {
      const input = [new Float32Array(128), new Float32Array(128)];
      if (block === 0) input[0][0] = input[1][0] = 1;
      const output = [new Float32Array(128), new Float32Array(128)];
      effect.process([input], [output], params);
      for (const channel of output) for (const value of channel) { assert.ok(Number.isFinite(value)); energy += value * value; peak = Math.max(peak, Math.abs(value)); }
    }
    assert.ok(energy > 0.01, `${rate}: nonzero reverb tail`);
    assert.ok(peak < 1, `${rate}: bounded impulse response`);
    effect.port.onmessage({ data: 'reset' });
    const output = [new Float32Array(128), new Float32Array(128)];
    effect.process([[]], [output], params);
    assert.ok(output.every(channel => channel.every(value => value === 0)));
  }
});

test('cancel during sample preparation prevents all scheduled playback', async () => {
  const engine = new SampleEngine();
  engine.context = { currentTime: 10 };
  engine.unlock = async () => {};
  engine.configure = () => {};
  let finish;
  engine.prepare = () => new Promise(resolve => finish = resolve);
  const voices = [];
  engine.voice = (...args) => voices.push(args);
  const playing = engine.play([60, 64]);
  await Promise.resolve();
  engine.cancel();
  finish([{}, {}]);
  assert.equal(await playing, null);
  assert.equal(voices.length, 0);
});

test('notes use audio-clock timestamps, harmonic attacks are simultaneous', async () => {
  const engine = new SampleEngine();
  engine.context = { currentTime: 10 };
  engine.unlock = async () => {};
  engine.configure = () => {};
  engine.prepare = async notes => notes.map(midi => ({ midi }));
  const times = [];
  engine.voice = (_, time) => times.push(time);
  const info = await engine.play([60, 64, 67], { direction: 'ascending', duration: 0.8, gap: 0.2 });
  assert.deepEqual(times, [10.14, 11.14, 12.14]);
  assert.ok(Math.abs(info.end - 12.94) < 1e-9);
  times.length = 0;
  await engine.play([60, 64, 67], { direction: 'harmonic' });
  assert.deepEqual(times, [10.14, 10.14, 10.14]);
});

test('long ringing notes can have closely spaced melodic onsets', async () => {
  const engine = new SampleEngine();
  engine.context = { currentTime: 10 };
  engine.unlock = async () => {};
  engine.configure = () => {};
  engine.prepare = async notes => notes.map(midi => ({ midi }));
  const voices = [];
  engine.voice = (note, time, duration) => voices.push({ midi: note.midi, time, duration });
  for (const notes of [[60, 67], [67, 60]]) {
    voices.length = 0;
    const info = await engine.play(notes, { duration: 12, spacing: .75 });
    assert.deepEqual(voices, [{ midi: notes[0], time: 10.14, duration: 12 }, { midi: notes[1], time: 10.89, duration: 12 }]);
    assert.ok(Math.abs(info.end - 22.89) < 1e-9);
  }
});

test('different recordings per note still share one audio clock', async () => {
  const engine = new SampleEngine();
  engine.context = { currentTime: 10 };
  engine.unlock = async () => {};
  engine.configure = () => {};
  engine.prepare = async (notes, settings) => notes.map(midi => ({ midi, instrument: settings.instrument }));
  const voices = [];
  engine.voice = (note, time) => voices.push({ ...note, time });
  await engine.play([60, 64, 67], { direction: 'harmonic', noteInstruments: ['rhodes', 'guitar-electric', 'vibraphone'] });
  assert.deepEqual(voices.map(v => v.instrument), ['rhodes', 'guitar-electric', 'vibraphone']);
  assert.ok(voices.every(v => v.time === 10.14));
});

test('stopping while the new drone loads prevents it from starting', async () => {
  const engine = new SampleEngine();
  engine.context = { currentTime: 10 };
  engine.unlock = async () => {};
  const completions = [];
  engine.prepare = () => new Promise(resolve => completions.push(resolve));
  const loading = engine.drone([60]);
  await Promise.resolve();
  engine.stopDrone();
  for (const complete of completions) complete([]);
  assert.equal(await loading, false);
  assert.equal(engine.activeDrone, null);
});

test('cold audio starts muted with the selected room, and replay leaves the output gate alone', async () => {
  const originalContext = globalThis.AudioContext;
  const originalWorklet = globalThis.AudioWorkletNode;
  const parameter = (value = 1) => ({
    value, events: [],
    setTargetAtTime(...args) { this.events.push(['target', ...args]); },
    setValueAtTime(...args) { this.events.push(['set', ...args]); },
    linearRampToValueAtTime(...args) { this.events.push(['ramp', ...args]); },
    cancelScheduledValues(...args) { this.events.push(['cancel', ...args]); },
  });
  const node = () => ({ connect(next) { return next; }, addEventListener() {} });
  let initialRoom;
  globalThis.AudioContext = class {
    constructor() { this.currentTime = 2; this.sampleRate = 48000; this.state = 'suspended'; this.destination = node(); this.audioWorklet = { addModule: async () => {} }; }
    createGain() { return { ...node(), gain: parameter() }; }
    createDynamicsCompressor() { return { ...node(), ...Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map(key => [key, parameter()])) }; }
    createBiquadFilter() { return { ...node(), frequency: parameter() }; }
    addEventListener() {}
    async resume() { this.state = 'running'; }
  };
  globalThis.AudioWorkletNode = class {
    constructor(_context, _name, options) { initialRoom = options.parameterData; Object.assign(this, node()); this.parameters = new Map(Object.entries(initialRoom).map(([name, value]) => [name, parameter(value)])); }
  };
  try {
    const engine = new SampleEngine();
    engine.configure({ room: 'hall', ambience: .25 });
    await engine.unlock();
    assert.equal(engine.output.gain.value, 0);
    assert.equal(engine.send.gain.value, .25);
    assert.equal(engine.return.gain.value, .8);
    assert.equal(initialRoom.preDelay, .038 * 48000);
    assert.equal(initialRoom.decay, .78);
    assert.equal(initialRoom.damping, .25);
    assert.equal(engine.readyAt, 2.06);
    assert.deepEqual(engine.output.gain.events.at(-1), ['ramp', 1, 2.06]);
    const startupEvents = [...engine.output.gain.events];
    const starts = [];
    engine.prepare = async () => [{}];
    engine.voice = (_note, time) => starts.push(time);
    const first = await engine.preview(60);
    assert.equal(first.start, engine.readyAt);
    engine.context.currentTime = 3;
    const next = await engine.preview(64);
    assert.equal(next.start, 3.025);
    assert.deepEqual(engine.output.gain.events, startupEvents);
    assert.deepEqual(starts, [2.06, 3.025]);
  } finally {
    if (originalContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = originalContext;
    if (originalWorklet === undefined) delete globalThis.AudioWorkletNode;
    else globalThis.AudioWorkletNode = originalWorklet;
  }
});

test('zero-attack regions preserve their transient and ended voices release their buffers', () => {
  const engine = new SampleEngine();
  const events = [];
  const gain = { value: 1, setValueAtTime: (...args) => events.push(['set', ...args]), linearRampToValueAtTime: (...args) => events.push(['ramp', ...args]), exponentialRampToValueAtTime() {} };
  const source = { playbackRate: {}, connect() {}, start() {}, stop() {}, disconnect() {} };
  engine.context = { createBufferSource: () => source, createGain: () => ({ gain, connect() {}, disconnect() {} }) };
  engine.voice({ midi: 60, region: { root: 60, attack: 0, offset: .25 }, buffer: {}, instrument: { gain: 1, release: .1 } }, 1, .8);
  assert.equal(gain.value, 0);
  assert.deepEqual(events[0], ['set', 0, 1]);
  assert.deepEqual(events[1], ['set', .6, 1]);
  source.onended();
  assert.equal(source.buffer, null);
  assert.equal(source.onended, null);
  assert.equal(engine.voices.size, 0);
});

test('returning to the current drone cancels an older pending pitch change', async () => {
  const engine = new SampleEngine();
  engine.context = { currentTime: 10 };
  engine.unlock = async () => {};
  const updates = [];
  const current = { tones: new Map([[60, {}]]), configure: options => updates.push(options), setNotes: () => assert.fail('stale pitches must not replace the held drone') };
  engine.activeDrone = current;
  engine.droneNotes = [60];
  let finish;
  engine.prepare = () => new Promise(resolve => { finish = resolve; });
  const changing = engine.drone([62]);
  await Promise.resolve();
  assert.equal(await engine.drone([60], { level: .8 }), true);
  finish([{ layers: [{}] }]);
  assert.equal(await changing, false);
  assert.equal(engine.activeDrone, current);
  assert.deepEqual(engine.droneNotes, [60]);
  assert.deepEqual(updates, [{ level: .8 }]);
});

test('piano onset uses a quiet stereo boundary before the mapped onset, without changing samples', () => {
  const channels = [new Float32Array([.5, .4, .001, .8, 1]), new Float32Array([.3, .2, -.001, .6, .9])];
  let reads = 0;
  const buffer = { sampleRate: 1000, length: 5, numberOfChannels: 2,
    copyFromChannel(target, channel, start) { reads++; target.set(channels[channel].subarray(start, start + target.length)); } };
  assert.equal(pianoOnset(buffer, .004), .002);
  assert.equal(pianoOnset(buffer, .004), .002);
  assert.equal(reads, 2, 'onset analysis is reused across replay');
  assert.equal(channels[0][4], 1, 'recorded transient is untouched');
});

test('obsolete queued recordings are skipped while shared current requests still load once', async () => {
  const engine = new SampleEngine();
  const started = [], completions = [];
  engine.fetchSample = file => { started.push(file); return new Promise(resolve => completions.push(resolve)); };
  engine.context = { decodeAudioData: async () => ({ length: 1, numberOfChannels: 1 }) };
  let wanted = true;
  const running = ['a', 'b', 'c'].map(file => engine.buffer(file));
  const obsolete = engine.buffer('obsolete', () => wanted);
  const sharedOld = engine.buffer('shared', () => wanted);
  const sharedNew = engine.buffer('shared', () => true);
  const settled = Promise.allSettled([...running, obsolete, sharedOld, sharedNew]);
  wanted = false;
  for (let pass = 0; pass < 4; pass++) {
    while (completions.length) completions.shift()(new ArrayBuffer(0));
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(engine.activeLoads <= 3);
  }
  const results = await settled;
  assert.deepEqual(started, ['a', 'b', 'c', 'shared']);
  assert.equal(results[3].reason.name, 'AbortError');
  assert.equal(results[5].status, 'fulfilled');
  assert.equal(engine.activeLoads, 0);
  assert.equal(engine.pending.size, 0);
});

test('decoded cache evicts least recently used buffers without modifying them', async () => {
  const engine = new SampleEngine();
  const a = { length: 8 * 1024 * 1024, numberOfChannels: 2 };
  const b = { length: 8 * 1024 * 1024, numberOfChannels: 2 };
  engine.buffers.set('a', a); engine.buffers.set('b', b);
  await engine.buffer('a');
  engine.trimBuffers();
  assert.deepEqual([...engine.buffers.keys()], ['a']);
  assert.equal(a.length, b.length);
});

test('repeated settings do not add automation events', () => {
  const engine = new SampleEngine();
  const events = [];
  const parameter = { value: 1, cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime: (...args) => events.push(args) };
  for (let i = 0; i < 1000; i++) engine.target(parameter, .5, i, .03);
  assert.equal(events.length, 1);
  engine.target(parameter, .6, 1001, .03);
  assert.equal(events.length, 2);
});

test('removing a drone note keeps the live graph and bypasses sample preparation', async () => {
  const engine = new SampleEngine();
  engine.unlock = async () => {};
  engine.prepare = () => assert.fail('removal must not reload the held notes');
  const retained = [];
  const drone = { tones: new Map([[60, {}], [67, {}]]), retainNotes: notes => retained.push(notes), configure() {} };
  engine.activeDrone = drone;
  engine.droneNotes = [60, 67];
  assert.equal(await engine.drone([60]), true);
  assert.equal(engine.activeDrone, drone);
  assert.deepEqual(retained, [[60]]);
  assert.deepEqual(engine.droneNotes, [60]);
});

test('adding a drone note prepares only the new pitch while preserving held notes', async () => {
  const engine = new SampleEngine();
  engine.unlock = async () => {};
  const prepared = [], changes = [];
  const layer = { midi: 67 };
  engine.prepare = async notes => { prepared.push(notes); return [{ layers: [layer] }]; };
  const drone = { tones: new Map([[60, {}]]), setNotes: (...args) => changes.push(args), configure() {} };
  engine.activeDrone = drone;
  engine.droneNotes = [60];
  assert.equal(await engine.drone([60, 67]), true);
  assert.deepEqual(prepared, [[67]]);
  assert.deepEqual(changes, [[[{ layer }], [60, 67]]]);
  assert.equal(engine.activeDrone, drone);
  assert.deepEqual(engine.droneNotes, [60, 67]);
});
