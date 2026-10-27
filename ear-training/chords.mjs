import { sanitizeSettings } from './theory.mjs';
import { instrumentById } from './instruments.mjs';

// Explicit sounding formulas, not a parser for every possible lead-sheet symbol.
// Extensions retain their theoretical roles even when folded into close position.
const ROLE = { '1': 0, 'b3': 3, '3': 4, 'b5': 6, '5': 7, '#5': 8, '6': 9, 'bb7': 9, 'b7': 10, '7': 11, '2': 2, '4': 5, 'b9': 13, '9': 14, '#9': 15, '11': 17, '#11': 18, 'b13': 20, '13': 21 };
const chord = (id, symbol, name, group, family, formula) => Object.freeze({ id, symbol, name, group, family,
  tones: Object.freeze(formula.split(' ').map(role => Object.freeze({ role, semitones: ROLE[role] }))) });
export const CHORDS = Object.freeze([
  chord('major', '', 'major', 'triads', 'major', '1 3 5'),
  chord('minor', 'm', 'minor', 'triads', 'minor', '1 b3 5'),
  chord('dim', 'dim', 'diminished', 'triads', 'diminished', '1 b3 b5'),
  chord('aug', '+', 'augmented', 'triads', 'augmented', '1 3 #5'),
  chord('maj7', 'maj7', 'major seventh', 'sevenths', 'major', '1 3 5 7'),
  chord('7', '7', 'dominant seventh', 'sevenths', 'major', '1 3 5 b7'),
  chord('m7', 'm7', 'minor seventh', 'sevenths', 'minor', '1 b3 5 b7'),
  chord('m7b5', 'ø7', 'half-diminished / minor seven flat five', 'sevenths', 'diminished', '1 b3 b5 b7'),
  chord('dim7', 'dim7', 'diminished seventh', 'sevenths', 'diminished', '1 b3 b5 bb7'),
  chord('mMaj7', 'm(maj7)', 'minor-major seventh', 'sevenths', 'minor', '1 b3 5 7'),
  chord('augMaj7', '+maj7', 'augmented major seventh', 'sevenths', 'augmented', '1 3 #5 7'),
  chord('sus2', 'sus2', 'suspended second', 'colours', 'suspended', '1 2 5'),
  chord('sus4', 'sus4', 'suspended fourth', 'colours', 'suspended', '1 4 5'),
  chord('7sus4', '7sus4', 'seventh suspended fourth', 'colours', 'suspended', '1 4 5 b7'),
  chord('6', '6', 'major sixth', 'colours', 'major', '1 3 5 6'),
  chord('m6', 'm6', 'minor sixth', 'colours', 'minor', '1 b3 5 6'),
  chord('add9', 'add9', 'major add nine', 'colours', 'major', '1 3 5 9'),
  chord('madd9', 'm(add9)', 'minor add nine', 'colours', 'minor', '1 b3 5 9'),
  chord('6add9', '6/9', 'six nine', 'colours', 'major', '1 3 5 6 9'),
  chord('maj9', 'maj9', 'major ninth', 'extensions', 'major', '1 3 5 7 9'),
  chord('9', '9', 'dominant ninth', 'extensions', 'major', '1 3 5 b7 9'),
  chord('m9', 'm9', 'minor ninth', 'extensions', 'minor', '1 b3 5 b7 9'),
  chord('11', '11', 'dominant eleventh', 'extensions', 'major', '1 3 5 b7 9 11'),
  chord('m11', 'm11', 'minor eleventh', 'extensions', 'minor', '1 b3 5 b7 9 11'),
  chord('13', '13', 'dominant thirteenth (no 11)', 'extensions', 'major', '1 3 5 b7 9 13'),
  chord('maj13', 'maj13', 'major thirteenth (no 11)', 'extensions', 'major', '1 3 5 7 9 13'),
  chord('m13', 'm13', 'minor thirteenth', 'extensions', 'minor', '1 b3 5 b7 9 11 13'),
  chord('7b5', '7(♭5)', 'dominant seven flat five', 'alterations', 'major', '1 3 b5 b7'),
  chord('7#5', '7(♯5)', 'dominant seven sharp five', 'alterations', 'augmented', '1 3 #5 b7'),
  chord('7b9', '7(♭9)', 'dominant seven flat nine', 'alterations', 'major', '1 3 5 b7 b9'),
  chord('7#9', '7(♯9)', 'dominant seven sharp nine', 'alterations', 'major', '1 3 5 b7 #9'),
  chord('7#11', '7(♯11)', 'dominant seven sharp eleven', 'alterations', 'major', '1 3 5 b7 #11'),
  chord('7b13', '7(♭13)', 'dominant seven flat thirteen', 'alterations', 'major', '1 3 5 b7 b13'),
  chord('maj7#11', 'maj7(♯11)', 'major seven sharp eleven', 'alterations', 'major', '1 3 5 7 #11'),
  chord('9#11', '9(♯11)', 'dominant nine sharp eleven', 'alterations', 'major', '1 3 5 b7 9 #11'),
  chord('13b9', '13(♭9)', 'dominant thirteen flat nine (no 11)', 'alterations', 'major', '1 3 5 b7 b9 13'),
  chord('7b9b13', '7(♭9,♭13)', 'dominant seven flat nine flat thirteen', 'alterations', 'major', '1 3 5 b7 b9 b13'),
  chord('7#9b13', '7(♯9,♭13)', 'dominant seven sharp nine flat thirteen', 'alterations', 'major', '1 3 5 b7 #9 b13'),
]);
export const CHORD_GROUPS = ['triads', 'sevenths', 'colours', 'extensions', 'alterations'];
export const chordById = id => CHORDS.find(c => c.id === id);
export const pc = note => ((note % 12) + 12) % 12;
export const pitchClasses = notes => [...new Set(notes.map(pc))].sort((a, b) => a - b);
const equal = (a, b) => a.length === b.length && a.every((n, i) => n === b[i]);
export const pitchName = note => ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][pc(note)];
export const prettyRole = role => role.replaceAll('b', '♭').replaceAll('#', '♯');
export function chordToneName(midi, root, role, octave = true) {
  const letters = 'CDEFGAB', naturals = [0, 2, 4, 5, 7, 9, 11];
  const index = (letters.indexOf(pitchName(root)[0]) + Number(role.replace(/[^0-9]/g, '')) - 1) % 7;
  const alteration = ((pc(midi) - naturals[index] + 18) % 12) - 6;
  const accidental = alteration < 0 ? '♭'.repeat(-alteration) : '♯'.repeat(alteration);
  return `${letters[index]}${accidental}${octave ? Math.floor((midi - alteration) / 12) - 1 : ''}`;
}
export const bassKind = role => role === '1' ? 'root' : /3$/.test(role) && !/13/.test(role) ? 'third' : /5$/.test(role) ? 'fifth' : /7$/.test(role) ? 'seventh' : 'colour';
export const BASS_OPTIONS = [['root', 'root position'], ['third', 'third in bass · first inversion'], ['fifth', 'fifth in bass · second inversion'], ['seventh', 'seventh in bass · third inversion'], ['colour', 'sixth, suspension or extension in bass']];
export const CHORD_DEFAULTS = Object.freeze({
  chordIds: ['major', 'minor'], task: 'name', answerWith: 'piano', rootCue: 'given', rootPitch: 'random',
  bassKinds: ['root'], spacing: 'close', doubling: false, omission: 'none',
  low: 48, high: 84, duration: 1.5, adaptive: true,
});
export function sanitizeChordSettings(raw = {}) {
  const s = { ...sanitizeSettings({ ...CHORD_DEFAULTS, ...raw, direction: 'harmonic', maxNotes: 8 }), ...CHORD_DEFAULTS, ...raw };
  // Audio constraints come from the same sanitizer as interval practice.
  const audio = sanitizeSettings({ ...s, direction: 'harmonic' });
  for (const key of ['low', 'high', 'instrument', 'instrumentPool', 'varyInstrument', 'perNoteInstruments', 'velocity', 'varyDynamics', 'dynamicSpread', 'duration', 'gap', 'room', 'ambience', 'volume']) s[key] = audio[key];
  s.direction = 'harmonic'; s.maxNotes = 8;
  for (const [key, values] of Object.entries({ task: ['name', 'inversion', 'tones', 'voicing'], answerWith: ['piano', 'fretboard', 'note'], rootCue: ['given', 'unknown'], spacing: ['close', 'open', 'mixed'], omission: ['none', 'fifth', 'root'] })) {
    if (!values.includes(s[key])) s[key] = CHORD_DEFAULTS[key];
  }
  s.chordIds = Array.isArray(s.chordIds) ? [...new Set(s.chordIds.filter(id => chordById(id)))] : [...CHORD_DEFAULTS.chordIds];
  s.bassKinds = Array.isArray(s.bassKinds) ? [...new Set(s.bassKinds.filter(id => BASS_OPTIONS.some(([value]) => value === id)))] : ['root'];
  s.rootPitch = s.rootPitch !== 'random' && Number.isInteger(Number(s.rootPitch)) && Number(s.rootPitch) >= 0 && Number(s.rootPitch) < 12 ? Number(s.rootPitch) : 'random';
  s.doubling = s.doubling === true; s.adaptive = s.adaptive !== false; s.audition = s.audition === true;
  if (s.omission === 'root' || ['tones', 'voicing'].includes(s.task)) s.rootCue = 'given';
  if (s.answerWith === 'fretboard' && ['tones', 'voicing'].includes(s.task)) { s.low = Math.max(40, s.low); s.high = Math.max(s.low + 1, s.high); }
  return s;
}
export const CHORD_CHALLENGES = [
  { id: 'first', name: 'first chords', description: 'major & minor · close root position', settings: { chordIds: ['major', 'minor'] } },
  { id: 'triads', name: 'four triad qualities', description: 'major, minor, diminished & augmented', settings: { chordIds: ['major', 'minor', 'dim', 'aug'] } },
  { id: 'shapes', name: 'same chord, new shape', description: 'inversions · close & open', settings: { chordIds: ['major', 'minor', 'dim', 'aug'], task: 'inversion', bassKinds: ['root', 'third', 'fifth'], spacing: 'mixed' } },
  { id: 'sevenths', name: 'seventh chords', description: 'five essential seventh qualities', settings: { chordIds: ['maj7', '7', 'm7', 'm7b5', 'dim7'] } },
  { id: 'colours', name: 'added colours', description: 'suspensions, sixths & added notes', settings: { chordIds: CHORDS.filter(c => c.group === 'colours').map(c => c.id) } },
  { id: 'extensions', name: 'extensions', description: '9ths, 11ths & 13ths', settings: { chordIds: CHORDS.filter(c => c.group === 'extensions').map(c => c.id), spacing: 'mixed' } },
  { id: 'alterations', name: 'alterations', description: 'altered fifths, ninths, elevenths & thirteenths', settings: { chordIds: CHORDS.filter(c => c.group === 'alterations').map(c => c.id), spacing: 'mixed' } },
];
export function chordChallengeSettings(id, preferences = {}, overrides = {}) {
  const preset = CHORD_CHALLENGES.find(c => c.id === id);
  if (!preset) return sanitizeChordSettings(preferences);
  const sound = Object.fromEntries(['instrument', 'instrumentPool', 'varyInstrument', 'perNoteInstruments', 'velocity', 'varyDynamics', 'dynamicSpread', 'duration', 'gap', 'room', 'ambience', 'volume', 'answerWith'].filter(key => preferences[key] !== undefined).map(key => [key, preferences[key]]));
  return sanitizeChordSettings({ ...CHORD_DEFAULTS, ...sound, ...preset.settings, ...overrides });
}
export function soundingTones(chord, omission = 'none') {
  return chord.tones.filter(t => !(omission === 'root' && t.role === '1') && !(omission === 'fifth' && t.role === '5'));
}

