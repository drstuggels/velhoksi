import test from 'node:test';
import assert from 'node:assert/strict';
import { constrainWave, visiblePeaks, waveWindow, zoomWave } from '../src/waveform.ts';

test('waveform zoom preserves the time under the pointer away from file boundaries', () => {
  const view = { zoom: 2, start: .2 }, anchor = .3;
  const next = zoomWave(view, 8, anchor);
  assert.ok(Math.abs(view.start + anchor / view.zoom - next.start - anchor / next.zoom) < 1e-10);
  assert.deepEqual(waveWindow(100, next), { start: 31.25, end: 43.75 });
});
test('waveform views remain inside the recording at both zoom limits', () => {
  assert.deepEqual(constrainWave({ zoom: 100, start: 1 }), { zoom: 32, start: 31 / 32 });
  assert.deepEqual(constrainWave({ zoom: 4, start: -2 }), { zoom: 4, start: 0 });
  assert.deepEqual(zoomWave({ zoom: 32, start: .75 }, 1), { zoom: 1, start: 0 });
  assert.deepEqual(constrainWave({ zoom: NaN, start: Infinity }), { zoom: 1, start: 0 });
});
test('zoomed waveform bars show the visible audio and retain short peaks', () => {
  const peaks = [0, 1, 0, .2, .3, .4, .8, .1];
  assert.deepEqual(visiblePeaks(peaks, { zoom: 1, start: 0 }, 2), [1, .8]);
  assert.deepEqual(visiblePeaks(peaks, { zoom: 2, start: .5 }, 4), [.3, .4, .8, .1]);
  assert.deepEqual(visiblePeaks(peaks, { zoom: 4, start: .25 }, 4), [0, 0, .2, .2]);
  assert.deepEqual(visiblePeaks(peaks, { zoom: 1, start: 0 }, 0), []);
});
