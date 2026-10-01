import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseNotes, describeInterval, harmonicModel, nearbyHarmonics, voicingIntervals } from '../ear-training/analysis.mjs';

test('voicing views distinguish bass distances from neighboring gaps', () => {
  for (const [notes, bass, adjacent] of [
    [[67, 76, 77], ['M6', 'm7'], ['M6', 'm2']],
    [[60, 64, 67], ['M3', 'P5'], ['M3', 'm3']],
    [[64, 67, 72], ['m3', 'm6'], ['m3', 'P4']],
    [[67, 72, 76], ['P4', 'M6'], ['P4', 'M3']],
    [[60, 67, 76], ['P5', 'M10'], ['P5', 'M6']],
    [[60, 64, 67, 72], ['M3', 'P5', 'P8'], ['M3', 'm3', 'P4']],
    [[60, 66, 72], ['TT', 'P8'], ['TT', 'TT']],
    [[60, 60, 72], ['P1', 'P8'], ['P1', 'P8']],
    [[60, 67], ['P5'], ['P5']],
  ]) {
    assert.deepEqual(voicingIntervals(notes).map(pair => pair.short), bass);
    assert.deepEqual(voicingIntervals(notes, 'adjacent').map(pair => pair.short), adjacent);
  }
});

test('voicing views retain voice indices when pitches are unordered or incomplete', () => {
  const notes = [67, 77, undefined, 76];
  const pairs = voicingIntervals(notes, 'adjacent');
  assert.deepEqual(pairs.map(({ from, to, fromIndex, toIndex }) => [from, to, fromIndex, toIndex]), [[67, 76, 0, 3], [76, 77, 3, 1]]);
  assert.deepEqual(notes, [67, 77, undefined, 76]);
  assert.deepEqual(voicingIntervals([60]), []);
});

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
