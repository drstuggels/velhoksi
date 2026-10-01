import { MAX_NOTE_DURATION, INTERVALS, sanitizeSettings, generateQuestion, gradeAnswer, noteName, intervalName, parseInterval, parseNote, notesFromIntervals } from './theory.mjs';
import { CHALLENGES, challengeSettings, questionSound } from './challenges.mjs';
import { SampleEngine } from './audio.mjs';
import { describeInterval, analyseNotes, harmonicModel, nearbyHarmonics, uniquePitches } from './analysis.mjs';
import { PIANO_KEYS, INTERVAL_CODES, intervalShortcut } from './shortcuts.mjs';
import { INSTRUMENTS, instrumentById } from './instruments.mjs';

const SETTINGS_KEY = 'velhoksi.ear.settings.v1';
const STATS_KEY = 'velhoksi.ear.stats.v1';
const EXERCISES_KEY = 'velhoksi.ear.exercises.v1';
const PLAY_ICON = '<svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5 3.5v13L16 10z"/></svg>';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Practice works without persistent storage. */ } };
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const options = (items, value) => items.map(([id, label]) => `<option value="${esc(id)}" ${String(id) === String(value) ? 'selected' : ''}>${esc(label)}</option>`).join('');
const instrumentOptions = value => ['keys', 'guitars', 'organs', 'synths', 'mallets', 'plucked strings'].map(family =>
  `<optgroup label="${family}">${options(INSTRUMENTS.filter(i => i.family === family).map(i => [i.id, i.name]), value)}</optgroup>`).join('');
const DIRECTIONS = [['ascending', 'ascending'], ['descending', 'descending'], ['harmonic', 'together'], ['melodic', 'ascending / descending'], ['mixed', 'ascending / descending / together']];
const INPUTS = [['interval', 'interval'], ['piano', 'piano'], ['fretboard', 'fretboard'], ['note', 'note names']];
const NOTES = Array.from({ length: 49 }, (_, i) => [i + 36, noteName(i + 36)]);
const noteMention = midi => `<span class="ear-note-mention" data-note-midi="${midi}" tabindex="0">${noteName(midi)}</span>`;
const readExercises = () => {
  const records = read(EXERCISES_KEY, []);
  if (!Array.isArray(records)) return [];
  const seen = new Set();
  return records.filter(item => {
    if (!item || typeof item.id !== 'string' || !/^[\w-]+$/.test(item.id) || seen.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || !item.settings || typeof item.settings !== 'object' || Array.isArray(item.settings)) return false;
    seen.add(item.id);
    return true;
  }).map(item => ({ id: item.id, name: item.name.trim().slice(0, 80), settings: sanitizeSettings(item.settings) }));
};

