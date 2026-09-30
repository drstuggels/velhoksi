// Physical keys keep the chromatic layout consistent across keyboard languages.
export const PIANO_KEYS = [
  ['KeyA', 'a'], ['KeyW', 'w'], ['KeyS', 's'], ['KeyE', 'e'], ['KeyD', 'd'],
  ['KeyF', 'f'], ['KeyT', 't'], ['KeyG', 'g'], ['KeyY', 'y'], ['KeyH', 'h'],
  ['KeyU', 'u'], ['KeyJ', 'j'], ['KeyK', 'k'], ['KeyO', 'o'], ['KeyL', 'l'],
  ['KeyP', 'p'],
];
// Q/R are unused by the piano and do not depend on punctuation or Shift layers.
export const INTERVAL_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'r'];
export const INTERVAL_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'KeyQ', 'KeyR'];
export const intervalShortcut = semitones => `${semitones > 12 ? '⇧' : ''}${INTERVAL_KEYS[(semitones - 1) % 12]}`;
