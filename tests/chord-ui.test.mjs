import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createEarTraining } from '../ear-training/ui.mjs';
import { SampleEngine } from '../ear-training/audio.mjs';
import { chordInterpretations, bassKind, CHORD_CHALLENGES } from '../ear-training/chords.mjs';
import { setAudioQuality } from '../preferences.mjs';

const recordings = [];
SampleEngine.prototype.configure = function(s) { this.settings = { ...this.settings, ...s }; };
SampleEngine.prototype.prefetch = () => {};
SampleEngine.prototype.play = async function(notes, settings) { recordings.push({ notes: [...notes], settings }); this.context = { currentTime: 2 }; return { start: 0, end: 1 }; };
SampleEngine.prototype.drone = async function(notes) { recordings.push({ drone: [...notes] }); return true; };
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const SETTINGS = 'velhoksi.ear.chords.settings.v1', ACTIVE = 'velhoksi.ear.activeQuiz.v1', STATS = 'velhoksi.ear.chords.stats.v1';

function setup(settings = {}, stored = {}) {
  const dom = new JSDOM('<!doctype html><section id="ear"></section>', { url: 'https://velhoksi.test', pretendToBeVisual: true });
  const w = dom.window;
  Object.assign(globalThis, { window: w, document: w.document, localStorage: w.localStorage, requestAnimationFrame: w.requestAnimationFrame.bind(w), cancelAnimationFrame: w.cancelAnimationFrame.bind(w) });
  w.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
  w.HTMLDialogElement.prototype.close = function() { this.open = false; this.dispatchEvent(new w.Event('close')); };
  localStorage.setItem(SETTINGS, JSON.stringify({ chordIds: ['major'], rootPitch: 0, low: 60, high: 72, ...settings }));
  for (const [k, v] of Object.entries(stored)) localStorage.setItem(k, v);
  const root = document.getElementById('ear');
  const app = createEarTraining(root, { onExit: () => app.deactivate() }); app.activate();
  const click = selector => { const el = root.querySelector(selector); assert.ok(el, selector); assert.ok(!el.disabled, `disabled: ${selector}`); el.click(); };
  const action = id => click(`[data-chord-action="${id}"]`);
  const change = (selector, value) => { const el = root.querySelector(selector); assert.ok(el, selector); if (el.type === 'checkbox') el.checked = value; else el.value = value; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const setting = (key, value) => change(`[data-chord-setting="${key}"]`, value);
  const submit = selector => root.querySelector(selector).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  const startCustom = () => { click('[data-action="chords"]'); action('custom'); submit('[data-chord-save-form]'); };
  const snapshot = () => Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => { const k = localStorage.key(i); return [k, localStorage.getItem(k)]; }));
  const close = () => { app.deactivate(); dom.window.close(); };
  return { root, w, app, click, action, change, setting, submit, startCustom, snapshot, close };
}

