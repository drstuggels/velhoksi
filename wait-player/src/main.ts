import { WorkspaceStorage, type Workspace } from './storage';
import type { FrameStepper } from './frame-step';
import styles from './style.css?inline';
import markup from './player.html?raw';
import { SmoothLoop } from './smooth-loop';
import { VideoView } from './video-view';
import type { VideoViewState } from './video-geometry';
import { clamp, time } from './marks';
import { MarkerEditor, type MarkerState } from './markers';

export async function clearSavedWait() {
  if (globalThis.indexedDB) await new WorkspaceStorage().clear();
}

export function createWait(host: HTMLElement, options: { onExit: () => void; volume: () => number; onVolume: (volume: number) => void }) {
const root = host.attachShadow({ mode: 'open' });
root.innerHTML = `<style>${styles}</style>${markup}`;
const scope = root.querySelector<HTMLDivElement>('.wait-body')!;
let enabled = false, playbackRequest = 0;
const $ = <T extends HTMLElement>(id: string) => root.getElementById(id) as T;
const media = $<HTMLVideoElement>('media'), fileInput = $<HTMLInputElement>('file-input');
const seek = $<HTMLInputElement>('seek'), speed = $<HTMLInputElement>('speed'), speedNumber = $<HTMLInputElement>('speed-number'), volume = $<HTMLInputElement>('volume');
const canvas = $<HTMLCanvasElement>('wave-canvas');
type Session = MarkerState & { view: VideoViewState; id: string; file: File; playbackFile: File; url: string; position: number; speed: number; volume: number; muted: boolean; peaks: number[]; decoded: boolean };
const sessions: Session[] = [];
const storage = new WorkspaceStorage();
let restoring = true, storageUnavailable = false, storageFailed = false, saveTimer = 0, saveRevision = 0;
let stepper: FrameStepper | null = null, nudgeQueue = Promise.resolve(), nudgeRevision = 0;
function workspaceSnapshot(): Workspace {
  return { active: active?.id ?? null, tabs: sessions.map(({ url, peaks, decoded, ...tab }) => tab) };
}
function scheduleSave(delay = 250) {
  if (restoring || storageUnavailable || storageFailed || saveTimer) return;
  $('storage-status').textContent = sessions.length ? 'saving locally' : '';
  saveTimer = window.setTimeout(() => { saveTimer = 0; void flushSave(); }, delay);
}
async function flushSave() {
  clearTimeout(saveTimer); saveTimer = 0;
  if (restoring || storageUnavailable) return;
  const revision = ++saveRevision;
  $('storage-status').textContent = sessions.length ? 'saving locally' : '';
  try {
    await storage.save(workspaceSnapshot());
    if (revision !== saveRevision) return;
    storageFailed = false; $('storage-status').textContent = sessions.length ? 'saved locally' : '';
  } catch (error) {
    if (revision !== saveRevision) return;
    storageFailed = true;
    $('storage-status').textContent = error instanceof DOMException && error.name === 'QuotaExceededError'
      ? 'not saved · browser storage full' : 'not saved · browser storage unavailable';
  }
}

let active: Session | null = null, generation = 0, ready = false, frame = 0, dragging = 0;
let peaks: number[] = [], decodeContext: AudioContext | null = null, conversion: AbortController | null = null;
const videoView = new VideoView(root, media, () => void togglePlay(), () => scheduleSave());
const markers = new MarkerEditor($('marker-lanes'), $('marks-list'), syncRange, seekTo, message);
const loopAudio = new SmoothLoop(media, () => ready && !markers.isDragging ? markers.activeRange() : undefined);
function save(key: string, value: string) { try { localStorage.setItem(`wait:${key}`, value); } catch {} }
function read(key: string) { try { return localStorage.getItem(`wait:${key}`); } catch { return null; } }
function message(text = '') { $('message').textContent = text; }
function syncTransport() {
  const playing = !media.paused;
  $('play-label').textContent = playing ? 'pause' : 'play'; $('play-icon').textContent = playing ? 'Ⅱ' : '▶'; $('play').setAttribute('aria-label', playing ? 'pause' : 'play');
}
function setReady(value: boolean) {
  ready = value;
  for (const id of ['play', 'back', 'forward', 'add-checkpoint', 'add-range', 'seek']) $<HTMLButtonElement>(id).disabled = !value;
  for (const id of ['frame-back', 'frame-forward']) $<HTMLButtonElement>(id).disabled = !value || !media.videoWidth;
}
function setSpeed(value: number) {
  const percent = Math.round(clamp(Number.isFinite(value) ? value : 100, 25, 200));
  speed.value = speedNumber.value = String(percent);
  media.preservesPitch = true;
  const legacy = media as HTMLVideoElement & { webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean };
  if ('webkitPreservesPitch' in media) legacy.webkitPreservesPitch = true;
  if ('mozPreservesPitch' in media) legacy.mozPreservesPitch = true;
  media.defaultPlaybackRate = media.playbackRate = percent / 100;
  if (active) active.speed = percent;
  root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === percent)));
  save('speed', String(percent)); scheduleSave();
}
function syncRange() {
  scheduleSave();
  loopAudio.check();
  const range = markers.activeRange(), region = $('loop-region');
  region.hidden = !range || !active?.duration;
  if (range && active?.duration) { region.style.left = `${range.start / active.duration * 100}%`; region.style.width = `${(range.end - range.start) / active.duration * 100}%`; }
}
function updatePosition() {
  if (!ready || !active) return;
  loopAudio.check();
  active.position = media.currentTime; scheduleSave(1000); seek.value = String(media.currentTime);
  seek.setAttribute('aria-valuetext', `${time(media.currentTime)} of ${time(media.duration)}`);
  $('current').textContent = time(media.currentTime, media.paused && !!media.videoWidth); $('playhead').style.left = `${clamp(media.currentTime / media.duration * 100, 0, 100)}%`;
}
function tick() { updatePosition(); if (!media.paused) frame = requestAnimationFrame(tick); }
function seekTo(seconds: number, nudging = false) {
  if (!nudging) ++nudgeRevision;
  if (!ready || !active) return;
  const range = markers.activeRange();
  // Seeking outside a loop is an intentional way to leave it.
  if (range && (seconds < range.start || seconds > range.end)) { active.loop = null; markers.render(); syncRange(); }
  loopAudio.cancel(); media.currentTime = clamp(seconds, 0, media.duration); updatePosition(); void flushSave();
}
async function togglePlay() {
  ++nudgeRevision;
  if (!ready || !enabled) return;
  if (!media.paused) { media.pause(); return; }
  const range = markers.activeRange();
  if (media.ended) media.currentTime = range?.start ?? 0;
  if (range && (media.currentTime < range.start || media.currentTime >= range.end)) media.currentTime = range.start;
  const token = generation, request = ++playbackRequest;
  try { await loopAudio.prepare(); if (token !== generation || request !== playbackRequest || !ready || !enabled) return; await media.play(); message(); } catch { message('could not play this file; try another format'); }
}
function nudgeFrame(direction: -1 | 1) {
  if (!ready || !active || !media.videoWidth || !enabled) return;
  ++playbackRequest; media.pause(); loopAudio.cancel();
  const token = generation, revision = nudgeRevision, session = active;
  nudgeQueue = nudgeQueue.then(async () => {
    if (token !== generation || revision !== nudgeRevision || !enabled) return;
    if (!stepper) {
      const { FrameStepper } = await import('./frame-step');
      if (token !== generation || revision !== nudgeRevision || !enabled) return;
      stepper = new FrameStepper(session.playbackFile);
    }
    const target = await stepper.step(media.currentTime, direction);
    if (token !== generation || revision !== nudgeRevision || !enabled) return;
    seekTo(target, true); $('current').textContent = time(media.currentTime, true);
  }).catch(() => {
    if (token === generation && revision === nudgeRevision) message('frame stepping is unavailable for this file');
  });
}
function setSidebar(open: boolean) {
  $('app-layout').classList.toggle('sidebar-collapsed', !open);
  $('sidebar-toggle').setAttribute('aria-expanded', String(open));
  $('sidebar-backdrop').hidden = !open;
  save('sidebar', String(open));
}
function renderTabs() {
  const list = $('file-tabs'); list.replaceChildren();
  $('file-count').textContent = String(sessions.length); $('no-files').hidden = !!sessions.length;
  for (const [index, session] of sessions.entries()) {
    const row = document.createElement('div'); row.className = `file-tab${active === session ? ' active' : ''}`;
    const button = document.createElement('button'); button.type = 'button'; button.role = 'tab'; button.id = `tab-${session.id}`;
    button.setAttribute('aria-selected', String(active === session)); button.setAttribute('aria-controls', 'workspace'); button.setAttribute('aria-label', session.file.name); button.title = session.file.name;
    button.tabIndex = active === session ? 0 : -1;
    const number = document.createElement('span'); number.className = 'tab-number'; number.textContent = String(index + 1);
    const name = document.createElement('span'); name.className = 'tab-name'; name.textContent = session.file.name; button.append(number, name);
    button.addEventListener('click', () => { activate(session); if (innerWidth <= 760) setSidebar(false); });
    button.addEventListener('keydown', e => {
      const offset = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (offset || e.key === 'Home' || e.key === 'End') {
        e.preventDefault(); const target = sessions[e.key === 'Home' ? 0 : e.key === 'End' ? sessions.length - 1 : (index + offset + sessions.length) % sessions.length];
        activate(target); $(`tab-${target.id}`).focus();
      } else if (e.key === 'Delete') { e.preventDefault(); closeSession(session); if (active) $(`tab-${active.id}`).focus(); else $('add-files').focus(); }
    });
    const close = document.createElement('button'); close.textContent = '×'; close.className = 'close-tab'; close.setAttribute('aria-label', `close ${session.file.name}`); close.addEventListener('click', () => closeSession(session));
    row.append(button, close); list.append(row);
  }
  if (active) $('workspace').setAttribute('aria-labelledby', `tab-${active.id}`); else $('workspace').removeAttribute('aria-labelledby');
}
function closeSession(session: Session) {
  const index = sessions.indexOf(session); sessions.splice(index, 1);
  if (active === session) activate(sessions[Math.min(index, sessions.length - 1)] ?? null);
  URL.revokeObjectURL(session.url); renderTabs(); void flushSave();
}
function addFiles(files: File[]) {
  const added: Session[] = [];
  let rejected = 0;
  for (const file of files) {
    if (!file.size || (!/^(audio|video)\//.test(file.type) && !/\.(mp3|mp4|m4a|m4v|wav|wave|ogg|ogv|oga|opus|webm|flac|aac|mov|mkv|avi|aif|aiff|wma|wmv|mpeg|mpg|3gp|ts)$/i.test(file.name))) { rejected++; continue; }
    const session: Session = { view: { zoom: 1, x: 0, y: 0 }, id: crypto.randomUUID(), file, playbackFile: file, url: URL.createObjectURL(file), position: 0, speed: Number(speed.value), volume: media.volume, muted: media.muted, duration: 0, marks: [], selected: null, loop: null, peaks: [], decoded: false };
    sessions.push(session); added.push(session);
  }
  if (added.length) { activate(added[0]); if (innerWidth > 760) setSidebar(true); void flushSave(); }
  if (rejected) message(`${rejected} empty or unsupported ${rejected === 1 ? 'file' : 'files'} skipped`);
}
function activate(session: Session | null) {
  if (active === session) return;
  ++nudgeRevision; stepper?.dispose(); stepper = null; nudgeQueue = Promise.resolve();
  if (active && ready) { active.position = media.currentTime; active.volume = media.volume; active.muted = media.muted; }
  loopAudio.reset(); setReady(false); videoView.bind(null); ++generation;
  conversion?.abort(); conversion = null; $('cancel-conversion').hidden = true;
  media.onloadedmetadata = null; media.onerror = null; media.pause(); cancelAnimationFrame(frame);
  if (decodeContext && decodeContext.state !== 'closed') void decodeContext.close().catch(() => {});
  decodeContext = null;
  active = session; const token = generation;
  media.removeAttribute('src'); media.load(); syncTransport();
  peaks = session?.peaks ?? []; drawWave(); markers.bind(null); syncRange();
  media.hidden = true; $('audio-face').hidden = true; $('fullscreen').hidden = true; $('drop-target').hidden = !!session;
  $('filename').textContent = session?.file.name ?? 'no file loaded'; $('filetype').textContent = session?.file.name.split('.').pop()?.toLowerCase() ?? 'audio / video';
  $('current').textContent = $('duration').textContent = '0:00'; seek.value = '0'; $('playhead').style.left = '0%'; $('wave-status').textContent = '';
  message(session ? 'opening file' : ''); renderTabs(); scheduleSave();
  if (!session) return;
  $('audio-name').textContent = session.file.name.replace(/\.[^.]+$/, '');
  setSpeed(session.speed); media.volume = options.volume(); media.muted = session.muted; volume.value = String(session.muted ? 0 : session.volume);
  let attemptedConversion = session.playbackFile !== session.file;
  media.onloadedmetadata = () => {
    if (token !== generation) return;
    if (!Number.isFinite(media.duration) || media.duration <= 0) { message('this file has no seekable duration'); return; }
    session.duration = media.duration; setReady(true); syncTransport();
    media.hidden = !media.videoWidth; $('audio-face').hidden = !!media.videoWidth; $('fullscreen').hidden = !media.videoWidth; videoView.bind(media.videoWidth ? session.view : null);
    $('duration').textContent = time(media.duration); seek.max = String(media.duration); media.currentTime = clamp(session.position, 0, media.duration);
    setSpeed(session.speed); markers.bind(session); syncRange(); updatePosition(); message();
    if (!session.decoded) void decodeWave(session.playbackFile, token);
  };
  media.onerror = async () => {
    if (token !== generation) return;
    setReady(false); videoView.bind(null); media.hidden = true; $('audio-face').hidden = true; $('fullscreen').hidden = true;
    if (attemptedConversion) { $('drop-target').hidden = false; message('this browser cannot play the converted file'); return; }
    attemptedConversion = true;
    const controller = new AbortController(); conversion = controller; $('cancel-conversion').hidden = false;
    try {
      message('loading converter'); const { convertMedia } = await import('./convert'); controller.signal.throwIfAborted();
      const blob = await convertMedia(session.file, text => { if (token === generation) message(text); }, controller.signal);
      if (token !== generation || controller.signal.aborted) return;
      URL.revokeObjectURL(session.url); session.url = URL.createObjectURL(blob); session.playbackFile = new File([blob], session.file.name + '.mp4', { type: blob.type });
      media.src = session.url; media.load(); message('opening converted file'); void flushSave();
    } catch (error) {
      if (token !== generation || controller.signal.aborted) return;
      $('drop-target').hidden = false; message(error instanceof Error ? error.message : 'could not convert this file; try MP4 or MP3');
    } finally { if (token === generation) { conversion = null; $('cancel-conversion').hidden = true; } }
  };
  media.src = session.url; media.load();
}
function drawWave() {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * scale; canvas.height = rect.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx || !peaks.length) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = getComputedStyle(host).getPropertyValue('--muted');
  const count = Math.floor(rect.width / 4);
  for (let i = 0; i < count; i++) {
    const peak = peaks[Math.floor(i / count * peaks.length)] || 0;
    const height = Math.max(2, peak * (rect.height - 8));
    ctx.fillRect(i * 4, (rect.height - height) / 2, 2, height);
  }
}
async function decodeWave(file: File, token: number) {
  // Playback never depends on decoding a whole file into memory.
  // Bound visualization memory for long recordings / large video files.
  if (file.size > 64 * 1024 * 1024 || media.duration > 15 * 60) return;
  $('wave-status').textContent = 'reading waveform';
  let context: AudioContext | null = null;
  try {
    context = new AudioContext(); decodeContext = context;
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    if (token !== generation) return;
    const channel = buffer.getChannelData(0);
    const bins = 1000;
    peaks = Array.from({ length: bins }, (_, i) => {
      const start = Math.floor(i * channel.length / bins);
      const end = Math.floor((i + 1) * channel.length / bins);
      const step = Math.max(1, Math.floor((end - start) / 120));
      let peak = 0;
      for (let j = start; j < end; j += step) peak = Math.max(peak, Math.abs(channel[j]));
      return peak;
    });
    const max = Math.max(...peaks, .01);
    peaks = peaks.map(value => value / max);
    if (active) { active.peaks = peaks; active.decoded = true; }
    drawWave();
  } catch { /* A seekable timeline remains when waveform decoding is unavailable. */ }
  finally {
    if (context && context.state !== 'closed') await context.close().catch(() => {});
    if (decodeContext === context) decodeContext = null;
    if (token === generation) $('wave-status').textContent = '';
  }
}
$('cancel-conversion').addEventListener('click', () => {
  ++generation; conversion?.abort(); conversion = null; media.onerror = null; media.onloadedmetadata = null;
  media.removeAttribute('src'); media.load(); $('cancel-conversion').hidden = true; $('drop-target').hidden = false; message('conversion cancelled');
});
fileInput.addEventListener('change', () => { addFiles(Array.from(fileInput.files ?? [])); fileInput.value = ''; });
for (const id of ['open-top', 'drop-target', 'add-files']) $(id).addEventListener('click', () => fileInput.click());
$('sidebar-toggle').addEventListener('click', () => setSidebar($('sidebar-toggle').getAttribute('aria-expanded') !== 'true'));
$('sidebar-backdrop').addEventListener('click', () => setSidebar(false));
$('play').addEventListener('click', () => void togglePlay());
media.addEventListener('play', () => { syncTransport(); cancelAnimationFrame(frame); tick(); });
media.addEventListener('pause', () => { syncTransport(); cancelAnimationFrame(frame); updatePosition(); scheduleSave(); });
media.addEventListener('timeupdate', updatePosition);

$('frame-back').addEventListener('click', () => nudgeFrame(-1)); $('frame-forward').addEventListener('click', () => nudgeFrame(1));
$('back').addEventListener('click', () => seekTo(media.currentTime - 5)); $('forward').addEventListener('click', () => seekTo(media.currentTime + 5));
seek.addEventListener('input', () => seekTo(Number(seek.value)));
speed.addEventListener('input', () => setSpeed(Number(speed.value))); speedNumber.addEventListener('change', () => setSpeed(Number(speedNumber.value)));
$('slower').addEventListener('click', () => setSpeed(Number(speed.value) - 5)); $('faster').addEventListener('click', () => setSpeed(Number(speed.value) + 5));
root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
volume.addEventListener('input', () => { media.volume = Number(volume.value); media.muted = false; options.onVolume(media.volume); });
$('mute').addEventListener('click', () => { media.muted = !media.muted; });
media.addEventListener('volumechange', () => {
  $('mute').textContent = media.muted || !media.volume ? 'muted' : 'volume'; $('mute').setAttribute('aria-label', media.muted ? 'unmute' : 'mute'); volume.value = String(media.muted ? 0 : media.volume);
  if (active) { active.volume = media.volume; active.muted = media.muted; scheduleSave(); }
});
$('add-checkpoint').addEventListener('click', () => markers.add('checkpoint', media.currentTime));
$('add-range').addEventListener('click', () => markers.add('range', media.currentTime));
for (const [open, dialogId, close] of [['shortcuts', 'keys-dialog', 'close-keys'], ['policy', 'policy-dialog', 'close-policy']]) {
  const dialog = $<HTMLDialogElement>(dialogId);
  $(open).addEventListener('click', () => dialog.showModal()); $(close).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
}
$('fullscreen').addEventListener('click', async () => { try { if (root.fullscreenElement) await document.exitFullscreen(); else await $('stage').requestFullscreen(); } catch { message('fullscreen is unavailable in this browser'); } });
scope.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || root.querySelector('dialog[open]') || document.querySelector('dialog[open]') || (event.target as HTMLElement).matches('input, textarea, select, [contenteditable=true]')) return;
  if (event.code === 'Space' && (event.target as HTMLElement).closest('button,a')) return;
  const actions: Record<string, () => void> = { ',': () => nudgeFrame(-1), '.': () => nudgeFrame(1), ' ': () => void togglePlay(), ArrowLeft: () => seekTo(media.currentTime - 5), ArrowRight: () => seekTo(media.currentTime + 5), '[': () => setSpeed(Number(speed.value) - 5), ']': () => setSpeed(Number(speed.value) + 5), c: () => { if (ready) markers.add('checkpoint', media.currentTime); }, r: () => { if (ready) markers.add('range', media.currentTime); }, l: () => markers.toggleSelected(), o: () => fileInput.click(), m: () => { media.muted = !media.muted; } };
  const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key]; if (action) { event.preventDefault(); action(); }
});
const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files');
document.addEventListener('dragenter', event => { if (!enabled) return; if (hasFiles(event)) { event.preventDefault(); dragging++; $('drag-overlay').hidden = false; } });
document.addEventListener('dragover', event => { if (!enabled) return; if (hasFiles(event)) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; } });
document.addEventListener('dragleave', event => { if (!enabled) return; if (hasFiles(event) && --dragging <= 0) { dragging = 0; $('drag-overlay').hidden = true; } });
document.addEventListener('drop', event => { if (!enabled) return; event.preventDefault(); dragging = 0; $('drag-overlay').hidden = true; addFiles(Array.from(event.dataTransfer?.files ?? [])); });
window.addEventListener('blur', () => { dragging = 0; $('drag-overlay').hidden = true; });
new ResizeObserver(drawWave).observe(canvas);
window.addEventListener('pagehide', () => { conversion?.abort(); media.pause(); void flushSave(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { ++playbackRequest; media.pause(); void flushSave(); } });
$('exit-mode').addEventListener('click', options.onExit);
window.addEventListener('velhoksi:volume', () => { media.volume = options.volume(); });
new MutationObserver(drawWave).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
setSpeed(Number(read('speed') || 100));
media.volume = options.volume(); volume.value = String(media.volume);
setSidebar(innerWidth > 760 && read('sidebar') !== 'false'); renderTabs();
$('storage-status').textContent = 'restoring files';
const restored = storage.load().then(saved => {
  // Files dropped during restoration remain active; restored files are prepended.
  const tabs: Session[] = saved.tabs.map(tab => ({ ...tab, url: URL.createObjectURL(tab.playbackFile), peaks: [], decoded: false }));
  sessions.unshift(...tabs);
  if (!active) activate(tabs.find(tab => tab.id === saved.active) ?? tabs[0] ?? null);
  else renderTabs();
}).catch(() => {
  storageUnavailable = true; $('storage-status').textContent = 'not saved · browser storage unavailable';
}).finally(() => { restoring = false; if (!storageUnavailable) void flushSave(); });

// Optional agent access uses the same actions and live per-file state as the UI.
type PlayerTool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean }; execute: (input: unknown) => unknown };
const context = (document as Document & { modelContext?: { registerTool: (tool: PlayerTool, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
const lifecycle = new AbortController();
function playerState() {
  return { storage: $('storage-status').textContent, ready, paused: media.paused, speedPercent: Number(speed.value), pitchPreserved: media.preservesPitch, loopAudio: loopAudio.status, currentTime: media.currentTime, duration: active?.duration ?? 0, activeTab: active?.id ?? null, tabs: sessions.map(s => ({ id: s.id, name: s.file.name, position: s.position, speed: s.speed, marks: s.marks, loop: s.loop, view: s.view })) };
}
if (context?.registerTool) {
  const tools: PlayerTool[] = [
    { name: 'get_player_state', description: 'Read open files, playback state, checkpoints and loop ranges.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: playerState },
    { name: 'set_playback_speed', description: 'Set active file playback speed from 25 to 200 percent with pitch preserved.', inputSchema: { type: 'object', properties: { percent: { type: 'integer', minimum: 25, maximum: 200 } }, required: ['percent'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: input => {
      const percent = (input as { percent?: unknown } | null)?.percent;
      if (typeof percent !== 'number' || !Number.isInteger(percent) || percent < 25 || percent > 200) throw new Error('percent must be an integer from 25 to 200');
      setSpeed(percent); return playerState();
    } },
  ];
  for (const tool of tools) { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} }
}

return {
  activate() { enabled = true; media.volume = options.volume(); drawWave(); window.dispatchEvent(new Event('resize')); },
  deactivate() {
    enabled = false; ++playbackRequest; ++nudgeRevision; media.pause(); loopAudio.reset(); void flushSave();
    dragging = 0; $('drag-overlay').hidden = true;
    root.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(dialog => dialog.close());
    if (root.fullscreenElement) void document.exitFullscreen().catch(() => {});
  },
  async resetSaved() {
    await restored; enabled = false; ++playbackRequest;
    activate(null);
    for (const session of sessions) URL.revokeObjectURL(session.url);
    sessions.length = 0; renderTabs(); clearTimeout(saveTimer); saveTimer = 0;
    if (globalThis.indexedDB) await storage.clear();
  },
  state: playerState,
  restored,
  saved: flushSave,
};
}
