import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createEarTraining } from '../ear-training/ui.mjs';
import { SampleEngine } from '../ear-training/audio.mjs';
import { DEFAULTS } from '../ear-training/theory.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('../audio/samples/manifest.json', import.meta.url)));
const recordings = [];
// Exercise the real UI and music logic without browser/device audio dependencies.
SampleEngine.prototype.configure = function (s) { this.settings = { ...this.settings, ...s }; };
SampleEngine.prototype.play = async function (notes, settings) {
  recordings.push({ notes: [...notes], settings });
  this.context = { currentTime: 2 };
  return { start: 0, end: 1, epoch: this.epoch };
};
SampleEngine.prototype.manifest = async () => manifest;
SampleEngine.prototype.cacheInfo = async () => ({ available: true, bytes: 0, total: 100 });
SampleEngine.prototype.drone = async function (notes) { recordings.push({ drone: notes }); this.droneNotes = [...notes]; return true; };
SampleEngine.prototype.preview = async function (note) { recordings.push({ preview: note }); this.context = { currentTime: 2 }; return { start: 0, end: 1 }; };

function setup(overrides = {}, exercises = []) {
  const dom = new JSDOM('<!doctype html><section id="ear"></section>', { url: 'https://velhoksi.test/', pretendToBeVisual: true });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.requestAnimationFrame = w.requestAnimationFrame.bind(w);
  globalThis.cancelAnimationFrame = w.cancelAnimationFrame.bind(w);
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  localStorage.setItem('velhoksi.ear.settings.v1', JSON.stringify({ ...DEFAULTS, input: 'interval', reference: 'fixed', referenceNote: 60, intervals: [4], ...overrides }));
  localStorage.setItem('velhoksi.ear.exercises.v1', JSON.stringify(exercises));
  const root = document.getElementById('ear');
  let exited = false;
  const app = createEarTraining(root, { onExit: () => { exited = true; app.deactivate(); } });
  app.activate();
  const click = selector => { const element = root.querySelector(selector); assert.ok(element, selector); element.click(); };
  const change = (selector, value) => { const element = root.querySelector(selector); element.value = value; element.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const startCustom = () => { click('[data-action="practice"]'); click('[data-action="custom"]'); click('[data-action="start-custom"]'); };
  return { dom, root, app, click, change, startCustom, w, exited: () => exited };
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

test('main and secondary menus, replay, grading, comparison, and next-question lifecycle', async () => {
  const { dom, root, app, click, startCustom, exited } = setup();
  assert.equal(root.querySelector('#ear-menu').classList.contains('hidden'), false);
  startCustom();
  assert.equal(root.querySelector('[data-action="check"]').disabled, true);
  click('[data-action="play"]'); await flush();
  assert.deepEqual(recordings.at(-1).notes, [60, 64]);
  click('[data-interval="4"]');
  assert.equal(root.querySelector('[data-action="check"]').disabled, false);
  click('[data-action="check"]');
  assert.equal(root.querySelector('.ear-result-heading strong').textContent, 'correct');
  assert.equal(root.querySelectorAll('.ear-result-part.correct').length, 1);
  assert.deepEqual([...root.querySelectorAll('#ear-stats strong')].map(el => el.textContent), ['1', '0', '100%']);
  click('[data-action="next"]');
  assert.equal(root.querySelector('[data-action="check"]').disabled, true);
  click('[data-action="home"]');
  assert.equal(exited(), true);
  app.deactivate(); dom.window.close();
});

test('piano and note input preserve reference and accept enharmonic answers', async () => {
  const { dom, root, app, click, change, startCustom, w } = setup({ intervals: [1] });
  startCustom();
  click('[data-action="settings"]'); change('[data-setting="input"]', 'piano'); click('[data-action="start-custom"]');
  assert.match(root.querySelector('#ear-answer-instruction').textContent, /reference: C4/);
  click('[data-action="play"]'); await flush();
  click('[data-pitch="61"]');
  click('[data-action="check"]');
  assert.equal(root.querySelector('.ear-result-heading strong').textContent, 'correct');
  click('[data-action="settings"]'); change('[data-setting="input"]', 'note'); click('[data-action="start-custom"]');
  click('[data-action="play"]'); await flush();
  root.querySelector('#ear-typed-answer').value = 'Db4';
  root.querySelector('#ear-typed-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(root.querySelector('.ear-result-heading strong').textContent, 'correct');
  app.deactivate(); dom.window.close();
});

test('graded piano stays playable without changing the submitted answer or score', async () => {
  const { dom, root, app, click, startCustom, w } = setup({ input: 'piano' });
  startCustom();
  assert.equal(root.querySelector('#ear-answer-slots').classList.contains('hidden'), true);
  assert.match(root.querySelector('#ear-selected-answer').textContent, /your note/);
  click('[data-action="play"]'); await flush();
  click('[data-pitch="63"]');
  click('[data-action="check"]');
  assert.equal(root.querySelector('.ear-result-heading strong').textContent, 'not quite');
  assert.equal(root.querySelector('[data-pitch="64"]').classList.contains('answer-correct'), true);
  assert.equal(root.querySelector('[data-pitch="63"]').classList.contains('answer-wrong'), true);
  assert.equal(root.querySelector('[data-pitch="64"]').disabled, false);
  assert.equal(root.querySelector('[data-pitch="64"]').hasAttribute('aria-pressed'), false);
  const score = localStorage.getItem('velhoksi.ear.stats.v1');
  const feedback = root.querySelector('#ear-feedback').innerHTML;
  click('[data-pitch="67"]'); await flush();
  assert.deepEqual(recordings.at(-1), { preview: 67 });
  document.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyD', key: 'd', bubbles: true, cancelable: true }));
  await flush();
  assert.deepEqual(recordings.at(-1), { preview: 64 });
  assert.equal(localStorage.getItem('velhoksi.ear.stats.v1'), score);
  assert.equal(root.querySelector('#ear-feedback').innerHTML, feedback);
  click('[data-action="mine"]'); await flush();
  assert.deepEqual(recordings.at(-1).notes, [60, 63]);
  click('[data-action="next"]');
  assert.equal(root.querySelector('#ear-feedback').textContent, '');
  assert.equal(root.querySelector('#ear-feedback').className, 'ear-feedback');
  assert.equal(root.querySelectorAll('.answer-correct, .answer-wrong').length, 0);
  app.deactivate(); dom.window.close();
});

test('piano wheel scrolls beyond the exercise range and releases page scrolling at the edge', () => {
  const { dom, root, app, startCustom, w } = setup({ input: 'piano', low: 60, high: 72 });
  startCustom();
  assert.ok(root.querySelector('[data-pitch="48"]'));
  assert.ok(root.querySelector('[data-pitch="84"]'));
  const pane = root.querySelector('[data-piano-scroll="quiz"]');
  Object.defineProperties(pane, { clientWidth: { value: 400 }, scrollWidth: { value: 900 } });
  pane.scrollLeft = 100;
  const wheel = new w.WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true });
  pane.dispatchEvent(wheel);
  assert.equal(wheel.defaultPrevented, true);
  assert.equal(pane.scrollLeft, 180);
  pane.scrollLeft = 500;
  const edge = new w.WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true });
  pane.dispatchEvent(edge);
  assert.equal(edge.defaultPrevented, false);
  app.deactivate(); dom.window.close();
});

