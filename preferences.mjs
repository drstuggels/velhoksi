const VOLUME_KEY = 'velhoksi.volume.v1';
const QUALITY_KEY = 'velhoksi.audio-quality.v1';
export const AUDIO_QUALITIES = [
  { id: 'saver', name: 'data saver', detail: '64 kbps' },
  { id: 'balanced', name: 'balanced', detail: '128 kbps · default' },
  { id: 'high', name: 'high', detail: '192 kbps' },
  { id: 'original', name: 'original', detail: 'lossless' },
];
const validQuality = value => AUDIO_QUALITIES.some(item => item.id === value);
const validVolume = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const stored = read(VOLUME_KEY);
const previous = read('velhoksi.ear.settings.v1')?.volume;
let volume = validVolume(stored) ? stored : validVolume(previous) ? previous : .65;
let quality = validQuality(read(QUALITY_KEY)) ? read(QUALITY_KEY) : 'balanced';
try {
  if (!validVolume(stored)) localStorage.setItem(VOLUME_KEY, JSON.stringify(volume));
} catch { /* Preferences also work for this session when storage is unavailable. */ }

export const masterVolume = () => volume;
export const audioQuality = () => quality;
export function setAudioQuality(value) {
  if (!validQuality(value) || value === quality) return;
  quality = value;
  try { localStorage.setItem(QUALITY_KEY, JSON.stringify(quality)); } catch { /* Session-only preference. */ }
  window.dispatchEvent(new window.Event('velhoksi:audio-quality'));
}
export function setMasterVolume(value) {
  if (!validVolume(value)) return;
  volume = value;
  try { localStorage.setItem(VOLUME_KEY, JSON.stringify(volume)); } catch { /* Session-only preference. */ }
  window.dispatchEvent(new Event('velhoksi:volume'));
}

if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === QUALITY_KEY || event.key === null) {
    quality = validQuality(read(QUALITY_KEY)) ? read(QUALITY_KEY) : 'balanced';
    window.dispatchEvent(new window.Event('velhoksi:audio-quality'));
  }
  if (event.key !== VOLUME_KEY && event.key !== null) return;
  try {
    const value = JSON.parse(event.newValue);
    volume = validVolume(value) ? value : .65;
    window.dispatchEvent(new Event('velhoksi:volume'));
  } catch { /* Ignore malformed preferences. */ }
});
