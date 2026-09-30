import { INSTRUMENTS, instrumentById } from './instruments.mjs';

export const INTERVALS = [
  [1, 'm2', 'minor second'], [2, 'M2', 'major second'], [3, 'm3', 'minor third'],
  [4, 'M3', 'major third'], [5, 'P4', 'perfect fourth'], [6, 'TT', 'tritone'],
  [7, 'P5', 'perfect fifth'], [8, 'm6', 'minor sixth'], [9, 'M6', 'major sixth'],
  [10, 'm7', 'minor seventh'], [11, 'M7', 'major seventh'], [12, 'P8', 'octave'],
  [13, 'm9', 'minor ninth'], [14, 'M9', 'major ninth'], [15, 'm10', 'minor tenth'],
  [16, 'M10', 'major tenth'], [17, 'P11', 'perfect eleventh'], [18, 'A11', 'augmented eleventh'],
  [19, 'P12', 'perfect twelfth'], [20, 'm13', 'minor thirteenth'], [21, 'M13', 'major thirteenth'],
  [22, 'm14', 'minor fourteenth'], [23, 'M14', 'major fourteenth'], [24, 'P15', 'double octave'],
].map(([semitones, short, name]) => ({ semitones, short, name }));

export const MAX_NOTE_DURATION = 12;

export const DEFAULTS = Object.freeze({
  direction: 'ascending', minNotes: 2, maxNotes: 2, low: 48, high: 72,
  intervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  input: 'piano', inputDefaultVersion: 2, instrument: 'salamander', velocity: 68,
  duration: 0.8, gap: 0.25, room: 'studio', ambience: 0.2, volume: 0.65,
  audition: false, adaptive: true, reference: 'random', referenceNote: 60,
  hint: 'alternate', varyInstrument: false, instrumentPool: ['salamander', 'rhodes', 'guitar-electric'],
  varyDynamics: false, dynamicSpread: 12, perNoteInstruments: false,
});

export function sanitizeSettings(raw = {}) {
  const s = { ...DEFAULTS, ...raw };
  for (const [key, allowed] of Object.entries({
    direction: ['ascending', 'descending', 'harmonic', 'melodic', 'mixed'],
    input: ['interval', 'piano', 'fretboard', 'note'], instrument: INSTRUMENTS.map(instrument => instrument.id),
    room: ['dry', 'studio', 'room', 'hall'], reference: ['random', 'fixed'],
    hint: ['alternate', 'slow', 'none'],
  })) if (!allowed.includes(s[key])) s[key] = DEFAULTS[key];
  for (const [key, min, max] of [
    ['minNotes', 2, 8], ['maxNotes', 2, 8], ['low', 36, 83], ['high', 37, 84],
    ['velocity', 1, 127], ['duration', 0.2, MAX_NOTE_DURATION], ['gap', 0, 2], ['ambience', 0, 0.7],
    ['volume', 0, 1], ['referenceNote', 36, 84],
    ['dynamicSpread', 1, 30],
  ]) s[key] = Math.min(max, Math.max(min, Number.isFinite(Number(s[key])) ? Number(s[key]) : DEFAULTS[key]));
  for (const k of ['minNotes', 'maxNotes', 'low', 'high', 'velocity', 'referenceNote', 'dynamicSpread']) s[k] = Math.round(s[k]);
  if (s.direction === 'harmonic') s.minNotes = Math.min(6, s.minNotes), s.maxNotes = Math.min(6, s.maxNotes);
  s.maxNotes = Math.max(s.minNotes, s.maxNotes);
  s.high = Math.max(s.low + 1, s.high);
  s.varyInstrument = s.varyInstrument === true;
  s.perNoteInstruments = s.perNoteInstruments === true;
  s.varyDynamics = s.varyDynamics === true;
  s.instrumentPool = Array.isArray(s.instrumentPool) ? [...new Set(s.instrumentPool.filter(id => INSTRUMENTS.some(i => i.id === id)))] : [...DEFAULTS.instrumentPool];
  if (!s.instrumentPool.length) s.instrumentPool = [s.instrument];
  const ranges = (s.varyInstrument || s.perNoteInstruments ? s.instrumentPool : [s.instrument]).map(id => instrumentById(id).range);
  const lowest = Math.max(...ranges.map(range => range[0]));
  const highest = Math.min(...ranges.map(range => range[1]));
  s.low = Math.max(lowest, Math.min(highest - 1, s.low));
  s.high = Math.max(s.low + 1, Math.min(highest, s.high));
  s.referenceNote = Math.max(lowest, Math.min(highest, s.referenceNote));
  s.intervals = Array.isArray(s.intervals) ? [...new Set(s.intervals.filter(n => Number.isInteger(n) && n >= 1 && n <= 24))].sort((a, b) => a - b) : [...DEFAULTS.intervals];
  s.adaptive = s.adaptive === true;
  s.audition = s.audition === true;
  return s;
}

