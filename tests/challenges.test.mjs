import test from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGES, challengeSettings, questionSound } from '../ear-training/challenges.mjs';
import { DEFAULTS, generateQuestion, sanitizeSettings } from '../ear-training/theory.mjs';
import { instrumentById } from '../ear-training/instruments.mjs';

test('presets constrain listening difficulty without constraining the answer method', () => {
  for (const challenge of CHALLENGES) for (const input of ['interval', 'piano', 'fretboard', 'note']) {
    const settings = challengeSettings(challenge.id, { ...DEFAULTS, input });
    assert.equal(settings.input, input);
    for (const random of [() => 0, () => 0.49, () => 0.999]) {
      const question = generateQuestion(settings, {}, random);
      assert.ok(question.count >= settings.minNotes && question.count <= settings.maxNotes);
      if (challenge.id === '1') assert.equal(question.direction, 'ascending');
      if (challenge.id === '2') assert.ok(['ascending', 'descending'].includes(question.direction));
      if (challenge.id === '3') assert.equal(question.direction, 'harmonic');
    }
  }
});

test('alternating instruments share a playable pitch range and bounded, gradual dynamics', () => {
  const settings = sanitizeSettings({ ...DEFAULTS, direction: 'mixed', minNotes: 3, maxNotes: 4,
    varyInstrument: true, instrumentPool: ['salamander', 'vibraphone', 'kalimba'],
    varyDynamics: true, velocity: 68, dynamicSpread: 12, low: 36, high: 84 });
  assert.equal(settings.low, 59);
  let previous;
  for (let index = 0; index < 30; index++) {
    const sound = questionSound(settings, previous, () => index % 2 ? 0.9 : 0.1);
    assert.ok(sound.velocity >= 56 && sound.velocity <= 80);
    if (previous) {
      assert.ok(Math.abs(sound.velocity - previous.velocity) <= 8);
      assert.notEqual(sound.instrument, previous.instrument);
    }
    const question = generateQuestion(settings);
    const range = instrumentById(sound.instrument).range;
    assert.ok(question.notes.every(note => note >= range[0] && note <= range[1]));
    previous = sound;
  }
});

test('variation stays valid at the softest and hardest touches; disabled variation is stable', () => {
  for (const velocity of [1, 127]) {
    const settings = sanitizeSettings({ ...DEFAULTS, varyDynamics: true, velocity });
    let previous;
    for (let i = 0; i < 20; i++) {
      const sound = questionSound(settings, previous, () => i % 2 ? 0.99 : 0);
      assert.ok(Number.isInteger(sound.velocity) && sound.velocity >= 1 && sound.velocity <= 127);
      if (previous) assert.ok(Math.abs(sound.velocity - previous.velocity) <= 8);
      previous = sound;
    }
  }
  const first = questionSound(DEFAULTS);
  assert.deepEqual(questionSound(DEFAULTS, first), first);
});
