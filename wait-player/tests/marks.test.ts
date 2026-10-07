import test from 'node:test';
import assert from 'node:assert/strict';
import { moveMark, parseTime, time, type Mark } from '../src/marks.ts';
const range: Mark = { id: 'r', kind: 'range', name: 'phrase', start: 3, end: 7 };

test('moving a range at either boundary preserves its length', () => {
  assert.deepEqual(moveMark(range, 'move', -99, 16), { ...range, start: 0, end: 4 });
  assert.deepEqual(moveMark(range, 'move', 99, 16), { ...range, start: 12, end: 16 });
  assert.equal(range.start, 3, 'the drag origin stays unchanged');
});
test('range endpoints cannot cross or leave the file', () => {
  assert.equal(moveMark(range, 'start', 99, 16).start, 6.9);
  assert.equal(moveMark(range, 'end', -99, 16).end, 3.1);
  assert.equal(moveMark(range, 'end', 99, 16).end, 16);
});
test('checkpoint positions are clamped and have no span', () => {
  const point: Mark = { ...range, kind: 'checkpoint', end: 3 };
  assert.deepEqual(moveMark(point, 'move', -10, 16), { ...point, start: 0, end: 0 });
  assert.deepEqual(moveMark(point, 'move', 99, 16), { ...point, start: 16, end: 16 });
});
test('subsecond recordings have valid range boundaries', () => {
  const tiny: Mark = { ...range, start: 0, end: .05 };
  assert.deepEqual(moveMark(tiny, 'start', 100, .05), tiny);
  assert.deepEqual(moveMark(tiny, 'end', -100, .05), tiny);
});
test('time editing supports precise seconds and hour-long recordings', () => {
  assert.equal(parseTime('1:02:03.125'), 3723.125);
  assert.equal(parseTime('83.5'), 83.5);
  for (const value of ['', '-1', '0:99', 'NaN', '1:2:3:4']) assert.equal(parseTime(value), null);
  assert.equal(parseTime(time(3723.125, true)), 3723.125);
});
