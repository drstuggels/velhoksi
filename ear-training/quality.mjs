// Decode a tiny, embedded silent Ogg Opus recording rather than trusting a
// browser/version string. OfflineAudioContext never opens the audio device.
const PROBE = 'T2dnUwACAAAAAAAAAADrx9RlAAAAAHn4b2UBE09wdXNIZWFkAQI4AYC7AAAAAABPZ2dTAAAAAAAAAAAAAOvH1GUBAAAAQZGVjgE9T3B1c1RhZ3MMAAAATGF2ZjYxLjcuMTAwAQAAAB0AAABlbmNvZGVyPUxhdmM2MS4xOS4xMDEgbGlib3B1c09nZ1MABPgEAAAAAAAA68fUZQIAAADpeeoyAgMD/P/+/P/+';
let support;
export function supportsOpus() {
  return support ||= (async () => {
    const Context = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!Context) return false;
    try {
      const context = new Context(2, 1, 48000);
      const buffer = await context.decodeAudioData(Uint8Array.from(atob(PROBE), char => char.charCodeAt(0)).buffer);
      return buffer.length > 0;
    } catch { return false; }
  })();
}

export function recordingFor(manifest, file, quality, opusSupported = true) {
  const original = { ...manifest.files[file], file };
  const variant = opusSupported && manifest.qualities?.[file]?.variants?.[quality];
  return variant && variant.bytes < original.bytes ? variant : original;
}
