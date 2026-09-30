import { DEFAULTS, sanitizeSettings } from './theory.mjs';

const simple = Array.from({ length: 12 }, (_, i) => i + 1);
export const CHALLENGES = [
  { id: '1', name: 'first intervals', notes: '2 notes', motion: 'ascending',
    settings: { direction: 'ascending', intervals: [3, 4, 5, 7], hint: 'slow' } },
  { id: '2', name: 'both directions', notes: '2 notes', motion: 'up or down',
    settings: { direction: 'melodic', intervals: simple, hint: 'slow', varyDynamics: true } },
  { id: '3', name: 'hear together', notes: '2 notes', motion: 'together',
    settings: { direction: 'harmonic', intervals: simple, hint: 'alternate', varyDynamics: true } },
  { id: '4', name: 'chains & stacks', notes: '3–4 notes', motion: 'up, down & together',
    settings: { direction: 'mixed', minNotes: 3, maxNotes: 4, intervals: simple, hint: 'alternate', varyInstrument: true, varyDynamics: true } },
];

export function challengeSettings(id, preferences, overrides = {}) {
  const challenge = CHALLENGES.find(item => item.id === id);
  if (!challenge) return sanitizeSettings(preferences);
  // Listening volume/room and the answer surface are preferences, not difficulty.
  const { input, instrument, room, ambience, volume } = preferences;
  return sanitizeSettings({ ...DEFAULTS, input, instrument, room, ambience, volume, ...challenge.settings, ...overrides });
}

// One immutable sound choice per question: replay, hints and comparisons share it.
// Walk through a small dynamic range instead of jumping between extremes.
export function questionSound(settings, previous, random = Math.random) {
  const pool = settings.varyInstrument || settings.perNoteInstruments ? settings.instrumentPool : [settings.instrument];
  const index = previous && settings.varyInstrument ? (pool.indexOf(previous.instrument) + 1) % pool.length : 0;
  const low = Math.max(1, settings.velocity - settings.dynamicSpread);
  const high = Math.min(127, settings.velocity + settings.dynamicSpread);
  const step = Math.round(random() * 6) + 2;
  let velocity = settings.velocity;
  if (settings.varyDynamics) {
    const before = previous?.velocity ?? settings.velocity;
    const candidate = before + (random() < 0.5 ? -step : step);
    velocity = Math.max(low, Math.min(high, candidate < low || candidate > high ? before - (candidate - before) : candidate));
  }
  return { ...settings, instrument: pool[index], velocity,
    noteInstruments: settings.perNoteInstruments ? Array.from({ length: settings.maxNotes }, (_, i) => pool[(index + i) % pool.length]) : null };
}