test('chord quiz grades once, compares audio, and keeps interval settings isolated', async () => {
  const t = setup();
  try {
    const intervalSettings = localStorage.getItem('velhoksi.ear.settings.v1');
    t.startCustom(); t.action('play'); await flush();
    assert.deepEqual(recordings.at(-1).notes, [60, 64, 67]);
    t.click('[data-chord-answer-id="major"]'); t.action('check'); await flush();
    assert.match(t.root.querySelector('[data-chord-feedback]').textContent, /correct/);
    const before = localStorage.getItem(STATS);
    assert.equal(t.root.querySelector('[data-chord-action="mine"]'), null);
    t.action('play'); await flush(); assert.deepEqual(recordings.at(-1).notes, [60, 64, 67]);
    assert.equal(localStorage.getItem(STATS), before);
    assert.equal(localStorage.getItem('velhoksi.ear.settings.v1'), intervalSettings);
    t.action('back'); t.click('[data-action="practice"]'); t.click('[data-start-challenge="1"]');
    assert.equal(t.root.querySelector('#ear-workspace').classList.contains('hidden'), false);
    t.click('[data-action="play"]'); await flush();
    assert.equal(recordings.at(-1).settings.direction, 'ascending');
  } finally { t.close(); }
});
for (const id of ['extensions', 'alterations']) test(`${id} challenge supports feedback and comparison for every offered quality`, async () => {
  const t = setup();
  try {
    t.click('[data-action="chords"]'); t.click(`[data-chord-card="${id}"]`); t.click(`[data-chord-start="${id}"]`);
    t.action('play'); await flush();
    const notes = recordings.at(-1).notes;
    const candidate = chordInterpretations(notes).find(i => CHORD_CHALLENGES.find(c => c.id === id).settings.chordIds.includes(i.chordId));
    t.click(`[data-chord-answer-id="${candidate.chordId}"]`); t.action('check');
    assert.ok(t.root.querySelector('[data-chord-feedback]').textContent.includes('root-position') === false);
    t.action('arpeggio-down'); await flush(); assert.deepEqual(recordings.at(-1).notes, [...notes].reverse());
    if (t.root.querySelector('[data-chord-action="reduction"]')) { t.action('reduction'); await flush(); assert.ok(recordings.at(-1).notes.length >= 4); }
  } finally { t.close(); }
});
test('unspecified-root quiz offers equivalent names without leaking question-dependent choices', async () => {
  const t = setup({ chordIds: ['6'], rootCue: 'unknown', task: 'inversion' });
  try {
    t.startCustom(); assert.ok(t.root.querySelector('[data-chord-answer-id="m7"]'));
    t.action('play'); await flush(); t.click('[data-chord-answer-id="m7"]'); t.click('[data-chord-answer-bass="third"]'); t.action('check');
    assert.ok(t.root.querySelector('[data-chord-feedback]').classList.contains('correct'));
    assert.match(t.root.querySelector('[data-chord-feedback]').textContent, /Am7\/C/);
  } finally { t.close(); }
});
test('assisted arpeggiation is recorded and replay keeps the question sound', async () => {
  const t = setup({ varyInstrument: true, varyDynamics: true, instrumentPool: ['salamander', 'rhodes'] });
  try {
    setAudioQuality('balanced'); t.startCustom(); t.action('play'); await flush(); const first = recordings.at(-1);
    setAudioQuality('high'); t.action('hint'); await flush(); const hint = recordings.at(-1);
    for (const key of ['instrument', 'velocity', 'quality']) assert.equal(first.settings[key], hint.settings[key]);
    assert.equal(hint.settings.direction, 'ascending');
    t.click('[data-chord-answer-id="major"]'); t.action('check');
    assert.match(t.root.querySelector('[data-chord-feedback]').textContent, /assisted/);
    const stats = JSON.parse(localStorage.getItem(STATS)); assert.equal(stats.buckets['name:given'].assisted, 1);
    t.action('next-result'); t.action('play'); await flush(); assert.equal(recordings.at(-1).settings.quality, 'high');
  } finally { t.close(); }
});
for (const task of ['tones', 'voicing']) test(`${task} answers use the piano and keep feedback playable`, async () => {
  const t = setup({ task, answerWith: 'piano' });
  try {
    t.startCustom(); t.action('play'); await flush();
    for (const pitch of [60, 64, 67]) t.click(`[data-chord-pitch="${pitch}"]`);
    t.action('check'); assert.ok(t.root.querySelector('[data-chord-feedback]').classList.contains('correct'));
    const before = localStorage.getItem(STATS); t.click('[data-chord-pitch="65"]'); await flush();
    assert.deepEqual(recordings.at(-1).notes, [65]); assert.equal(localStorage.getItem(STATS), before);
  } finally { t.close(); }
});
test('note entry accepts enharmonics and optional octaves only for pitch-class tasks', async () => {
  const t = setup({ task: 'tones', answerWith: 'note', chordIds: ['7'] });
  try {
    t.startCustom(); t.action('play'); await flush();
    t.root.querySelector('#chord-notes').value = 'C, E, G, A#'; t.submit('[data-chord-notes-form]');
    assert.ok(t.root.querySelector('[data-chord-feedback]').classList.contains('correct'));
  } finally { t.close(); }
});
test('saving, editing, removing, and undoing a chord exercise preserve the setup', async () => {
  const t = setup({ chordIds: ['7b9'], high: 84 });
  try {
    t.click('[data-action="chords"]'); t.action('custom'); t.setting('spacing', 'open');
    t.change('[data-chord-save-toggle]', true); t.root.querySelector('#chord-exercise-name').value = 'Altered ears';
    t.action('save'); await flush(); assert.match(t.root.querySelector('[data-chord-status]').textContent, /saved/);
    t.action('menu'); assert.ok(t.root.querySelector('[data-chord-saved-edit]'));
    t.click('[data-chord-saved-edit]'); assert.equal(t.root.querySelector('[data-chord-setting="spacing"]').value, 'open');
    t.action('menu'); t.click('[data-chord-remove]'); await flush(); assert.equal(t.root.querySelector('[data-chord-saved-start]'), null);
    t.action('restore'); await flush(); t.click('[data-chord-saved-start]'); assert.ok(t.root.querySelector('[data-chord-quiz]'));
  } finally { t.close(); }
});
test('refresh resumes chord practice without autoplay and menu navigation clears it', async () => {
  let t = setup(); t.startCustom(); t.action('play'); await flush(); t.click('[data-chord-answer-id="major"]'); t.action('check');
  const stored = t.snapshot(), count = recordings.length; t.close();
  t = setup({}, stored);
  try {
    assert.equal(t.root.querySelector('#ear-chord-mode').classList.contains('hidden'), false);
    assert.ok(t.root.querySelector('[data-chord-quiz]'));
    assert.equal(t.root.querySelector('[data-chord-action="check"]').disabled, true);
    assert.equal(recordings.length, count); assert.equal(localStorage.getItem(STATS), stored[STATS]);
    t.action('menu'); assert.equal(localStorage.getItem(ACTIVE), 'null');
  } finally { t.close(); }
});
test('invalid chord resume falls back to chord menu', () => {
  const t = setup({}, { [ACTIVE]: JSON.stringify({ kind: 'chords', settings: { chordIds: [], low: 60, high: 61 } }) });
  try { assert.ok(t.root.querySelector('.chord-challenges')); assert.equal(localStorage.getItem(ACTIVE), 'null'); } finally { t.close(); }
});
for (const entry of ['explore-answer', 'explorer', 'shortcut']) test(`explorer opens the exact answered open voicing via ${entry}`, async () => {
  const t = setup({ chordIds: ['aug'], rootPitch: 4, spacing: 'open', bassKinds: ['third'], low: 48, high: 84 });
  try {
    t.startCustom(); t.action('play'); await flush();
    const heard = [...recordings.at(-1).notes];
    t.click('[data-chord-answer-id="aug"]'); t.action('check');
    const before = localStorage.getItem(STATS);
    const open = () => entry === 'shortcut'
      ? document.dispatchEvent(new t.w.KeyboardEvent('keydown', { code: 'KeyC', altKey: true, bubbles: true }))
      : t.action(entry);
    for (let visit = 0; visit < 2; visit++) {
      open();
      const dialog = t.root.querySelector('[data-chord-explorer]');
      assert.equal(dialog.open, true);
      for (const [key, value] of Object.entries({ root: '4', chordId: 'aug', bassKind: 'third', spacing: 'open' })) {
        assert.equal(dialog.querySelector(`[data-chord-lab="${key}"]`).value, value);
      }
      t.action('lab-play'); await flush();
      assert.deepEqual(recordings.at(-1).notes, heard);
      t.click('[data-chord-index="1"][data-chord-move="-1"]'); await flush();
      t.action('close-explorer');
    }
    assert.equal(localStorage.getItem(STATS), before);
  } finally { t.close(); }
});
test('explorer edits one chord and never changes a submitted score', async () => {
  const t = setup();
  try {
    t.startCustom(); t.action('play'); await flush(); t.click('[data-chord-answer-id="major"]'); t.action('check');
    const before = localStorage.getItem(STATS); t.action('explore-answer');
    assert.match(t.root.querySelector('[data-chord-lab-notes]').textContent, /C/);
    t.click('[data-chord-index="1"][data-chord-move="-1"]'); await flush();
    t.action('lab-play'); await flush(); assert.deepEqual(recordings.at(-1).notes, [60, 63, 67]);
    t.action('hold'); await flush(); assert.deepEqual(recordings.at(-1).drone, [60, 63, 67]);
    t.click('[data-chord-index="1"][data-chord-move="1"]'); await flush(); assert.deepEqual(recordings.at(-1).drone, [60, 64, 67]);
    t.action('close-explorer'); assert.equal(localStorage.getItem(STATS), before);
  } finally { t.close(); }
});
test('impossible custom chord constraints show a useful error in settings', async () => {
  const t = setup({ chordIds: ['m13'], low: 60, high: 64 });
  try { t.startCustom(); await flush(); assert.ok(t.root.querySelector('.chord-setup')); assert.match(t.root.querySelector('[data-chord-status]').textContent, /No matching voicing/); } finally { t.close(); }
});
test('editing sound preserves an answer; changing chord constraints creates a new one', async () => {
  const t = setup();
  try {
    t.startCustom(); t.action('play'); await flush(); t.click('[data-chord-answer-id="major"]');
    t.action('settings'); t.setting('duration', 2); t.action('back-quiz');
    assert.equal(t.root.querySelector('[data-chord-answer-id="major"]').getAttribute('aria-pressed'), 'true');
    t.action('settings'); t.setting('rootPitch', 2); t.action('back-quiz');
    assert.equal(t.root.querySelector('[data-chord-action="check"]').disabled, true);
    t.action('play'); await flush(); assert.equal(pc(recordings.at(-1).notes[0]), 2);
  } finally { t.close(); }
});
test('new question scrolls the mobile page back to its prompt', async () => {
  const t = setup();
  try {
    t.startCustom(); t.action('play'); await flush(); t.click('[data-chord-answer-id="major"]'); t.action('check');
    const calls = [];
    t.w.HTMLElement.prototype.scrollIntoView = function(options) { calls.push({ main: this.classList.contains('ear-main'), options }); };
    t.action('next-result');
    assert.ok(calls.some(call => call.main && call.options.block === 'start'));
  } finally { t.close(); }
});
test('a late playback completion after leaving chords cannot mark a question heard', async () => {
  const originalPlay = SampleEngine.prototype.play;
  const t = setup();
  try {
    t.startCustom();
    let resolve;
    SampleEngine.prototype.play = function() { this.context = { currentTime: 2 }; return new Promise(done => { resolve = done; }); };
    t.action('play'); t.action('back'); resolve({ start: 0, end: 1 }); await flush();
    assert.equal(t.root.querySelector('#ear-menu').classList.contains('hidden'), false);
    t.click('[data-action="chords"]');
    assert.equal(t.root.querySelector('[data-chord-action="check"]').disabled, true);
    assert.equal(t.root.querySelector('[data-chord-play-label]').textContent, 'listen to chord');
  } finally { SampleEngine.prototype.play = originalPlay; t.close(); }
});
const pc = n => n % 12;

