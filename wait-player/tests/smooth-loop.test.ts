import test from 'node:test';
import assert from 'node:assert/strict';
import { SmoothLoop } from '../src/smooth-loop.ts';

function fixture(rate = 1) {
  let now = 0, id = 0;
  const tasks = new Map<number, { at: number; fn: () => void }>();
  const clock = { set(fn: () => void, delay: number) { const key = ++id; tasks.set(key, { at: now + delay / 1000, fn }); return key; }, clear(key: number) { tasks.delete(key); } };
  type Point = { at: number; value: number; ramp: boolean };
  let events: Point[] = [{ at: 0, value: 1, ramp: false }];
  const param = {
    get value() {
      let last = events[0];
      for (const next of events.slice(1)) {
        if (next.at > now) return next.ramp ? last.value + (next.value - last.value) * (now - last.at) / (next.at - last.at) : last.value;
        last = next;
      }
      return last.value;
    },
    cancelScheduledValues(at: number) { events = events.filter(p => p.at < at); },
    setValueAtTime(value: number, at: number) { events.push({ at, value, ramp: false }); events.sort((a, b) => a.at - b.at); },
    linearRampToValueAtTime(value: number, at: number) { events.push({ at, value, ramp: true }); events.sort((a, b) => a.at - b.at); },
    cancelAndHoldAtTime(at: number) { const value = this.value; events = events.filter(p => p.at < at); this.setValueAtTime(value, at); },
  };
  const seeks: { at: number; gain: number; position: number }[] = [];
  class Media extends EventTarget {
    position = .41; playbackRate = rate; paused = false; ended = false; seeking = false; readyState = 4; volume = .37; muted = false; playCalls = 0;
    get currentTime() { return this.position; }
    set currentTime(value: number) {
      seeks.push({ at: now, gain: param.value, position: value });
      this.position = value; this.seeking = true; this.ended = false; this.dispatchEvent(new Event('seeking'));
      clock.set(() => { this.seeking = false; this.dispatchEvent(new Event('seeked')); }, 12);
    }
    async play() { this.paused = false; this.playCalls++; this.dispatchEvent(new Event('playing')); }
  }
  const media = new Media();
  const context = { get currentTime() { return now; }, state: 'running', sampleRate: 48000, destination: {}, createGain: () => ({ gain: param, connect() {} }), createMediaElementSource: () => ({ connect() {} }), resume: async () => {} };
  let range: { start: number; end: number } | undefined = { start: .123, end: .423 };
  const loop = new SmoothLoop(media as unknown as HTMLMediaElement, () => range, () => context as unknown as AudioContext, clock);
  function advance(ms: number) {
    const end = now + ms / 1000;
    const go = (at: number) => { if (!media.paused && !media.seeking) media.position += (at - now) * media.playbackRate; now = at; };
    for (let guard = 0; guard < 10000; guard++) {
      const next = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      tasks.delete(next[0]); go(next[1].at); next[1].fn();
    }
    go(end);
  }
  return { loop, media, seeks, param, advance, setRange(value: typeof range) { range = value; } };
}

for (const rate of [.25, 1, 2]) test(`loop jumps occur at zero gain at ${rate}×, without changing user volume`, async () => {
  const f = fixture(rate); await f.loop.prepare(); await f.media.play(); f.advance(1600 / rate);
  assert.ok(f.seeks.length >= 3);
  for (const seek of f.seeks) { assert.ok(Math.abs(seek.gain) < 1e-6); assert.equal(seek.position, .123); }
  assert.equal(f.media.volume, .37); assert.equal(f.media.muted, false);
});
test('pause cancels a pending seek and does not restart playback', async () => {
  const f = fixture(); await f.loop.prepare(); await f.media.play(); f.advance(2);
  f.media.paused = true; f.media.dispatchEvent(new Event('pause')); f.advance(200);
  assert.equal(f.seeks.length, 0); assert.equal(f.media.playCalls, 1); assert.equal(f.param.value, 1);
});
test('switching files or deleting the loop invalidates pending callbacks', async () => {
  const f = fixture(); await f.loop.prepare(); await f.media.play(); f.advance(2);
  f.setRange(undefined); f.loop.reset(); f.advance(200);
  assert.equal(f.seeks.length, 0); assert.equal(f.param.value, 1);
});
test('the decoder stays silent until seeked audio is available', async () => {
  const f = fixture(); await f.loop.prepare(); await f.media.play(); f.media.readyState = 2; f.advance(50);
  assert.equal(f.seeks.length, 1); assert.equal(f.param.value, 0);
  f.media.readyState = 4; f.media.dispatchEvent(new Event('canplay')); f.advance(20);
  assert.equal(f.param.value, 1);
});
test('loops ending at EOF restart through the same silent seek', async () => {
  const f = fixture(); await f.loop.prepare(); await f.media.play(); f.advance(5);
  f.media.ended = true; f.media.paused = true; f.media.dispatchEvent(new Event('pause')); f.media.dispatchEvent(new Event('ended')); f.advance(45);
  assert.equal(f.seeks.length, 1); assert.equal(f.seeks[0].gain, 0); assert.equal(f.media.playCalls, 2); assert.equal(f.param.value, 1);
});
