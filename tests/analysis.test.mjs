import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseNotes, describeInterval, harmonicModel, nearbyHarmonics } from '../ear-training/analysis.mjs';

test('all cross intervals include inner pairs, compound intervals, and doubled thirds', () => {
  const data = analyseNotes([60, 64, 67, 76]);
  assert.equal(data.pairs.length, 6);
  assert.ok(data.pairs.some(p => p.low === 64 && p.high === 67 && p.short === 'm3'));
  assert.ok(data.pairs.some(p => p.low === 60 && p.high === 76 && p.short === 'M10'));
  assert.ok(data.facts.some(f => f.title === 'doubled third'));
  assert.ok(data.facts.some(f => f.title === 'stacked thirds'));
  assert.ok(data.facts.some(f => f.title === 'octave doubling'));
});

test('doubled thirds are identified relative to a triad root, not automatically the bass', () => {
  assert.ok(analyseNotes([52, 55, 60, 64]).facts.some(f => f.title === 'doubled third'));
  assert.ok(!analyseNotes([60, 64, 68]).facts.some(f => f.title === 'doubled third'));
  assert.ok(!analyseNotes([60, 63, 75]).facts.some(f => f.title === 'doubled third'));
});

test('chromatic names cover the entire supported piano range', () => {
  assert.equal(describeInterval(0).name, 'unison');
  assert.equal(describeInterval(28).short, 'M17');
  assert.equal(describeInterval(36).short, 'P22');
  assert.equal(describeInterval(48).short, 'P29');
  assert.equal(describeInterval(-7).name, 'perfect fifth');
  const data = analyseNotes(Array.from({ length: 49 }, (_, i) => i + 36));
  assert.equal(data.pairs.length, 49 * 48 / 2);
  assert.equal(data.groups.length, 48);
  assert.equal(analyseNotes([60, 60, 72]).pairs.length, 1);
});

test('ideal harmonics and nearby pairs use frequencies, not invented sample amplitudes', () => {
  const model = harmonicModel([69]);
  assert.deepEqual(model[0].partials[0], { harmonic: 1, hz: 440 });
  assert.equal(model[0].partials[7].hz, 3520);
  assert.equal(harmonicModel([69], 100)[0].partials.length, 16);
  const octave = nearbyHarmonics([60, 72])[0];
  assert.equal(octave.a.harmonic, 2);
  assert.equal(octave.b.harmonic, 1);
  assert.equal(octave.difference, 0);
  const third = nearbyHarmonics([60, 64])[0];
  assert.equal(third.a.harmonic, 5);
  assert.equal(third.b.harmonic, 4);
  assert.ok(third.difference > 10 && third.difference < 11);
});
