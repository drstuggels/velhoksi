const VOLUME_KEY = 'velhoksi.volume.v1';
const validVolume = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const stored = read(VOLUME_KEY);
const previous = read('velhoksi.ear.settings.v1')?.volume;
let volume = validVolume(stored) ? stored : validVolume(previous) ? previous : .65;
try {
  if (!validVolume(stored)) localStorage.setItem(VOLUME_KEY, JSON.stringify(volume));
} catch { /* Preferences also work for this session when storage is unavailable. */ }

export const masterVolume = () => volume;
export function setMasterVolume(value) {
  if (!validVolume(value)) return;
  volume = value;
  try { localStorage.setItem(VOLUME_KEY, JSON.stringify(volume)); } catch { /* Session-only preference. */ }
  window.dispatchEvent(new Event('velhoksi:volume'));
}

if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key !== VOLUME_KEY && event.key !== null) return;
  try {
    const value = JSON.parse(event.newValue);
    volume = validVolume(value) ? value : .65;
    window.dispatchEvent(new Event('velhoksi:volume'));
  } catch { /* Ignore malformed preferences. */ }
});