for (const spacing of ['close', 'open']) test(`${spacing} voicing uses numeric timing for hints and analysis playback`, async () => {
  const t = setup({ spacing, high: 84 });
  const timed = () => {
    const { notes, settings: s } = recordings.at(-1);
    assert.equal(s.spacing, s.duration + s.gap);
    assert.ok(notes.every((_, index) => Number.isFinite(index * s.spacing)), 'all audio onsets must be finite');
  };
  try {
    t.startCustom(); t.action('play'); await flush(); timed();
    t.action('hint'); await flush(); timed();
    t.click('[data-chord-answer-id="major"]'); t.action('check');
    const details = t.root.querySelector('[data-chord-listen-details]');
    assert.equal(details.open, false); details.open = true;
    for (const action of ['arpeggio-up', 'arpeggio-down', ...(spacing === 'open' ? ['reduction'] : [])]) { t.action(action); await flush(); timed(); }
    t.action('basis-adjacent');
    assert.equal(t.root.querySelector('[data-chord-listen-details]').open, true);
    assert.equal(document.activeElement.dataset.chordAction, 'basis-adjacent');
    t.action('explore-answer'); t.action('lab-up'); await flush(); timed();
    t.action('lab-down'); await flush(); timed();
  } finally { t.close(); }
});

test('main play control can cancel loading and does not unlock grading after cancellation', async () => {
  const original = SampleEngine.prototype.play;
  let finish;
  SampleEngine.prototype.play = () => new Promise(resolve => { finish = resolve; });
  const t = setup();
  try {
    t.startCustom();
    assert.ok(t.root.querySelector('.chord-play svg'));
    t.action('play');
    assert.match(t.root.querySelector('[data-chord-play-hint]').textContent, /loading/);
    assert.equal(t.root.querySelector('[data-chord-play-label]').textContent, 'stop playback');
    t.action('play');
    finish({ start: 0, end: 1 }); await flush();
    assert.equal(t.root.querySelector('[data-chord-play-label]').textContent, 'listen to chord');
    t.click('[data-chord-answer-id="major"]');
    assert.equal(t.root.querySelector('[data-chord-action="check"]').disabled, true);
  } finally { SampleEngine.prototype.play = original; t.close(); }
});

