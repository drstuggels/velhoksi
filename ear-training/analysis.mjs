import { INTERVALS, noteName } from './theory.mjs';

const SIMPLE = [
  ['P', 'perfect', 1], ['m', 'minor', 2], ['M', 'major', 2],
  ['m', 'minor', 3], ['M', 'major', 3], ['P', 'perfect', 4],
  ['A', 'augmented', 4], ['P', 'perfect', 5], ['m', 'minor', 6],
  ['M', 'major', 6], ['m', 'minor', 7], ['M', 'major', 7],
];
const ORDINALS = ['', 'unison', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'octave', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third', 'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh', 'twenty-eighth', 'twenty-ninth'];
export const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
export const uniquePitches = notes => [...new Set(notes.filter(n => Number.isInteger(n) && n >= 0 && n <= 127))].sort((a, b) => a - b);

// Chromatic-distance names; a score/key context would be needed for enharmonic spelling.
export function describeInterval(semitones) {
  const distance = Math.abs(Math.round(semitones));
  if (!distance) return { semitones: 0, short: 'P1', name: 'unison' };
  const known = INTERVALS.find(i => i.semitones === distance);
  if (known) return known;
  const [quality, name, degree] = SIMPLE[distance % 12];
  const number = degree + 7 * Math.floor(distance / 12);
  return { semitones: distance, short: `${quality}${number}`, name: `${name} ${ORDINALS[number] || `${number}th`}` };
}

// Keep register, duplicated pitches and original voice indices. The bass is the
// lowest sounding note, which need not be the root of a chord.
export function voicingIntervals(input, basis = 'bass') {
  const voices = input.map((midi, index) => ({ midi, index })).filter(voice => Number.isFinite(voice.midi))
    .sort((a, b) => a.midi - b.midi);
  return voices.slice(1).map((to, index) => {
    const from = voices[basis === 'adjacent' ? index : 0];
    return { from: from.midi, to: to.midi, fromIndex: from.index, toIndex: to.index,
      ...describeInterval(to.midi - from.midi) };
  });
}

export function analyseNotes(input) {
  const notes = uniquePitches(input), pairs = [], groups = new Map(), facts = [];
  for (let i = 0; i < notes.length; i++) for (let j = i + 1; j < notes.length; j++) {
    const pair = { low: notes[i], high: notes[j], ...describeInterval(notes[j] - notes[i]) };
    pairs.push(pair);
    if (!groups.has(pair.semitones)) groups.set(pair.semitones, { ...describeInterval(pair.semitones), pairs: [] });
    groups.get(pair.semitones).pairs.push(pair);
  }
  const close = pairs.filter(p => p.semitones <= 2);
  if (close.length) facts.push({ title: 'close neighbours', text: 'Seconds can add roughness. Compare their spacing and instrument; register and timbre change the effect.', notes: [close[0].low, close[0].high] });
  const octaves = pairs.filter(p => p.semitones % 12 === 0);
  if (octaves.length) facts.push({ title: 'octave doubling', text: 'The same pitch class appears in different octaves. Listen for reinforcement rather than a new chord tone.', notes: [octaves[0].low, octaves[0].high] });
  const pcs = [...new Set(notes.map(n => n % 12))];
  if (pcs.length === 3) for (const root of pcs) for (const third of [3, 4]) {
    if (!pcs.includes((root + third) % 12) || !pcs.includes((root + 7) % 12)) continue;
    const thirds = notes.filter(n => n % 12 === (root + third) % 12);
    if (thirds.length > 1) facts.push({ title: 'doubled third', text: `In a ${noteName(root + 60).slice(0, -1)} ${third === 4 ? 'major' : 'minor'} reading, the third appears in multiple octaves. Doubling it is not inherently unpleasant; compare the balance with and without one copy.`, notes: thirds });
  }
  for (let i = 0; i + 2 < notes.length; i++) {
    const a = notes[i + 1] - notes[i], b = notes[i + 2] - notes[i + 1];
    if ([3, 4].includes(a) && [3, 4].includes(b)) {
      facts.push({ title: 'stacked thirds', text: `${describeInterval(a).short} + ${describeInterval(b).short} span ${a + b} semitones. Compare the outer notes with each inner pair.`, notes: notes.slice(i, i + 3) });
      break;
    }
  }
  const wide = pairs.find(p => p.semitones > 12 && p.semitones % 12);
  if (wide) facts.push({ title: 'compound interval', text: `${wide.short} has the same pitch-class distance as ${describeInterval(wide.semitones % 12).short}, spread across extra octaves.`, notes: [wide.low, wide.high] });
  return { notes, pairs, groups: [...groups.values()].sort((a, b) => a.semitones - b.semitones), facts };
}

export function harmonicModel(input, count = 8) {
  const notes = uniquePitches(input);
  return notes.map(midi => ({ midi, partials: Array.from({ length: Math.max(1, Math.min(16, count)) }, (_, i) => ({ harmonic: i + 1, hz: frequency(midi) * (i + 1) })) }));
}

// A geometric comparison, not an estimate of perceived dissonance or recorded amplitudes.
export function nearbyHarmonics(input) {
  const rows = harmonicModel(input), matches = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    let best;
    for (const a of rows[i].partials) for (const b of rows[j].partials) {
      const cents = Math.abs(1200 * Math.log2(a.hz / b.hz));
      if (cents <= 35 && (!best || a.harmonic + b.harmonic < best.order || (a.harmonic + b.harmonic === best.order && cents < best.cents))) best = { low: rows[i].midi, high: rows[j].midi, a, b, cents, order: a.harmonic + b.harmonic, difference: Math.abs(a.hz - b.hz) };
    }
    if (best) matches.push(best);
  }
  return matches.sort((a, b) => a.order - b.order || a.cents - b.cents).slice(0, 8);
}