// Finite templates plus valid transposition bounds: impossible settings cannot loop.
export function chordCandidates(raw) {
  const s = sanitizeChordSettings(raw), candidates = [];
  for (const id of s.chordIds) {
    const c = chordById(id), tones = soundingTones(c, s.omission);
    for (const bass of tones.filter(t => s.bassKinds.includes(bassKind(t.role)))) {
      const compact = tones.map(t => ({ ...t, offset: pc(bass.semitones) + pc(t.semitones - bass.semitones) })).sort((a, b) => a.offset - b.offset);
      for (const spacing of s.spacing === 'mixed' ? ['close', 'open'] : [s.spacing]) {
        let voices = compact.map((t, i) => ({ ...t, offset: t.offset + (spacing === 'open' && i > 0 && i % 2 ? 12 : 0) }));
        if (s.doubling) voices.push({ ...voices[0], offset: voices[0].offset + 12 });
        voices = [...new Map(voices.map(t => [t.offset, t])).values()].sort((a, b) => a.offset - b.offset);
        const min = s.low - voices[0].offset, max = s.high - voices.at(-1).offset;
        const roots = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i).filter(root => s.rootPitch === 'random' || pc(root) === s.rootPitch);
        if (roots.length) candidates.push({ chordId: id, bassRole: bass.role, spacing, voices, roots });
      }
    }
  }
  return candidates;
}
function choose(items, random) { return items[Math.min(items.length - 1, Math.floor(random() * items.length))]; }
export function generateChordQuestion(raw, history = {}, random = Math.random) {
  const s = sanitizeChordSettings(raw);
  if (!s.chordIds.length) throw new Error('Choose at least one chord.');
  if (!s.bassKinds.length) throw new Error('Choose at least one bass position.');
  if (s.perNoteInstruments && s.instrumentPool.length < 2) throw new Error('Choose at least two instruments for different instruments per note.');
  const candidates = chordCandidates(s);
  const feasibleIds = [...new Set(candidates.map(c => c.chordId))];
  // Never silently drop selected chord qualities because a voicing does not fit.
  const missing = s.chordIds.filter(id => !feasibleIds.includes(id));
  if (missing.length) throw new Error(`No matching voicing for ${missing.map(id => chordById(id).name).join(', ')}. Widen the range or change bass positions / omissions.`);
  const weights = feasibleIds.map(id => 1 + (s.adaptive ? Math.min(3, Math.max(0, Number(history[id]?.misses) || 0)) : 0));
  let draw = random() * weights.reduce((a, b) => a + b, 0), id = feasibleIds.at(-1);
  for (let i = 0; i < feasibleIds.length; i++) if ((draw -= weights[i]) < 0) { id = feasibleIds[i]; break; }
  const template = choose(candidates.filter(c => c.chordId === id), random), root = choose(template.roots, random);
  const notes = template.voices.map(t => root + t.offset);
  const ranges = (s.varyInstrument || s.perNoteInstruments ? s.instrumentPool : [s.instrument]).map(id => instrumentById(id).range);
  const rangeLow = Math.max(...ranges.map(r => r[0])), rangeHigh = Math.min(...ranges.map(r => r[1]));
  let rootNote = root;
  while (rootNote < rangeLow) rootNote += 12;
  while (rootNote > rangeHigh) rootNote -= 12;
  return { id: `${Date.now()}-${Math.floor(random() * 1e9)}`, chordId: id, root: pc(root), rootNote,
    notes, roles: template.voices.map(t => t.role), bassRole: template.bassRole,
    spacing: template.spacing, omission: s.omission, rootCue: s.rootCue, task: s.task,
    reference: s.task === 'voicing' ? notes[0] : rootNote };
}

