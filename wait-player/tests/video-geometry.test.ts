import test from 'node:test';
import assert from 'node:assert/strict';
import { fitVideo, constrainView, zoomAt } from '../src/video-geometry.ts';

test('fit preserves portrait and landscape ratios without cropping', () => {
  assert.deepEqual(fitVideo({ width: 360, height: 640 }, { width: 800, height: 640 }), { width: 360, height: 640 });
  assert.deepEqual(fitVideo({ width: 1920, height: 1080 }, { width: 800, height: 600 }), { width: 800, height: 450 });
});
test('pan cannot expose empty space along a cropped axis', () => {
  assert.deepEqual(constrainView({ zoom: 2, x: 8, y: -8 }, { width: 800, height: 450 }, { width: 800, height: 450 }), { zoom: 2, x: .5, y: -.5 });
  assert.deepEqual(constrainView({ zoom: 1, x: 8, y: -8 }, { width: 800, height: 450 }, { width: 800, height: 600 }), { zoom: 1, x: 0, y: -0 });
});
test('zoom anchors the image point under the cursor', () => {
  const view = zoomAt({ zoom: 1, x: 0, y: 0 }, 2, { x: .2, y: -.1 }, { width: 800, height: 450 }, { width: 800, height: 450 });
  assert.equal(view.x, -.2); assert.equal(view.y, .1);
  assert.equal((.2 - view.x) / view.zoom, .2);
});
test('fullscreen letterboxing and zoom limits remain bounded', () => {
  assert.deepEqual(constrainView({ zoom: 2, x: 2, y: 2 }, { width: 200, height: 400 }, { width: 800, height: 400 }), { zoom: 2, x: 0, y: .5 });
  assert.equal(constrainView({ zoom: 99, x: 0, y: 0 }, { width: 400, height: 400 }, { width: 400, height: 400 }).zoom, 5);
});
