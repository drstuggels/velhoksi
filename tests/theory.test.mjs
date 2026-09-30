import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, sanitizeSettings, parseInterval, parseNote, noteName, generateQuestion, gradeAnswer, notesFromIntervals } from '../ear-training/theory.mjs';
import { INSTRUMENTS } from '../ear-training/instruments.mjs';

test('questions respect each instrument’s recorded range and preserve the instrument selection', () => {
  for (const instrument of INSTRUMENTS) {
    const settings = sanitizeSettings({ ...DEFAULTS, instrument: instrument.id, low: 36, high: 84 });
    assert.equal(settings.instrument, instrument.id);
    for (const direction of ['ascending', 'descending', 'harmonic', 'mixed']) {
      const question = generateQuestion({ ...settings, direction });
      assert.ok(question.notes.every(note => note >= instrument.range[0] && note <= instrument.range[1]));
    }
  }
});

function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

test('minor and major intervals remain distinct; enharmonic notes match with octaves', () => {
  assert.equal(parseInterval('m3'), 3);
  assert.equal(parseInterval('M3'), 4);
  assert.equal(parseInterval('minor third'), 3);
  assert.equal(parseInterval('major third'), 4);
  assert.equal(parseInterval('maj3'), 4);
  assert.equal(parseInterval('P15'), 24);
  assert.equal(parseInterval('d5'), 6);
  assert.equal(parseInterval('P3'), null);
  assert.equal(parseInterval('0'), null);
  assert.equal(parseNote('C♯4'), 61);
  assert.equal(parseNote('db4'), 61);
  assert.equal(parseNote('B#3'), 60);
  assert.equal(parseNote('Cb4'), 59);
  assert.equal(parseNote('C'), null);
  assert.equal(noteName(60), 'C4');
});

test('thousands of generated exercises respect pitch, direction, enabled intervals and counts', () => {
  const random = seeded(74);
  for (const direction of ['ascending', 'descending', 'harmonic', 'mixed']) {
    for (const count of [2, 3, 4, 6, 8]) {
      const config = { ...DEFAULTS, direction, low: 36, high: 84, minNotes: count, maxNotes: count };
      for (let i = 0; i < 100; i++) {
        const q = generateQuestion(config, {}, random);
        assert.ok(q.notes.every(n => n >= 36 && n <= 84));
        assert.equal(q.notes.length, direction === 'harmonic' ? Math.min(6, count) : count);
        assert.equal(q.answers.length, q.notes.length - 1);
        assert.ok(q.answers.every(n => config.intervals.includes(n)));
        assert.deepEqual(notesFromIntervals(q, q.answers), q.notes);
        assert.equal(new Set(q.notes).size, q.notes.length);
        assert.equal(gradeAnswer(q, q.answers, 'interval').correct, true);
        assert.equal(gradeAnswer(q, q.notes.slice(1), 'piano').correct, true);
        for (let n = 1; n < q.notes.length; n++) assert.ok(q.direction === 'descending' ? q.notes[n] < q.notes[n - 1] : q.notes[n] > q.notes[n - 1]);
      }
    }
  }
});

test('fixed references, variable lengths and compound intervals remain valid', () => {
  const random = seeded(9);
  const counts = new Set();
  for (let i = 0; i < 100; i++) {
    const q = generateQuestion({ ...DEFAULTS, direction: 'descending', reference: 'fixed', referenceNote: 84, low: 36, high: 84, minNotes: 2, maxNotes: 4, intervals: [7, 12, 19, 24] }, {}, random);
    assert.equal(q.notes[0], 84);
    assert.ok(Math.min(...q.notes) >= 36);
    counts.add(q.count);
  }
  assert.deepEqual([...counts].sort(), [2, 3, 4]);
});