for (const [rootPitch, chordId, expected] of [[2, 'major', 'F♯4'], [0, '7#9', 'D♯4'], [0, 'dim7', 'B♭♭4']]) test(`${chordId} interval labels use the same spelling as the chord tones`, async () => {
  const t = setup({ rootPitch, chordIds: [chordId], low: 60, high: 71 });
  try {
    t.startCustom(); t.action('play'); await flush();
    t.click(`[data-chord-answer-id="${chordId}"]`); t.action('check');
    const tones = [...t.root.querySelectorAll('[data-chord-voice]')];
    assert.ok(tones.some(el => el.textContent.includes(expected)));
    const notes = recordings.at(-1).notes;
    for (const basis of ['basis-bass', 'basis-adjacent']) {
      t.action(basis);
      const pairs = [...t.root.querySelectorAll('[data-chord-pair]')];
      assert.ok(pairs.some(el => el.textContent.includes(expected)));
      assert.ok(pairs.some(el => el.getAttribute('aria-label').includes(expected)));
      for (let i = 0; i < pairs.length; i++) {
        t.click(`[data-chord-pair="${i}"]`); await flush();
        assert.deepEqual(recordings.at(-1).notes, [notes[basis === 'basis-bass' ? 0 : i], notes[i + 1]]);
      }
    }
  } finally { t.close(); }
});