export function createEarTraining(root, { onExit }) {
  const storedSettings = read(SETTINGS_KEY, {});
  if (!storedSettings.inputDefaultVersion && (!storedSettings.input || storedSettings.input === 'interval')) storedSettings.input = 'piano';
  let settings = sanitizeSettings({ ...storedSettings, inputDefaultVersion: 2 });
  save(SETTINGS_KEY, settings);
  let customSettings = { ...settings };
  let savedExercises = readExercises();
  let selectedExerciseId = null;
  let customExerciseId = null;
  let removedExercise = null;
  let selectedChallenge = 'custom';
  let expandedChallenge = null;
  const challengeDrafts = Object.fromEntries(CHALLENGES.map(c => [c.id, { input: settings.input, intervals: [...c.settings.intervals], perNoteInstruments: settings.perNoteInstruments }]));
  let sound = null;
  let quizBeforeSettings = null;
  let pianoBase = 60;
  let pianoQuestionId = null;
  let explorationAnimation = 0;
  let explorationEvents = [];
  let intervalEvents = [];
  let hoveredNote = null;
  let focusedNote = null;
  let instrumentPreview = null;
  let pitchPreview = null;
  let previewAnimation = 0;
  let stats = read(STATS_KEY, { buckets: {}, skills: {} });
  if (!stats.buckets || !stats.skills) stats = { buckets: {}, skills: {} };
  let active = false;
  let view = 'menu';
  let question = null;
  let answer = [];
  let result = null;
  let heard = false;
  let assisted = false;
  let replays = 0;
  let busy = false;
  let operation = 0;
  let animation = 0;
  let playback = null;
  let selectedSlot = 0;
  let lab = { analysisNotes: null, analysisMode: 'selected', analysisOpen: false, analysisPage: 0, reference: 60, interval: 7, direction: 'harmonic', duration: MAX_NOTE_DURATION, drone: false, droneNotes: [60, 67], loop: false, keyMode: 'reference', pianoBase: 60, level: .85, motion: .4, busy: false, perNoteInstruments: false, noteFocus: 0, instrument2: 'guitar-electric', family: 'keys' };
  let analysisCache = null;
  let labAnimation = 0;
  let labRequest = 0;
  let labEvents = [];
  let loopTimer = null;
  const engine = new SampleEngine((message, state) => {
    if (!active) return;
    setStatus(message, state);
    if (state === 'paused') {
      operation++;
      stopExploration();
      cancelAnimationFrame(previewAnimation);
      instrumentPreview = null;
      pitchPreview = null;
      syncInstrumentPreviews();
      busy = false;
      lab.busy = false;
      labEvents = [];
      labRequest++;
      cancelAnimationFrame(labAnimation);
      lab.drone = false;
      stopLoop();
      stopAnimation();
      updateControls();
      syncLab();
    }
  });
  engine.configure(settings);

  root.innerHTML = `
    <div id="ear-menu" class="view view-picker">
      <div class="intro-copy"><nav class="ear-breadcrumbs" aria-label="practice navigation"><button type="button" class="text-button" data-action="home">practice sets</button><span>/</span><span aria-current="page">ear training</span></nav><h2>pick a practice set</h2></div>
      <div class="alphabet-picker ear-picker" aria-label="ear training submode">
        <button type="button" class="alphabet-button" data-action="practice"><span class="alphabet-button-label">intervals</span><span class="alphabet-button-preview interval-name-carousel" aria-hidden="true"><span class="alphabet-button-preview-track">${Array.from({ length: 2 }, () => `<span>${INTERVALS.map(interval => interval.name).join(" · ")} · </span>`).join('')}</span></span></button>
      </div>
      <div class="ear-menu-tools"><button type="button" class="text-button" data-action="cheat">cheat sheet</button></div>
    </div>
    <div id="ear-challenges" class="view view-picker ear-challenges hidden">
      <div class="intro-copy">${breadcrumbs()}<h2>pick a challenge</h2></div>
      <div class="alphabet-picker ear-challenge-picker" aria-label="interval challenges">
        ${CHALLENGES.map(challengeCard).join('')}
        <button type="button" class="alphabet-button ear-custom-choice" data-action="custom"><span class="alphabet-button-label">custom</span><span class="ear-challenge-description">set up a challenge ↗</span></button>
      </div>
      <section id="ear-saved-exercises" class="ear-saved-exercises" aria-labelledby="ear-saved-title" hidden><h3 id="ear-saved-title">saved exercises</h3><div id="ear-saved-list"></div><div class="ear-saved-notice"><p id="ear-saved-status" role="status"></p><button type="button" class="text-button" data-action="undo-remove-exercise" hidden>undo</button></div></section>
      <div class="ear-menu-tools"><button type="button" class="text-button" data-action="cheat">cheat sheet</button></div>
    </div>
    <div id="ear-setup" class="view ear-setup hidden">
      <div class="ear-setup-inner">
        <div class="ear-setup-header"><div>${breadcrumbs()}<h2 id="ear-setup-title">custom challenge</h2></div><button type="button" class="text-button" data-action="back-quiz" hidden>back to quiz →</button></div>
        <div id="ear-settings-content"></div>
        <form id="ear-save-exercise" class="ear-setup-start">
          <div id="ear-save-options" class="ear-save-options" hidden>
            <label class="visually-hidden" for="ear-exercise-name">exercise name (optional)</label><input id="ear-exercise-name" type="text" maxlength="80" placeholder="name (optional)" autocomplete="off" />
            <label class="ear-checkbox ear-save-copy" hidden><input id="ear-save-as-new" type="checkbox" /> save as new</label>
          </div>
          <div class="ear-setup-actions">
            <button type="submit" class="ear-primary" data-action="start-custom">start quiz →</button>
            <label class="ear-checkbox ear-save-toggle"><input id="ear-save-on-start" type="checkbox" aria-controls="ear-save-options" /> save exercise</label>
            <button type="button" class="ear-primary" data-action="save-now" hidden>save now</button>
          </div>
          <p id="ear-save-status" role="status"></p><p id="ear-setup-error" role="status"></p>
        </form>
      </div>
    </div>
    <div id="ear-workspace" class="view view-game hidden">
      <div id="ear-practice" class="floating floating-main ear-main">
        <div class="prompt-meta">
          <div class="prompt-title-row">${breadcrumbs()}</div>
          <div class="prompt-tools" role="group" aria-label="quiz tools"><button type="button" class="text-button" data-action="settings">edit challenge</button><span class="nav-separator" aria-hidden="true">/</span><button type="button" class="text-button" data-action="cheat">cheat sheet</button><span class="nav-separator" aria-hidden="true">/</span><button type="button" class="text-button" data-action="shortcuts">shortcuts</button></div>
        </div>
        <section class="prompt-card ear-prompt" aria-labelledby="ear-question-title">
          <h2 id="ear-question-title" class="visually-hidden">intervals</h2>
          <p id="ear-question-description" class="visually-hidden"></p>
          <div class="ear-note-dots" id="ear-note-dots" aria-hidden="true"></div>
          <button type="button" class="ear-play" data-action="play"><span class="ear-play-icon" aria-hidden="true">▶</span><span id="ear-play-label">listen</span></button>
          <div class="ear-prompt-footer"><span id="ear-challenge-caption" class="ear-challenge-caption"></span><div class="ear-transport"><button type="button" class="text-button" data-action="stop">stop</button><button type="button" class="text-button" data-action="hint">listen slowly</button><button type="button" class="text-button" data-action="reveal">reveal</button></div></div>
        </section>
        <section class="ear-answer" aria-label="answer">
          <div class="ear-answer-heading"><p id="ear-answer-instruction" class="ear-muted"></p><span id="ear-selected-answer" class="ear-selected-answer"></span></div>
          <div id="ear-answer-slots" class="ear-answer-slots" aria-label="answer positions"></div>
          <div id="ear-answer-surface"></div>
          <div class="ear-answer-actions"><button type="button" class="ear-primary" data-action="check">check answer</button><button type="button" class="text-button" data-action="undo">undo</button><button type="button" class="text-button" data-action="clear">clear</button><button type="button" class="text-button" data-action="next">next question →</button></div>
          <div id="ear-feedback" class="ear-feedback" role="status" aria-live="polite"></div>
          <div id="ear-comparison" class="ear-comparison hidden"><div class="ear-replay-controls" role="group" aria-label="compare answers"><button type="button" class="ear-audio-button" data-action="target">${PLAY_ICON}<span>replay answer</span></button><button type="button" class="ear-audio-button" data-action="mine">${PLAY_ICON}<span>compare mine</span></button></div></div>
          <div id="ear-sound-status" class="ear-sound-status" role="status" aria-live="polite"></div>
        </section>
      </div>
      <aside id="ear-stats" class="floating floating-stats ear-stats" aria-label="practice statistics"></aside>
    </div>

    <dialog id="ear-cheat" class="ear-dialog" aria-labelledby="ear-cheat-title"><div class="ear-dialog-header"><h2 id="ear-cheat-title">interval cheat sheet</h2><button type="button" class="text-button" data-close="ear-cheat">close</button></div><div id="ear-lab-dialog"></div></dialog>
    <dialog id="ear-shortcuts" class="ear-dialog" aria-labelledby="ear-shortcuts-title"><div class="ear-dialog-header"><h2 id="ear-shortcuts-title">shortcuts</h2><button type="button" class="text-button" data-close="ear-shortcuts">close</button></div><dl class="ear-shortcut-list"><dt>space</dt><dd>replay</dd><dt>enter</dt><dd>check / next question</dd><dt>escape</dt><dd>stop sound / close dialog</dd><dt>alt + c</dt><dd>cheat sheet</dd><dt>alt + s</dt><dd>edit challenge</dd><dt>a w s e d f t g y h u j k o l p</dt><dd>piano: chromatic notes from C; the matching keys are labelled</dd><dt>z / x</dt><dd>piano: octave down / up</dd><dt>1–9, 0, q, r</dt><dd>intervals: 1–12 semitones; hold shift for 13–24</dd></dl></dialog>
  `;
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];

  function noteScope() {
    return root.querySelector('dialog[open]') || $({ menu: '#ear-menu', challenges: '#ear-challenges', setup: '#ear-setup', practice: '#ear-workspace' }[view]);
  }
  function noteTarget(target) {
    const note = target?.closest?.('[data-note-midi], [data-note-midis]');
    return note && noteScope()?.contains(note) ? note : null;
  }
  function syncNoteHighlights() {
    const scope = noteScope();
    if (!hoveredNote?.isConnected || !scope?.contains(hoveredNote)) hoveredNote = null;
    if (!focusedNote?.isConnected || !scope?.contains(focusedNote)) focusedNote = null;
    const source = hoveredNote || focusedNote;
    const pitches = source ? (source.dataset.noteMidis || source.dataset.noteMidi).split(',') : [];
    for (const note of $$('[data-note-midi], [data-note-midis]')) {
      const matches = (note.dataset.noteMidis || note.dataset.noteMidi).split(',').some(midi => pitches.includes(midi));
      note.classList.toggle('is-note-hovered', !!source && scope.contains(note) && matches);
    }
  }
  function revealLinkedNote(source) {
    if (!source || !source.dataset.noteMidi || source.closest('.ear-instrument-scroll')) return;
    for (const pane of noteScope().querySelectorAll('.ear-instrument-scroll')) {
      if (!pane.clientWidth) continue;
      const frame = pane.getBoundingClientRect();
      const offsets = [...pane.querySelectorAll('[data-note-midi]')]
        .filter(note => note.dataset.noteMidi === source.dataset.noteMidi)
        .map(note => {
          const rect = note.getBoundingClientRect();
          return rect.left < frame.left + 4 ? rect.left - frame.left - 4 : rect.right > frame.right - 4 ? rect.right - frame.right + 4 : 0;
        });
      if (!offsets.length || offsets.includes(0)) continue;
      const left = offsets.reduce((nearest, value) => Math.abs(value) < Math.abs(nearest) ? value : nearest);
      if (pane.scrollBy) pane.scrollBy({ left, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      else pane.scrollLeft += left;
    }
  }
  root.addEventListener('pointerover', event => {
    const next = noteTarget(event.target);
    if (next === hoveredNote) return;
    hoveredNote = next;
    syncNoteHighlights(); revealLinkedNote(next);
  });
  root.addEventListener('pointerout', event => {
    if (noteTarget(event.relatedTarget) === hoveredNote) return;
    hoveredNote = null;
    syncNoteHighlights();
  });
  root.addEventListener('focusin', event => {
    focusedNote = noteTarget(event.target);
    syncNoteHighlights(); revealLinkedNote(focusedNote);
  });
  root.addEventListener('focusout', event => {
    focusedNote = noteTarget(event.relatedTarget);
    syncNoteHighlights();
  });
  // Re-rendered answers and drone notes join the current highlight; removed
  // controls cannot leave a stale highlight behind. Animation classes are ignored.
  new window.MutationObserver(syncNoteHighlights).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-note-midi', 'data-note-midis', 'open', 'hidden'] });

  function setStatus(message, state = '') {
    if (state === 'playing' || state === 'drone') message = '';
    const el = $('#ear-sound-status');
    el.textContent = message;
    el.dataset.state = state;
    if (view === 'setup' && state === 'error') $('#ear-setup-error').textContent = message;
    const dialogStatus = root.querySelector('dialog[open] .ear-local-status') || (view === 'setup' ? $('#ear-setup .ear-local-status') : null);
    if (dialogStatus) { dialogStatus.textContent = message; dialogStatus.dataset.state = state; }
  }
  function fail(error) { setStatus(error.message || 'Something went wrong. Please try again.', 'error'); }
  async function safely(action) { try { await action(); } catch (error) { busy = false; lab.busy = false; if (!engine.activeDrone) lab.drone = false; fail(error); updateControls(); syncLab(); } }

  function stopAnimation() {
    cancelAnimationFrame(animation);
    animation = 0;
    playback = null;
    $$('.ear-note-dot').forEach(dot => dot.classList.remove('playing'));
    $('.ear-play')?.classList.remove('is-playing');
  }
  function stopLoop() {
    lab.loop = false;
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  function stopAll(preserveTail = false) {
    operation++;
    stopExploration();
    cancelAnimationFrame(previewAnimation);
    instrumentPreview = null;
    pitchPreview = null;
    syncInstrumentPreviews();
    labRequest++;
    lab.busy = false;
    labEvents = [];
    cancelAnimationFrame(labAnimation);
    engine.cancel(true, { resetReverb: !preserveTail, fade: preserveTail ? 0.12 : 0.025 });
    stopLoop();
    stopAnimation();
    busy = false;
    lab.drone = false;
    updateControls();
    syncLab();
  }

  function breadcrumbs() {
    return '<nav class="ear-breadcrumbs" aria-label="practice navigation"><button type="button" class="text-button" data-action="home">practice sets</button><span>/</span><button type="button" class="text-button" data-action="menu">ear training</button><span>/</span><button type="button" class="text-button" data-action="practice">intervals</button></nav>';
  }

  function show(next) {
    stopAll();
    hoveredNote = focusedNote = null;
    view = next;
    syncNoteHighlights();
    for (const [name, id] of [['menu', 'ear-menu'], ['challenges', 'ear-challenges'], ['setup', 'ear-setup'], ['practice', 'ear-workspace']]) {
      $('#' + id).classList.toggle('hidden', next !== name);
    }
    if (next === 'challenges') { syncChallengeCards(); renderSavedExercises(); }
    if (next === 'setup') {
      $('#ear-setup-title').textContent = quizBeforeSettings ? 'settings' : 'custom challenge';
      $('[data-action="back-quiz"]').hidden = !quizBeforeSettings;
      $('[data-action="start-custom"]').textContent = quizBeforeSettings ? 'new quiz →' : 'start quiz →';
      renderSettings(); renderSaveExercise(); $('#ear-setup-error').textContent = ''; $('#ear-setup').scrollTop = 0; }
    if (next === 'practice') { if (!question) newQuestion(); else renderQuestion(); }
    if (question || next !== 'practice') setStatus('');
  }

  function challengeDrawing(id) {
    const points = id === '1' ? [[12, 34], [48, 10]] : id === '2' ? [[8, 34], [30, 10], [54, 34]] : id === '3' ? [[30, 10], [30, 34]] : [[6, 35], [24, 22], [42, 8], [60, 22], [60, 35]];
    return `<svg class="ear-challenge-drawing" viewBox="0 0 70 44" aria-hidden="true"><path d="M ${points.map(p => p.join(' ')).join(' L ')}"/>${points.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4" style="--note-delay:${i * 70}ms"/>`).join('')}</svg>`;
  }

  function challengeCard(c) {
    const draft = challengeDrafts[c.id];
    const chips = intervals => intervals.map(i => `<button type="button" class="ear-challenge-interval" data-challenge-interval="${i.semitones}" data-for-challenge="${c.id}" aria-label="${i.name}" title="${i.name}" aria-pressed="${draft.intervals.includes(i.semitones)}">${i.short}</button>`).join('');
    return `<article class="ear-challenge-card" data-card="${c.id}">
      <button type="button" class="ear-challenge-select" data-challenge="${c.id}" aria-expanded="false" aria-controls="ear-challenge-options-${c.id}">
        <span class="ear-challenge-card-top"><span class="ear-challenge-level">level ${c.id}</span><span class="ear-challenge-expand" aria-hidden="true">+</span></span>
        <span class="ear-challenge-card-title"><span class="alphabet-button-label">${c.name}</span>${challengeDrawing(c.id)}</span>
        <span class="ear-challenge-description">${c.notes}<span aria-hidden="true"> / </span>${c.motion}${c.settings.varyInstrument ? '<span class="ear-timbre-mark" title="alternating instruments"> / varied timbres</span>' : ''}</span>
        <span class="ear-challenge-summary" data-challenge-summary="${c.id}">${draft.intervals.map(intervalName).join(' · ')}</span>
      </button>
      <div id="ear-challenge-options-${c.id}" class="ear-challenge-options hidden">
        <fieldset class="ear-card-answer"><legend>answer with</legend><div>${INPUTS.map(([id, label]) => `<button type="button" data-challenge-input="${id}" data-for-challenge="${c.id}" aria-pressed="${draft.input === id}">${label}</button>`).join('')}</div></fieldset>
        <div class="ear-card-interval-heading"><span>intervals</span><div><button type="button" class="text-button" data-challenge-set="simple" data-for-challenge="${c.id}">all simple</button><span>/</span><button type="button" class="text-button" data-challenge-set="reset" data-for-challenge="${c.id}">reset</button></div></div>
        <div class="ear-card-intervals" role="group" aria-label="simple intervals">${chips(INTERVALS.slice(0, 12))}</div>
        <details class="ear-card-compound"><summary>extend beyond an octave</summary><div class="ear-card-intervals" role="group" aria-label="compound intervals">${chips(INTERVALS.slice(12))}</div></details>
        <label class="ear-checkbox ear-card-multitimbral"><input type="checkbox" data-challenge-multitimbral="${c.id}" ${draft.perNoteInstruments ? 'checked' : ''} /> different instrument per note</label><div class="ear-card-start"><button type="button" class="ear-primary" data-start-challenge="${c.id}">start →</button><button type="button" class="text-button" data-customize-challenge="${c.id}">more settings</button></div>
        <p class="ear-card-error" data-challenge-error="${c.id}" role="status"></p>
      </div>
    </article>`;
  }

  function syncChallengeCards() {
    for (const c of CHALLENGES) {
      const card = $(`[data-card="${c.id}"]`);
      const draft = challengeDrafts[c.id];
      const expanded = c.id === expandedChallenge;
      card.classList.toggle('is-selected', expanded);
      card.querySelector('[data-challenge]').setAttribute('aria-expanded', String(expanded));
      card.querySelector('.ear-challenge-expand').textContent = expanded ? '−' : '+';
      card.querySelector('.ear-challenge-options').classList.toggle('hidden', !expanded);
      card.querySelector('[data-challenge-summary]').textContent = draft.intervals.length ? draft.intervals.map(intervalName).join(' · ') : 'choose intervals';
      card.querySelector('[data-challenge-multitimbral]').checked = draft.perNoteInstruments;
      card.querySelectorAll('[data-challenge-input]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.challengeInput === draft.input)));
      card.querySelectorAll('[data-challenge-interval]').forEach(b => b.setAttribute('aria-pressed', String(draft.intervals.includes(Number(b.dataset.challengeInterval)))));
      const compoundCount = draft.intervals.filter(n => n > 12).length;
      card.querySelector('.ear-card-compound summary').textContent = `extend beyond an octave${compoundCount ? ` · ${compoundCount} selected` : ''}`;
      card.querySelector('[data-start-challenge]').disabled = !draft.intervals.length;
      card.querySelector('[data-challenge-error]').textContent = draft.intervals.length ? '' : 'Choose at least one interval.';
    }
  }

  function renderSavedExercises() {
    savedExercises = readExercises();
    $('#ear-saved-exercises').hidden = !savedExercises.length && !removedExercise;
    $('#ear-saved-list').innerHTML = savedExercises.map(exercise => {
      const s = exercise.settings;
      const count = s.minNotes === s.maxNotes ? s.minNotes : `${s.minNotes}–${s.maxNotes}`;
      return `<article class="ear-saved-exercise"><div><h4>${esc(exercise.name)}</h4><p>${count} notes · ${DIRECTIONS.find(([id]) => id === s.direction)[1]} · ${INPUTS.find(([id]) => id === s.input)[1]}</p><p class="ear-saved-intervals">${s.intervals.map(intervalName).join(' · ')}</p></div><div class="ear-saved-actions"><button type="button" class="ear-primary" data-start-exercise="${exercise.id}" aria-label="Start ${esc(exercise.name)}">start →</button><button type="button" class="text-button" data-edit-exercise="${exercise.id}" aria-label="Edit ${esc(exercise.name)}">edit</button><button type="button" class="text-button" data-remove-exercise="${exercise.id}" aria-label="Remove ${esc(exercise.name)}">remove</button></div></article>`;
    }).join('');
    $('[data-action="undo-remove-exercise"]').hidden = !removedExercise;
  }

  function syncSaveControls() {
    const saving = $('#ear-save-on-start').checked;
    $('#ear-save-options').hidden = !saving;
    $('[data-action="save-now"]').hidden = !saving;
    $('[data-action="start-custom"]').textContent = saving ? 'save and start quiz →' : 'start quiz →';
  }

  function renderSaveExercise(keepSaving = false) {
    const exercise = savedExercises.find(item => item.id === selectedExerciseId);
    $('#ear-exercise-name').value = exercise?.name || '';
    $('#ear-save-on-start').checked = keepSaving;
    $('#ear-save-as-new').checked = false;
    syncSaveControls();
    $('.ear-save-copy').hidden = !exercise;
    $('#ear-save-status').textContent = '';
    $('#ear-save-status').removeAttribute('data-state');
  }

  function writeExercises(records, status) {
    try {
      localStorage.setItem(EXERCISES_KEY, JSON.stringify(records));
      savedExercises = records;
      status.removeAttribute('data-state');
      return true;
    } catch {
      status.textContent = 'Could not save your exercises. Please try again.';
      status.dataset.state = 'error';
      return false;
    }
  }

  function saveExercise(asNew = false, keepEditing = false) {
    const input = $('#ear-exercise-name');
    const status = $('#ear-save-status');
    const existing = readExercises();
    const editing = !asNew && existing.some(item => item.id === selectedExerciseId);
    const snapshot = sanitizeSettings(settings);
    let name = input.value.trim();
    if (!name) {
      const count = snapshot.minNotes === snapshot.maxNotes ? snapshot.minNotes : `${snapshot.minNotes}–${snapshot.maxNotes}`;
      const direction = DIRECTIONS.find(([id]) => id === snapshot.direction)[1];
      const base = editing ? existing.find(item => item.id === selectedExerciseId).name : `${direction} · ${count} notes${snapshot.intervals.length <= 3 ? ` · ${snapshot.intervals.map(intervalName).join(', ')}` : ''}`.slice(0, 68);
      name = base;
      let suffix = 2;
      while (existing.some(item => (!editing || item.id !== selectedExerciseId) && item.name.toLowerCase() === name.toLowerCase())) name = `${base} (${suffix++})`;
    }
    status.dataset.state = 'error';
    if (existing.some(item => (!editing || item.id !== selectedExerciseId) && item.name.toLowerCase() === name.toLowerCase())) {
      status.textContent = 'That name is already in use. Choose a different name.';
      input.focus(); input.select(); return false;
    }
    try {
      generateQuestion(snapshot.input === 'fretboard' ? { ...snapshot, low: Math.max(40, snapshot.low) } : snapshot);
    } catch (error) { status.textContent = error.message; return false; }
    const id = editing ? selectedExerciseId : `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const record = { id, name: name.slice(0, 80), settings: snapshot };
    const next = editing ? existing.map(item => item.id === id ? record : item) : [...existing, record];
    if (!writeExercises(next, status)) return false;
    selectedExerciseId = customExerciseId = id;
    customSettings = sanitizeSettings(snapshot);
    save(SETTINGS_KEY, customSettings);
    renderSaveExercise(keepEditing);
    status.textContent = editing ? 'Changes saved.' : 'Exercise saved.';
    return true;
  }

  function startCustomQuiz() {
    if ($('#ear-save-on-start').checked && !saveExercise($('#ear-save-as-new').checked)) return;
    startChallenge('custom');
  }

  function openSavedExercise(id, start = false) {
    savedExercises = readExercises();
    const exercise = savedExercises.find(item => item.id === id);
    if (!exercise) { renderSavedExercises(); return; }
    selectedExerciseId = customExerciseId = id;
    settings = sanitizeSettings(exercise.settings);
    customSettings = sanitizeSettings(settings);
    save(SETTINGS_KEY, customSettings);
    quizBeforeSettings = null;
    engine.configure(settings);
    show('setup');
    if (start) startChallenge('custom');
  }

  function removeExercise(id) {
    const records = readExercises();
    const exercise = records.find(item => item.id === id);
    if (!exercise || !writeExercises(records.filter(item => item.id !== id), $('#ear-saved-status'))) return;
    removedExercise = exercise;
    if (selectedExerciseId === id) selectedExerciseId = null;
    if (customExerciseId === id) customExerciseId = null;
    renderSavedExercises();
    $('#ear-saved-status').textContent = `Removed “${exercise.name}”.`;
    $('[data-action="undo-remove-exercise"]').focus({ preventScroll: true });
  }

  function undoRemoveExercise() {
    if (!removedExercise) return;
    const records = readExercises();
    if (records.some(item => item.id === removedExercise.id || item.name.toLowerCase() === removedExercise.name.toLowerCase())) {
      $('#ear-saved-status').textContent = 'An exercise with that name already exists.';
      return;
    }
    if (!writeExercises([...records, removedExercise], $('#ear-saved-status'))) return;
    const restoredId = removedExercise.id;
    removedExercise = null;
    renderSavedExercises();
    $('#ear-saved-status').textContent = 'Exercise restored.';
    $(`[data-start-exercise="${restoredId}"]`).focus({ preventScroll: true });
  }

  function updateSettings(patch) {
    settings = sanitizeSettings({ ...settings, ...patch });
    customSettings = { ...settings };
    customExerciseId = selectedExerciseId;
    save(SETTINGS_KEY, customSettings);
    engine.configure(settings);
    $('#ear-setup-error').textContent = '';
    $('#ear-save-status').textContent = '';
  }

  function openCustom(fromQuiz = false) {
    quizBeforeSettings = fromQuiz && view === 'practice' && question ? { settings: { ...settings }, sound, challenge: selectedChallenge } : null;
    settings = sanitizeSettings(fromQuiz ? settings : customSettings);
    if (!fromQuiz) selectedExerciseId = customExerciseId;
    show('setup');
  }

  function backToQuiz() {
    if (!quizBeforeSettings) return;
    const previous = quizBeforeSettings;
    try {
      generateQuestion(settings.input === 'fretboard' ? { ...settings, low: Math.max(40, settings.low) } : settings);
    } catch (error) { $('#ear-setup-error').textContent = error.message; return; }
    const exerciseKeys = ['direction', 'minNotes', 'maxNotes', 'low', 'high', 'intervals', 'reference', 'referenceNote', 'input'];
    const changed = JSON.stringify(settings) !== JSON.stringify(previous.settings);
    const newExercise = exerciseKeys.some(key => JSON.stringify(settings[key]) !== JSON.stringify(previous.settings[key]));
    selectedChallenge = changed || selectedExerciseId ? 'custom' : previous.challenge;
    sound = changed ? questionSound(settings, null) : previous.sound;
    quizBeforeSettings = null;
    if (newExercise) question = null;
    show('practice');
    engine.configure(sound || settings);
  }

  function startChallenge(id) {
    const nextSettings = challengeSettings(id, id === 'custom' ? settings : customSettings, challengeDrafts[id]);
    // Validate before leaving setup, so a constrained custom exercise can be fixed here.
    try {
      generateQuestion(nextSettings.input === 'fretboard' ? { ...nextSettings, low: Math.max(40, nextSettings.low) } : nextSettings);
    } catch (error) {
      if (view === 'setup') $('#ear-setup-error').textContent = error.message;
      else $(`[data-challenge-error="${id}"]`).textContent = error.message;
      return;
    }
    settings = nextSettings;
    quizBeforeSettings = null;
    selectedChallenge = id;
    if (id === 'custom') { customSettings = { ...settings }; customExerciseId = selectedExerciseId; save(SETTINGS_KEY, customSettings); }
    else selectedExerciseId = null;
    sound = null;
    question = null;
    show('practice');
  }

  function newQuestion() {
    stopAll(true);
    answer = [];
    result = null;
    heard = false;
    assisted = $('#ear-cheat').open;
    replays = 0;
    selectedSlot = 0;
    try {
      const effective = settings.input === 'fretboard' ? { ...settings, low: Math.max(40, settings.low) } : settings;
      question = generateQuestion(effective, stats.skills);
      pianoBase = Math.floor(Math.min(question.reference, settings.high - 12) / 12) * 12;
      sound = questionSound(settings, sound);
      engine.configure(sound);
    } catch (error) {
      question = null;
      fail(error);
    }
    renderQuestion();
    if (question) { setStatus(''); $('[data-action="play"]').focus({ preventScroll: true }); }
  }

  function renderQuestion() {
    const q = question;
    const challenge = CHALLENGES.find(c => c.id === selectedChallenge);
    const savedExercise = savedExercises.find(item => item.id === selectedExerciseId);
    $('#ear-challenge-caption').textContent = `${savedExercise?.name || (challenge ? `level ${challenge.id}` : 'custom')} · ${q?.count || settings.minNotes} notes · ${q?.direction === 'harmonic' ? 'together' : q?.direction || settings.direction}`;
    $('#ear-question-title').textContent = !q ? 'adjust your settings' : q.count === 2 ? 'interval recognition' : q.direction === 'harmonic' ? 'harmonic stack' : 'interval chain';
    $('#ear-question-description').textContent = !q ? 'Edit the challenge to change intervals, note count, reference or pitch range.' : `${q.count} notes · ${q.direction === 'harmonic' ? 'played together' : q.direction} · ${q.direction === 'harmonic' ? 'intervals above the bass' : 'each gap between successive notes'}`;
    $('#ear-note-dots').innerHTML = q ? q.notes.map((_, i) => `<span class="ear-note-dot" data-note-index="${i}">${i + 1}</span>`).join('') : '';
    $('#ear-feedback').textContent = '';
    $('#ear-feedback').className = 'ear-feedback';
    $('#ear-comparison').classList.add('hidden');
    renderAnswer();
    renderStats();
    if (result) renderResult();
    updateControls();
  }

  function updateControls() {
    const count = question?.answers.length || 1;
    const playable = !!question && view === 'practice';
    $('[data-action="play"]').disabled = !playable;
    $('#ear-play-label').textContent = busy ? playback ? 'replay' : 'loading…' : heard ? 'replay' : 'listen';
    $('[data-action="check"]').disabled = !heard || !!result || answer.length !== count || Array.from(answer).some(n => !Number.isFinite(n));
    $('[data-action="hint"]').disabled = !playable;
    $('[data-action="reveal"]').disabled = !playable || !!result;
    $('[data-action="hint"]').textContent = settings.hint === 'slow' ? 'listen slowly' : question?.direction === 'harmonic' ? 'hear separately' : 'hear together';
    $('[data-action="mine"]').classList.toggle('hidden', !result || result.correct);
    $('[data-action="mine"]').disabled = !result || result.submitted.length !== count || result.submitted.some(n => !Number.isFinite(n));
    const nextButton = $('[data-action="next"]');
    const nextContainer = result ? $('#ear-comparison') : $('.ear-answer-actions');
    if (nextButton.parentElement !== nextContainer) {
      if (result) nextContainer.prepend(nextButton);
      else nextContainer.append(nextButton);
    }
    nextButton.classList.toggle('ear-primary', !!result);
    nextButton.classList.toggle('text-button', !result);
    $('.ear-answer-actions').classList.toggle('hidden', !!result);
    $('[data-action="undo"]').classList.toggle('hidden', answer.length === 0 || count === 1);
    $('[data-action="clear"]').classList.toggle('hidden', answer.length === 0);
    $('[data-action="stop"]').classList.toggle('hidden', !busy);
    $('[data-action="hint"]').classList.toggle('hidden', settings.hint === 'none' || !heard || !!result || busy);
    $('[data-action="reveal"]').classList.toggle('hidden', !heard || !!result || busy);
    $('.ear-transport').classList.toggle('hidden', !busy && (!heard || !!result));
  }

  async function playQuestion(hint = false, notes = question?.notes, direction = question?.direction, markHeard = true, noteInstruments = sound?.noteInstruments) {
    if (!question || !notes?.length) return;
    const current = ++operation;
    if (hint) assisted = true;
    else if (heard && markHeard && !result) replays++;
    stopAnimation();
    stopExploration();
    busy = true;
    updateControls();
    const alternate = hint && settings.hint === 'alternate';
    const playbackDirection = alternate ? direction === 'harmonic' ? 'ascending' : 'harmonic' : direction;
    const dur = hint && !alternate ? sound.duration * 1.35 : sound.duration;
    const gap = hint ? sound.gap + 0.3 : sound.gap;
    const info = await engine.play(notes, { ...sound, noteInstruments, direction: playbackDirection,
      duration: dur, gap, allowOutside: !markHeard });
    if (!info || current !== operation || !active || view !== 'practice') return;
    if (result) {
      explorationEvents = notes.map((midi, index) => ({ midi, start: info.start + (playbackDirection === 'harmonic' ? 0 : index * (dur + gap)), end: info.start + (playbackDirection === 'harmonic' ? 0 : index * (dur + gap)) + dur }));
      intervalEvents = notes.slice(1).map((midi, index) => ({
        interval: Math.abs(midi - notes[playbackDirection === 'harmonic' ? 0 : index]),
        start: explorationEvents[playbackDirection === 'harmonic' ? 0 : index].start,
        end: explorationEvents[index + 1].end,
      }));
      animateExploration();
    }
    playback = info;
    $('.ear-play').classList.add('is-playing');
    updateControls();
    const together = playbackDirection === 'harmonic';
    const tick = () => {
      if (current !== operation) return;
      const time = engine.context.currentTime;
      $$('.ear-note-dot').forEach((dot, index) => {
        const onset = info.start + (together ? 0 : index * (dur + gap));
        dot.classList.toggle('playing', time >= onset && time < onset + dur);
      });
      if (time < info.end) animation = requestAnimationFrame(tick);
      else {
        busy = false;
        if (markHeard) heard = true;
        stopAnimation();
        updateControls();
        setStatus('');
      }
    };
    tick();
  }

  function renderAnswer() {
    const q = question;
    const pitches = settings.input !== 'interval';
    $('#ear-answer-instruction').innerHTML = !q ? '' : pitches
      ? `reference: ${noteMention(q.reference)}${q.count > 2 ? q.direction === 'harmonic' ? ' · remaining notes, any order' : ' · remaining notes, in order' : ''}${settings.audition ? ' · assisted' : ''}`
      : q.count === 2 ? '' : q.direction === 'harmonic' ? 'from the reference, smallest first' : 'each successive interval';
    renderSlots();
    const surface = $('#ear-answer-surface');
    const scrollLeft = surface.querySelector('.ear-instrument-scroll')?.scrollLeft || 0;
    if (!q) { surface.innerHTML = ''; return; }
    if (settings.input === 'interval') {
      surface.innerHTML = `<div class="ear-interval-buttons">${INTERVALS.filter(i => settings.intervals.includes(i.semitones)).map(i => `<button type="button" data-interval="${i.semitones}" aria-label="${i.name}" title="${i.name}" aria-pressed="false"><strong>${i.short}</strong><kbd>${intervalShortcut(i.semitones)}</kbd></button>`).join('')}</div><details class="ear-type-option"><summary>type intervals</summary><form id="ear-typed-form" class="ear-typed"><label class="visually-hidden" for="ear-typed-answer">intervals</label><div><input id="ear-typed-answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${q.count === 2 ? 'm3, M3, P5…' : 'M3, m3, P4…'}" /><button type="submit" class="text-button">use answer</button></div></form></details>`;
    } else if (settings.input === 'piano' || (result && settings.input === 'note')) {
      surface.innerHTML = pianoMarkup(...quizPianoRange(), q.reference);
    } else if (settings.input === 'fretboard') {
      surface.innerHTML = fretboardMarkup(q.reference);
    } else {
      surface.innerHTML = `<form id="ear-typed-form" class="ear-typed"><label for="ear-typed-answer">note names, including octave</label><div><input id="ear-typed-answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${q.count === 2 ? 'E4' : 'E4, G4, B4'}" /><button type="submit" class="text-button">use answer</button></div></form>`;
    }
    updateSelection();
    syncPianoKeyboard(false);
    if (result) $$('#ear-answer-surface .ear-type-option, #ear-answer-surface .ear-typed').forEach(el => el.classList.add('hidden'));
    const pane = surface.querySelector('.ear-instrument-scroll');
    if (pane) {
      pane.scrollLeft = scrollLeft;
      if (pianoQuestionId !== q.id) scrollPianoTo(q.reference, false, false);
      pianoQuestionId = q.id;
    }
    syncPianoScroll();
  }

  function renderSlots() {
    const q = question;
    const label = settings.input === 'interval' ? 'interval' : 'note';
    const slots = $('#ear-answer-slots');
    slots.classList.toggle('hidden', !q || q.count === 2 || !!result);
    slots.innerHTML = q && q.count > 2 && !result ? q.answers.map((_, index) => `<button type="button" class="ear-answer-slot ${selectedSlot === index ? 'current' : ''}" data-slot="${index}" ${settings.input !== 'interval' && Number.isFinite(answer[index]) ? `data-note-midi="${answer[index]}"` : ''} aria-label="${label} ${settings.input === 'interval' ? index + 1 : index + 2}: ${answer[index] === undefined ? 'choose a ' + label : settings.input === 'interval' ? intervalName(answer[index]) : noteName(answer[index])}"><span>${label} ${settings.input === 'interval' ? index + 1 : index + 2}</span><strong>${answer[index] === undefined ? '—' : settings.input === 'interval' ? intervalName(answer[index]) : noteName(answer[index])}</strong></button>`).join('') : '';
    const readout = $('#ear-selected-answer');
    readout.innerHTML = q?.count === 2 && !result ? `<span>your ${label}</span> <strong>${answer[0] === undefined ? '—' : settings.input === 'interval' ? intervalName(answer[0]) : noteMention(answer[0])}</strong>` : '';
  }

  function quizPianoRange() {
    const ranges = (settings.varyInstrument || settings.perNoteInstruments ? settings.instrumentPool : [settings.instrument]).map(id => instrumentById(id).range);
    return [Math.max(...ranges.map(r => r[0])), Math.min(...ranges.map(r => r[1]))];
  }

  function pianoMarkup(low, high, reference, isLab = false) {
    const keys = [];
    let whites = 0;
    const base = isLab ? lab.pianoBase : pianoBase;
    // Include the white neighbours of edge accidentals so no key hangs outside.
    if ([1, 3, 6, 8, 10].includes(low % 12)) low--;
    if ([1, 3, 6, 8, 10].includes(high % 12)) high++;
    const range = isLab ? labPianoRange() : quizPianoRange();
    for (let midi = low; midi <= high; midi++) {
      const black = [1, 3, 6, 8, 10].includes(midi % 12);
      const position = black ? whites - 0.32 : whites++;
      const shortcut = PIANO_KEYS[midi - base]?.[1];
      const name = noteName(midi);
      const disabled = midi < range[0] || midi > range[1] || (isLab && lab.keyMode === 'reference' && (midi + labOffset() < range[0] || midi + labOffset() > range[1]));
      keys.push(`<button type="button" class="ear-key ${black ? 'black' : 'white'} ${midi === reference ? 'reference' : ''}" style="--key-position:${position}" data-note-midi="${midi}" data-${isLab ? 'lab-note' : 'pitch'}="${midi}" ${disabled ? 'disabled' : ''} title="${name}${shortcut ? ` · ${shortcut}` : ''}" aria-label="${name}${midi === reference ? ', reference' : ''}${shortcut ? `, keyboard ${shortcut}` : ''}">${shortcut ? `<kbd>${shortcut}</kbd>` : ''}<span class="ear-key-label"><span>${name.slice(0, -1)}</span><small>${name.slice(-1)}</small></span><i class="ear-key-light" aria-hidden="true"></i></button>`);
    }
    return `<div class="ear-instrument-scroll" tabindex="0" aria-label="piano — scroll horizontally for more notes" data-piano-scroll="${isLab ? 'lab' : 'quiz'}"><div class="ear-piano" style="--white-count:${whites}" role="group" aria-label="piano keys">${keys.join('')}</div></div><div class="ear-piano-caption"><span class="ear-piano-pan"><button type="button" class="text-button" data-pan-piano="-1" data-piano-context="${isLab ? 'lab' : 'quiz'}" aria-label="scroll to lower notes">←</button><button type="button" class="text-button" data-pan-piano="1" data-piano-context="${isLab ? 'lab' : 'quiz'}" aria-label="scroll to higher notes">→</button></span><span class="ear-octave-controls"><button type="button" class="text-button" data-octave="-1" data-piano-context="${isLab ? 'lab' : 'quiz'}" aria-label="keyboard octave down">z ←</button><span data-piano-range>${noteName(base)}–${noteName(Math.min(base + PIANO_KEYS.length - 1, range[1]))}</span><button type="button" class="text-button" data-octave="1" data-piano-context="${isLab ? 'lab' : 'quiz'}" aria-label="keyboard octave up">→ x</button></span></div>`;
  }

  function shiftPiano(amount, isLab) {
    const base = isLab ? lab.pianoBase : pianoBase;
    const next = clampPianoBase(base + amount * 12, isLab);
    if (isLab) lab.pianoBase = next;
    else pianoBase = next;
    // Keep the existing keys and focused control alive; only move the mapping.
    syncPianoKeyboard(isLab);
    scrollPianoTo(Math.min(next + 7, pianoPlayableRange(isLab)[1]), isLab);
  }

  function pianoPlayableRange(isLab) {
    const [low, high] = isLab ? labPianoRange() : quizPianoRange();
    const offset = isLab && lab.keyMode === 'reference' ? labOffset() : 0;
    return [low - Math.min(0, offset), high - Math.max(0, offset)];
  }

  function clampPianoBase(base, isLab) {
    const [low, high] = pianoPlayableRange(isLab);
    const first = Math.floor(low / 12) * 12;
    const last = Math.floor(Math.max(low, high - 1) / 12) * 12;
    return Math.max(first, Math.min(last, base));
  }

  function syncPianoKeyboard(isLab) {
    const host = isLab ? $('#ear-lab-piano') : $('#ear-answer-surface');
    if (!host?.querySelector('.ear-piano')) return;
    const base = clampPianoBase(isLab ? lab.pianoBase : pianoBase, isLab);
    if (isLab) lab.pianoBase = base;
    else pianoBase = base;
    for (const key of host.querySelectorAll('.ear-key')) {
      const midi = Number(isLab ? key.dataset.labNote : key.dataset.pitch);
      const shortcut = !key.disabled && PIANO_KEYS[midi - base]?.[1];
      key.querySelector('kbd')?.remove();
      if (shortcut) {
        const hint = document.createElement('kbd');
        hint.textContent = shortcut;
        key.prepend(hint);
        key.setAttribute('aria-keyshortcuts', shortcut);
      } else key.removeAttribute('aria-keyshortcuts');
      key.classList.toggle('keyboard-mapped', !!shortcut);
      key.title = `${noteName(midi)}${shortcut ? ` · ${shortcut}` : ''}`;
      key.setAttribute('aria-label', `${noteName(midi)}${key.classList.contains('reference') ? ', reference' : ''}${shortcut ? `, keyboard ${shortcut}` : ''}${!isLab && result ? ', play' : ''}${key.classList.contains('answer-correct') ? ', correct answer' : key.classList.contains('answer-wrong') ? ', your answer' : ''}`);
    }
    const [low, high] = pianoPlayableRange(isLab);
    host.querySelector('[data-piano-range]').textContent = `${noteName(Math.max(low, base))}–${noteName(Math.min(base + PIANO_KEYS.length - 1, high))}`;
    for (const button of host.querySelectorAll('[data-octave]')) button.disabled = clampPianoBase(base + Number(button.dataset.octave) * 12, isLab) === base;
  }

  function scrollPianoTo(midi, isLab, smooth = true) {
    const host = isLab ? $('#ear-lab-piano') : $('#ear-answer-surface');
    const pane = host?.querySelector('[data-piano-scroll]');
    const key = host?.querySelector(`[data-${isLab ? 'lab-note' : 'pitch'}="${midi}"]`);
    if (!pane || !key) return;
    const left = Math.max(0, key.offsetLeft - (pane.clientWidth - key.offsetWidth) / 2);
    if (smooth && pane.scrollTo) pane.scrollTo({ left, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    else pane.scrollLeft = left;
    syncPianoScroll();
  }

  function syncPianoScroll() {
    for (const pane of $$('[data-piano-scroll]')) {
      const context = pane.dataset.pianoScroll;
      const max = Math.max(0, pane.scrollWidth - pane.clientWidth);
      const controls = $$(`[data-pan-piano][data-piano-context="${context}"]`);
      for (const button of controls) {
        button.parentElement.classList.toggle('hidden', max < 2);
        button.disabled = Number(button.dataset.panPiano) < 0 ? pane.scrollLeft <= 1 : pane.scrollLeft >= max - 1;
      }
    }
  }

  function animateExploration() {
    cancelAnimationFrame(explorationAnimation);
    const now = engine.context?.currentTime || 0;
    explorationEvents = explorationEvents.filter(e => e.end > now);
    const sounding = explorationEvents.filter(e => e.start <= now).map(e => e.midi);
    $$('[data-pitch]').forEach(key => key.classList.toggle('sounding', sounding.includes(Number(key.dataset.pitch))));
    intervalEvents = intervalEvents.filter(event => event.end > now);
    const intervals = intervalEvents.filter(event => event.start <= now).map(event => event.interval);
    $$('[data-interval], [data-playing-interval]').forEach(element => {
      const playing = intervals.includes(Number(element.dataset.interval ?? element.dataset.playingInterval));
      element.classList.toggle('is-playing-interval', playing);
    });
    if ((explorationEvents.length || intervalEvents.length) && active && view === 'practice') explorationAnimation = requestAnimationFrame(animateExploration);
  }

  function stopExploration() {
    cancelAnimationFrame(explorationAnimation);
    explorationAnimation = 0;
    explorationEvents = [];
    intervalEvents = [];
    $$('[data-pitch].sounding').forEach(key => key.classList.remove('sounding'));
    $$('.is-playing-interval').forEach(element => element.classList.remove('is-playing-interval'));
  }

  async function explorePitch(midi) {
    if (!result || !question) return;
    const token = operation;
    const index = Math.max(0, question.notes.indexOf(midi));
    const instrument = sound.noteInstruments?.[index] || sound.instrument;
    const info = await engine.preview(midi, { ...sound, instrument });
    if (!info || token !== operation || !result || view !== 'practice') return;
    explorationEvents.push({ midi, start: info.start, end: info.end });
    animateExploration();
  }

  async function exploreInterval(interval) {
    const [low, high] = quizPianoRange();
    const descending = question.direction === 'descending';
    const reference = descending ? Math.max(low + interval, Math.min(high, question.reference)) : Math.max(low, Math.min(high - interval, question.reference));
    await playQuestion(false, [reference, reference + (descending ? -interval : interval)], question.direction, false);
  }

  function fretboardMarkup(reference) {
    return `<div class="ear-instrument-scroll" tabindex="0" aria-label="scrollable guitar fretboard"><div class="ear-fretboard" role="group" aria-label="guitar fretboard, standard tuning"><div class="ear-fret-labels"><span></span>${Array.from({ length: 21 }, (_, fret) => `<span>${fret}</span>`).join('')}</div>${[64, 59, 55, 50, 45, 40].map((open, string) => `<div class="ear-string" style="--string-weight:${1 + string * 0.35}px"><span class="ear-note-mention" data-note-midi="${open}" tabindex="0">${noteName(open)}</span>${Array.from({ length: 21 }, (_, fret) => `<button type="button" data-note-midi="${open + fret}" data-pitch="${open + fret}" class="${reference === open + fret ? 'reference' : ''} ${[3, 5, 7, 9, 12, 15, 17, 19].includes(fret) ? 'marked' : ''}" aria-label="string ${string + 1}, fret ${fret}, ${noteName(open + fret)}"><span>${noteName(open + fret)}</span></button>`).join('')}</div>`).join('')}</div></div>`;
  }

  function addAnswer(value) {
    if (!question) return;
    if (result) { safely(() => settings.input === 'interval' ? exploreInterval(value) : explorePitch(value)); return; }
    if (question.direction === 'harmonic' && settings.input !== 'interval') {
      if (value === question.reference) return;
      if (answer.includes(value)) answer.splice(answer.indexOf(value), 1);
      else if (answer.length < question.answers.length) answer.push(value);
      answer.sort((a, b) => a - b);
    } else {
      answer[selectedSlot] = value;
      selectedSlot = Math.min(question.answers.length - 1, selectedSlot + 1);
    }
    if (settings.audition && settings.input !== 'interval') {
      assisted = true;
      safely(() => engine.preview(value));
    }
    renderSlots();
    updateSelection();
    updateControls();
  }
  function updateSelection() {
    for (const button of $$('[data-pitch], [data-interval]')) {
      const pitch = button.dataset.pitch !== undefined;
      const value = Number(pitch ? button.dataset.pitch : button.dataset.interval);
      const selected = answer.includes(value);
      const correct = !!result && (pitch ? question.notes.slice(1) : question.answers).includes(value);
      button.classList.toggle('selected', pitch && !result && selected);
      button.classList.toggle('answer-correct', correct);
      button.classList.toggle('answer-wrong', !!result && selected && !correct);
      if (!result) button.setAttribute('aria-pressed', String(selected));
      else {
        button.removeAttribute('aria-pressed');
        button.setAttribute('aria-label', `${button.getAttribute('aria-label')}, play${correct ? ', correct answer' : selected ? ', your answer' : ''}`);
      }
    }
  }

  function bucket() {
    const key = `${question?.direction || settings.direction}:${question?.count || settings.minNotes}:${settings.input}`;
    if (!stats.buckets[key]) stats.buckets[key] = { total: 0, right: 0, parts: 0, partTotal: 0, assisted: 0, replays: 0 };
    return stats.buckets[key];
  }
  function check(reveal = false) {
    if (!question || result || (!reveal && (!heard || answer.length !== question.answers.length || Array.from(answer).some(n => !Number.isFinite(n))))) return;
    stopAll(true);
    assisted ||= reveal;
    result = gradeAnswer(question, answer, settings.input);
    answer = result.submitted;
    const b = bucket();
    b.total++;
    b.right += Number(result.correct && !reveal);
    b.parts += result.relationships.filter(Boolean).length;
    b.partTotal += result.relationships.length;
    b.assisted += Number(assisted);
    b.replays += replays;
    question.answers.forEach((interval, index) => {
      const key = `${question.direction}:${interval}`;
      const skill = stats.skills[key] ||= { attempts: 0, misses: 0 };
      skill.attempts++;
      if (!result.relationships[index] || reveal) skill.misses++;
      else skill.misses = Math.max(0, skill.misses - 0.25);
    });
    save(STATS_KEY, stats);
    renderAnswer();
    renderResult(reveal);
    renderStats();
    updateControls();
    $('[data-action="next"]').focus({ preventScroll: true });
  }

  function resultPair(index, mine = false) {
    const step = result?.steps[index];
    if (!step) return [];
    if (!mine) return [step.expectedFrom, step.expectedTo];
    if (settings.input !== 'interval') return [step.from, step.to];
    const notes = notesFromIntervals(question, result.submitted);
    return [notes[question.direction === 'harmonic' ? 0 : index], notes[index + 1]];
  }

  function renderResult(reveal = result?.revealed) {
    result.revealed = reveal;
    const feedback = $('#ear-feedback');
    const correct = result.correct && !reveal;
    const title = reveal ? 'answer revealed' : correct ? 'correct' : 'not quite';
    const pitches = settings.input !== 'interval';
    const harmonic = question.direction === 'harmonic';
    const separator = harmonic ? ' + ' : ' → ';
    const intervalCount = result.relationships.filter(Boolean).length;
    const noteCount = result.parts.filter(Boolean).length;
    const motion = delta => harmonic ? '' : `<span class="ear-result-direction" aria-label="${delta < 0 ? 'descending' : delta > 0 ? 'ascending' : 'same pitch'}">${delta < 0 ? '↓' : delta > 0 ? '↑' : '→'}</span>`;
    const intervalMarkup = delta => {
      if (!Number.isFinite(delta)) return '<span class="ear-muted">—</span>';
      const interval = describeInterval(delta);
      return `<strong class="ear-result-abbr">${interval.short}</strong><span class="ear-result-name">${esc(interval.name)}</span>${motion(delta)}`;
    };
    const playButton = (index, mine = false) => {
      const notes = resultPair(index, mine);
      const playable = notes.length === 2 && notes.every(note => Number.isFinite(note) && note >= 0 && note <= 127);
      const label = `Play ${mine ? 'your' : 'correct'} interval ${index + 1}`;
      return `<button type="button" class="ear-audio-button ear-interval-play" data-result-play="${index}" data-result-mine="${mine}" aria-label="${label}" title="${label}" ${playable ? '' : 'disabled'}>${PLAY_ICON}</button>`;
    };
    feedback.className = `ear-feedback ear-result ${correct ? 'correct' : reveal ? 'revealed' : 'incorrect'}`;
    feedback.innerHTML = `<div class="ear-result-heading"><strong>${title}</strong>${assisted ? '<span class="ear-result-assisted">assisted</span>' : ''}
      ${!reveal ? `<div class="ear-result-counts"><span>${intervalCount} of ${result.steps.length} ${result.steps.length === 1 ? 'interval' : 'intervals'} correct</span>${pitches && !correct ? `<span>${noteCount} of ${result.steps.length} ${result.steps.length === 1 ? 'note' : 'notes'} matched</span>` : ''}</div>` : ''}</div>
      <div class="ear-result-intervals">${result.steps.map((step, index) => {
        const status = reveal ? 'revealed' : step.correct ? 'correct' : step.sizeCorrect ? 'direction-wrong' : 'incorrect';
        const label = reveal ? 'answer' : step.correct ? pitches && !step.noteCorrect ? 'interval correct · pitches shifted' : 'correct' : step.sizeCorrect ? 'right size · wrong direction' : Number.isFinite(step.delta) ? 'different interval' : 'not answered';
        return `<article class="ear-result-part ${status}">
          <div class="ear-result-step"><span>${harmonic ? `note ${index + 2}` : `${index + 1} → ${index + 2}`}</span><span class="ear-result-step-status">${!reveal && step.correct ? '✓ ' : ''}${label}</span></div>
          <div class="ear-result-line" data-playing-interval="${step.interval}"><div class="ear-result-heard">${intervalMarkup(step.interval * (question.direction === 'descending' ? -1 : 1))}</div>${playButton(index)}</div>
          <p class="ear-result-notes">${noteMention(step.expectedFrom)}${separator}${noteMention(step.expectedTo)}</p>
          ${!reveal && (!step.correct || (pitches && !step.noteCorrect)) ? `<div class="ear-result-submitted"><span class="ear-result-your-label">your answer</span><div class="ear-result-line" data-playing-interval="${Math.abs(step.delta)}"><div class="ear-result-heard">${intervalMarkup(step.delta)}</div>${playButton(index, true)}</div>${pitches ? `<p class="ear-result-notes">${Number.isFinite(step.from) ? noteMention(step.from) : '—'}${separator}${Number.isFinite(step.to) ? noteMention(step.to) : '—'}</p>` : ''}</div>` : ''}
        </article>`;
      }).join('')}</div>`;
    $('#ear-comparison').classList.remove('hidden');
  }

  function renderStats() {
    const b = bucket();
    $('#ear-stats').innerHTML = `<div class="stats-row"><div><span>right</span><strong>${b.right}</strong></div><div><span>wrong</span><strong>${b.total - b.right}</strong></div><div><span>percent</span><strong>${b.total ? Math.round(b.right / b.total * 100) : 0}%</strong></div></div><button type="button" class="text-button" data-action="reset-stats">reset</button>`;
  }

  function pitchControl(key, label, notes, value) {
    return `<div class="ear-setting-field"><label for="ear-pitch-${key}">${label}</label><div class="ear-pitch-control"><select id="ear-pitch-${key}" data-note-midi="${value}" data-setting="${key}">${options(notes, value)}</select><button type="button" class="ear-pitch-preview" data-note-midi="${value}" data-preview-pitch="${key}" aria-label="Preview ${label}: ${noteName(value)}" title="Preview ${noteName(value)}"><span aria-hidden="true">▶</span></button></div></div>`;
  }

  function renderSettings() {
    const s = settings;
    const rangeInstruments = (s.varyInstrument || s.perNoteInstruments ? s.instrumentPool : [s.instrument]).map(instrumentById);
    const rangeLow = Math.max(...rangeInstruments.map(i => i.range[0]));
    const rangeHigh = Math.min(...rangeInstruments.map(i => i.range[1]));
    const instrumentNotes = NOTES.filter(([midi]) => midi >= rangeLow && midi <= rangeHigh);
    $('#ear-settings-content').innerHTML = `
      <section class="ear-setting-section"><h3>answering</h3><div class="ear-settings-grid">
        <label>answer with<select data-setting="input">${options(INPUTS, s.input)}</select></label>
        <label>listening help<select data-setting="hint">${options([['alternate', 'together ↔ separately'], ['slow', 'slower replay'], ['none', 'no listening hints']], s.hint)}</select></label>
      </div><label class="ear-checkbox"><input type="checkbox" data-setting="audition" ${s.audition ? 'checked' : ''} /> sound piano and fretboard answers aloud (assisted)</label></section>
      <section class="ear-setting-section"><h3>sound</h3><div class="ear-settings-grid">
        <label>instrument<select data-setting="instrument">${instrumentOptions(s.instrument)}</select></label>
        <label>room<select data-setting="room">${options([['dry', 'dry'], ['studio', 'studio'], ['room', 'room'], ['hall', 'hall']], s.room)}</select></label>
        <label>touch <output>${s.velocity}</output><input type="range" data-setting="velocity" min="1" max="127" value="${s.velocity}" /></label>
        <label>ambience <output>${Math.round(s.ambience * 100)}%</output><input type="range" data-setting="ambience" min="0" max="0.7" step="0.01" value="${s.ambience}" /></label>
      </div><p class="ear-muted">range: ${noteMention(rangeLow)}–${noteMention(rangeHigh)}${s.varyInstrument || s.perNoteInstruments ? ' (shared)' : ''}</p>
      <label class="ear-checkbox"><input type="checkbox" data-setting="varyInstrument" ${s.varyInstrument ? 'checked' : ''} /> alternate instruments between questions</label>
      <label class="ear-checkbox"><input type="checkbox" data-setting="perNoteInstruments" ${s.perNoteInstruments ? 'checked' : ''} /> different instrument per note</label>
      ${s.varyInstrument || s.perNoteInstruments ? `<fieldset class="ear-instrument-pool"><legend>instruments <span>${s.instrumentPool.length} selected</span></legend><div class="ear-pool-families">${['keys', 'guitars', 'organs', 'synths', 'mallets', 'plucked strings'].map(family => `<div class="ear-pool-family" role="group" aria-label="${family}"><h4>${family}</h4><div>${INSTRUMENTS.filter(i => i.family === family).map(i => `<div class="ear-pool-choice ${s.instrumentPool.includes(i.id) ? 'is-selected' : ''}"><label class="ear-pool-toggle"><input type="checkbox" data-pool="${i.id}" ${s.instrumentPool.includes(i.id) ? 'checked' : ''} /><span>${esc(i.name)}</span></label><button type="button" class="ear-instrument-preview" data-preview-instrument="${i.id}" aria-label="Preview ${esc(i.name)}" title="Preview ${esc(i.name)}"><span aria-hidden="true">▶</span></button></div>`).join('')}</div></div>`).join('')}</div></fieldset>` : ''}
      <div class="ear-variation-block"><label class="ear-checkbox"><input type="checkbox" data-setting="varyDynamics" ${s.varyDynamics ? 'checked' : ''} /> gently vary dynamics between questions</label>
      ${s.varyDynamics ? `<div class="ear-dynamics"><label for="ear-dynamic-spread">touch variation <output for="ear-dynamic-spread">±${s.dynamicSpread}</output><input id="ear-dynamic-spread" type="range" data-setting="dynamicSpread" min="1" max="30" value="${s.dynamicSpread}" /><span class="ear-dynamics-scale"><span>subtle</span><span>expressive</span></span></label></div>` : ''}</div>
      </section>
      <section class="ear-setting-section"><h3>exercise</h3><div class="ear-settings-grid">
        <label>playback<select data-setting="direction">${options(DIRECTIONS, s.direction)}</select></label>
        <label>minimum notes<input type="number" data-setting="minNotes" min="2" max="${s.direction === 'harmonic' ? 6 : 8}" value="${s.minNotes}" /></label>
        <label>maximum notes<input type="number" data-setting="maxNotes" min="2" max="${s.direction === 'harmonic' ? 6 : 8}" value="${s.maxNotes}" /></label>
        ${pitchControl('low', 'lowest pitch', instrumentNotes.slice(0, -1), s.low)}
        ${pitchControl('high', 'highest pitch', instrumentNotes.slice(1), s.high)}
        <label>reference<select data-setting="reference">${options([['random', 'varies each question'], ['fixed', 'fixed pitch']], s.reference)}</select></label>
        ${pitchControl('referenceNote', 'fixed reference', instrumentNotes, s.referenceNote)}
        <label>note length (seconds)<input type="number" data-setting="duration" min="0.2" max="${MAX_NOTE_DURATION}" step="0.1" value="${s.duration}" /></label>
        <label>gap (seconds)<input type="number" data-setting="gap" min="0" max="2" step="0.05" value="${s.gap}" /></label>
      </div>
      <label class="ear-checkbox"><input type="checkbox" data-setting="adaptive" ${s.adaptive ? 'checked' : ''} /> revisit intervals I miss more often</label></section>
      <section class="ear-setting-section"><h3>intervals</h3><div class="ear-setting-presets"><button type="button" class="text-button" data-preset="starter">thirds, fourths & fifths</button><button type="button" class="text-button" data-preset="simple">all simple</button><button type="button" class="text-button" data-preset="all">include compound</button></div><div class="ear-interval-selection">${INTERVALS.map(i => `<label><input type="checkbox" data-enabled-interval="${i.semitones}" ${s.intervals.includes(i.semitones) ? 'checked' : ''} /><span><strong>${i.short}</strong> ${i.name}</span></label>`).join('')}</div></section>
    `;
    syncInstrumentPreviews();
  }

  function syncInstrumentPreviews() {
    for (const button of $$('[data-preview-instrument], [data-preview-pitch]')) {
      const pitch = button.dataset.previewPitch;
      const playing = pitch ? pitch === pitchPreview : button.dataset.previewInstrument === instrumentPreview;
      const name = pitch ? `${({ low: 'lowest pitch', high: 'highest pitch', referenceNote: 'fixed reference' })[pitch]}: ${noteName(settings[pitch])}` : instrumentById(button.dataset.previewInstrument).name;
      button.classList.toggle('is-playing', playing);
      button.setAttribute('aria-label', `${playing ? 'Stop' : 'Preview'} ${name}`);
      button.title = `${playing ? 'Stop' : 'Preview'} ${name}`;
      button.querySelector('span').textContent = playing ? '■' : '▶';
    }
  }

  async function previewInstrument(id, pitchKey = null) {
    const stop = pitchKey ? pitchPreview === pitchKey : instrumentPreview === id;
    stopAll(true);
    setStatus('');
    if (stop) return;
    const token = operation;
    instrumentPreview = pitchKey ? null : id;
    pitchPreview = pitchKey;
    syncInstrumentPreviews();
    try {
      const info = await engine.play(pitchKey ? [settings[pitchKey]] : [60, 67], { ...settings, instrument: id, noteInstruments: null, direction: 'ascending', duration: pitchKey ? Math.max(.8, settings.duration) : .65, gap: .12 });
      if (!info || token !== operation) return;
      const tick = () => {
        if (token !== operation) return;
        if (engine.context.currentTime < info.end) previewAnimation = requestAnimationFrame(tick);
        else { instrumentPreview = pitchPreview = null; syncInstrumentPreviews(); engine.configure(settings); }
      };
      tick();
    } catch (error) {
      if (token !== operation) return;
      instrumentPreview = pitchPreview = null; syncInstrumentPreviews();
      throw error;
    }
  }

  function labHost() { return $('#ear-lab-dialog'); }
  function labSound() {
    return { ...settings, duration: lab.duration, instrument: lab.instrument || settings.instrument, room: lab.room || settings.room,
      noteInstruments: lab.perNoteInstruments ? [lab.instrument || settings.instrument, lab.instrument2] : null };
  }
  function labRange() {
    const sound = labSound();
    const ranges = (sound.noteInstruments || [sound.instrument]).map(id => instrumentById(id).range);
    return [Math.max(...ranges.map(r => r[0])), Math.min(...ranges.map(r => r[1]))];
  }
  function labPianoRange() {
    return lab.keyMode === 'drone' ? instrumentById('pipe-organ').range : labRange();
  }
  function labOffset() { return lab.interval * (lab.direction === 'descending' ? -1 : 1); }
  function replaceDroneInterval(previousReference, previousInterval, previousDirection = lab.direction) {
    const previous = [previousReference, previousReference + previousInterval * (previousDirection === 'descending' ? -1 : 1)];
    const extra = lab.droneNotes.filter(note => !previous.includes(note));
    lab.droneNotes = [...new Set([lab.reference, lab.reference + labOffset(), ...extra])].sort((a, b) => a - b);
  }
  function fitLabReference() {
    const [low, high] = labRange();
    const offset = labOffset();
    lab.reference = Math.max(low - Math.min(0, offset), Math.min(high - Math.max(0, offset), lab.reference));
    lab.pianoBase = clampPianoBase(lab.pianoBase, true);
  }
  function instrumentPalette() {
    const current = lab.noteFocus === 1 && lab.perNoteInstruments ? lab.instrument2 : labSound().instrument;
    return `<div class="ear-instrument-browser"><div class="ear-instrument-families" role="group" aria-label="instrument families">${['keys', 'guitars', 'organs', 'synths', 'mallets', 'plucked strings'].map(family => `<button type="button" class="ear-family" data-lab-family="${family}" aria-pressed="${lab.family === family}">${family}</button>`).join('')}</div>
      <div class="ear-instrument-tiles" role="group" aria-label="sampled instruments">${INSTRUMENTS.filter(i => i.family === lab.family).map(i => `<button type="button" data-lab-instrument="${i.id}" aria-pressed="${i.id === current}"><span>${esc(i.name)}</span><span class="ear-instrument-check" aria-hidden="true">✓</span></button>`).join('')}</div></div>`;
  }
  function renderLab(host) {
    const scrollLeft = host.querySelector('[data-piano-scroll]')?.scrollLeft;
    const previousReference = lab.reference;
    fitLabReference();
    if (previousReference !== lab.reference) replaceDroneInterval(previousReference, lab.interval);
    host.innerHTML = `<div class="ear-lab">
      <div class="ear-lab-sound-heading"><div class="ear-lab-note-instruments">${lab.perNoteInstruments ? `<button type="button" class="ear-note-instrument" data-lab-focus="0" aria-pressed="${lab.noteFocus === 0}">reference: ${esc(instrumentById(labSound().instrument).name)}</button><button type="button" class="ear-note-instrument" data-lab-focus="1" aria-pressed="${lab.noteFocus === 1}">second note: ${esc(instrumentById(lab.instrument2).name)}</button>` : `<span class="ear-current-instrument">${esc(instrumentById(labSound().instrument).name)}</span>`}</div><label class="ear-checkbox"><input type="checkbox" data-lab="perNoteInstruments" ${lab.perNoteInstruments ? 'checked' : ''} /> different instruments</label></div>
      ${instrumentPalette()}
      <div class="ear-lab-console">
        <div class="ear-lab-playback" role="group" aria-label="interval playback"><button type="button" class="ear-lab-play" data-action="lab-play" aria-label="play interval"><span class="ear-play-symbol" aria-hidden="true">▶</span><span class="ear-motion-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></button><button type="button" class="ear-lab-repeat" data-action="loop" aria-label="repeat interval" title="Repeat interval" aria-pressed="${lab.loop}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 4 4-4 4M4 11V9a2 2 0 0 1 2-2h14M8 21l-4-4 4-4m12 0v2a2 2 0 0 1-2 2H4"/></svg></button></div>
        <div class="ear-lab-center"><strong class="ear-lab-interval">${intervalName(lab.interval)}</strong><div><p class="ear-lab-description"></p><p class="ear-lab-notes" aria-live="polite"></p></div></div>
        <div class="ear-lab-directions" role="group" aria-label="playback">${DIRECTIONS.slice(0, 3).map(([id, label]) => `<button type="button" class="text-button" data-lab-direction="${id}" aria-pressed="${lab.direction === id}">${id === 'ascending' ? '↗' : id === 'descending' ? '↘' : '∥'} ${label}</button>`).join('')}</div>
      </div>
      <div class="ear-lab-intervals" role="group" aria-label="explore intervals">${INTERVALS.map(i => `<button type="button" data-lab-interval="${i.semitones}" title="${i.name} · ${i.semitones} semitones" aria-label="${i.name}" aria-pressed="${i.semitones === lab.interval}"><strong>${i.short}</strong><kbd>${intervalShortcut(i.semitones)}</kbd></button>`).join('')}</div>
      <section class="ear-lab-piano-section" aria-label="piano and drone">
        <div class="ear-lab-piano-heading"><div class="ear-lab-key-mode" role="group" aria-label="piano action">${[['reference', 'set reference'], ['play', 'play notes'], ['drone', 'drone notes']].map(([mode, label]) => `<button type="button" class="ear-piano-mode" data-lab-key-mode="${mode}" aria-pressed="${lab.keyMode === mode}">${label}</button>`).join('')}</div><span>reference <strong>${noteMention(lab.reference)}</strong></span></div>
        <div id="ear-lab-piano"></div>
        <div class="ear-drone-console">
          <button type="button" class="ear-drone-switch" data-action="drone" aria-pressed="${lab.drone}"><span class="ear-drone-orbit" aria-hidden="true">∞</span><span class="ear-drone-label">${lab.drone ? 'stop drone' : 'start drone'}</span></button>
          <div class="ear-drone-notes" role="group" aria-label="held drone notes"></div>
          <div class="ear-drone-controls"><label>level<input type="range" data-lab="level" min="0" max="1.5" step="0.01" value="${lab.level}" /></label><label>motion<input type="range" data-lab="motion" min="0" max="1" step="0.01" value="${lab.motion}" /></label></div>
        </div>
      </section>
      <div class="ear-lab-footer"><div><button type="button" class="text-button" data-action="stop">stop all</button></div><label>length <input type="number" data-lab="duration" aria-label="note length in seconds" min="0.2" max="${MAX_NOTE_DURATION}" step="0.1" value="${lab.duration}" /> s</label><label>room<select data-lab="room">${options([['dry', 'dry'], ['studio', 'studio'], ['room', 'room'], ['hall', 'hall']], labSound().room)}</select></label></div>
      <section class="ear-analysis" aria-label="interval analysis">
        <div class="ear-analysis-heading"><h3>intervals</h3><span data-analysis-mode></span></div>
        <div class="ear-analysis-notes" data-analysis-notes></div>
        <div class="ear-analysis-summary" data-analysis-summary></div>
        <details data-analysis-details ${lab.analysisOpen ? 'open' : ''}><summary>interval map &amp; harmonics</summary><div data-analysis-body></div></details>
      </section>
      <p class="ear-local-status" role="status" aria-live="polite"></p>
    </div>`;
    renderLabPiano();
    if (scrollLeft !== undefined) host.querySelector('[data-piano-scroll]').scrollLeft = scrollLeft;
    syncPianoScroll();
    syncLab();
  }
  function renderLabPiano() {
    const host = $('#ear-lab-piano');
    if (host) {
      const left = host.querySelector('[data-piano-scroll]')?.scrollLeft;
      host.innerHTML = pianoMarkup(...labPianoRange(), lab.reference, true);
      syncPianoKeyboard(true);
      if (left !== undefined) host.querySelector('[data-piano-scroll]').scrollLeft = left;
      syncPianoScroll();
    }
  }
  function syncLab() {
    const host = labHost();
    host.querySelectorAll('[data-action="drone"]').forEach(b => {
      b.setAttribute('aria-pressed', String(lab.drone));
      b.disabled = !lab.droneNotes.length && !lab.drone;
      b.querySelector('.ear-drone-label').textContent = lab.drone ? 'stop drone' : 'start drone';
    });
    const held = host.querySelector('.ear-drone-notes');
    if (held && held.dataset.notes !== lab.droneNotes.join(',')) {
      const hadFocus = held.contains(document.activeElement);
      const focusedNote = document.activeElement?.dataset.removeDroneNote;
      held.innerHTML = `${lab.droneNotes.map(note => `<button type="button" class="ear-drone-note" data-remove-drone-note="${note}" data-note-midi="${note}" aria-label="Remove ${noteName(note)} from drone">${noteName(note)} <span aria-hidden="true">×</span></button>`).join('')}${lab.droneNotes.length ? '<button type="button" class="text-button" data-action="clear-drone">clear</button>' : ''}`;
      held.dataset.notes = lab.droneNotes.join(',');
      if (hadFocus) (held.querySelector(`[data-remove-drone-note="${focusedNote}"]`) || held.querySelector('button') || host.querySelector('[data-lab-key-mode="drone"]')).focus({ preventScroll: true });
    }
    for (const key of host.querySelectorAll('[data-lab-note]')) {
      const selected = lab.droneNotes.includes(Number(key.dataset.labNote));
      key.classList.toggle('drone-selected', selected && (lab.keyMode === 'drone' || lab.drone));
      if (lab.keyMode === 'drone') key.setAttribute('aria-pressed', String(selected));
      else key.removeAttribute('aria-pressed');
    }
    const droneTransport = lab.drone || lab.keyMode === 'drone';
    const play = host.querySelector('[data-action="lab-play"]');
    if (play) {
      play.setAttribute('aria-label', droneTransport ? lab.drone ? 'stop drone' : 'start drone' : 'play interval');
      play.querySelector('.ear-play-symbol').textContent = droneTransport ? lab.drone ? '■' : '∞' : '▶';
      play.disabled = droneTransport && !lab.droneNotes.length && !lab.drone;
    }
    host.querySelectorAll('[data-action="loop"]').forEach(b => { b.hidden = droneTransport; });
    const directions = host.querySelector('.ear-lab-directions');
    if (directions) directions.hidden = droneTransport;
    host.querySelectorAll('[data-action="loop"]').forEach(b => {
      b.setAttribute('aria-pressed', String(lab.loop));
      b.title = lab.loop ? 'Stop repeating' : 'Repeat interval';
    });
    host.querySelectorAll('[data-lab-interval]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.labInterval) === lab.interval)));
    const interval = INTERVALS.find(i => i.semitones === lab.interval);
    if (host.querySelector('.ear-lab-interval')) host.querySelector('.ear-lab-interval').textContent = interval.short;
    if (host.querySelector('.ear-lab-description')) host.querySelector('.ear-lab-description').textContent = interval.name;
    const noteLine = host.querySelector('.ear-lab-notes');
    const noteMarkup = `${noteMention(lab.reference)} ${droneTransport || lab.direction === 'harmonic' ? '+' : '↔'} ${noteMention(lab.reference + labOffset())}`;
    if (noteLine && noteLine.innerHTML !== noteMarkup) noteLine.innerHTML = noteMarkup;
    host.querySelector('.ear-lab')?.classList.toggle('is-loading', lab.busy);
    renderLabAnalysis();
    animateLab();
  }
  function setLabAnalysis(notes, mode) {
    const next = uniquePitches(notes);
    if (next.join(',') !== lab.analysisNotes?.join(',')) lab.analysisPage = 0;
    lab.analysisNotes = next;
    lab.analysisMode = mode;
  }

  function harmonicMarkup(notes) {
    const rows = harmonicModel(notes);
    if (!rows.length) return '';
    const low = Math.min(55, rows[0].partials[0].hz), high = Math.max(2000, rows.at(-1).partials.at(-1).hz);
    const x = hz => 72 + 630 * Math.log2(hz / low) / Math.log2(high / low);
    const height = 36 + rows.length * 30;
    const ticks = [55, 110, 220, 440, 880, 1760, 3520, 7040, 14080].filter(hz => hz >= low && hz <= high);
    return `<div class="ear-harmonic-scroll"><svg class="ear-harmonics" viewBox="0 0 720 ${height}" role="img" aria-label="First eight ideal harmonics of each note on a logarithmic frequency axis">
      ${ticks.map(hz => `<line class="ear-harmonic-grid" x1="${x(hz)}" x2="${x(hz)}" y1="22" y2="${height}"/><text class="ear-harmonic-tick" x="${x(hz)}" y="12" text-anchor="middle">${hz}</text>`).join('')}
      ${rows.map(({ midi, partials }, index) => `<g class="ear-harmonic-row" data-note-midi="${midi}" tabindex="0" aria-label="${noteName(midi)} harmonics"><text x="4" y="${43 + index * 30}">${noteName(midi)}</text>${partials.map(({ harmonic, hz }) => `<line class="${harmonic === 1 ? 'ear-fundamental' : ''}" x1="${x(hz)}" x2="${x(hz)}" y1="${27 + index * 30}" y2="${47 + index * 30}"><title>${noteName(midi)} · harmonic ${harmonic} · ${hz.toFixed(1)} Hz</title></line>`).join('')}</g>`).join('')}
    </svg></div>`;
  }

  function renderLabAnalysis() {
    const panel = $('[data-analysis-summary]');
    if (!panel) return;
    const notes = lab.analysisNotes ?? [lab.reference, lab.reference + labOffset()];
    const key = notes.join(',');
    if (analysisCache?.key !== key) analysisCache = { key, ...analyseNotes(notes) };
    const data = analysisCache;
    $('[data-analysis-mode]').textContent = lab.analysisMode;
    if (panel.dataset.notes !== key) {
      panel.dataset.notes = key;
      $('.ear-analysis')?.removeAttribute('data-sounding');
      $('[data-analysis-notes]').innerHTML = data.notes.map(noteMention).join('<span aria-hidden="true"> · </span>');
      panel.innerHTML = data.groups.map(group => `<div class="ear-analysis-interval" tabindex="0" data-note-midis="${uniquePitches(group.pairs.flatMap(p => [p.low, p.high])).join(',')}"><strong>${group.short}</strong><span>${group.name}</span>${group.pairs.length > 1 ? `<small>×${group.pairs.length}</small>` : ''}</div>`).join('') || '<span class="ear-muted">—</span>';
    }
    const body = $('[data-analysis-body]');
    if (!lab.analysisOpen) { if (body.childNodes.length) body.replaceChildren(); delete body.dataset.key; return; }
    const pageSize = 36, pages = Math.max(1, Math.ceil(data.pairs.length / pageSize));
    lab.analysisPage = Math.max(0, Math.min(pages - 1, lab.analysisPage));
    const bodyKey = `${key}:${lab.analysisPage}`;
    if (body.dataset.key === bodyKey) return;
    body.dataset.key = bodyKey;
    $('.ear-analysis')?.removeAttribute('data-sounding');
    const pairs = data.pairs.slice(lab.analysisPage * pageSize, (lab.analysisPage + 1) * pageSize);
    const matches = data.matches ||= nearbyHarmonics(data.notes);
    body.innerHTML = `<div class="ear-analysis-map-heading"><h4>all pairs <small>${data.pairs.length}</small></h4>${pages > 1 ? `<div class="ear-analysis-pages"><button type="button" class="text-button" data-analysis-page="-1" ${lab.analysisPage === 0 ? 'disabled' : ''} aria-label="previous interval pairs">←</button><span>${lab.analysisPage + 1} / ${pages}</span><button type="button" class="text-button" data-analysis-page="1" ${lab.analysisPage === pages - 1 ? 'disabled' : ''} aria-label="next interval pairs">→</button></div>` : ''}</div>
      <div class="ear-pair-scroll"><table class="ear-pair-table"><thead><tr><th>notes</th><th>interval</th><th><span class="visually-hidden">listen</span></th></tr></thead><tbody>${pairs.map(pair => `<tr data-note-midis="${pair.low},${pair.high}" tabindex="0"><td>${noteMention(pair.low)} <span aria-hidden="true">–</span> ${noteMention(pair.high)}</td><td><strong>${pair.short}</strong> ${pair.name}</td><td><button type="button" class="text-button" data-analysis-pair="${pair.low},${pair.high}" aria-label="Play ${noteName(pair.low)} and ${noteName(pair.high)}, ${pair.name}">▶</button></td></tr>`).join('')}</tbody></table></div>
      ${data.facts.length ? `<div class="ear-listening-facts">${data.facts.map(fact => `<article tabindex="0" data-note-midis="${fact.notes.join(',')}"><h4>${fact.title}</h4><p>${fact.text}</p></article>`).join('')}</div>` : ''}
      <div class="ear-analysis-map-heading"><h4>harmonics</h4><span>model · 1–8 · Hz</span></div>
      ${data.harmonicMarkup ||= harmonicMarkup(data.notes)}
      <p class="ear-analysis-caption">Ideal harmonics, not a measured spectrum. Real partials vary with instrument, tuning and touch.</p>
      ${matches.length ? `<details class="ear-partial-matches"><summary>nearby harmonics</summary><ul>${matches.map(match => `<li data-note-midis="${match.low},${match.high}" tabindex="0">${noteMention(match.low)} ×${match.a.harmonic} <span>↔</span> ${noteMention(match.high)} ×${match.b.harmonic}<strong>${match.difference < .05 ? 'aligned' : `${match.difference.toFixed(1)} Hz apart`}</strong></li>`).join('')}</ul></details>` : ''}`;
  }

  function animateLab() {
    cancelAnimationFrame(labAnimation);
    if (!$('#ear-cheat').open) return;
    const now = engine.context?.currentTime || 0;
    const sounding = labEvents.filter(e => now >= e.start && now < e.end).map(e => e.midi);
    const sustained = lab.drone ? engine.droneNotes || [] : [];
    const analysis = $('.ear-analysis');
    const playing = uniquePitches([...sounding, ...sustained]);
    if (analysis && analysis.dataset.sounding !== playing.join(',')) {
      analysis.dataset.sounding = playing.join(',');
      for (const mention of analysis.querySelectorAll('[data-note-midi]')) mention.classList.toggle('is-playing-note', playing.includes(Number(mention.dataset.noteMidi)));
    }
    for (const key of $$('[data-lab-note]')) {
      const midi = Number(key.dataset.labNote);
      for (const [name, enabled] of [['sounding', sounding.includes(midi)], ['sustaining', sustained.includes(midi)], ['interval-tone', midi === lab.reference + labOffset()]]) {
        if (key.classList.contains(name) !== enabled) key.classList.toggle(name, enabled);
      }
    }
    const host = labHost().querySelector('.ear-lab');
    host?.classList.toggle('is-playing', sounding.length > 0);
    host?.classList.toggle('is-sustaining', sustained.length > 0);
    host?.querySelector('.ear-drone-orbit')?.style.setProperty('--drone-energy', engine.droneLevel());
    if (lab.busy || sustained.length || labEvents.some(e => e.end > now)) labAnimation = requestAnimationFrame(animateLab);
  }
  async function playLabNotes(notes, direction = 'harmonic', instruments = labSound().noteInstruments, updateAnalysis = true) {
    const token = ++labRequest;
    lab.busy = true; syncLab();
    // Let notes ring for the selected length without delaying the next onset.
    const duration = lab.duration, spacing = .75;
    const info = await engine.play(notes, { ...labSound(), noteInstruments: instruments, direction, duration, spacing, keepDrone: lab.drone });
    if (!info || token !== labRequest || !$('#ear-cheat').open) return null;
    lab.busy = false;
    if (updateAnalysis) setLabAnalysis([...notes, ...(lab.drone ? lab.droneNotes : [])], lab.drone ? 'drone + notes' : direction === 'harmonic' ? 'together' : 'sequence');
    labEvents = notes.map((midi, index) => ({ midi, start: info.start + (direction === 'harmonic' ? 0 : index * spacing), end: info.start + (direction === 'harmonic' ? 0 : index * spacing) + duration }));
    syncLab();
    return info;
  }
  async function playLab() {
    const notes = [lab.reference, lab.reference + labOffset()];
    const instruments = labSound().noteInstruments;
    return playLabNotes(notes, lab.direction, instruments);
  }
  async function labTransport() {
    if (lab.drone || lab.keyMode === 'drone') return startDrone();
    stopLoop(); syncLab();
    return playLab();
  }
  async function repeatLab() {
    const token = operation;
    const info = await playLab();
    if (!info || !lab.loop || token !== operation) return;
    loopTimer = setTimeout(() => safely(repeatLab), Math.max(0, info.end - engine.context.currentTime + 1.5) * 1000);
  }
  async function refreshDrone() {
    const token = operation;
    engine.configure(labSound());
    const notes = [...lab.droneNotes];
    if (!notes.length) { engine.stopDrone(); lab.drone = false; lab.busy = false; syncLab(); return; }
    lab.busy = !engine.activeDrone || JSON.stringify(notes) !== JSON.stringify(engine.droneNotes);
    syncLab();
    const started = await engine.drone(notes, { level: lab.level, motion: lab.motion });
    if (!started || token !== operation) return;
    lab.busy = false; syncLab();
  }
  async function startDrone() {
    stopLoop();
    labRequest++;
    if (lab.drone) {
      engine.stopDrone(); lab.busy = false; lab.drone = false; syncLab(); return;
    }
    if (!lab.droneNotes.length) return;
    engine.cancel(false, { resetReverb: false, fade: .2 });
    labEvents = [];
    lab.drone = true;
    setLabAnalysis(lab.droneNotes, 'drone');
    const focusedAction = document.activeElement?.dataset.action;
    lab.keyMode = 'drone';
    renderLab(labHost());
    if (focusedAction === 'drone' || focusedAction === 'lab-play') labHost().querySelector(`[data-action="${focusedAction}"]`).focus({ preventScroll: true });
    await refreshDrone();
  }
  async function updateDroneNotes(notes, start = false) {
    const [low, high] = instrumentById('pipe-organ').range;
    lab.droneNotes = [...new Set(notes.filter(note => Number.isInteger(note) && note >= low && note <= high))].sort((a, b) => a - b);
    setLabAnalysis(lab.droneNotes, lab.drone || start ? 'drone' : 'selected');
    labRequest++;
    if (!lab.droneNotes.length) {
      engine.stopDrone(); lab.drone = false; lab.busy = false; syncLab(); return;
    }
    if (start && !lab.drone) {
      stopLoop();
      engine.cancel(false, { resetReverb: false, fade: .2 });
      labEvents = [];
      lab.drone = true;
    }
    syncLab();
    if (lab.drone) await refreshDrone();
  }
  async function changeLab(patch, audition = true) {
    const request = ++labRequest;
    const previousReference = lab.reference, previousInterval = lab.interval, previousDirection = lab.direction;
    lab.busy = false;
    labEvents = [];
    clearTimeout(loopTimer);
    engine.cancel(false, { resetReverb: false, fade: .12 });
    Object.assign(lab, patch);
    if (patch.perNoteInstruments && lab.instrument2 === labSound().instrument) lab.instrument2 = labSound().instrument === 'rhodes' ? 'salamander' : 'rhodes';
    if (!lab.perNoteInstruments) lab.noteFocus = 0;
    fitLabReference();
    if ('interval' in patch || 'reference' in patch || 'direction' in patch || previousReference !== lab.reference) {
      replaceDroneInterval(previousReference, previousInterval, previousDirection);
      setLabAnalysis(lab.drone || lab.keyMode === 'drone' ? lab.droneNotes : [lab.reference, lab.reference + labOffset()], lab.drone ? 'drone' : 'selected');
    }
    renderLab(labHost());
    if (lab.drone) await refreshDrone();
    if (request !== labRequest || !$('#ear-cheat').open) return false;
    if (lab.drone || lab.keyMode === 'drone') return true;
    if (lab.loop) await repeatLab();
    else if (audition) await playLab();
    return true;
  }
  async function labPiano(midi) {
    if (lab.keyMode === 'drone') {
      return updateDroneNotes(lab.droneNotes.includes(midi) ? lab.droneNotes.filter(note => note !== midi) : [...lab.droneNotes, midi], true);
    }
    if (lab.keyMode === 'reference') {
      if (midi + labOffset() < labRange()[0] || midi + labOffset() > labRange()[1]) return;
      if (!await changeLab({ reference: midi }, false)) return;
      if (lab.drone) return;
    }
    const token = labRequest;
    const instrument = lab.perNoteInstruments && lab.keyMode === 'play' ? lab.instrument2 : labSound().instrument;
    const info = await engine.preview(midi, { ...labSound(), instrument });
    if (!info || token !== labRequest || !$('#ear-cheat').open) return;
    labEvents = labEvents.filter(e => e.end > (engine.context?.currentTime || 0));
    labEvents.push({ midi, start: info.start, end: info.end });
    setLabAnalysis([...labEvents.map(event => event.midi), ...(lab.drone ? lab.droneNotes : [])], lab.drone ? 'drone + notes' : 'played notes');
    syncLab();
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.resultPlay !== undefined && result) {
      const index = Number(button.dataset.resultPlay);
      const notes = resultPair(index, button.dataset.resultMine === 'true');
      const instruments = sound.noteInstruments;
      const pairInstruments = instruments?.length ? [question.direction === 'harmonic' ? 0 : index, index + 1].map(i => instruments[i % instruments.length]) : null;
      safely(() => playQuestion(false, notes, question.direction, false, pairInstruments));
      return;
    }
    if (button.dataset.analysisPage) { lab.analysisPage += Number(button.dataset.analysisPage); renderLabAnalysis(); return; }
    if (button.dataset.analysisPair) { safely(() => playLabNotes(button.dataset.analysisPair.split(',').map(Number), 'harmonic', undefined, false)); return; }
    if (button.dataset.startExercise) { openSavedExercise(button.dataset.startExercise, true); return; }
    if (button.dataset.editExercise) { openSavedExercise(button.dataset.editExercise); return; }
    if (button.dataset.removeExercise) { removeExercise(button.dataset.removeExercise); return; }
    if (button.dataset.action === 'undo-remove-exercise') { undoRemoveExercise(); return; }
    if (button.dataset.close) { document.getElementById(button.dataset.close).close(); return; }
    if (button.dataset.previewPitch) { safely(() => previewInstrument(settings.varyInstrument || settings.perNoteInstruments ? settings.instrumentPool[0] : settings.instrument, button.dataset.previewPitch)); return; }
    if (button.dataset.previewInstrument) { safely(() => previewInstrument(button.dataset.previewInstrument)); return; }
    if (button.dataset.challenge) {
      expandedChallenge = expandedChallenge === button.dataset.challenge ? null : button.dataset.challenge;
      syncChallengeCards();
      return;
    }
    if (button.dataset.startChallenge) { startChallenge(button.dataset.startChallenge); return; }
    if (button.dataset.customizeChallenge) {
      const id = button.dataset.customizeChallenge;
      settings = challengeSettings(id, customSettings, challengeDrafts[id]);
      selectedExerciseId = null;
      openCustom(true);
      return;
    }
    if (button.dataset.forChallenge) {
      const id = button.dataset.forChallenge;
      const draft = challengeDrafts[id];
      if (button.dataset.challengeInput) draft.input = button.dataset.challengeInput;
      if (button.dataset.challengeInterval) {
        const interval = Number(button.dataset.challengeInterval);
        draft.intervals = draft.intervals.includes(interval) ? draft.intervals.filter(n => n !== interval) : [...draft.intervals, interval].sort((a, b) => a - b);
      }
      if (button.dataset.challengeSet) draft.intervals = button.dataset.challengeSet === 'reset' ? [...CHALLENGES.find(c => c.id === id).settings.intervals] : [...new Set([...draft.intervals, ...INTERVALS.slice(0, 12).map(i => i.semitones)])].sort((a, b) => a - b);
      syncChallengeCards();
      return;
    }
    if (button.dataset.slot !== undefined && !result) { selectedSlot = Number(button.dataset.slot); renderSlots(); return; }
    if (button.dataset.interval) { addAnswer(Number(button.dataset.interval)); return; }
    if (button.dataset.pitch) { addAnswer(Number(button.dataset.pitch)); return; }
    if (button.dataset.panPiano) {
      const pane = $(`[data-piano-scroll="${button.dataset.pianoContext}"]`);
      const keyWidth = pane?.querySelector('.ear-key.white')?.getBoundingClientRect().width || 32;
      pane?.scrollBy({ left: Number(button.dataset.panPiano) * keyWidth * 2, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    if (button.dataset.octave) { shiftPiano(Number(button.dataset.octave), button.dataset.pianoContext === 'lab'); return; }
    if (button.dataset.labNote) { safely(() => labPiano(Number(button.dataset.labNote))); return; }
    if (button.dataset.removeDroneNote) { safely(() => updateDroneNotes(lab.droneNotes.filter(note => note !== Number(button.dataset.removeDroneNote)))); return; }
    if (button.dataset.labInterval) { safely(() => changeLab({ interval: Number(button.dataset.labInterval) })); return; }
    if (button.dataset.labInstrument) { safely(() => changeLab({ [lab.noteFocus === 1 && lab.perNoteInstruments ? 'instrument2' : 'instrument']: button.dataset.labInstrument })); return; }
    if (button.dataset.labFamily) { lab.family = button.dataset.labFamily; renderLab(labHost()); return; }
    if (button.dataset.labFocus !== undefined) { lab.noteFocus = Number(button.dataset.labFocus); lab.family = instrumentById(lab.noteFocus ? lab.instrument2 : labSound().instrument).family; renderLab(labHost()); return; }
    if (button.dataset.labKeyMode) {
      lab.keyMode = button.dataset.labKeyMode;
      if (lab.keyMode === 'drone') {
        stopLoop();
        labRequest++;
        engine.cancel(false, { resetReverb: false, fade: .2 });
        labEvents = [];
        lab.busy = false;
      }
      renderLab(labHost());
      $(`[data-lab-key-mode="${lab.keyMode}"]`).focus({ preventScroll: true });
      return;
    }
    if (button.dataset.labDirection) { safely(() => changeLab({ direction: button.dataset.labDirection })); return; }
    if (button.dataset.preset) {
      updateSettings({ intervals: button.dataset.preset === 'starter' ? [3, 4, 5, 7] : INTERVALS.filter(i => button.dataset.preset === 'all' || i.semitones <= 12).map(i => i.semitones) });
      renderSettings();
      return;
    }
    const action = button.dataset.action;
    safely(async () => {
      if (action === 'home') onExit();
      if (action === 'menu') show('menu');
      if (action === 'practice') show('challenges');
      if (action === 'custom') openCustom();
      if (action === 'save-now') saveExercise($('#ear-save-as-new').checked, true);
      if (action === 'play' || action === 'target') await playQuestion();
      if (action === 'hint') await playQuestion(true);
      if (action === 'stop') { stopAll(); setStatus(''); }
      if (action === 'check') check();
      if (action === 'reveal') check(true);
      if (action === 'next') newQuestion();
      if (action === 'undo' && !result) { answer.pop(); selectedSlot = Math.max(0, answer.length); renderSlots(); updateSelection(); updateControls(); }
      if (action === 'clear' && !result) { answer = []; selectedSlot = 0; renderSlots(); updateSelection(); updateControls(); }
      if (action === 'mine' && result) {
        const notes = settings.input === 'interval' ? notesFromIntervals(question, result.submitted) : [question.reference, ...result.submitted];
        if (notes.some(n => n < 0 || n > 127)) throw new Error('Your answer is outside the supported pitch range.');
        await playQuestion(false, notes, question.direction, false);
      }
      if (action === 'shortcuts') { stopAll(); $('#ear-shortcuts').showModal(); }
      if (action === 'settings') openCustom(view === 'practice');
      if (action === 'back-quiz') backToQuiz();
      if (action === 'cheat') {
        stopAll();
        if (view === 'practice' && question) {
          if (!result) assisted = true;
          lab.reference = question.reference;
          lab.interval = question.answers[0];
          lab.direction = question.direction;
          lab.instrument = sound.noteInstruments?.[0] || sound.instrument;
          lab.perNoteInstruments = !!sound.noteInstruments;
          lab.instrument2 = sound.noteInstruments?.[1] || lab.instrument2;
          lab.noteFocus = 0;
          lab.keyMode = 'reference';
          lab.pianoBase = Math.floor(lab.reference / 12) * 12;
          lab.droneNotes = [lab.reference, lab.reference + labOffset()].sort((a, b) => a - b);
          setLabAnalysis(lab.droneNotes, 'selected');
        }
        lab.family = instrumentById(lab.noteFocus && lab.perNoteInstruments ? lab.instrument2 : labSound().instrument).family;
        engine.configure(labSound());
        renderLab($('#ear-lab-dialog'));
        $('#ear-cheat').showModal();
        scrollPianoTo(lab.reference, true, false);
        syncPianoScroll();
        syncLab();
      }
      if (action === 'lab-play') await labTransport();
      if (action === 'drone') await startDrone();
      if (action === 'clear-drone') await updateDroneNotes([]);
      if (action === 'loop') { const next = !lab.loop; clearTimeout(loopTimer); lab.loop = next; syncLab(); if (next) await repeatLab(); }
      if (action === 'reset-stats') {
        const key = `${question?.direction || settings.direction}:${question?.count || settings.minNotes}:${settings.input}`;
        delete stats.buckets[key]; save(STATS_KEY, stats); renderStats();
      }
    });
  });

  root.addEventListener('scroll', event => {
    if (event.target.matches?.('[data-piano-scroll]')) syncPianoScroll();
  }, true);
  root.addEventListener('wheel', event => {
    const pane = event.target.closest?.('.ear-instrument-scroll');
    if (!pane || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const max = pane.scrollWidth - pane.clientWidth;
    if (max <= 1 || (event.deltaY < 0 && pane.scrollLeft <= 0) || (event.deltaY > 0 && pane.scrollLeft >= max - 1)) return;
    event.preventDefault();
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pane.clientWidth : 1;
    pane.scrollLeft += event.deltaY * scale;
    syncPianoScroll();
  }, { passive: false });
  window.addEventListener('resize', () => { if (active) syncPianoScroll(); });

  root.addEventListener('toggle', event => {
    if (!event.target.matches?.('[data-analysis-details]') || event.target !== $('[data-analysis-details]')) return;
    lab.analysisOpen = event.target.open;
    renderLabAnalysis();
    animateLab();
  }, true);

  root.addEventListener('submit', event => {
    if (event.target.id === 'ear-save-exercise') { event.preventDefault(); safely(startCustomQuiz); return; }
    if (event.target.id !== 'ear-typed-form') return;
    event.preventDefault();
    if (!question || result) return;
    const raw = $('#ear-typed-answer').value.trim();
    const parse = settings.input === 'interval' ? parseInterval : parseNote;
    // A spelled-out single interval may contain spaces. Lists accept commas or whitespace.
    const single = parse(raw);
    const values = single !== null ? [single] : raw.split(raw.includes(',') ? /\s*,\s*/ : /\s+/).map(parse);
    if (values.some(v => v === null) || values.length !== question.answers.length) {
      $('#ear-feedback').textContent = `Enter ${question.answers.length} ${settings.input === 'interval' ? 'intervals (m3 and M3 are different)' : 'notes with octaves, such as E4'}, separated by commas.`;
      return;
    }
    answer = values;
    selectedSlot = Math.max(0, values.length - 1);
    renderSlots(); updateSelection(); updateControls();
    if (heard) check();
    else setStatus('Listen to the question before checking your answer.');
  });

  root.addEventListener('change', event => {
    const el = event.target;
    if (el.id === 'ear-save-on-start') {
      syncSaveControls();
      $('#ear-save-status').textContent = '';
      if (el.checked) $('#ear-exercise-name').focus({ preventScroll: true });
    }
    if (el.id === 'ear-save-as-new' && el.checked && $('#ear-exercise-name').value === savedExercises.find(item => item.id === selectedExerciseId)?.name) $('#ear-exercise-name').value = '';
    if (el.dataset.challengeMultitimbral) { challengeDrafts[el.dataset.challengeMultitimbral].perNoteInstruments = el.checked; syncChallengeCards(); }
    if (el.dataset.pool) {
      updateSettings({ instrumentPool: el.checked ? [...settings.instrumentPool, el.dataset.pool] : settings.instrumentPool.filter(id => id !== el.dataset.pool) });
      renderSettings();
      $(`[data-pool="${el.dataset.pool}"]`)?.focus({ preventScroll: true });
    }
    if (el.dataset.setting) {
      const key = el.dataset.setting;
      const value = el.type === 'checkbox' ? el.checked : ['range', 'number'].includes(el.type) || ['low', 'high', 'referenceNote'].includes(key) ? Number(el.value) : el.value;
      const exerciseKeys = ['instrument', 'direction', 'minNotes', 'maxNotes', 'low', 'high', 'reference', 'referenceNote', 'varyInstrument', 'varyDynamics', 'perNoteInstruments'];
      if (key === 'instrument' || (pitchPreview && ['low', 'high', 'referenceNote'].includes(key))) stopAll(true);
      updateSettings({ [key]: value });
      if (exerciseKeys.includes(key)) renderSettings();
    }
    if (el.dataset.enabledInterval) {
      const interval = Number(el.dataset.enabledInterval);
      updateSettings({ intervals: el.checked ? [...settings.intervals, interval] : settings.intervals.filter(n => n !== interval) });
    }
    if (el.dataset.lab && !['level', 'motion'].includes(el.dataset.lab)) {
      if (el.dataset.lab === 'duration') { lab.duration = Math.max(.2, Math.min(MAX_NOTE_DURATION, Number(el.value) || MAX_NOTE_DURATION)); el.value = lab.duration; }
      else if (el.dataset.lab === 'room') { lab.room = el.value; engine.configure(labSound()); }
      else safely(() => changeLab({ [el.dataset.lab]: el.type === 'checkbox' ? el.checked : el.value }));
    }
  });
  root.addEventListener('input', event => {
    const el = event.target;
    if (el.id === 'ear-exercise-name') { $('#ear-save-status').textContent = ''; $('#ear-save-status').removeAttribute('data-state'); }
    if (el.type === 'range' && el.dataset.lab) { lab[el.dataset.lab] = Number(el.value); engine.configureDrone({ level: lab.level, motion: lab.motion }); }
    if (el.type === 'range' && el.dataset.setting) {
      const key = el.dataset.setting;
      updateSettings({ [key]: Number(el.value) });
      el.parentElement.querySelector('output').textContent = key === 'velocity' ? el.value : key === 'dynamicSpread' ? `±${el.value}` : `${Math.round(Number(el.value) * 100)}%`;
    }
  });

  for (const dialog of $$('dialog.ear-dialog')) {
    dialog.addEventListener('close', () => { stopAll(); engine.configure(view === 'practice' && sound ? sound : settings); setStatus(''); });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && active) { stopAll(); engine.suspend(); setStatus('Paused while the page was away. Press play to resume.'); } });
  document.addEventListener('velhoksi:global-panel-open', () => { if (active) stopAll(true); });
  window.addEventListener('velhoksi:volume', () => engine.configure(engine.settings));
  document.addEventListener('velhoksi:clear-recordings', event => {
    if (active) stopAll(true);
    event.detail.waitUntil(Promise.allSettled([...engine.pending.values()].map(job => job.promise)).then(() => engine.clearCache()));
  });
  window.addEventListener('pagehide', () => { if (active) { stopAll(); engine.suspend(); } });
  document.addEventListener('keydown', event => {
    if (document.querySelector('.global-dialog[open]')) return;
    if (!active || event.ctrlKey || event.metaKey || event.repeat) return;
    if (event.key === 'Escape') { stopAll(); return; }
    if (event.target.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    const inLab = $('#ear-cheat').open;
    if (root.querySelector('dialog[open]') && !inLab) return;
    if (event.altKey && event.code === 'KeyC' && !inLab) { event.preventDefault(); $('[data-action="cheat"]').click(); return; }
    if (event.altKey && event.code === 'KeyS' && !inLab) { event.preventDefault(); $('[data-action="settings"]').click(); return; }
    if (event.altKey || (!inLab && view !== 'practice')) return;
    if (event.code === 'Space') { event.preventDefault(); safely(() => inLab ? labTransport() : playQuestion()); return; }
    if (!inLab && event.key === 'Enter') { event.preventDefault(); result ? newQuestion() : check(); return; }
    const intervalIndex = INTERVAL_CODES.indexOf(event.code);
    if (intervalIndex >= 0 && (inLab || settings.input === 'interval')) {
      const interval = intervalIndex + 1 + (event.shiftKey ? 12 : 0);
      const button = inLab ? $(`[data-lab-interval="${interval}"]`) : $(`[data-interval="${interval}"]`);
      if (button && !button.disabled) { event.preventDefault(); button.click(); }
      return;
    }
    if (inLab || settings.input === 'piano' || (result && settings.input === 'note')) {
      if (['KeyZ', 'KeyX'].includes(event.code)) { event.preventDefault(); shiftPiano(event.code === 'KeyZ' ? -1 : 1, inLab); return; }
      const offset = PIANO_KEYS.findIndex(([code]) => code === event.code);
      if (offset < 0) return;
      const midi = (inLab ? lab.pianoBase : pianoBase) + offset;
      const button = inLab ? $(`[data-lab-note="${midi}"]`) : $(`[data-pitch="${midi}"]`);
      if (button && !button.disabled) { event.preventDefault(); button.click(); }
    }
  });

  return {
    activate() { if (!active) { active = true; show(view); } },
    deactivate() { if (active) { active = false; stopAll(); engine.suspend(); for (const dialog of $$('.ear-dialog')) if (dialog.open) dialog.close(); } },
  };
}