test('infeasible settings terminate with a useful error', () => {
  assert.throws(() => generateQuestion({ ...DEFAULTS, intervals: [] }), /at least one/);
  assert.throws(() => generateQuestion({ ...DEFAULTS, intervals: [12], minNotes: 8, maxNotes: 8 }), /do not fit/);
  assert.throws(() => generateQuestion({ ...DEFAULTS, direction: 'harmonic', intervals: [7], minNotes: 3, maxNotes: 3 }), /do not fit/);
  assert.throws(() => generateQuestion({ ...DEFAULTS, reference: 'fixed', referenceNote: 72 }), /do not fit/);
});

test('harmonic pitches are unordered, melodic pitches are ordered, partial grading is explicit', () => {
  const q = { direction: 'harmonic', reference: 60, notes: [60, 64, 67], answers: [4, 7] };
  assert.equal(gradeAnswer(q, [67, 64], 'piano').correct, true);
  assert.deepEqual(gradeAnswer(q, [3, 7], 'interval').parts, [false, true]);
  assert.equal(gradeAnswer({ ...q, direction: 'ascending' }, [67, 64], 'piano').correct, false);
  assert.equal(gradeAnswer(q, [4, 7, 12], 'interval').correct, false);
  assert.deepEqual(gradeAnswer(q, [], 'interval').parts, [false, false]);
});

test('persisted settings are bounded and invalid values do not reach audio', () => {
  const s = sanitizeSettings({ low: 90, high: 0, velocity: 999, minNotes: 99, maxNotes: -3, direction: 'harmonic', intervals: [1, 1, 200, '4'], instrument: 'unknown' });
  assert.equal(s.low, 83);
  assert.equal(s.high, 84);
  assert.equal(s.velocity, 127);
  assert.equal(s.minNotes, 6);
  assert.equal(s.maxNotes, 6);
  assert.deepEqual(s.intervals, [1]);
  assert.equal(s.instrument, 'salamander');
});

test('pitch reproduction tracks successive relationships separately from note positions', () => {
  const q = { direction: 'ascending', reference: 60, notes: [60, 64, 67], answers: [4, 3] };
  const result = gradeAnswer(q, [63, 67], 'piano');
  assert.deepEqual(result.parts, [false, true]);
  assert.deepEqual(result.relationships, [false, false]);
});

test('a later interval receives credit even when the first mistake shifts both pitches', () => {
  const q = { direction: 'descending', reference: 72, notes: [72, 65, 58], answers: [7, 7] };
  const result = gradeAnswer(q, [67, 60], 'piano');
  assert.equal(result.correct, false);
  assert.deepEqual(result.parts, [false, false]);
  assert.deepEqual(result.relationships, [false, true]);
  assert.deepEqual(result.steps.map(s => s.delta), [-5, -7]);
  assert.equal(result.steps[1].noteCorrect, false);
});

test('interval size and direction are explicit, including the reported descending example', () => {
  const q = { direction: 'descending', reference: 72, notes: [72, 65, 58], answers: [7, 7] };
  const screenshot = gradeAnswer(q, [67, 72], 'piano');
  assert.deepEqual(screenshot.steps.map(s => s.delta), [-5, 5]);
  assert.deepEqual(screenshot.relationships, [false, false]);
  const reversed = gradeAnswer(q, [65, 72], 'piano');
  assert.equal(reversed.steps[1].sizeCorrect, true);
  assert.equal(reversed.steps[1].correct, false);
});

test('harmonic partial credit matches notes irrespective of missing lower voices', () => {
  const q = { direction: 'harmonic', reference: 60, notes: [60, 64, 67], answers: [4, 7] };
  const pitches = gradeAnswer(q, [67, 72], 'piano');
  assert.deepEqual(pitches.parts, [false, true]);
  assert.deepEqual(pitches.relationships, [false, true]);
  assert.deepEqual(pitches.steps.map(s => s.to), [72, 67]);
  const intervals = gradeAnswer(q, [7, 12], 'interval');
  assert.deepEqual(intervals.relationships, [false, true]);
  assert.deepEqual(gradeAnswer(q, [7, 7], 'interval').parts, [false, true]);
  assert.equal(gradeAnswer(q, [7, 7], 'interval').correct, false);
});