for (const [name, settings, offered] of [
  ['close root position', {}, false],
  ['close root position in another register', { low: 72, high: 84 }, false],
  ['open voicing', { spacing: 'open', high: 84 }, true],
  ['first inversion', { bassKinds: ['third'], high: 84 }, true],
  ['omitted fifth', { omission: 'fifth' }, true],
  ['doubled bass', { doubling: true }, true],
]) test(`root-position comparison is contextual for ${name}`, async () => {
  const t = setup(settings);
  try {
    t.startCustom(); t.action('play'); await flush();
    t.click('[data-chord-answer-id="major"]'); t.action('check');
    assert.equal(!!t.root.querySelector('[data-chord-action="reduction"]'), offered);
    if (offered) { t.action('reduction'); await flush(); const notes = recordings.at(-1).notes; assert.deepEqual(notes.map(n => n - notes[0]), [0, 4, 7]); }
    const actions = t.root.querySelector('[data-chord-result-actions]'), details = t.root.querySelector('[data-chord-listen-details]');
    assert.ok(actions.compareDocumentPosition(details) & t.w.Node.DOCUMENT_POSITION_FOLLOWING);
    details.open = true;
    assert.equal(document.activeElement.dataset.chordAction, 'next-result');
  } finally { t.close(); }
});

