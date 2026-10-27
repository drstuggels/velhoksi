import { CHORDS, CHORD_GROUPS, CHORD_CHALLENGES, BASS_OPTIONS, chordById, sanitizeChordSettings, chordChallengeSettings, generateChordQuestion, gradeChordAnswer, chordInterpretations, interpretationName, chordComparison, chordToneName, pitchClasses, pitchName, prettyRole, bassKind, pc } from './chords.mjs';
import { noteName, parseNote } from './theory.mjs';
import { questionSound } from './challenges.mjs';
import { INSTRUMENTS, instrumentById } from './instruments.mjs';
import { voicingIntervals } from './analysis.mjs';
import { PIANO_KEYS } from './shortcuts.mjs';
import { audioQuality } from '../preferences.mjs';

const SETTINGS = 'velhoksi.ear.chords.settings.v1', EXERCISES = 'velhoksi.ear.chords.exercises.v1', STATS = 'velhoksi.ear.chords.stats.v1';
const ACTIVE = 'velhoksi.ear.activeQuiz.v1';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const options = (items, value) => items.map(([id, label]) => `<option value="${esc(id)}" ${String(value) === String(id) ? 'selected' : ''}>${esc(label)}</option>`).join('');
const TASKS = [['name', 'name the chord'], ['inversion', 'quality + bass position'], ['tones', 'reconstruct chord tones'], ['voicing', 'reproduce exact voicing']];
const INPUTS = [['piano', 'piano'], ['fretboard', 'fretboard'], ['note', 'note names']];
const ROOTS = Array.from({ length: 12 }, (_, i) => [i, pitchName(i)]);
const label = id => chordById(id).symbol || 'maj';
const formula = c => c.tones.map(t => prettyRole(t.role)).join(' · ');
const button = (action, text, cls = 'text-button', attrs = '') => `<button type="button" class="${cls}" data-chord-action="${action}" ${attrs}>${text}</button>`;