export function chordInterpretations(notes, { root = null, omission = 'none' } = {}) {
  if (!notes.length) return [];
  const actual = pitchClasses(notes), bass = Math.min(...notes), results = [];
  for (let r = 0; r < 12; r++) {
    if (root !== null && pc(root) !== r) continue;
    for (const c of CHORDS) {
      const tones = soundingTones(c, omission);
      if (!equal(actual, pitchClasses(tones.map(t => r + t.semitones)))) continue;
      const bassRole = tones.find(t => pc(r + t.semitones) === pc(bass))?.role;
      if (bassRole) results.push({ chordId: c.id, root: r, bassRole });
    }
  }
  return results;
}
export function interpretationName(value, bass = null) {
  const c = chordById(value.chordId);
  const role = value.bassRole || c.tones.find(t => pc(value.root + t.semitones) === pc(bass))?.role;
  return `${pitchName(value.root)}${c.symbol}${bass !== null && pc(bass) !== pc(value.root) ? `/${role ? chordToneName(bass, value.root, role, false) : pitchName(bass)}` : ''}`;
}
export function gradeChordAnswer(q, answer = {}) {
  const interpretations = chordInterpretations(q.notes, { root: q.rootCue === 'given' ? q.root : null, omission: q.omission });
  const submitted = [...new Set((answer.notes || []).filter(n => Number.isInteger(n) && n >= 0 && n <= 127))].sort((a, b) => a - b);
  const isPitches = q.task === 'tones' || q.task === 'voicing';
  if (isPitches) {
    const expected = q.task === 'tones' ? pitchClasses(q.notes) : q.notes;
    const actual = q.task === 'tones' ? pitchClasses(submitted) : submitted;
    const parts = expected.map(n => actual.includes(n));
    return { correct: equal(expected, actual), parts, expected, submitted, interpretations,
      extra: actual.filter(n => !expected.includes(n)), matches: parts.filter(Boolean).length };
  }
  const matches = interpretations.filter(i => i.chordId === answer.chordId);
  const qualityCorrect = matches.length > 0;
  const inversionCorrect = matches.some(i => bassKind(i.bassRole) === answer.bassKind);
  const selected = chordById(answer.chordId), target = chordById(q.chordId);
  const familyCorrect = qualityCorrect || (!!selected && selected.family === target.family);
  const parts = [qualityCorrect, ...(q.task === 'inversion' ? [inversionCorrect] : [])];
  return { correct: parts.every(Boolean), parts, qualityCorrect, inversionCorrect, familyCorrect, submitted,
    answer: { chordId: answer.chordId, bassKind: answer.bassKind }, interpretations };
}

// Match the heard register and bass role where possible for useful A/B feedback.
export function chordComparison(q, answer, settings) {
  if (q.task === 'tones' || q.task === 'voicing') return [...(answer.notes || [])].sort((a, b) => a - b);
  if (!chordById(answer.chordId)) return [];
  const accepted = chordInterpretations(q.notes, { root: q.rootCue === 'given' ? q.root : null, omission: q.omission }).find(i => i.chordId === answer.chordId && (q.task !== 'inversion' || bassKind(i.bassRole) === answer.bassKind));
  if (accepted) return [...q.notes];
  let candidates = chordCandidates({ ...settings, chordIds: [answer.chordId], rootPitch: q.root, bassKinds: [answer.bassKind || bassKind(q.bassRole)], spacing: q.spacing });
  if (!candidates.length) candidates = chordCandidates({ ...settings, chordIds: [answer.chordId], rootPitch: q.root, bassKinds: ['root', 'third', 'fifth', 'seventh', 'colour'], spacing: 'mixed' });
  return candidates.flatMap(c => c.roots.map(root => c.voices.map(t => root + t.offset)))
    .sort((a, b) => Math.abs(a[0] - q.notes[0]) - Math.abs(b[0] - q.notes[0]))[0] || [];
}