test('different submitted notes retain a playable comparison without changing the score', async () => {
  const t = setup({ task: 'tones', answerWith: 'note' });
  try {
    t.startCustom(); t.action('play'); await flush();
    t.root.querySelector('#chord-notes').value = 'C, Eb, G'; t.submit('[data-chord-notes-form]');
    const score = localStorage.getItem(STATS);
    t.action('mine'); await flush();
    assert.deepEqual(recordings.at(-1).notes, [60, 63, 67]);
    assert.equal(localStorage.getItem(STATS), score);
  } finally { t.close(); }
});

test('interval audition highlights the button and sounding notes until playback ends or stops', async () => {
  const t = setup();
  const original = SampleEngine.prototype.play;
  let nextFrame, context;
  try {
    t.startCustom(); t.action('play'); await flush(); t.click('[data-chord-answer-id="major"]'); t.action('check');
    globalThis.requestAnimationFrame = fn => { nextFrame = fn; return 1; };
    globalThis.cancelAnimationFrame = () => { nextFrame = null; };
    SampleEngine.prototype.play = async function() { context = this.context = { currentTime: .5 }; return { start: 0, end: 1 }; };
    t.click('[data-chord-pair="0"]'); await flush();
    assert.ok(t.root.querySelector('[data-chord-pair="0"]').classList.contains('sounding'));
    assert.deepEqual([...t.root.querySelectorAll('[data-chord-voice].sounding')].map(el => Number(el.dataset.chordNotePlay)), [60, 64]);
    context.currentTime = 2; nextFrame();
    assert.equal(t.root.querySelectorAll('.sounding').length, 0);
    t.click('[data-chord-pair="1"]'); await flush();
    t.w.document.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(t.root.querySelectorAll('.sounding').length, 0);
  } finally { SampleEngine.prototype.play = original; t.close(); }
});

test('explorer sustain exposes on/off state and tracks edited notes through stop and clear', async () => {
  const t = setup({ rootPitch: 2, low: 60, high: 71 });
  try {
    t.startCustom(); t.action('play'); await flush(); t.click('[data-chord-answer-id="major"]'); t.action('check'); t.action('explore-answer');
    const dialog = t.root.querySelector('[data-chord-explorer]'), hold = () => dialog.querySelector('[data-chord-action="hold"]');
    assert.equal(hold().getAttribute('aria-pressed'), 'false');
    assert.match(dialog.querySelector('[data-chord-note-play="66"]').textContent, /F♯4/);
    assert.equal(dialog.querySelector('[data-chord-pitch="66"]').getAttribute('aria-label'), 'F♯4');
    assert.ok(dialog.querySelector('[aria-label="semitone for F♯4"]'));
    assert.ok(dialog.querySelector('[aria-label="octave for F♯4"]'));
    t.action('hold'); await flush(); assert.equal(hold().getAttribute('aria-pressed'), 'true');
    assert.match(hold().textContent, /sustainon/);
    assert.equal(dialog.querySelectorAll('[data-chord-pitch].sounding').length, 3);
    t.click('[data-chord-index="1"][data-chord-move="-1"]'); await flush();
    assert.deepEqual(recordings.at(-1).drone, [62, 65, 69]);
    assert.ok(dialog.querySelector('[data-chord-pitch="65"]').classList.contains('sounding'));
    t.action('hold'); assert.equal(hold().getAttribute('aria-pressed'), 'false'); assert.equal(dialog.querySelectorAll('.sounding').length, 0);
    t.action('hold'); await flush(); t.action('lab-clear'); await flush();
    assert.equal(hold().getAttribute('aria-pressed'), 'false'); assert.ok(hold().disabled);
    assert.equal(dialog.querySelectorAll('.sounding').length, 0);
  } finally { t.close(); }
});
