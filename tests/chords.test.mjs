import test from 'node:test';
import assert from 'node:assert/strict';
import { CHORDS, CHORD_CHALLENGES, chordById, chordChallengeSettings, sanitizeChordSettings, generateChordQuestion, chordInterpretations, gradeChordAnswer, chordComparison, chordToneName, pitchClasses, bassKind, pc } from '../ear-training/chords.mjs';

const question = (notes, extra = {}) => ({ chordId: '6', root: 0, notes, rootCue: 'unknown', omission: 'none', task: 'name', bassRole: '1', spacing: 'close', ...extra });
test('catalog formulas distinguish additions, extensions, and altered tones', () => {
  const formula = id => chordById(id).tones.map(t => t.semitones);
  assert.deepEqual(formula('add9'), [0, 4, 7, 14]);
  assert.deepEqual(formula('9'), [0, 4, 7, 10, 14]);
  assert.deepEqual(formula('7#5'), [0, 4, 8, 10]);
  assert.deepEqual(formula('7b13'), [0, 4, 7, 10, 20]);
  assert.deepEqual(formula('7#9'), [0, 4, 7, 10, 15]);
  assert.deepEqual(formula('m13'), [0, 3, 7, 10, 14, 17, 21]);
  assert.ok(chordById('13').name.includes('no 11'));
  assert.equal(new Set(CHORDS.map(c => c.id)).size, CHORDS.length);
});
test('feedback spells altered chord members by role, including enharmonic octaves', () => {
  assert.equal(chordToneName(63, 0, '#9'), 'D♯4');
  assert.equal(chordToneName(69, 0, 'bb7'), 'B♭♭4');
  assert.equal(chordToneName(60, 8, '3'), 'C4');
  assert.equal(chordToneName(60, 1, '7'), 'C4');
  assert.equal(chordToneName(65, 6, '7'), 'E♯4');
  assert.equal(chordToneName(71, 3, 'b13'), 'C♭5');
});
test('challenge presets preserve sound preferences without carrying interval constraints', () => {
  const s = chordChallengeSettings('extensions', { duration: 2.8, low: 60, high: 62, instrument: 'rhodes', answerWith: 'fretboard' });
  assert.equal(s.duration, 2.8); assert.equal(s.low, 48); assert.equal(s.high, 84); assert.equal(s.instrument, 'rhodes');
  assert.equal(s.answerWith, 'fretboard');
});
test('every quality fits across close/open voicings, all bass roles and roots', () => {
  for (const c of CHORDS) for (const tone of c.tones) for (const spacing of ['close', 'open']) for (const rootPitch of [0, 1, 6, 11]) {
    const q = generateChordQuestion({ chordIds: [c.id], bassKinds: [bassKind(tone.role)], spacing, rootPitch, low: 36, high: 84, doubling: true }, {}, () => .41);
    assert.equal(q.root, rootPitch);
    assert.ok(q.notes.every(n => n >= 36 && n <= 84));
    assert.deepEqual(q.notes, [...new Set(q.notes)].sort((a, b) => a - b));
    assert.equal(q.notes.length, q.roles.length);
    assert.equal(bassKind(q.bassRole), bassKind(tone.role));
    assert.deepEqual(pitchClasses(q.notes), pitchClasses(c.tones.map(t => rootPitch + t.semitones)));
    assert.equal(pc(q.rootNote), rootPitch);
    assert.ok(gradeChordAnswer(q, { chordId: c.id }).correct);
  }
});
test('all challenge presets generate valid, complete single chords', () => {
  for (const c of CHORD_CHALLENGES) {
    const settings = chordChallengeSettings(c.id);
    for (let i = 0; i < 10; i++) {
      const q = generateChordQuestion(settings);
      assert.ok(settings.chordIds.includes(q.chordId));
      assert.ok(gradeChordAnswer(q, { chordId: q.chordId, bassKind: bassKind(q.bassRole) }).correct);
    }
  }
});
test('sixth / seventh equivalents are accepted only with a compatible root contract', () => {
  const q = question([60, 64, 67, 69]);
  assert.ok(gradeChordAnswer(q, { chordId: 'm7' }).correct);
  assert.ok(!gradeChordAnswer({ ...q, rootCue: 'given' }, { chordId: 'm7' }).correct);
  const inversions = { ...q, task: 'inversion' };
  assert.ok(gradeChordAnswer(inversions, { chordId: 'm7', bassKind: 'third' }).correct);
  assert.ok(!gradeChordAnswer(inversions, { chordId: 'm7', bassKind: 'root' }).correct);
  assert.ok(gradeChordAnswer(inversions, { chordId: '6', bassKind: 'root' }).correct);
});
test('minor sixth and half diminished equivalence uses different roots', () => {
  const names = chordInterpretations([60, 63, 67, 69]);
  assert.ok(names.some(n => n.chordId === 'm6' && n.root === 0));
  assert.ok(names.some(n => n.chordId === 'm7b5' && n.root === 9));
  assert.ok(!names.some(n => n.chordId === 'm7b5' && n.root === 0));
});
test('symmetric chords do not require a hidden root or inversion', () => {
  const q = question([60, 64, 68], { chordId: 'aug', task: 'inversion' });
  for (const bassKind of ['root', 'third', 'fifth']) assert.ok(gradeChordAnswer(q, { chordId: 'aug', bassKind }).correct);
  assert.ok(!gradeChordAnswer({ ...q, rootCue: 'given' }, { chordId: 'aug', bassKind: 'third' }).correct);
  assert.equal(chordInterpretations([60, 63, 66, 69]).filter(i => i.chordId === 'dim7').length, 4);
});
test('suspended second and fourth are alternate interpretations', () => {
  const q = question([60, 62, 67], { chordId: 'sus2' });
  assert.ok(gradeChordAnswer(q, { chordId: 'sus4' }).correct);
});
test('omission rules preserve altered fifths and require a root cue for rootless chords', () => {
  const q = generateChordQuestion({ chordIds: ['7b5'], omission: 'fifth' });
  assert.equal(q.notes.length, 4);
  const s = sanitizeChordSettings({ chordIds: ['9'], omission: 'root', rootCue: 'unknown', bassKinds: ['third'] });
  assert.equal(s.rootCue, 'given');
  const rootless = generateChordQuestion(s);
  assert.ok(!pitchClasses(rootless.notes).includes(rootless.root));
  assert.ok(gradeChordAnswer(rootless, { chordId: '9' }).correct);
  const altered = question([60, 64, 68, 70], { chordId: '7#5', rootCue: 'given', omission: 'fifth' });
  assert.ok(gradeChordAnswer(altered, { chordId: '7b13' }).correct);
});
test('tone reconstruction ignores octave doubling but exact voicing does not', () => {
  const q = question([48, 60, 64, 67], { task: 'tones', chordId: 'major' });
  assert.ok(gradeChordAnswer(q, { notes: [60, 64, 67] }).correct);
  const exact = gradeChordAnswer({ ...q, task: 'voicing' }, { notes: [60, 64, 67] });
  assert.equal(exact.correct, false); assert.equal(exact.matches, 3);
  const extra = gradeChordAnswer(q, { notes: [60, 64, 67, 70] });
  assert.equal(extra.correct, false); assert.deepEqual(extra.extra, [10]);
});
test('partial credit separates quality and bass position', () => {
  const q = question([64, 67, 72], { task: 'inversion', chordId: 'major', rootCue: 'given', bassRole: '3' });
  const result = gradeChordAnswer(q, { chordId: 'major', bassKind: 'fifth' });
  assert.deepEqual(result.parts, [true, false]);
});
test('impossible exercises fail promptly without silently dropping chord types', () => {
  assert.throws(() => generateChordQuestion({ chordIds: [] }), /at least one chord/);
  assert.throws(() => generateChordQuestion({ bassKinds: [] }), /bass position/);
  assert.throws(() => generateChordQuestion({ omission: 'root', bassKinds: ['root'] }), /No matching voicing/);
  assert.throws(() => generateChordQuestion({ chordIds: ['major', 'm13'], low: 60, high: 67 }), /minor thirteenth/);
  assert.throws(() => generateChordQuestion({ perNoteInstruments: true, instrumentPool: ['salamander'] }), /two instruments/);
});
test('comparisons preserve equivalent audio and construct wrong answers in range', () => {
  const q = question([60, 64, 67, 69]);
  assert.deepEqual(chordComparison(q, { chordId: 'm7' }, {}), q.notes);
  const wrong = chordComparison(q, { chordId: '7' }, sanitizeChordSettings({ low: 48, high: 84 }));
  assert.deepEqual(pitchClasses(wrong), [0, 4, 7, 10]);
});
test('sanitization isolates chord settings from interval settings', () => {
  const s = sanitizeChordSettings({ input: 'interval', chordIds: ['major', 'bogus', 'major'], task: 'bad', bassKinds: ['root', 'wrong'], high: 200 });
  assert.deepEqual(s.chordIds, ['major']); assert.deepEqual(s.bassKinds, ['root']);
  assert.equal(s.task, 'name'); assert.ok(s.high <= 84);
});