test('fretboard accepts equivalent positions; harmonic selection toggles and sorts', async () => {
  const { dom, root, app, click, startCustom } = setup({ input: 'fretboard', intervals: [4, 7], direction: 'harmonic', minNotes: 3, maxNotes: 3 });
  startCustom();
  click('[data-action="play"]'); await flush();
  assert.deepEqual(recordings.at(-1).notes, [60, 64, 67]);
  assert.ok(root.querySelectorAll('[data-pitch="64"]').length > 1);
  click('[data-pitch="67"]');
  click('[data-pitch="64"]');
  click('[data-action="check"]');
  assert.equal(root.querySelector('.ear-result-heading strong').textContent, 'correct');
  app.deactivate(); dom.window.close();
});

test('multi-note holes cannot submit; typing keeps major and minor separate', async () => {
  const { dom, root, app, click, change, startCustom, w } = setup({ intervals: [4], minNotes: 3, maxNotes: 3 });
  startCustom();
  click('[data-action="play"]'); await flush();
  click('[data-slot="1"]'); click('[data-interval="4"]');
  assert.equal(root.querySelector('[data-action="check"]').disabled, true);
  root.querySelector('#ear-typed-answer').value = 'm3, M3';
  root.querySelector('#ear-typed-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  assert.match(root.querySelector('#ear-feedback').textContent, /1 of 2/);
  assert.equal(root.querySelectorAll('.ear-result-part.incorrect').length, 1);
  app.deactivate(); dom.window.close();
});

test('cheat sheet marks the question assisted, starts and stops real sampled drone path', async () => {
  const { dom, root, app, click, startCustom } = setup();
  startCustom();
  click('[data-action="cheat"]');
  assert.equal(root.querySelector('#ear-cheat').open, true);
  click('#ear-cheat [data-action="drone"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [60, 64]);
  assert.equal(root.querySelector('#ear-cheat [data-action="drone"]').getAttribute('aria-pressed'), 'true');
  click('[data-close="ear-cheat"]');
  assert.equal(root.querySelector('#ear-cheat').open, false);
  assert.equal(root.querySelector('#ear-cheat [data-action="drone"]').getAttribute('aria-pressed'), 'false');
  click('[data-action="play"]'); await flush();
  click('[data-interval="4"]'); click('[data-action="check"]');
  assert.match(root.querySelector('#ear-feedback').textContent, /assisted/);
  app.deactivate(); dom.window.close();
});

test('custom settings are validated before starting and persist', () => {
  const { dom, root, app, click, change } = setup();
  click('[data-action="practice"]'); click('[data-action="custom"]');
  change('[data-setting="minNotes"]', '8');
  click('[data-action="start-custom"]');
  assert.match(root.querySelector('#ear-setup-error').textContent, /do not fit/);
  assert.equal(root.querySelector('#ear-setup').classList.contains('hidden'), false);
  change('[data-setting="high"]', '84');
  change('[data-setting="reference"]', 'random');
  click('[data-action="start-custom"]');
  assert.match(root.querySelector('#ear-question-title').textContent, /interval chain/);
  click('[data-action="settings"]');
  change('[data-setting="direction"]', 'harmonic');
  const stored = JSON.parse(localStorage.getItem('velhoksi.ear.settings.v1'));
  assert.equal(stored.minNotes, 6);
  assert.equal(stored.maxNotes, 6);
  assert.equal(root.querySelector('[data-setting="minNotes"]').max, '6');
  assert.equal(root.querySelectorAll('[data-enabled-interval]').length, 24);
  app.deactivate(); dom.window.close();
});

test('all four levels accept every answer method before the quiz; quiz has no setup controls', () => {
  const { dom, root, app, click, change } = setup();
  click('[data-action="practice"]');
  assert.equal(root.querySelector('#ear-challenges').classList.contains('hidden'), false);
  for (const level of ['1', '2', '3', '4']) for (const input of ['interval', 'piano', 'fretboard', 'note']) {
    if (root.querySelector(`[data-challenge="${level}"]`).getAttribute('aria-expanded') !== 'true') click(`[data-challenge="${level}"]`);
    click(`[data-for-challenge="${level}"][data-challenge-input="${input}"]`);
    click(`[data-start-challenge="${level}"]`);
    assert.equal(root.querySelector('#ear-workspace').classList.contains('hidden'), false);
    assert.equal(root.querySelector('#ear-workspace select'), null);
    assert.equal(root.querySelector('#ear-workspace [data-input]'), null);
    assert.ok(root.querySelector(input === 'interval' ? '.ear-interval-buttons' : input === 'piano' ? '.ear-piano' : input === 'fretboard' ? '.ear-fretboard' : '#ear-typed-answer'));
    click('#ear-workspace [data-action="practice"]');
  }
  app.deactivate(); dom.window.close();
});

test('replay keeps question sound and cheat sheet does not change the exercise', async () => {
  const { dom, root, app, click, change } = setup();
  click('[data-action="practice"]'); click('[data-challenge="4"]'); click('[data-start-challenge="4"]');
  click('[data-action="play"]'); await flush();
  const first = recordings.at(-1);
  click('[data-action="cheat"]');
  click('[data-lab-family="mallets"]'); click('[data-lab-instrument="vibraphone"]'); await flush();
  click('[data-close="ear-cheat"]');
  click('[data-action="play"]'); await flush();
  assert.deepEqual(recordings.at(-1), first);
  click('[data-action="next"]');
  click('[data-action="play"]'); await flush();
  assert.notEqual(recordings.at(-1).settings.instrument, first.settings.instrument);
  assert.ok(Math.abs(recordings.at(-1).settings.velocity - first.settings.velocity) <= 8);
  app.deactivate(); dom.window.close();
});

test('harmonic help plays separately, melodic alternate help plays together, no-help hides hints', async () => {
  const { dom, root, app, click, change } = setup();
  click('[data-action="practice"]'); click('[data-challenge="3"]'); click('[data-start-challenge="3"]');
  click('[data-action="play"]'); await flush();
  assert.equal(root.querySelector('[data-action="hint"]').textContent, 'hear separately');
  click('[data-action="hint"]'); await flush();
  assert.equal(recordings.at(-1).settings.direction, 'ascending');
  click('[data-action="settings"]');
  change('[data-setting="direction"]', 'ascending');
  click('[data-action="start-custom"]');
  click('[data-action="play"]'); await flush();
  click('[data-action="hint"]'); await flush();
  assert.equal(recordings.at(-1).settings.direction, 'harmonic');
  click('[data-action="settings"]');
  change('[data-setting="hint"]', 'none');
  click('[data-action="start-custom"]');
  click('[data-action="play"]'); await flush();
  assert.equal(root.querySelector('[data-action="hint"]').classList.contains('hidden'), true);
  app.deactivate(); dom.window.close();
});

test('cards expand without starting; answer and interval choices are independent and reach the quiz', async () => {
  const { dom, root, app, click } = setup();
  click('[data-action="practice"]');
  click('[data-challenge="1"]');
  assert.equal(root.querySelector('#ear-workspace').classList.contains('hidden'), true);
  assert.equal(root.querySelector('#ear-challenge-input'), null);
  click('[data-for-challenge="1"][data-challenge-input="note"]');
  root.querySelector('[data-card="1"] details').open = true;
  click('[data-for-challenge="1"][data-challenge-interval="24"]');
  for (const interval of [3, 4, 5, 7]) click(`[data-for-challenge="1"][data-challenge-interval="${interval}"]`);
  click('[data-challenge="2"]');
  assert.equal(root.querySelector('[data-challenge="1"]').getAttribute('aria-expanded'), 'false');
  assert.equal(root.querySelector('[data-for-challenge="2"][data-challenge-input="interval"]').getAttribute('aria-pressed'), 'true');
  click('[data-challenge="1"]');
  assert.equal(root.querySelector('[data-for-challenge="1"][data-challenge-input="note"]').getAttribute('aria-pressed'), 'true');
  assert.equal(root.querySelector('[data-challenge-summary="1"]').textContent, 'P15');
  click('[data-start-challenge="1"]');
  click('[data-action="play"]'); await flush();
  const notes = recordings.at(-1).notes;
  assert.equal(notes[1] - notes[0], 24);
  assert.ok(root.querySelector('#ear-typed-answer'));
  click('#ear-workspace [data-action="practice"]');
  click('[data-for-challenge="1"][data-challenge-set="reset"]');
  assert.equal(root.querySelector('[data-for-challenge="1"][data-challenge-interval="24"]').getAttribute('aria-pressed'), 'false');
  assert.equal(root.querySelector('[data-challenge-summary="1"]').textContent, 'm3 · M3 · P4 · P5');
  app.deactivate(); dom.window.close();
});

test('an empty card selection cannot start; more settings carries card choices into custom', () => {
  const { dom, root, app, click } = setup();
  click('[data-action="practice"]'); click('[data-challenge="1"]');
  for (const interval of [3, 4, 5, 7]) click(`[data-for-challenge="1"][data-challenge-interval="${interval}"]`);
  assert.equal(root.querySelector('[data-start-challenge="1"]').disabled, true);
  click('[data-for-challenge="1"][data-challenge-interval="14"]');
  click('[data-for-challenge="1"][data-challenge-input="fretboard"]');
  click('[data-customize-challenge="1"]');
  assert.equal(root.querySelector('#ear-setup').classList.contains('hidden'), false);
  assert.equal(root.querySelector('[data-setting="input"]').value, 'fretboard');
  assert.equal(root.querySelector('[data-enabled-interval="14"]').checked, true);
  assert.equal(root.querySelector('[data-enabled-interval="3"]').checked, false);
  app.deactivate(); dom.window.close();
});

test('piano is the default; settings can return to the same question and preserve its answer', async () => {
  assert.equal(DEFAULTS.input, 'piano');
  const { dom, root, app, click, startCustom } = setup({ input: 'piano' });
  startCustom();
  click('[data-action="play"]'); await flush();
  const original = recordings.at(-1);
  click('[data-pitch="64"]');
  click('[data-action="settings"]');
  assert.equal(root.querySelector('[data-action="back-quiz"]').hidden, false);
  assert.ok(root.querySelector('#ear-setup .ear-breadcrumbs [data-action="menu"]'));
  assert.ok(root.querySelector('#ear-setup .ear-breadcrumbs [data-action="practice"]'));
  click('[data-action="back-quiz"]');
  assert.equal(root.querySelector('#ear-workspace').classList.contains('hidden'), false);
  assert.equal(root.querySelector('[data-action="check"]').disabled, false);
  assert.ok(root.querySelector('[data-pitch="64"]').classList.contains('selected'));
  click('[data-action="play"]'); await flush();
  assert.deepEqual(recordings.at(-1), original);
  app.deactivate(); dom.window.close();
});

test('visible piano and interval keyboard shortcuts select answers', async () => {
  const { dom, root, app, click, change, startCustom, w } = setup({ input: 'piano' });
  const key = (code, key, shiftKey = false) => document.dispatchEvent(new w.KeyboardEvent('keydown', { code, key, shiftKey, bubbles: true, cancelable: true }));
  startCustom();
  click('[data-action="play"]'); await flush();
  assert.equal(root.querySelector('[data-pitch="64"] kbd').textContent, 'd');
  key('KeyD', 'd'); key('Enter', 'Enter');
  assert.equal(root.querySelector('.ear-result-heading strong').textContent, 'correct');
  click('[data-action="settings"]'); change('[data-setting="input"]', 'interval');
  click('[data-action="back-quiz"]');
  click('[data-action="play"]'); await flush();
  assert.equal(root.querySelector('[data-interval="4"] kbd').textContent, '4');
  key('Digit4', '4'); key('Enter', 'Enter');
  assert.equal(root.querySelector('.ear-result-heading strong').textContent, 'correct');
  app.deactivate(); dom.window.close();
});

test('cheat sheet exposes 24 intervals, instrument tiles and piano reference selection', async () => {
  const { dom, root, app, click } = setup();
  click('[data-action="cheat"]');
  assert.equal(root.querySelectorAll('[data-lab-interval]').length, 24);
  assert.equal(root.querySelector('[data-lab="reference"]'), null);
  assert.equal(root.querySelector('[data-lab="instrument"]'), null);
  assert.ok(root.querySelector('[data-lab-instrument="rhodes"]'));
  click('[data-lab-note="55"]'); await flush();
  assert.ok(root.querySelector('[data-lab-note="55"]').classList.contains('reference'));
  click('[data-action="drone"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [55, 62]);
  assert.ok(root.querySelector('[data-lab-note="55"]').classList.contains('sustaining'));
  click('[data-lab-interval="24"]'); await flush();
  assert.equal(root.querySelector('.ear-lab-interval').textContent, 'P15');
  app.deactivate(); dom.window.close();
});

test('per-note instruments are retained for replay and harmonic playback', async () => {
  const { dom, root, app, click, startCustom } = setup({ perNoteInstruments: true, instrumentPool: ['rhodes', 'guitar-electric'], direction: 'harmonic' });
  startCustom();
  click('[data-action="play"]'); await flush();
  const first = recordings.at(-1);
  assert.deepEqual(first.settings.noteInstruments, ['rhodes', 'guitar-electric']);
  assert.equal(first.settings.direction, 'harmonic');
  click('[data-action="play"]'); await flush();
  assert.deepEqual(recordings.at(-1), first);
  app.deactivate(); dom.window.close();
});

test('save-on-start persists an exercise and updates only when checked', async () => {
  const first = setup({ input: 'piano', instrument: 'rhodes', room: 'hall', perNoteInstruments: true, instrumentPool: ['rhodes', 'guitar-electric'] });
  first.click('[data-action="practice"]'); first.click('[data-action="custom"]');
  assert.equal(first.root.querySelector('#ear-save-options').hidden, true);
  first.click('#ear-save-on-start');
  assert.equal(first.root.querySelector('#ear-save-options').hidden, false);
  first.root.querySelector('#ear-exercise-name').value = 'Evening thirds';
  first.click('[data-action="start-custom"]');
  const stored = JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1'));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].name, 'Evening thirds');
  assert.equal(stored[0].settings.perNoteInstruments, true);
  assert.equal(first.root.querySelector('#ear-workspace').classList.contains('hidden'), false);
  const id = stored[0].id;
  await flush(); first.app.deactivate(); first.dom.window.close();

  const { dom, root, app, click, change } = setup({}, stored);
  click('[data-action="practice"]');
  click(`[data-start-exercise="${id}"]`);
  assert.match(root.querySelector('#ear-challenge-caption').textContent, /Evening thirds/);
  click('[data-action="settings"]');
  assert.equal(root.querySelector('#ear-save-on-start').checked, false);
  change('[data-setting="duration"]', '1.4');
  click('[data-action="start-custom"]');
  assert.equal(JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1'))[0].settings.duration, .8);
  click('[data-action="settings"]');
  click('#ear-save-on-start'); click('[data-action="start-custom"]');
  assert.equal(JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1'))[0].settings.duration, 1.4);
  click('[data-action="settings"]');
  click('#ear-save-on-start'); click('#ear-save-as-new');
  root.querySelector('#ear-exercise-name').value = 'Longer thirds';
  change('[data-setting="duration"]', '2');
  click('[data-action="start-custom"]');
  const copies = JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1'));
  assert.equal(copies.length, 2);
  assert.equal(copies[0].settings.duration, 1.4);
  assert.equal(copies[1].settings.duration, 2);
  click('[data-action="practice"]');
  click(`[data-remove-exercise="${id}"]`);
  assert.equal(JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1')).length, 1);
  click('[data-action="undo-remove-exercise"]');
  assert.equal(JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1')).length, 2);
  await flush(); app.deactivate(); dom.window.close();
});

test('save-on-start failures preserve the setup and report the error', async () => {
  const { dom, root, app, click, w } = setup();
  click('[data-action="practice"]'); click('[data-action="custom"]');
  click('#ear-save-on-start');
  root.querySelector('#ear-exercise-name').value = 'Thirds';
  click('[data-action="start-custom"]');
  click('[data-action="settings"]');
  click('#ear-save-on-start'); click('#ear-save-as-new');
  root.querySelector('#ear-exercise-name').value = 'Thirds';
  click('[data-action="start-custom"]');
  assert.match(root.querySelector('#ear-save-status').textContent, /already in use/);
  assert.equal(root.querySelector('#ear-setup').classList.contains('hidden'), false);
  assert.equal(JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1')).length, 1);
  const original = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function (key, value) {
    if (key === 'velhoksi.ear.exercises.v1') throw new Error('storage unavailable');
    return original.call(this, key, value);
  };
  root.querySelector('#ear-exercise-name').value = 'Another exercise';
  click('[data-action="start-custom"]');
  assert.equal(root.querySelector('#ear-save-status').dataset.state, 'error');
  assert.match(root.querySelector('#ear-save-status').textContent, /Could not save/);
  assert.equal(root.querySelector('#ear-setup').classList.contains('hidden'), false);
  assert.equal(JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1')).length, 1);
  await flush(); app.deactivate(); dom.window.close();
});

test('optional exercise names are generated uniquely and unchecking save does not persist', () => {
  const { dom, root, app, click, startCustom } = setup();
  startCustom();
  assert.deepEqual(JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1')), []);
  click('[data-action="settings"]');
  click('#ear-save-on-start');
  assert.equal(root.querySelector('#ear-exercise-name').required, false);
  click('[data-action="start-custom"]');
  const first = JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1'))[0];
  assert.ok(first.name.length > 0);
  click('[data-action="settings"]');
  click('#ear-save-on-start'); click('#ear-save-as-new');
  assert.equal(root.querySelector('#ear-exercise-name').value, '');
  click('[data-action="start-custom"]');
  const copies = JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1'));
  assert.equal(copies.length, 2);
  assert.notEqual(copies[0].name, copies[1].name);
  click('[data-action="settings"]');
  click('#ear-save-on-start'); click('#ear-save-on-start');
  assert.equal(root.querySelector('#ear-save-options').hidden, true);
  click('[data-action="start-custom"]');
  assert.deepEqual(JSON.parse(localStorage.getItem('velhoksi.ear.exercises.v1')), copies);
  app.deactivate(); dom.window.close();
});

test('octave controls move playable shortcuts without replacing keys or losing focus', async () => {
  const { dom, root, app, click, w } = setup();
  click('[data-action="cheat"]');
  const down = root.querySelector('[data-octave="-1"][data-piano-context="lab"]');
  const keyC4 = root.querySelector('[data-lab-note="60"]');
  const pane = root.querySelector('[data-piano-scroll="lab"]');
  Object.defineProperty(pane, 'clientWidth', { value: 400 });
  Object.defineProperties(root.querySelector('[data-lab-note="55"]'), { offsetLeft: { value: 600 }, offsetWidth: { value: 40 } });
  pane.scrollTo = ({ left }) => { pane.scrollLeft = left; };
  down.focus(); down.click();
  assert.equal(document.activeElement, down);
  assert.equal(root.querySelector('[data-lab-note="60"]'), keyC4);
  assert.equal(root.querySelector('[data-lab-note="48"] kbd').textContent, 'a');
  assert.match(root.querySelector('#ear-lab-piano [data-piano-range]').textContent, /^C3/);
  assert.equal(pane.scrollLeft, 420);
  assert.equal(keyC4.classList.contains('reference'), true);
  document.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyA', key: 'a', bubbles: true, cancelable: true }));
  await flush();
  assert.deepEqual(recordings.at(-1), { preview: 48 });
  assert.equal(root.querySelector('[data-lab-note="48"]').classList.contains('reference'), true);
  assert.equal(root.querySelector('[data-piano-scroll="lab"]').scrollLeft, 420);
  for (let i = 0; i < 8; i++) click('[data-octave="-1"][data-piano-context="lab"]');
  assert.equal(root.querySelector('[data-octave="-1"][data-piano-context="lab"]').disabled, true);
  assert.equal(root.querySelector('[data-lab-note="36"] kbd').textContent, 'a');
  app.deactivate(); dom.window.close();
});

test('interval shortcuts avoid punctuation and interpret Finnish Shift+0 consistently', async () => {
  const { dom, root, app, click, w } = setup();
  click('[data-action="cheat"]');
  const press = async (code, key, shiftKey = false) => {
    document.dispatchEvent(new w.KeyboardEvent('keydown', { code, key, shiftKey, bubbles: true, cancelable: true }));
    await flush();
  };
  assert.equal(root.querySelector('[data-lab-interval="11"] kbd').textContent, 'q');
  assert.equal(root.querySelector('[data-lab-interval="12"] kbd').textContent, 'r');
  await press('KeyQ', 'q');
  assert.equal(root.querySelector('[data-lab-interval="11"]').getAttribute('aria-pressed'), 'true');
  await press('KeyR', 'r');
  assert.equal(root.querySelector('[data-lab-interval="12"]').getAttribute('aria-pressed'), 'true');
  await press('Digit0', '=', true);
  assert.equal(root.querySelector('[data-lab-interval="22"]').getAttribute('aria-pressed'), 'true');
  await press('KeyR', 'R', true);
  assert.equal(root.querySelector('[data-lab-interval="24"]').getAttribute('aria-pressed'), 'true');
  app.deactivate(); dom.window.close();
});

test('drone piano builds a held set and interval changes preserve extras without struck previews', async () => {
  const { dom, root, app, click } = setup();
  click('[data-action="cheat"]');
  assert.equal(root.querySelector('[data-action="dyad"]'), null);
  assert.ok(root.querySelector('[data-lab-key-mode="drone"]'));
  click('[data-action="drone"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [60, 67]);
  assert.equal(root.querySelector('[data-lab-key-mode="drone"]').getAttribute('aria-pressed'), 'true');
  assert.equal(root.querySelector('[data-lab-note="60"]').getAttribute('aria-pressed'), 'true');
  const start = recordings.length;
  click('[data-lab-note="64"]'); await flush();
  click('[data-lab-note="69"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [60, 64, 67, 69]);
  click('[data-lab-interval="5"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [60, 64, 65, 69]);
  assert.ok(recordings.slice(start).every(entry => entry.drone));
  assert.equal(root.querySelector('[data-lab-note="67"]').getAttribute('aria-pressed'), 'false');
  assert.equal(root.querySelector('[data-lab-note="65"]').getAttribute('aria-pressed'), 'true');
  click('[data-remove-drone-note="64"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [60, 65, 69]);
  click('[data-lab-key-mode="play"]');
  click('[data-lab-note="72"]'); await flush();
  assert.deepEqual(recordings.at(-1), { preview: 72 });
  click('[data-lab-interval="7"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [60, 67, 69]);
  click('[data-lab-key-mode="reference"]');
  click('[data-lab-note="53"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [53, 60, 69]);
  click('[data-action="drone"]'); await flush();
  assert.equal(root.querySelector('.ear-drone-label').textContent, 'start drone');
  assert.equal(root.querySelectorAll('[data-remove-drone-note]').length, 3);
  click('[data-action="drone"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [53, 60, 69]);
  click('[data-action="clear-drone"]'); await flush();
  assert.equal(root.querySelector('[data-action="drone"]').disabled, true);
  assert.equal(root.querySelectorAll('[data-lab-note][aria-pressed="true"]').length, 0);
  click('[data-lab-note="64"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [64]);
  app.deactivate(); dom.window.close();
});

test('drone transport and Space pause and resume held notes without replaying an instrument', async () => {
  const { dom, root, app, click, w } = setup();
  click('[data-action="cheat"]');
  click('[data-lab-key-mode="drone"]');
  click('[data-action="lab-play"]'); await flush();
  assert.deepEqual(recordings.at(-1).drone, [60, 67]);
  assert.equal(root.querySelector('[data-action="lab-play"]').getAttribute('aria-label'), 'stop drone');
  const count = recordings.length;
  const space = () => document.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true }));
  space(); await flush();
  assert.equal(root.querySelector('[data-action="drone"]').getAttribute('aria-pressed'), 'false');
  assert.equal(recordings.length, count);
  space(); await flush();
  assert.deepEqual(recordings.at(-1).drone, [60, 67]);
  assert.equal(root.querySelector('[data-action="loop"]').hidden, true);
  app.deactivate(); dom.window.close();
});

test('note labels link exact pitches on hover and focus without changing sound or score', async () => {
  const { dom, root, app, click, startCustom, w } = setup({ input: 'piano' });
  startCustom();
  click('[data-action="play"]'); await flush();
  click('[data-pitch="64"]'); click('[data-action="check"]');
  const note = root.querySelector('.ear-result-notes [data-note-midi="64"]');
  const score = localStorage.getItem('velhoksi.ear.stats.v1');
  const count = recordings.length;
  note.dispatchEvent(new w.MouseEvent('pointerover', { bubbles: true }));
  assert.equal(root.querySelector('[data-pitch="64"]').classList.contains('is-note-hovered'), true);
  assert.equal(root.querySelector('[data-pitch="76"]').classList.contains('is-note-hovered'), false);
  note.dispatchEvent(new w.MouseEvent('pointerout', { bubbles: true }));
  assert.equal(root.querySelector('[data-pitch="64"]').classList.contains('is-note-hovered'), false);
  note.focus();
  assert.equal(root.querySelector('[data-pitch="64"]').classList.contains('is-note-hovered'), true);
  click('[data-action="cheat"]'); await flush();
  const reference = root.querySelector('.ear-lab-piano-heading [data-note-midi="60"]');
  reference.dispatchEvent(new w.MouseEvent('pointerover', { bubbles: true }));
  const linked = [...root.querySelectorAll('#ear-cheat [data-note-midi="60"]')];
  assert.ok(linked.length >= 4);
  assert.ok(linked.every(element => element.classList.contains('is-note-hovered')));
  assert.equal(root.querySelector('#ear-workspace [data-pitch="64"]').classList.contains('is-note-hovered'), false);
  assert.equal(root.querySelectorAll('[data-piano-range] [data-note-midi]').length, 0);
  assert.equal(recordings.length, count);
  assert.equal(localStorage.getItem('velhoksi.ear.stats.v1'), score);
  app.deactivate(); dom.window.close();
});

test('hovering a fretboard string label highlights every equivalent position only', () => {
  const { dom, root, app, startCustom, w } = setup({ input: 'fretboard' });
  startCustom();
  const label = root.querySelector('.ear-string > [data-note-midi="64"]');
  label.dispatchEvent(new w.MouseEvent('pointerover', { bubbles: true }));
  const positions = [...root.querySelectorAll('[data-pitch="64"]')];
  assert.ok(positions.length > 1);
  assert.ok(positions.every(element => element.classList.contains('is-note-hovered')));
  assert.ok([...root.querySelectorAll('[data-pitch="52"]')].every(element => !element.classList.contains('is-note-hovered')));
  assert.equal(root.querySelector('[data-action="check"]').disabled, true);
  label.dispatchEvent(new w.MouseEvent('pointerout', { bubbles: true }));
  assert.equal(root.querySelectorAll('.is-note-hovered').length, 0);
  app.deactivate(); dom.window.close();
});

for (const direction of ['ascending', 'descending', 'harmonic']) {
  test(`cheat sheet follows the ${direction} question before and after answering`, async () => {
    const { dom, root, app, click, startCustom } = setup({ direction, referenceNote: 65 });
    startCustom();
    const target = direction === 'descending' ? 61 : 69;
    const assertContext = () => {
      assert.equal(root.querySelector('[data-lab-interval="4"]').getAttribute('aria-pressed'), 'true');
      assert.equal(root.querySelector('[data-lab-direction="' + direction + '"]').getAttribute('aria-pressed'), 'true');
      assert.ok(root.querySelector('.ear-lab-piano-heading [data-note-midi="65"]'));
      assert.deepEqual([...root.querySelectorAll('.ear-lab-notes [data-note-midi]')].map(n => Number(n.dataset.noteMidi)), [65, target]);
    };
    const before = recordings.length;
    click('[data-action="cheat"]');
    assertContext();
    assert.equal(recordings.length, before);
    click('[data-action="lab-play"]'); await flush();
    assert.deepEqual(recordings.at(-1).notes, [65, target]);
    click('[data-lab-interval="7"]'); await flush();
    click('[data-close="ear-cheat"]');
    click('[data-action="play"]'); await flush();
    click('[data-interval="4"]'); click('[data-action="check"]');
    click('[data-action="cheat"]');
    assertContext();
    click('[data-action="drone"]'); await flush();
    assert.deepEqual(recordings.at(-1).drone, [65, target].sort((a, b) => a - b));
    app.deactivate(); dom.window.close();
  });
}

test('cheat sheet length defaults to maximum and can change independently of the quiz', async () => {
  const { dom, root, app, click, change, startCustom } = setup({ duration: .8 });
  startCustom();
  click('[data-action="cheat"]');
  const length = root.querySelector('[data-lab="duration"]');
  assert.equal(length.value, length.max);
  click('[data-action="lab-play"]'); await flush();
  assert.equal(recordings.at(-1).settings.duration, Number(length.max));
  change('[data-lab="duration"]', '2.5');
  click('[data-action="lab-play"]'); await flush();
  assert.equal(recordings.at(-1).settings.duration, 2.5);
  click('[data-close="ear-cheat"]');
  click('[data-action="play"]'); await flush();
  assert.equal(recordings.at(-1).settings.duration, .8);
  app.deactivate(); dom.window.close();
});

test('cheat sheet analyses all drone pairs with optional, linked harmonic detail', async () => {
  const { dom, root, app, click, w } = setup();
  click('[data-action="cheat"]');
  assert.equal(root.querySelector('[data-analysis-body]').childNodes.length, 0);
  assert.equal(root.querySelector('.ear-harmonics'), null);
  click('[data-action="drone"]'); await flush();
  click('[data-lab-note="64"]'); await flush();
  click('[data-lab-note="76"]'); await flush();
  assert.match(root.querySelector('[data-analysis-summary]').textContent, /major tenth/);
  const details = root.querySelector('[data-analysis-details]');
  details.open = true; details.dispatchEvent(new w.Event('toggle'));
  assert.equal(root.querySelectorAll('.ear-pair-table tbody tr').length, 6);
  assert.equal(root.querySelectorAll('.ear-harmonic-row').length, 4);
  assert.match(root.querySelector('.ear-listening-facts').textContent, /doubled third/);
  const pair = root.querySelector('.ear-pair-table tr[data-note-midis="60,64"]');
  pair.dispatchEvent(new w.MouseEvent('pointerover', { bubbles: true }));
  assert.ok(root.querySelector('[data-lab-note="60"]').classList.contains('is-note-hovered'));
  assert.ok(root.querySelector('[data-lab-note="64"]').classList.contains('is-note-hovered'));
  assert.ok(!root.querySelector('[data-lab-note="67"]').classList.contains('is-note-hovered'));
  click('[data-analysis-pair="60,64"]'); await flush();
  assert.deepEqual(recordings.at(-1).notes, [60, 64]);
  assert.equal(root.querySelectorAll('[data-analysis-notes] [data-note-midi]').length, 4);
  details.open = false; details.dispatchEvent(new w.Event('toggle'));
  assert.equal(root.querySelector('[data-analysis-body]').childNodes.length, 0);
  assert.equal(root.querySelector('.ear-harmonics'), null);
  app.deactivate(); dom.window.close();
});

test('result gives a shifted later interval credit and shows the actual mistaken gap', async () => {
  const { dom, root, app, click, startCustom } = setup({ input: 'piano', direction: 'ascending', intervals: [4], minNotes: 3, maxNotes: 3 });
  startCustom();
  click('[data-action="play"]'); await flush();
  click('[data-pitch="63"]'); click('[data-pitch="67"]'); click('[data-action="check"]');
  const steps = root.querySelectorAll('.ear-result-part');
  assert.ok(steps[0].classList.contains('incorrect'));
  assert.ok(steps[1].classList.contains('correct'));
  assert.match(steps[1].textContent, /interval correct · pitches shifted/);
  assert.match(steps[0].querySelector('.ear-result-submitted').textContent, /minor third/);
  assert.match(root.querySelector('.ear-result-counts').textContent, /1 of 2 intervals correct/);
  assert.match(root.querySelector('.ear-result-counts').textContent, /0 of 2 notes matched/);
  app.deactivate(); dom.window.close();
});
