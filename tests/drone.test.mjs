import test from 'node:test';
import assert from 'node:assert/strict';
import { LivingDrone, droneLoop } from '../ear-training/drone.mjs';

// Inspect the graph and automation contract without playing device audio.
function context() {
  const parameter = () => ({ value: 0, events: [],
    setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); },
    linearRampToValueAtTime(value, time) { this.events.push(['ramp', value, time]); },
    setTargetAtTime(value, time, constant) { this.events.push(['target', value, time, constant]); },
    cancelAndHoldAtTime(time) { this.events.push(['hold', time]); },
  });
  const node = () => ({ connected: [], connect(to) { this.connected.push(to); return to; }, disconnect() { this.disconnected = true; } });
  return { currentTime: 1,
    createBuffer(channels, length, sampleRate) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { length, sampleRate, numberOfChannels: channels, getChannelData: i => data[i] }; },
    createGain: () => ({ ...node(), gain: parameter() }),
    createAnalyser: () => ({ ...node(), getFloatTimeDomainData(data) { data.fill(.1); } }),
    createBiquadFilter: () => ({ ...node(), frequency: parameter(), Q: parameter() }),
    createOscillator: () => ({ ...node(), frequency: parameter(), start(time) { this.startTime = time; }, stop(time) { this.stopTime = time; } }),
    createBufferSource: () => ({ ...node(), playbackRate: parameter(), start(time, offset) { this.startTime = time; this.offset = offset; }, stop(time) { this.stopTime = time; } }),
  };
}

function recording(ctx, midi = 60) {
  const buffer = ctx.createBuffer(1, 24000, 8000);
  const frequency = 440 * 2 ** ((60 - 69) / 12);
  buffer.getChannelData(0).set(Float32Array.from({ length: buffer.length }, (_, i) => .2 * Math.sin(2 * Math.PI * frequency * i / buffer.sampleRate)));
  return { buffer, midi, region: { root: 60, loopStart: .25, loopEnd: 2.65 } };
}

test('held loop joins neighbouring sample frames without a crossfade volume notch', () => {
  const ctx = context(), layer = recording(ctx);
  const loop = droneLoop(ctx, layer.buffer, layer.region);
  const samples = loop.buffer.getChannelData(0);
  const naturalStep = .4 * Math.sin(Math.PI * (440 * 2 ** ((60 - 69) / 12)) / 8000);
  assert.ok(Math.abs(samples[0] - samples.at(-1)) <= naturalStep * 1.05);
  for (let start = 0; start + 1024 <= samples.length; start += 256) {
    const rms = Math.sqrt(samples.subarray(start, start + 1024).reduce((sum, v) => sum + v * v, 0) / 1024);
    assert.ok(rms > .12 && rms < .16);
  }
  assert.equal(droneLoop(ctx, layer.buffer, layer.region), loop);
});

test('drone adds and removes tones without restarting or ducking the reference', () => {
  const ctx = context(), layer = recording(ctx);
  const drone = new LivingDrone(ctx, {}, {}, [{ layer }]);
  const reference = drone.tones.get(60);
  assert.equal(reference.sources[0].offset, 0);
  assert.equal(reference.sources[0].playbackRate.value, 1);
  assert.equal(reference.output.gain.events[0][1], 0);
  assert.ok(Math.abs(reference.output.gain.events[1][2] - 3.43) < 1e-8);
  assert.equal(reference.modulators.length, 2);
  assert.ok(reference.modulators.every(m => m.oscillator.frequency.value < .02 && !m.amount.connected.includes(reference.sources[0].playbackRate)));
  const envelope = [...reference.output.gain.events];
  drone.configure({ level: .85, motion: .4 });
  assert.equal(drone.output.gain.events.length, 0);
  drone.setNotes([{ layer: { ...layer, midi: 67 } }], [60, 67]);
  const upper = drone.tones.get(67);
  assert.equal(drone.tones.get(60), reference);
  assert.deepEqual(reference.output.gain.events, envelope);
  assert.equal(reference.sources[0].stopTime, undefined);
  drone.setNotes([{ layer }]);
  assert.equal(drone.tones.get(60), reference);
  assert.equal(upper.stopped, true);
  assert.ok(Math.abs(upper.sources[0].stopTime - 2.22) < 1e-8);
  assert.ok(drone.meter() > .7);
  drone.configure({ level: 1, motion: .7 });
  assert.deepEqual(drone.output.gain.events.at(-1), ['target', 1, 1, .65]);
  drone.stop(.65);
  assert.ok(Math.abs(reference.sources[0].stopTime - 1.67) < 1e-8);
  assert.ok(Math.abs(upper.sources[0].stopTime - 1.67) < 1e-8);
  reference.sources[0].onended();
  assert.equal(drone.output.disconnected, undefined);
  upper.sources[0].onended();
  assert.equal(drone.output.disconnected, true);
  assert.ok(reference.modulators.every(m => m.oscillator.disconnected));
});

test('removing a fully held note eases to exact silence while its neighbour keeps sounding', () => {
  const ctx = context(), layer = recording(ctx);
  const drone = new LivingDrone(ctx, {}, {}, [{ layer }, { layer: { ...layer, midi: 67 } }]);
  const kept = drone.tones.get(60), removed = drone.tones.get(67);
  const keptEnvelope = [...kept.output.gain.events];
  ctx.currentTime = 10;
  drone.retainNotes([60]);
  assert.deepEqual(kept.output.gain.events, keptEnvelope);
  assert.equal(kept.sources[0].stopTime, undefined);
  assert.equal(removed.levelAt(10), 1);
  assert.ok(removed.levelAt(10.1) > .98);
  assert.ok(Math.abs(removed.levelAt(10.6) - .5) < 1e-9);
  assert.equal(removed.levelAt(11.2), 0);
  assert.deepEqual(removed.output.gain.events.at(-1), ['ramp', 0, 11.2]);
  assert.ok(Math.abs(removed.sources[0].stopTime - 11.22) < 1e-9);
  assert.equal(removed.sources[0].disconnected, undefined);
});

test('removing the last note during its entrance releases from its current level', () => {
  const ctx = context(), layer = recording(ctx);
  const drone = new LivingDrone(ctx, {}, {}, [{ layer }]);
  const tone = drone.tones.get(60);
  ctx.currentTime = 2.23;
  drone.stop();
  const anchor = tone.output.gain.events.filter(e => e[0] === 'set').at(-1);
  assert.ok(Math.abs(anchor[1] - .5) < 1e-9);
  assert.equal(anchor[2], 2.23);
  assert.equal(drone.output.disconnected, undefined);
  assert.ok(Math.abs(tone.sources[0].stopTime - 3.45) < 1e-9);
  tone.sources[0].onended();
  assert.equal(drone.output.disconnected, true);
});