export function noteName(midi, flats = false) {
  const names = flats ? ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] : ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}
export function intervalName(n) { return INTERVALS.find(i => i.semitones === n)?.short ?? `${n} st`; }

export function parseInterval(text) {
  const value = String(text).trim();
  if (/^\d+$/.test(value)) { const n = Number(value); return n >= 1 && n <= 24 ? n : null; }
  const exact = INTERVALS.find(i => i.short === value || i.name === value.toLowerCase());
  if (exact) return exact.semitones;
  const normalized = value.replace(/\s+/g, '').replace(/^minor/i, 'm').replace(/^min/i, 'm').replace(/^major/i, 'M').replace(/^maj/i, 'M').replace(/^perfect/i, 'P').replace(/^p/, 'P');
  if (/^(tt|a4|d5|tritone)$/i.test(normalized)) return 6;
  if (/^octave$/i.test(normalized)) return 12;
  return INTERVALS.find(i => i.short === normalized)?.semitones ?? null;
}

export function parseNote(text) {
  const match = String(text).trim().replaceAll('♯', '#').replaceAll('♭', 'b').match(/^([a-g])([#b]?)([0-8])$/i);
  if (!match) return null;
  const midi = (Number(match[3]) + 1) * 12 + { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[match[1].toLowerCase()] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
  return midi >= 0 && midi <= 127 ? midi : null;
}

function pick(values, random) { return values[Math.min(values.length - 1, Math.floor(random() * values.length))]; }
function weighted(values, weight, random) {
  const weights = values.map(weight);
  let target = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < values.length; i++) if ((target -= weights[i]) < 0) return values[i];
  return values.at(-1);
}

// Construct only feasible exercises. No rejection loop, so even extreme settings terminate.
export function generateQuestion(settings, history = {}, random = Math.random) {
  const s = sanitizeSettings(settings);
  if (s.perNoteInstruments && s.instrumentPool.length < 2) throw new Error('Choose at least two instruments for different instruments per note.');
  if (!s.intervals.length) throw new Error('Choose at least one interval in settings.');
  const directions = s.direction === 'mixed' ? ['ascending', 'descending', 'harmonic'] : s.direction === 'melodic' ? ['ascending', 'descending'] : [s.direction];
  const candidates = [];
  for (const direction of directions) {
    const maxCount = direction === 'harmonic' ? Math.min(6, s.maxNotes) : s.maxNotes;
    for (let count = s.minNotes; count <= maxCount; count++) {
      const distance = direction === 'harmonic'
        ? s.intervals[count - 2]
        : s.intervals[0] * (count - 1);
      if (distance === undefined || distance > s.high - s.low) continue;
      const referenceLow = direction === 'descending' ? s.low + distance : s.low;
      const referenceHigh = direction === 'descending' ? s.high : s.high - distance;
      if (s.reference === 'fixed' && (s.referenceNote < referenceLow || s.referenceNote > referenceHigh)) continue;
      candidates.push({ direction, count });
    }
  }
  if (!candidates.length) throw new Error('These notes and intervals do not fit. Widen the pitch range, reduce the note count, or change the fixed reference.');
  const { direction, count } = pick(candidates, random);
  const maxSpan = s.reference === 'fixed'
    ? direction === 'descending' ? s.referenceNote - s.low : s.high - s.referenceNote
    : s.high - s.low;
  const weight = interval => s.adaptive ? 1 + Math.min(3, history[`${direction}:${interval}`]?.misses || 0) : 1;
  let answers = [];
  if (direction === 'harmonic') {
    const choices = s.intervals.filter(n => n <= maxSpan);
    for (let i = 0; i < count - 1; i++) {
      const value = weighted(choices, weight, random);
      answers.push(value);
      choices.splice(choices.indexOf(value), 1);
    }
    answers.sort((a, b) => a - b);
  } else {
    let available = maxSpan;
    for (let i = 0; i < count - 1; i++) {
      const reserve = (count - 2 - i) * s.intervals[0];
      const value = weighted(s.intervals.filter(n => n <= available - reserve), weight, random);
      answers.push(value);
      available -= value;
    }
  }
  const span = direction === 'harmonic' ? answers.at(-1) : answers.reduce((a, b) => a + b, 0);
  const min = direction === 'descending' ? s.low + span : s.low;
  const max = direction === 'descending' ? s.high : s.high - span;
  const reference = s.reference === 'fixed' ? s.referenceNote : min + Math.floor(random() * (max - min + 1));
  const notes = [reference];
  for (const interval of answers) notes.push(direction === 'harmonic' ? reference + interval : notes.at(-1) + interval * (direction === 'descending' ? -1 : 1));
  return { id: `${Date.now()}-${Math.floor(random() * 1e9)}`, direction, notes, answers, reference, count };
}

export function gradeAnswer(question, values, input) {
  const expected = input === 'interval' ? question.answers : question.notes.slice(1);
  const submitted = [...values];
  const harmonic = question.direction === 'harmonic';
  if (harmonic) submitted.sort((a, b) => a - b);
  const indices = expected.map((_, index) => index);
  if (harmonic) {
    // Reserve all exact matches before pairing the remaining mistakes. A missed
    // lower voice must not hide a correctly identified upper voice.
    const used = new Set();
    expected.forEach((value, index) => {
      indices[index] = submitted.findIndex((answer, i) => !used.has(i) && answer === value);
      if (indices[index] >= 0) used.add(indices[index]);
    });
    indices.forEach((match, index) => {
      if (match >= 0) return;
      const next = submitted.findIndex((_, i) => !used.has(i));
      indices[index] = next;
      if (next >= 0) used.add(next);
    });
  }
  const parts = expected.map((value, index) => value === submitted[indices[index]]);
  const direction = question.direction === 'descending' ? -1 : 1;
  const steps = question.answers.map((interval, index) => {
    const from = harmonic || index === 0 ? question.reference : submitted[index - 1];
    const to = submitted[indices[index]];
    const delta = input === 'interval' ? to * direction : to - from;
    return {
      interval, expectedFrom: harmonic ? question.reference : question.notes[index], expectedTo: question.notes[index + 1],
      from, to, delta, sizeCorrect: Number.isFinite(delta) && Math.abs(delta) === interval,
      correct: Number.isFinite(delta) && delta === interval * direction,
      noteCorrect: parts[index],
    };
  });
  const relationships = steps.map(step => step.correct);
  return { correct: submitted.length === expected.length && parts.every(Boolean), parts, relationships, steps, expected, submitted };
}

export function notesFromIntervals(question, intervals) {
  const notes = [question.reference];
  for (const n of intervals) notes.push(question.direction === 'harmonic' ? question.reference + n : notes.at(-1) + (question.direction === 'descending' ? -n : n));
  return notes;
}