const ICONS = {
  play: '<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  up: '<path d="M4 18h4v-4h4v-4h4V6h4M16 2l4 4-4 4"/>',
  down: '<path d="M4 6h4v4h4v4h4v4h4m-4-4 4 4-4 4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  explore: '<path d="M5 4v16M12 4v16M19 4v16M2 8h6m1 8h6m1-6h6"/>',
};
const icon = name => `<svg class="chord-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const actionLabel = (name, text) => `${icon(name)}<span>${text}</span>`;

function readExercises() {
  const records = read(EXERCISES, []), seen = new Set();
  if (!Array.isArray(records)) return [];
  return records.filter(r => {
    if (!r || typeof r.id !== 'string' || !/^[\w-]+$/.test(r.id) || seen.has(r.id) || typeof r.name !== 'string' || !r.name.trim() || !r.settings || Array.isArray(r.settings)) return false;
    seen.add(r.id); return true;
  }).map(r => ({ id: r.id, name: r.name.trim().slice(0, 80), settings: sanitizeChordSettings(r.settings) }));
}

export function createChordTraining(root, { engine, preferences, onBack, onHome }) {
  const $ = selector => root.querySelector(selector), $$ = selector => [...root.querySelectorAll(selector)];
  const initialSound = Object.fromEntries(['instrument', 'instrumentPool', 'room', 'ambience', 'volume'].map(key => [key, preferences[key]]));
  let custom = sanitizeChordSettings(read(SETTINGS, initialSound)), settings = custom;
  let active = false, view = 'menu', expanded = null, title = 'custom', editingId = null, removed = null;
  let saved = readExercises(), previousQuiz = null;
  const drafts = Object.fromEntries(CHORD_CHALLENGES.map(c => [c.id, { ...c.settings, chordIds: [...c.settings.chordIds] }]));
  let question = null, answer = {}, result = null, sound = null, heard = false, assisted = false, replays = 0;
  let busy = false, loading = false, operation = 0, animation = 0, pianoBase = 60, basis = 'bass', statusText = '';
  let stats = read(STATS, { buckets: {}, skills: {}, confusions: {} });
  if (!stats || typeof stats !== 'object' || !stats.buckets || !stats.skills || !stats.confusions) stats = { buckets: {}, skills: {}, confusions: {} };
  let explorer = { root: 0, chordId: 'major', bassKind: 'root', spacing: 'close', notes: [60, 64, 67], holding: false };
  let explorerSound = null, soundingNotes = [], soundingTarget = null;
  const scrollTimers = new Map();
  function clearScrollIndicators() {
    for (const [pane, timer] of scrollTimers) { clearTimeout(timer); pane.classList.remove('is-scrolling'); }
    scrollTimers.clear();
  }
  const isPitches = () => ['tones', 'voicing'].includes(settings.task);
  const inExplorer = () => !!$('[data-chord-explorer]')?.open;

  const sameNotes = (a, b) => a.length === b.length && a.every((n, i) => n === b[i]);
  function questionNoteName(midi, octave = true) {
    const role = question.roles[question.notes.indexOf(midi)];
    return role ? chordToneName(midi, question.root, role, octave) : octave ? noteName(midi, true) : pitchName(midi);
  }
  function explorerNoteName(midi) {
    const tone = chordById(explorer.chordId).tones.find(t => pc(explorer.root + t.semitones) === pc(midi));
    return tone ? chordToneName(midi, explorer.root, tone.role) : noteName(midi, true);
  }
  function rootPositionNotes() {
    return generateChordQuestion({ ...settings, chordIds: [question.chordId], rootPitch: question.root, bassKinds: ['root'], spacing: 'close', omission: 'none', doubling: false, low: 48, high: 84 }, {}, () => .5).notes;
  }
  function highlightSounding(notes = soundingNotes, target = soundingTarget) {
    soundingNotes = notes; soundingTarget = target;
    $$('.sounding').forEach(el => el.classList.remove('sounding'));
    const host = inExplorer() ? $('[data-chord-explorer]') : $('[data-chord-quiz]');
    host?.querySelectorAll('[data-chord-pitch], [data-chord-note-play]').forEach(el => el.classList.toggle('sounding', notes.includes(Number(el.dataset.chordPitch ?? el.dataset.chordNotePlay))));
    if (target && notes.length) host?.querySelectorAll(`[${target[0]}="${target[1]}"]`).forEach(el => el.classList.add('sounding'));
  }
  function syncSustain() {
    const hold = $('[data-chord-action="hold"]');
    if (!hold) return;
    hold.innerHTML = `${icon('sound')}<span>sustain</span><span class="chord-sustain-state">${explorer.holding ? 'on' : 'off'}</span>`;
    hold.setAttribute('aria-pressed', String(explorer.holding));
    hold.disabled = !explorer.notes.length;
  }

  function status(message, state = '') {
    statusText = ['playing', 'drone'].includes(state) ? '' : message;
    const host = inExplorer() ? $('[data-chord-explorer-status]') : $('[data-chord-status]');
    if (host) { host.textContent = statusText; host.dataset.state = state; }
  }
  function stop(preserveTail = false) {
    operation++; cancelAnimationFrame(animation); animation = 0; busy = false; loading = false; explorer.holding = false;
    engine.cancelPrefetch();
    engine.cancel(true, { resetReverb: !preserveTail, fade: preserveTail ? .12 : .025 });
    $$('.sounding, .playing').forEach(el => el.classList.remove('sounding', 'playing'));
    controls();
    highlightSounding([], null); syncSustain();
  }
  async function safely(fn) {
    try { await fn(); } catch (error) { stop(); status(error.message || 'Could not play. Try again.', 'error'); }
  }
  function rememberQuiz() { write(ACTIVE, view === 'quiz' && question ? { kind: 'chords', settings, title, exerciseId: editingId } : null); }
  function breadcrumbs() {
    return `<nav class="ear-breadcrumbs" aria-label="practice navigation">${button('home', 'practice sets')}<span>/</span>${button('back', 'ear training')}<span>/</span>${view === 'menu' ? '<span aria-current="page">chords</span>' : button('menu', 'chords')}</nav>`;
  }
  function tools() { return `<div class="ear-menu-tools">${button('explorer', 'chord explorer')}${button('shortcuts', 'shortcuts')}</div>`; }
  function render() {
    clearScrollIndicators();
    root.innerHTML = view === 'menu' ? menuMarkup() : view === 'setup' ? setupMarkup() : quizMarkup();
    root.insertAdjacentHTML('beforeend', `<dialog class="ear-dialog" data-chord-explorer aria-label="chord explorer"></dialog><dialog class="ear-dialog" data-chord-shortcuts aria-labelledby="chord-shortcut-title"><div class="ear-dialog-header"><h2 id="chord-shortcut-title">chord shortcuts</h2>${button('close-shortcuts', 'close')}</div><dl class="ear-shortcut-list"><dt>space</dt><dd>listen / replay</dd><dt>enter</dt><dd>check / next question</dd><dt>escape</dt><dd>stop / close dialog</dd><dt>alt + c</dt><dd>chord explorer</dd><dt>alt + s</dt><dd>edit challenge</dd><dt>a w s e d f t g y h u j k o l p</dt><dd>piano notes from the labelled C</dd><dt>z / x</dt><dd>piano octave down / up</dd></dl></dialog>`);
    $$('dialog').forEach(dialog => {
      dialog.addEventListener('close', () => { stop(); engine.configure(sound || settings); });
      dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    });
    if (view === 'quiz') { renderAnswer(); renderFeedback(); renderStats(); controls(); }
    status(statusText);
  }
  function show(next) {
    stop(); statusText = ''; view = next; render(); rememberQuiz();
  }
  function menuMarkup() {
    saved = readExercises();
    return `<div class="view view-picker ear-challenges chord-challenges"><div class="intro-copy">${breadcrumbs()}<h2>pick a challenge</h2><p class="ear-muted">one chord at a time</p></div><div class="alphabet-picker ear-challenge-picker" aria-label="chord challenges">${CHORD_CHALLENGES.map((c, index) => {
      const d = drafts[c.id], open = expanded === c.id;
      return `<article class="ear-challenge-card ${open ? 'is-selected' : ''}"><button type="button" class="ear-challenge-select" data-chord-card="${c.id}" aria-expanded="${open}" aria-controls="chord-card-${c.id}"><span class="ear-challenge-card-top"><span class="ear-challenge-level">level ${index + 1}</span><span class="ear-challenge-expand">${open ? '−' : '+'}</span></span><span class="alphabet-button-label">${c.name}</span><span class="ear-challenge-description">${c.description}</span><span class="ear-challenge-summary">${d.chordIds.map(label).join(' · ')}</span></button><div id="chord-card-${c.id}" class="ear-challenge-options" ${open ? '' : 'hidden'}><label class="chord-select-label">listen for<select data-chord-card-task="${c.id}">${options(TASKS, d.task || 'name')}</select></label><div class="chord-chips" role="group" aria-label="chords in ${c.name}">${c.settings.chordIds.map(id => `<button type="button" class="ear-challenge-interval" data-chord-card-quality="${esc(id)}" data-card-id="${c.id}" aria-pressed="${d.chordIds.includes(id)}" title="${chordById(id).name}">${label(id)}</button>`).join('')}</div><div class="ear-card-start"><button type="button" class="ear-primary" data-chord-start="${c.id}" ${d.chordIds.length ? '' : 'disabled'}>start →</button><button type="button" class="text-button" data-chord-customize="${c.id}">more settings</button></div></div></article>`;
    }).join('')}${button('custom', '<span class="alphabet-button-label">custom</span><span class="ear-challenge-description">choose chords, voicings & sound ↗</span>', 'alphabet-button ear-custom-choice')}</div>
    ${saved.length || removed ? `<section class="ear-saved-exercises"><h3>saved exercises</h3><div class="chord-saved-list">${saved.map(e => `<article class="ear-saved-exercise"><div><h4>${esc(e.name)}</h4><p>${e.settings.chordIds.map(label).join(' · ')} · ${TASKS.find(([id]) => id === e.settings.task)[1]}</p></div><div class="ear-saved-actions"><button class="ear-primary" type="button" data-chord-saved-start="${e.id}">start →</button><button class="text-button" type="button" data-chord-saved-edit="${e.id}">edit</button><button class="text-button" type="button" data-chord-remove="${e.id}" aria-label="Remove ${esc(e.name)}">remove</button></div></article>`).join('')}</div>${removed ? `<p class="ear-muted">Removed “${esc(removed.name)}”. ${button('restore', 'undo')}</p>` : ''}</section>` : ''}${tools()}<p data-chord-status role="status" class="ear-sound-status"></p></div>`;
  }
  function selectSetting(key, text, choices, attrs = '') {
    return `<label>${text}<select data-chord-setting="${key}" ${attrs}>${options(choices, settings[key])}</select></label>`;
  }
  function numberSetting(key, text, min, max, step = 1) {
    return `<label>${text}<input type="number" data-chord-setting="${key}" min="${min}" max="${max}" step="${step}" value="${settings[key]}" /></label>`;
  }
  function checkboxSetting(key, text) { return `<label class="ear-checkbox"><input type="checkbox" data-chord-setting="${key}" ${settings[key] ? 'checked' : ''} /> ${text}</label>`; }
  function setupMarkup() {
    const s = settings, e = saved.find(e => e.id === editingId);
    return `<div class="view ear-setup chord-setup"><div class="ear-setup-inner"><div class="ear-setup-header"><div>${breadcrumbs()}<h2>${previousQuiz ? 'edit challenge' : 'custom chords'}</h2></div>${previousQuiz ? button('back-quiz', 'back to quiz →') : ''}</div>
    <section class="ear-setting-section"><h3>answering</h3><div class="ear-settings-grid">${selectSetting('task', 'listen for', TASKS)}${isPitches() ? selectSetting('answerWith', 'answer with', INPUTS) : ''}${selectSetting('rootCue', 'root', [['given', 'given · name and reference sound'], ['unknown', 'unspecified · accept equivalent names']], isPitches() || s.omission === 'root' ? 'disabled' : '')}</div><p class="ear-muted">${isPitches() ? s.task === 'tones' ? 'Select every sounding pitch class. Octaves and doubled notes do not affect grading.' : 'Select every sounding pitch in its actual octave. The bass is supplied as a reference.' : s.rootCue === 'given' ? 'Identify the chord relative to the supplied root.' : 'Identify any matching chord quality. Equivalent roots and bass positions are accepted; no absolute-pitch naming required.'}</p>${checkboxSetting('audition', 'sound answers aloud before grading (assisted)')}</section>
    <section class="ear-setting-section"><h3>chords</h3><p class="ear-muted">The formulas specify the notes in these exercises. Major and dominant 13ths omit 11; minor 13ths include it. “alt” is not a single fixed formula.</p>${CHORD_GROUPS.map(group => `<fieldset class="chord-catalog"><legend>${group} <button type="button" class="text-button" data-chord-group="${group}">${CHORDS.filter(c => c.group === group).every(c => s.chordIds.includes(c.id)) ? 'clear group' : 'select group'}</button></legend><div class="ear-interval-selection">${CHORDS.filter(c => c.group === group).map(c => `<label><input type="checkbox" data-chord-enabled="${esc(c.id)}" ${s.chordIds.includes(c.id) ? 'checked' : ''} /><span><strong>${label(c.id)}</strong> ${c.name}<small>${formula(c)}</small></span></label>`).join('')}</div></fieldset>`).join('')}</section>
    <section class="ear-setting-section"><h3>voicing</h3><fieldset class="chord-bass-choices"><legend>bass positions</legend>${BASS_OPTIONS.map(([id, name]) => `<label class="ear-checkbox"><input type="checkbox" data-chord-bass="${id}" ${s.bassKinds.includes(id) ? 'checked' : ''} /> ${name}</label>`).join('')}</fieldset><div class="ear-settings-grid">${selectSetting('spacing', 'spacing', [['close', 'close'], ['open', 'open'], ['mixed', 'close & open']])}${selectSetting('omission', 'omit', [['none', 'nothing'], ['fifth', 'perfect fifth, where present'], ['root', 'root · supplied separately']])}${selectSetting('rootPitch', 'root pitch', [['random', 'varies each question'], ...ROOTS])}${selectSetting('low', 'lowest pitch', Array.from({ length: 48 }, (_, i) => [i + 36, noteName(i + 36)]))}${selectSetting('high', 'highest pitch', Array.from({ length: 48 }, (_, i) => [i + 37, noteName(i + 37)]))}</div>${checkboxSetting('doubling', 'double the bass one octave above')}<p class="ear-muted">Spacing applies before octave doubling. Omitting the root requires a non-root bass position. Altered fifths are retained.</p>${checkboxSetting('adaptive', 'revisit chord qualities I miss more often')}</section>
    <section class="ear-setting-section"><h3>sound</h3><div class="ear-settings-grid">${selectSetting('instrument', 'instrument', INSTRUMENTS.map(i => [i.id, i.name]))}${selectSetting('room', 'room', [['dry', 'dry'], ['studio', 'studio'], ['room', 'room'], ['hall', 'hall']])}${numberSetting('duration', 'note length (seconds)', .2, 12, .1)}${numberSetting('gap', 'arpeggio gap (seconds)', 0, 2, .05)}${numberSetting('velocity', 'touch', 1, 127)}${numberSetting('ambience', 'ambience', 0, .7, .05)}</div>${checkboxSetting('varyInstrument', 'alternate instruments between questions')}${checkboxSetting('perNoteInstruments', 'different instrument per note')}${s.varyInstrument || s.perNoteInstruments ? `<fieldset class="ear-instrument-pool"><legend>instrument pool</legend><div class="chord-pool">${INSTRUMENTS.map(i => `<label class="ear-checkbox"><input type="checkbox" data-chord-pool="${i.id}" ${s.instrumentPool.includes(i.id) ? 'checked' : ''} /> ${esc(i.name)}</label>`).join('')}</div></fieldset>` : ''}${checkboxSetting('varyDynamics', 'gently vary dynamics between questions')}${s.varyDynamics ? `<div class="ear-settings-grid">${numberSetting('dynamicSpread', 'touch variation ±', 1, 30)}</div>` : ''}</section>
    <form class="ear-setup-start" data-chord-save-form><div class="ear-save-options" data-chord-save-options hidden><label for="chord-exercise-name">exercise name</label><input id="chord-exercise-name" type="text" maxlength="80" placeholder="name (optional)" value="${esc(e?.name || '')}" />${e ? '<label class="ear-checkbox"><input type="checkbox" data-chord-save-copy /> save as new</label>' : ''}</div><div class="ear-setup-actions"><button type="submit" class="ear-primary">start quiz →</button><label class="ear-checkbox"><input type="checkbox" data-chord-save-toggle /> save exercise</label>${button('save', 'save now', 'text-button', 'hidden')}</div><p data-chord-status role="status" class="ear-sound-status"></p></form></div></div>`;
  }
  function updateSettings(patch) {
    settings = sanitizeChordSettings({ ...settings, ...patch }); custom = settings; write(SETTINGS, custom); statusText = '';
  }
  function openSetup(next = custom, id = null, fromQuiz = false) {
    previousQuiz = fromQuiz ? { settings, title, editingId } : null;
    settings = sanitizeChordSettings(next); editingId = id; show('setup');
  }
  function saveExercise() {
    generateChordQuestion(settings);
    const records = readExercises(), copy = $('[data-chord-save-copy]')?.checked;
    const name = $('#chord-exercise-name').value.trim() || `chords · ${settings.chordIds.length === 1 ? chordById(settings.chordIds[0]).name : `${settings.chordIds.length} qualities`} · ${settings.task}`;
    if (records.some(e => (copy || e.id !== editingId) && e.name.toLowerCase() === name.toLowerCase())) throw new Error('That name is already in use. Choose a different name.');
    const id = !copy && records.some(e => e.id === editingId) ? editingId : `chord-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const record = { id, name, settings: sanitizeChordSettings(settings) };
    const next = records.some(e => e.id === id) ? records.map(e => e.id === id ? record : e) : [...records, record];
    if (!write(EXERCISES, next)) throw new Error('Could not save the exercise. Practice remains available.');
    saved = next; editingId = id; title = name; custom = settings; write(SETTINGS, custom);
    $('#chord-exercise-name').value = name;
    if ($('[data-chord-save-copy]')) $('[data-chord-save-copy]').checked = false;
    status('Exercise saved.');
  }
  function start(next, name = 'custom', id = null) {
    const q = generateChordQuestion(next, stats.skills); // Validate before leaving settings.
    settings = sanitizeChordSettings(next); title = name; editingId = id; previousQuiz = null;
    stop(); sound = null; assignQuestion(q); view = 'quiz'; statusText = ''; render(); rememberQuiz();
  }
  function assignQuestion(q) {
    question = q; answer = { notes: [] }; result = null; heard = false; assisted = false; replays = 0;
    pianoBase = Math.floor(q.reference / 12) * 12;
    sound = { ...questionSound(settings, sound), quality: audioQuality() };
    engine.configure(sound); engine.prefetch(q.notes, sound);
  }
  function nextQuestion() {
    stop(true); assignQuestion(generateChordQuestion(settings, stats.skills)); statusText = ''; render(); rememberQuiz();
    $('[data-chord-action="play"]')?.focus({ preventScroll: true });
    const workspace = $('[data-chord-quiz]');
    if (['auto', 'scroll'].includes(window.getComputedStyle(workspace).overflowY)) workspace.scrollTo?.({ top: 0 });
    else $('.ear-main')?.scrollIntoView?.({ block: 'start' });
  }
  function quizMarkup() {
    const q = question;
    return `<div class="view view-game chord-workspace" data-chord-quiz><div class="floating floating-main ear-main"><div class="prompt-meta"><div class="prompt-title-row">${breadcrumbs()}</div><div class="prompt-tools">${button('settings', 'edit challenge')}<span>/</span>${button('explorer', 'chord explorer')}<span>/</span>${button('shortcuts', 'shortcuts')}</div></div><section class="prompt-card ear-prompt" aria-label="single chord"><h2 class="visually-hidden">${TASKS.find(([id]) => id === settings.task)[1]}</h2><div class="ear-note-dots" aria-hidden="true">${q.notes.map((_, i) => `<span class="ear-note-dot" data-chord-dot="${i}">${i + 1}</span>`).join('')}</div>${button('play', `<span class="chord-play-symbol" data-chord-play-icon>${icon('play')}</span><span class="chord-play-copy"><strong data-chord-play-label>listen to chord</strong><span data-chord-play-hint>${TASKS.find(([id]) => id === settings.task)[1]}</span></span>`, 'ear-play chord-play', 'aria-keyshortcuts="Space"')}<div class="ear-prompt-footer"><span class="ear-challenge-caption">${esc(title)} · ${q.notes.length} notes · together</span><div class="ear-transport">${button('hint', actionLabel('up', 'note by note'), 'chord-quiet', 'title="Hear the notes separately (counts as assisted)"')}${button('reveal', actionLabel('eye', 'show answer'), 'chord-quiet')}</div></div></section>
    <section class="ear-answer" aria-label="chord answer"><div class="ear-answer-heading"><p class="ear-muted chord-references">${q.rootCue === 'given' ? `<span class="chord-reference"><span>root: <strong>${pitchName(q.root)}</strong></span>${button('reference', actionLabel('sound', 'hear root'), 'chord-quiet')}</span>` : '<span>root unspecified · equivalent interpretations accepted</span>'}${settings.task === 'voicing' ? `<span class="chord-reference"><span>bass: ${noteName(q.notes[0], true)}</span>${button('bass-reference', actionLabel('sound', 'hear bass'), 'chord-quiet')}</span>` : ''}</p></div><div data-chord-answer></div><div class="ear-answer-actions">${button('check', actionLabel('check', 'check answer'), 'ear-primary')}${button('clear', 'clear selection', 'chord-quiet')}${button('next', 'skip question →', 'chord-quiet')}</div><div class="ear-feedback" data-chord-feedback role="status" aria-live="polite"></div><p data-chord-status role="status" class="ear-sound-status"></p></section></div><aside class="floating floating-stats ear-stats" data-chord-stats aria-label="chord practice statistics"></aside></div>`;
  }
  function pianoMarkup(exploring = false) {
    const range = instrumentById((exploring ? explorerSound : sound)?.instrument || settings.instrument).range;
    const low = Math.max(36, range[0]), high = Math.min(84, range[1]);
    let white = 0;
    const keys = Array.from({ length: high - low + 1 }, (_, i) => low + i).map(midi => {
      const black = [1, 3, 6, 8, 10].includes(pc(midi)), position = black ? white - .32 : white++;
      const shortcut = PIANO_KEYS[midi - pianoBase]?.[1];
      const name = exploring ? explorerNoteName(midi) : result ? questionNoteName(midi) : noteName(midi, true);
      return `<button type="button" class="ear-key ${black ? 'black' : 'white'}" style="--key-position:${position}" data-chord-pitch="${midi}" aria-label="${name}" aria-pressed="false">${shortcut ? `<kbd>${shortcut}</kbd>` : ''}<span class="ear-key-label">${name}</span><span class="ear-key-light"></span></button>`;
    });
    return `<div class="ear-piano-caption"><span>${exploring ? 'click to add / remove notes' : result ? 'play to explore' : settings.task === 'tones' ? 'select every pitch class · any octave' : 'select every pitch · exact octaves'}</span><div class="ear-octave-controls">${button('octave-down', '← octave')}<span>keys from ${noteName(pianoBase)}</span>${button('octave-up', 'octave →')}</div></div><div class="ear-instrument-scroll" tabindex="0" aria-label="scrollable chord piano"><div class="ear-piano" style="--white-count:${white}">${keys.join('')}</div></div>`;
  }
  function fretboardMarkup() {
    return `<div class="ear-instrument-scroll" tabindex="0" aria-label="scrollable guitar fretboard"><div class="ear-fretboard" role="group" aria-label="guitar fretboard, standard tuning"><div class="ear-fret-labels"><span></span>${Array.from({ length: 21 }, (_, fret) => `<span>${fret}</span>`).join('')}</div>${[64, 59, 55, 50, 45, 40].map((open, string) => `<div class="ear-string" style="--string-weight:${string + 1}"><span>${noteName(open)}</span>${Array.from({ length: 21 }, (_, fret) => `<button type="button" data-chord-pitch="${open + fret}" aria-label="string ${string + 1}, fret ${fret}, ${noteName(open + fret, true)}" aria-pressed="false"><span>${noteName(open + fret, true)}</span></button>`).join('')}</div>`).join('')}</div></div>`;
  }
  function renderAnswer() {
    const host = $('[data-chord-answer]');
    if (!host) return;
    const scroll = host.querySelector('.ear-instrument-scroll')?.scrollLeft;
    if (isPitches()) {
      host.innerHTML = `<p class="ear-muted" data-chord-selection></p>${settings.answerWith === 'fretboard' ? fretboardMarkup() : settings.answerWith === 'note' && !result ? `<form data-chord-notes-form class="ear-typed"><label for="chord-notes">${settings.task === 'tones' ? 'note names · octaves optional' : 'note names with octaves'}</label><div><input id="chord-notes" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${settings.task === 'tones' ? 'C, E, G, B♭' : 'C4, E4, G4, B♭4'}" /><button class="text-button" type="submit">use answer</button></div></form>` : pianoMarkup()}`;
    } else {
      // Include exact equivalent qualities even if the current preset omits them.
      // Derive the pool from every selected formula, never from the hidden question.
      const pool = new Set(settings.chordIds);
      if (settings.rootCue === 'unknown' || settings.omission !== 'none') for (const id of settings.chordIds) {
        const tones = chordById(id).tones.filter(t => !(settings.omission === 'fifth' && t.role === '5') && !(settings.omission === 'root' && t.role === '1'));
        chordInterpretations(tones.map(t => t.semitones), { root: settings.rootCue === 'given' ? 0 : null, omission: settings.omission }).forEach(i => pool.add(i.chordId));
      }
      host.innerHTML = `${CHORD_GROUPS.map(group => {
        const choices = CHORDS.filter(c => c.group === group && pool.has(c.id));
        return choices.length ? `<fieldset class="chord-answer-group"><legend>${group}</legend><div class="chord-quality-buttons">${choices.map(c => `<button type="button" data-chord-answer-id="${esc(c.id)}" aria-pressed="false" title="${esc(c.name)}"><strong>${label(c.id)}</strong><span>${c.name}</span><span class="chord-choice-mark" aria-hidden="true">${icon('check')}</span></button>`).join('')}</div></fieldset>` : '';
      }).join('')}${settings.task === 'inversion' ? `<fieldset class="chord-answer-group"><legend>bass position · relative to your chosen chord</legend><div class="chord-bass-buttons">${BASS_OPTIONS.map(([id, name]) => `<button type="button" data-chord-answer-bass="${id}" aria-pressed="false">${name}</button>`).join('')}</div></fieldset>` : ''}`;
    }
    syncSelection();
    const pane = host.querySelector('.ear-instrument-scroll');
    if (pane) pane.scrollLeft = scroll ?? Math.max(0, (question.reference - 48) * 18);
  }
  function syncSelection() {
    const exploring = inExplorer(), notes = exploring ? explorer.notes : answer.notes || [];
    const host = exploring ? $('[data-chord-explorer]') : $('[data-chord-answer]');
    if (!host) return;
    host.querySelectorAll('[data-chord-pitch]').forEach(el => {
      const midi = Number(el.dataset.chordPitch), matches = n => !exploring && settings.task === 'tones' ? pc(n) === pc(midi) : n === midi;
      const selected = notes.some(matches), correct = !exploring && result && question.notes.some(matches);
      el.setAttribute('aria-pressed', String(selected)); el.classList.toggle('selected', selected && !result || exploring && selected);
      el.classList.toggle('answer-correct', !!correct); el.classList.toggle('answer-wrong', !!(!exploring && result && selected && !correct));
    });
    $$('[data-chord-answer-id]').forEach(el => {
      const id = el.dataset.chordAnswerId, selected = id === answer.chordId;
      el.setAttribute('aria-pressed', String(selected)); el.disabled = !!result;
      const correct = result?.interpretations.some(i => i.chordId === id);
      el.classList.toggle('answer-correct', !!correct); el.classList.toggle('answer-wrong', !!result && selected && !correct);
    });
    $$('[data-chord-answer-bass]').forEach(el => { el.setAttribute('aria-pressed', String(el.dataset.chordAnswerBass === answer.bassKind)); el.disabled = !!result; });
    const selected = $('[data-chord-selection]');
    if (selected) selected.textContent = notes.length ? `selected: ${settings.task === 'tones' ? pitchClasses(notes).map(pitchName).join(' · ') : notes.map(n => noteName(n, true)).join(' · ')}` : 'select all sounding notes, including the reference if present';
  }
  function controls() {
    const labPlay = $('[data-chord-action="lab-play"]');
    if (labPlay) {
      labPlay.innerHTML = actionLabel(busy ? 'stop' : 'play', busy ? 'stop playback' : 'play chord');
      labPlay.disabled = !explorer.notes.length;
    }
    if (view !== 'quiz' || !question) return;
    const set = (action, disabled) => { const el = $(`[data-chord-action="${action}"]`); if (el) el.disabled = disabled; };
    const ready = isPitches() ? answer.notes?.length > 0 : !!answer.chordId && (settings.task !== 'inversion' || !!answer.bassKind);
    set('check', !heard || !ready || !!result || busy); set('reveal', !heard || !!result || busy);
    set('hint', !heard || !!result || busy); set('clear', !!result);
    const playLabel = $('[data-chord-play-label]');
    if (playLabel) playLabel.textContent = busy ? 'stop playback' : heard ? 'replay chord' : 'listen to chord';
    const playButton = $('.chord-play');
    if (playButton) {
      playButton.classList.toggle('is-playing', busy && !loading);
      playButton.classList.toggle('is-loading', busy && loading);
      $('[data-chord-play-icon]').innerHTML = icon(busy ? 'stop' : 'play');
      $('[data-chord-play-hint]').textContent = busy ? loading ? 'loading sound…' : 'listen closely' : TASKS.find(([id]) => id === settings.task)[1];
    }
    const transport = $('.ear-transport'); if (transport) transport.hidden = !!result;
    set('clear', !!result || !(answer.chordId || answer.bassKind || answer.notes?.length));
    const actions = $('.ear-answer-actions'); if (actions) actions.hidden = !!result;
  }
  async function play(notes = question?.notes, { direction = 'harmonic', markHeard = false, hint = false, audition = false, voiceIndices = null, trigger = null } = {}) {
    if (!notes?.length) return;
    if (inExplorer() && explorer.holding) {
      explorer.holding = false;
      syncSustain();
    }
    if (hint || audition) assisted = true;
    if (markHeard && heard && !result && !hint) replays++;
    const target = trigger ? ['data-chord-action', 'data-chord-pair', 'data-chord-note-play'].filter(key => trigger.hasAttribute(key)).map(key => [key, trigger.getAttribute(key)])[0] : markHeard ? ['data-chord-action', 'play'] : null;
    highlightSounding([], target);
    const token = ++operation; cancelAnimationFrame(animation); busy = true; loading = true; controls();
    const source = inExplorer() ? explorerSound : sound || settings;
    const noteInstruments = voiceIndices && source.noteInstruments ? voiceIndices.map(i => source.noteInstruments[i]) : source.noteInstruments;
    const duration = direction === 'harmonic' ? source.duration : Math.min(.8, source.duration), gap = direction === 'harmonic' ? source.gap : Math.max(.2, source.gap);
    // Chord spacing is close/open; the audio engine's spacing is onset time in seconds.
    const info = await engine.play(notes, { ...source, noteInstruments, direction, duration, gap, spacing: duration + gap });
    if (!info || token !== operation || !active) { if (token === operation) { busy = false; controls(); } return; }
    loading = false; controls();
    const tick = () => {
      if (token !== operation || !active) return;
      const time = engine.context.currentTime;
      const sounding = notes.filter((_, i) => { const onset = info.start + (direction === 'harmonic' ? 0 : i * (duration + gap)); return time >= onset && time < onset + duration; });
      highlightSounding(sounding, target);
      $$('[data-chord-dot]').forEach(el => { const i = Number(el.dataset.chordDot); el.classList.toggle('playing', markHeard && sounding.includes(question.notes[i])); });
      if (time < info.end) animation = requestAnimationFrame(tick);
      else { highlightSounding([], null); busy = false; if (markHeard) heard = true; controls(); status(''); }
    };
    tick();
  }
  function bucket() {
    return stats.buckets[`${settings.task}:${settings.rootCue}`] ||= { total: 0, right: 0, parts: 0, partTotal: 0, assisted: 0, replays: 0 };
  }
  function check(reveal = false) {
    if (!question || result || !heard || busy) return;
    if (!reveal && (isPitches() ? !answer.notes?.length : !answer.chordId || settings.task === 'inversion' && !answer.bassKind)) return;
    stop(true); assisted ||= reveal; result = { ...gradeChordAnswer(question, answer), revealed: reveal };
    const b = bucket(); b.total++; b.right += Number(result.correct && !reveal); b.parts += reveal ? 0 : result.parts.filter(Boolean).length; b.partTotal += result.parts.length; b.assisted += Number(assisted); b.replays += replays;
    const skill = stats.skills[question.chordId] ||= { attempts: 0, misses: 0 };
    skill.attempts++; skill.misses = result.correct && !reveal ? Math.max(0, skill.misses - .25) : skill.misses + 1;
    if (!reveal && !isPitches() && !result.qualityCorrect && answer.chordId) {
      const pair = `${question.chordId}|${answer.chordId}`; stats.confusions[pair] = (stats.confusions[pair] || 0) + 1;
    }
    write(STATS, stats); renderAnswer(); renderFeedback(); renderStats(); controls();
    $('[data-chord-action="next-result"]')?.focus({ preventScroll: true });
    $('[data-chord-result-actions]')?.scrollIntoView?.({ block: 'nearest' });
  }
  function renderFeedback() {
    const host = $('[data-chord-feedback]');
    if (!host || !result) return;
    const q = question, c = chordById(q.chordId), correct = result.correct && !result.revealed;
    const equivalents = chordInterpretations(q.notes, { omission: q.omission });
    const relationships = voicingIntervals(q.notes, basis === 'adjacent' ? 'adjacent' : 'bass');
    const mine = chordComparison(q, answer, settings), reduction = rootPositionNotes();
    const compareMine = mine.length && !sameNotes(mine, q.notes);
    // A register-only change is not a useful root-position comparison.
    const compareReduction = pc(reduction[0]) !== pc(q.notes[0]) || !sameNotes(reduction.map(n => n - reduction[0]), q.notes.map(n => n - q.notes[0]));
    const detailsOpen = host.querySelector('[data-chord-listen-details]')?.open;
    const equivalentsOpen = host.querySelector('.chord-equivalents')?.open;
    host.className = `ear-feedback ear-result chord-result ${correct ? 'correct' : result.revealed ? 'revealed' : 'incorrect'}`;
    host.innerHTML = `<div class="chord-result-top"><div><div class="ear-result-heading"><strong>${icon(correct ? 'check' : 'eye')}${result.revealed ? 'answer revealed' : correct ? 'correct' : 'not quite'}</strong>${assisted ? '<span class="ear-result-assisted">assisted</span>' : ''}</div><p class="chord-result-name"><strong>${interpretationName(q, q.notes[0])}</strong><span>${c.name}</span></p><p class="chord-result-formula">${formula(c)}${q.omission !== 'none' ? ` · ${q.omission === 'root' ? 'root omitted' : 'perfect fifth omitted where present'}` : ''}</p></div></div>
      ${!result.revealed && !correct ? `<div class="chord-correction"><p>${isPitches() ? `${result.matches} of ${result.expected.length} ${settings.task === 'tones' ? 'pitch classes' : 'pitches'} matched${result.extra.length ? ` · ${result.extra.length} extra` : ''}` : `${result.qualityCorrect ? 'quality correct' : result.familyCorrect ? 'chord family correct; check the added or altered tones' : 'different chord quality'}${settings.task === 'inversion' ? ` · ${result.inversionCorrect ? 'bass position correct' : 'check the bass position relative to your chord'}` : ''}`}</p>${!isPitches() && answer.chordId ? `<p class="ear-muted">your answer: ${esc(chordById(answer.chordId).name)}${answer.bassKind ? ` · ${BASS_OPTIONS.find(([id]) => id === answer.bassKind)[1]}` : ''}</p>` : ''}</div>` : ''}
      <div class="chord-note-row"><div class="chord-voicing-heading"><strong>${q.spacing === 'open' ? 'open voicing' : 'close voicing'}</strong><span>bass → top · ${q.roles.map(prettyRole).join(' → ')}</span></div><div class="chord-tone-list" role="group" aria-label="Play individual chord tones">${q.notes.map((n, i) => `<button type="button" class="ear-audio-button" data-chord-note-play="${n}" data-chord-voice="${i}" aria-label="Play ${chordToneName(n, q.root, q.roles[i])}, degree ${prettyRole(q.roles[i])}">${icon('play')}<strong>${chordToneName(n, q.root, q.roles[i])}</strong><span>${prettyRole(q.roles[i])}</span></button>`).join('')}</div><p class="chord-voicing-caption">${BASS_OPTIONS.find(([id]) => id === bassKind(q.bassRole))[1]} · bass ${questionNoteName(q.notes[0], false)}</p>${q.spacing === 'open' ? '<p class="chord-voicing-explanation">Chord tones are spread across registers. Root position describes the bass, not the spacing.</p>' : ''}</div>
      <div class="chord-result-actions" data-chord-result-actions>${button('next-result', `<span>next chord</span>${icon('arrow')}`, 'ear-primary')}${button('play', actionLabel('play', 'replay chord'), 'chord-quiet')}${compareMine ? button('mine', actionLabel('sound', 'play your answer'), 'chord-quiet') : ''}<span class="chord-key-hint"><kbd>enter</kbd> to continue</span></div>
      ${equivalents.length > 1 ? `<details class="chord-equivalents" ${equivalentsOpen ? 'open' : ''}><summary>other names for these notes</summary><p>${equivalents.map(i => interpretationName(i, q.notes[0])).join(' · ')}</p><p class="ear-muted">These names use the same pitch classes${q.omission !== 'none' ? ' under this omission rule' : ''}. ${q.rootCue === 'given' ? 'This question is graded relative to the supplied root.' : 'Any matching quality and its corresponding bass position are accepted.'}</p></details>` : ''}
      <details class="chord-listen-details" data-chord-listen-details ${detailsOpen ? 'open' : ''}><summary>${icon('sound')}<span>listen closer</span><span class="chord-details-caption">notes, voicing & intervals</span></summary><div class="chord-listening-tools" role="group" aria-label="Explore the chord by listening">${button('arpeggio-up', actionLabel('up', 'notes ascending'), 'ear-audio-button')}${button('arpeggio-down', actionLabel('down', 'notes descending'), 'ear-audio-button')}${compareReduction ? button('reduction', actionLabel('play', bassKind(q.bassRole) === 'root' ? 'hear close voicing' : 'hear close · root position'), 'ear-audio-button', 'title="Play the complete chord in close spacing, with the root in the bass"') : ''}${button('explore-answer', actionLabel('explore', 'open chord explorer'), 'chord-quiet')}</div><div class="chord-interval-heading"><span>hear the intervals</span><div class="ear-result-basis" role="group" aria-label="interval view">${button('basis-bass', 'from bass', 'text-button', `aria-pressed="${basis === 'bass'}"`)}${button('basis-adjacent', 'between neighbours', 'text-button', `aria-pressed="${basis === 'adjacent'}"`)}</div></div><div class="chord-pairs">${relationships.map((p, i) => `<button type="button" class="ear-audio-button" data-chord-pair="${i}" aria-label="Play ${questionNoteName(p.from)} and ${questionNoteName(p.to)}, ${p.short}">${icon('play')}<span>${questionNoteName(p.from)} – ${questionNoteName(p.to)}</span><strong>${p.short}</strong></button>`).join('')}</div></details>`;
    highlightSounding();
  }

  function renderStats() {
    const host = $('[data-chord-stats]'); if (!host) return;
    const b = bucket();
    const confusion = Object.entries(stats.confusions).filter(([key]) => key.split('|').every(id => chordById(id))).sort((a, b) => b[1] - a[1])[0];
    host.innerHTML = `<div class="stats-row"><div><span>right</span><strong>${b.right}</strong></div><div><span>wrong</span><strong>${b.total - b.right}</strong></div><div><span>percent</span><strong>${b.total ? Math.round(100 * b.right / b.total) : 0}%</strong></div></div><p class="chord-stats-detail">${b.assisted} assisted · ${b.replays} replays<br>${b.parts}/${b.partTotal} answer parts correct</p>${confusion ? `<p class="chord-stats-detail">often confused: ${confusion[0].split('|').map(label).join(' / ')}<br><button type="button" class="text-button" data-chord-focus="${esc(confusion[0])}">practice these</button></p>` : ''}${button('reset-stats', 'reset')}`;
  }

  function explorerMarkup() {
    const c = chordById(explorer.chordId);
    return `<div class="ear-dialog-header"><h2>chord explorer</h2>${button('close-explorer', 'close')}</div><p class="ear-muted">Build a chord, move individual voices, and listen. Quiz answers and scores stay as submitted.</p><div class="ear-settings-grid chord-explorer-settings"><label>root<select data-chord-lab="root">${options(ROOTS, explorer.root)}</select></label><label>chord<select data-chord-lab="chordId">${CHORD_GROUPS.map(group => `<optgroup label="${group}">${options(CHORDS.filter(c => c.group === group).map(c => [c.id, `${c.symbol || 'maj'} · ${c.name}`]), explorer.chordId)}</optgroup>`).join('')}</select></label><label>bass position<select data-chord-lab="bassKind">${options(BASS_OPTIONS, explorer.bassKind)}</select></label><label>spacing<select data-chord-lab="spacing">${options([['close', 'close'], ['open', 'open']], explorer.spacing)}</select></label></div><p class="ear-muted">${c.name}: ${formula(c)} · manual edits may change the chord</p><div class="chord-result-actions chord-explorer-transport">${button('lab-play', actionLabel('play', 'play chord'), 'ear-primary')}${button('lab-up', actionLabel('up', 'notes ascending'), 'chord-quiet')}${button('lab-down', actionLabel('down', 'notes descending'), 'chord-quiet')}<span class="chord-sustain-control">${button('hold', '', 'ear-audio-button', `aria-pressed="${explorer.holding}" aria-label="sustain"`)}<span class="ear-muted">organ</span></span>${button('lab-clear', 'clear notes', 'chord-quiet')}</div><div data-chord-lab-notes></div><div data-chord-lab-piano>${pianoMarkup(true)}</div><p data-chord-explorer-status class="ear-sound-status" role="status"></p>`;
  }
  function renderExplorerNotes() {
    const host = $('[data-chord-lab-notes]'); if (!host) return;
    const names = chordInterpretations(explorer.notes);
    host.innerHTML = `<div class="chord-voice-editor">${explorer.notes.map((n, i) => `<div class="chord-voice"><button type="button" class="ear-audio-button" data-chord-note-play="${n}" aria-label="play ${explorerNoteName(n)}">${icon('play')}${explorerNoteName(n)}</button>${[['semitone', 1], ['octave', 12]].map(([unit, step]) => `<div class="chord-voice-step" role="group" aria-label="${unit} for ${explorerNoteName(n)}"><span>${unit}</span><div><button type="button" data-chord-move="${-step}" data-chord-index="${i}" aria-label="lower ${explorerNoteName(n)} one ${unit}">−</button><button type="button" data-chord-move="${step}" data-chord-index="${i}" aria-label="raise ${explorerNoteName(n)} one ${unit}">+</button></div></div>`).join('')}</div>`).join('')}</div><p class="chord-lab-names">${names.length ? names.map(i => interpretationName(i, explorer.notes[0])).join(' · ') : explorer.notes.length ? 'No complete match in the chord catalog.' : 'Choose notes on the piano.'}</p>`;
    $('[data-chord-explorer]')?.querySelectorAll('[data-chord-pitch]').forEach(el => {
      const name = explorerNoteName(Number(el.dataset.chordPitch));
      el.setAttribute('aria-label', name); el.querySelector('.ear-key-label').textContent = name;
    });
    syncSustain(); controls();
    highlightSounding(explorer.holding ? explorer.notes : soundingNotes);

    syncSelection();
  }
  function openExplorer(useAnswer = view === 'quiz' && !!result) {
    stop(); if (view === 'quiz' && !result) assisted = true;
    explorerSound = { ...(sound || questionSound(settings, null)), quality: sound?.quality || audioQuality() };
    if (useAnswer && question) explorer = { root: question.root, chordId: question.chordId, bassKind: bassKind(question.bassRole), spacing: question.spacing, notes: [...question.notes], holding: false };
    const dialog = $('[data-chord-explorer]');
    dialog.innerHTML = explorerMarkup(); dialog.showModal(); renderExplorerNotes();
    engine.configure(explorerSound);
    dialog.querySelector('.ear-instrument-scroll').scrollLeft = Math.max(0, (explorer.notes[0] - 48) * 18);
  }
  async function setExplorerNotes(notes) {
    const range = instrumentById(explorerSound.instrument).range;
    if (notes.some(n => n < Math.max(36, range[0]) || n > Math.min(84, range[1]))) throw new Error('That note is outside the instrument range.');
    notes = [...new Set(notes)].sort((a, b) => a - b);
    if (notes.length > 8) throw new Error('Use up to eight sounding notes.');
    if (busy && !explorer.holding) stop();
    explorer.notes = notes; renderExplorerNotes();
    if (explorer.holding) {
      if (!notes.length) stop();
      else await engine.drone(notes, { level: .7, motion: .3 });
    }
  }
  async function rebuildExplorer(patch) {
    const next = { ...explorer, ...patch };
    let q;
    try {
      q = generateChordQuestion({ ...settings, ...explorerSound, chordIds: [next.chordId], low: 48, high: 84, rootPitch: Number(next.root), bassKinds: [next.bassKind], spacing: next.spacing, omission: 'none', doubling: false }, {}, () => .5);
    } catch (error) {
      if (!patch.chordId) throw error;
      next.bassKind = 'root';
      q = generateChordQuestion({ ...settings, ...explorerSound, chordIds: [next.chordId], low: 48, high: 84, rootPitch: Number(next.root), bassKinds: ['root'], spacing: next.spacing, omission: 'none', doubling: false }, {}, () => .5);
    }
    explorer = { ...next, notes: q.notes };
    $('[data-chord-explorer]').innerHTML = explorerMarkup(); renderExplorerNotes();
    if (explorer.holding) await engine.drone(explorer.notes, { level: .7, motion: .3 });
  }
  async function addPitch(midi) {
    if (inExplorer()) {
      await setExplorerNotes(explorer.notes.includes(midi) ? explorer.notes.filter(n => n !== midi) : [...explorer.notes, midi]); return;
    }
    if (!question || view !== 'quiz') return;
    if (result) { await play([midi]); return; }
    const matches = n => settings.task === 'tones' ? pc(n) === pc(midi) : n === midi;
    answer.notes = answer.notes.some(matches) ? answer.notes.filter(n => !matches(n)) : [...answer.notes, midi].sort((a, b) => a - b);
    syncSelection(); controls();
    if (settings.audition) await play([midi], { audition: true });
  }
  function shiftPiano(delta) {
    const range = instrumentById((inExplorer() ? explorerSound : sound)?.instrument || settings.instrument).range;
    pianoBase = Math.min(Math.floor((Math.min(84, range[1]) - 12) / 12) * 12, Math.max(Math.ceil(Math.max(36, range[0]) / 12) * 12, pianoBase + delta * 12));
    if (inExplorer()) { $('[data-chord-lab-piano]').innerHTML = pianoMarkup(true); syncSelection(); }
    else renderAnswer();
    const pane = (inExplorer() ? $('[data-chord-explorer]') : $('[data-chord-answer]')).querySelector('.ear-instrument-scroll');
    if (pane) pane.scrollLeft = Math.max(0, (pianoBase - 40) * 18);
  }

  root.addEventListener('click', event => {
    const el = event.target.closest('button'); if (!el || el.disabled || !active) return;
    const playFromButton = (notes, options = {}) => play(notes, { ...options, trigger: el });
    safely(async () => {
      if (el.dataset.chordCard) { expanded = expanded === el.dataset.chordCard ? null : el.dataset.chordCard; render(); return; }
      if (el.dataset.chordCardQuality) {
        const d = drafts[el.dataset.cardId], id = el.dataset.chordCardQuality;
        d.chordIds = d.chordIds.includes(id) ? d.chordIds.filter(c => c !== id) : [...d.chordIds, id]; render(); return;
      }
      if (el.dataset.chordStart) { const id = el.dataset.chordStart; start(chordChallengeSettings(id, custom, drafts[id]), CHORD_CHALLENGES.find(c => c.id === id).name); return; }
      if (el.dataset.chordCustomize) { const id = el.dataset.chordCustomize; openSetup(chordChallengeSettings(id, custom, drafts[id])); return; }
      if (el.dataset.chordGroup) {
        const ids = CHORDS.filter(c => c.group === el.dataset.chordGroup).map(c => c.id), all = ids.every(id => settings.chordIds.includes(id));
        updateSettings({ chordIds: all ? settings.chordIds.filter(id => !ids.includes(id)) : [...new Set([...settings.chordIds, ...ids])] }); renderSetupPreservingSave(); return;
      }
      if (el.dataset.chordSavedStart || el.dataset.chordSavedEdit) {
        const e = readExercises().find(e => e.id === (el.dataset.chordSavedStart || el.dataset.chordSavedEdit));
        if (e) { if (el.dataset.chordSavedStart) start(e.settings, e.name, e.id); else openSetup(e.settings, e.id); } return;
      }
      if (el.dataset.chordRemove) {
        const records = readExercises(), e = records.find(e => e.id === el.dataset.chordRemove);
        if (e && write(EXERCISES, records.filter(r => r.id !== e.id))) { removed = e; if (editingId === e.id) editingId = null; render(); }
        else throw new Error('Could not remove that exercise.'); return;
      }
      if (el.dataset.chordAnswerId && !result) {
        answer.chordId = el.dataset.chordAnswerId; syncSelection(); controls();
        if (settings.audition) await playFromButton(chordComparison(question, answer, settings), { audition: true }); return;
      }
      if (el.dataset.chordAnswerBass && !result) { answer.bassKind = el.dataset.chordAnswerBass; syncSelection(); controls(); return; }
      if (el.dataset.chordPitch) { await addPitch(Number(el.dataset.chordPitch)); return; }
      if (el.dataset.chordNotePlay) { await playFromButton([Number(el.dataset.chordNotePlay)], { voiceIndices: el.dataset.chordVoice === undefined ? null : [Number(el.dataset.chordVoice)] }); return; }
      if (el.dataset.chordPair !== undefined) {
        const p = voicingIntervals(question.notes, basis === 'adjacent' ? 'adjacent' : 'bass')[Number(el.dataset.chordPair)];
        await playFromButton([p.from, p.to], { voiceIndices: [question.notes.indexOf(p.from), question.notes.indexOf(p.to)] }); return;
      }
      if (el.dataset.chordMove) {
        const notes = [...explorer.notes]; notes[Number(el.dataset.chordIndex)] += Number(el.dataset.chordMove); await setExplorerNotes(notes); return;
      }
      if (el.dataset.chordFocus) {
        openSetup({ ...settings, chordIds: [...new Set(el.dataset.chordFocus.split('|'))], rootCue: 'given', omission: 'none', bassKinds: ['root'], spacing: 'close', task: 'name' }); return;
      }
      const action = el.dataset.chordAction;
      if (action === 'home' || action === 'back') { write(ACTIVE, null); stop(); (action === 'home' ? onHome : onBack)(); }
      if (action === 'menu') { previousQuiz = null; show('menu'); }
      if (action === 'custom') openSetup();
      if (action === 'settings') openSetup(settings, editingId, true);
      if (action === 'back-quiz' && previousQuiz) {
        generateChordQuestion(settings);
        const keys = ['chordIds', 'task', 'rootCue', 'rootPitch', 'bassKinds', 'spacing', 'doubling', 'omission', 'low', 'high', 'answerWith'];
        const changed = keys.some(key => JSON.stringify(settings[key]) !== JSON.stringify(previousQuiz.settings[key]));
        title = JSON.stringify(settings) === JSON.stringify(previousQuiz.settings) ? previousQuiz.title : 'custom';
        previousQuiz = null;
        if (changed) start(settings, title, editingId);
        else { sound = { ...questionSound(settings, null), quality: sound.quality }; engine.configure(sound); show('quiz'); }
      }
      if (action === 'save') saveExercise();
      if (action === 'restore' && removed) {
        const records = readExercises();
        if (records.some(e => e.id === removed.id || e.name.toLowerCase() === removed.name.toLowerCase())) throw new Error('An exercise with that name already exists.');
        if (!write(EXERCISES, [...records, removed])) throw new Error('Could not restore the exercise.');
        removed = null; render();
      }
      if (action === 'play') { if (busy) { stop(); status(''); } else await playFromButton(question.notes, { markHeard: true }); }
      if (action === 'hint') await playFromButton(question.notes, { direction: 'ascending', hint: true, markHeard: true });
      if (action === 'reference') await playFromButton([question.rootNote], { voiceIndices: [Math.max(0, question.roles.indexOf('1'))] });
      if (action === 'bass-reference') await playFromButton([question.notes[0]], { voiceIndices: [0] });
      if (action === 'stop') { stop(); status(''); }
      if (action === 'check') check();
      if (action === 'reveal') check(true);
      if (action === 'next' || action === 'next-result') nextQuestion();
      if (action === 'clear' && !result) { answer = { notes: [] }; syncSelection(); controls(); }
      if (action === 'mine' && result) await playFromButton(chordComparison(question, answer, settings));
      if (action === 'arpeggio-up') await playFromButton(question.notes, { direction: 'ascending' });
      if (action === 'arpeggio-down') await playFromButton([...question.notes].reverse(), { direction: 'descending', voiceIndices: question.notes.map((_, i) => i).reverse() });
      if (action === 'reduction') await playFromButton(rootPositionNotes());
      if (action === 'basis-bass' || action === 'basis-adjacent') { basis = action === 'basis-bass' ? 'bass' : 'adjacent'; renderFeedback(); $(`[data-chord-action="${action}"]`)?.focus({ preventScroll: true }); }
      if (action === 'explorer') openExplorer();
      if (action === 'explore-answer') openExplorer(true);
      if (action === 'close-explorer') $('[data-chord-explorer]').close();
      if (action === 'shortcuts') { stop(); $('[data-chord-shortcuts]').showModal(); }
      if (action === 'close-shortcuts') $('[data-chord-shortcuts]').close();
      if (action === 'octave-down' || action === 'octave-up') shiftPiano(action === 'octave-down' ? -1 : 1);
      if (action === 'lab-play') { if (busy) stop(); else await playFromButton(explorer.notes); }
      if (action === 'lab-up') await playFromButton(explorer.notes, { direction: 'ascending' });
      if (action === 'lab-down') await playFromButton([...explorer.notes].reverse(), { direction: 'descending', voiceIndices: explorer.notes.map((_, i) => i).reverse() });
      if (action === 'lab-clear') await setExplorerNotes([]);
      if (action === 'hold') {
        if (explorer.holding) stop();
        else if (explorer.notes.length) {
          stop(); const token = operation;
          const started = await engine.drone(explorer.notes, { level: .7, motion: .3 });
          if (started && token === operation && inExplorer()) { explorer.holding = true; syncSustain(); highlightSounding(explorer.notes, ['data-chord-action', 'hold']); }
        }
      }
      if (action === 'reset-stats') { delete stats.buckets[`${settings.task}:${settings.rootCue}`]; write(STATS, stats); renderStats(); }
    });
  });
  function renderSetupPreservingSave() {
    const state = { name: $('#chord-exercise-name')?.value, saving: $('[data-chord-save-toggle]')?.checked, copy: $('[data-chord-save-copy]')?.checked };
    render();
    if ($('#chord-exercise-name')) $('#chord-exercise-name').value = state.name || '';
    if ($('[data-chord-save-toggle]')) $('[data-chord-save-toggle]').checked = !!state.saving;
    if ($('[data-chord-save-copy]')) $('[data-chord-save-copy]').checked = !!state.copy;
    syncSave();
  }
  function syncSave() {
    const enabled = $('[data-chord-save-toggle]')?.checked;
    if ($('[data-chord-save-options]')) $('[data-chord-save-options]').hidden = !enabled;
    if ($('[data-chord-action="save"]')) $('[data-chord-action="save"]').hidden = !enabled;
    const submit = $('[data-chord-save-form] button[type="submit"]'); if (submit) submit.textContent = enabled ? 'save and start quiz →' : 'start quiz →';
  }
  root.addEventListener('change', event => {
    if (!active) return;
    const el = event.target;
    safely(async () => {
      if (el.dataset.chordCardTask) drafts[el.dataset.chordCardTask].task = el.value;
      if (el.hasAttribute('data-chord-save-toggle')) { syncSave(); if (el.checked) $('#chord-exercise-name').focus(); }
      if (el.hasAttribute('data-chord-save-copy') && el.checked) $('#chord-exercise-name').value = '';
      if (el.dataset.chordSetting) {
        const key = el.dataset.chordSetting;
        updateSettings({ [key]: el.type === 'checkbox' ? el.checked : el.type === 'number' || ['low', 'high'].includes(key) ? Number(el.value) : el.value });
        renderSetupPreservingSave(); $(`[data-chord-setting="${key}"]`)?.focus({ preventScroll: true });
      }
      if (el.dataset.chordEnabled) {
        const id = el.dataset.chordEnabled; updateSettings({ chordIds: el.checked ? [...settings.chordIds, id] : settings.chordIds.filter(c => c !== id) });
      }
      if (el.dataset.chordBass) { const id = el.dataset.chordBass; updateSettings({ bassKinds: el.checked ? [...settings.bassKinds, id] : settings.bassKinds.filter(c => c !== id) }); }
      if (el.dataset.chordPool) { const id = el.dataset.chordPool; updateSettings({ instrumentPool: el.checked ? [...settings.instrumentPool, id] : settings.instrumentPool.filter(c => c !== id) }); renderSetupPreservingSave(); }
      if (el.dataset.chordLab) {
        try { await rebuildExplorer({ [el.dataset.chordLab]: el.dataset.chordLab === 'root' ? Number(el.value) : el.value }); }
        catch (error) { el.value = explorer[el.dataset.chordLab]; throw error; }
      }
    });
  });
  root.addEventListener('submit', event => {
    event.preventDefault(); if (!active) return;
    safely(() => {
      if (event.target.hasAttribute('data-chord-save-form')) {
        if ($('[data-chord-save-toggle]').checked) saveExercise();
        custom = settings; write(SETTINGS, custom);
        start(settings, saved.find(e => e.id === editingId)?.name || 'custom', editingId);
      }
      if (event.target.hasAttribute('data-chord-notes-form') && !result) {
        const words = $('#chord-notes').value.trim().split(/[\s,]+/);
        const notes = words.map(word => parseNote(settings.task === 'tones' && /^[a-g][#b♯♭]?$/i.test(word) ? `${word}4` : word));
        if (!notes.length || notes.some(n => n === null)) throw new Error(`Enter notes such as ${settings.task === 'tones' ? 'C, E, G' : 'C4, E4, G4'}.`);
        answer.notes = [...new Set(notes)].sort((a, b) => a - b); syncSelection(); controls();
        if (heard) check(); else status('Listen before checking your answer.');
      }
    });
  });
  root.addEventListener('scroll', event => {
    const pane = event.target;
    if (!active || !pane.classList) return;
    clearTimeout(scrollTimers.get(pane));
    pane.classList.add('is-scrolling');
    scrollTimers.set(pane, setTimeout(() => {
      pane.classList.remove('is-scrolling');
      scrollTimers.delete(pane);
    }, 800));
  }, { capture: true, passive: true });
  root.addEventListener('wheel', event => {
    const pane = event.target.closest('.ear-instrument-scroll');
    if (!pane || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const max = pane.scrollWidth - pane.clientWidth;
    if (max <= 1 || event.deltaY < 0 && pane.scrollLeft <= 0 || event.deltaY > 0 && pane.scrollLeft >= max - 1) return;
    event.preventDefault(); event.stopPropagation(); pane.scrollLeft += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pane.clientWidth : 1);
  }, { passive: false });
  document.addEventListener('keydown', event => {
    if (!active || event.ctrlKey || event.metaKey || event.repeat || document.querySelector('.global-dialog[open]')) return;
    if (event.key === 'Escape') { stop(); return; }
    if (event.target.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    const exploring = inExplorer();
    if ($('[data-chord-shortcuts]')?.open) return;
    if (event.altKey && event.code === 'KeyC' && !exploring) { event.preventDefault(); openExplorer(); return; }
    if (event.altKey && event.code === 'KeyS' && view === 'quiz' && !exploring) { event.preventDefault(); openSetup(settings, editingId, true); return; }
    if (event.altKey || view !== 'quiz' && !exploring) return;
    if ((event.code === 'Space' || event.key === 'Enter') && event.target.closest?.('button, summary')) return;
    if (event.code === 'Space') { event.preventDefault(); if (busy) { stop(); status(''); } else safely(() => exploring ? play(explorer.notes) : play(question.notes, { markHeard: true })); return; }
    if (!exploring && event.key === 'Enter') { event.preventDefault(); safely(() => result ? nextQuestion() : check()); return; }
    if (exploring || isPitches() && settings.answerWith === 'piano' || result && settings.answerWith === 'note' && isPitches()) {
      if (event.code === 'KeyZ' || event.code === 'KeyX') { event.preventDefault(); shiftPiano(event.code === 'KeyZ' ? -1 : 1); return; }
      const offset = PIANO_KEYS.findIndex(([code]) => code === event.code);
      const scope = exploring ? $('[data-chord-explorer]') : $('[data-chord-answer]');
      if (offset >= 0 && scope?.querySelector(`[data-chord-pitch="${pianoBase + offset}"]`)) { event.preventDefault(); safely(() => addPitch(pianoBase + offset)); }
    }
  });
  return {
    activate(resume = null) {
      active = true;
      if (resume?.kind === 'chords') {
        try { start(resume.settings, typeof resume.title === 'string' ? resume.title : 'custom', saved.some(e => e.id === resume.exerciseId) ? resume.exerciseId : null); }
        catch { view = 'menu'; question = null; show('menu'); }
      } else { render(); rememberQuiz(); }
    },
    deactivate() { active = false; clearScrollIndicators(); stop(); $$('dialog[open]').forEach(d => d.close()); },
    stop,
    status(message, state) { if (state === 'paused') stop(); status(message, state); },
  };
}
