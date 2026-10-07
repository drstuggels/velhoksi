import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FrameStepper } from '../src/frame-step.ts';

for (const [filename, frames] of [
  ['25fps.mp4', Array.from({ length: 12 }, (_, i) => i / 25)],
  ['variable.mp4', [0, .04, .08, .12, .16, .26, .36, .46, .56, .66]],
] as const) {
  test(`frame steps follow presentation timestamps in ${filename}, including B-frames`, async () => {
    const file = new Blob([await readFile(new URL(`fixtures/${filename}`, import.meta.url))]);
    const stepper = new FrameStepper(file);
    try {
      let position = 0;
      assert.ok(Math.abs(await stepper.step(0, -1)) < 1e-6);
      for (const expected of frames.slice(1)) {
        position = await stepper.step(position, 1);
        assert.ok(Math.abs(position - expected) < 1e-6, `${position} should be ${expected}`);
      }
      assert.ok(Math.abs(await stepper.step(position, 1) - position) < 1e-6, 'last frame remains visible');
      for (const expected of [...frames.slice(0, -1)].reverse()) {
        position = await stepper.step(position, -1);
        assert.ok(Math.abs(position - expected) < 1e-6, `${position} should be ${expected}`);
      }
    } finally { stepper.dispose(); }
  });
}
