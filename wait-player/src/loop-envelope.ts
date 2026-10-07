export function holdGain(param: AudioParam, now: number) {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
  else { const value = param.value; param.cancelScheduledValues(now); param.setValueAtTime(value, now); }
}
export function fadeLoopOut(param: AudioParam, now: number, end: number, fade: number) {
  holdGain(param, now);
  if (end - fade > now) param.setValueAtTime(param.value, end - fade);
  param.linearRampToValueAtTime(0, end);
}
export function fadeLoopIn(param: AudioParam, now: number, fade: number, sampleRate: number) {
  param.cancelScheduledValues(now); param.setValueAtTime(0, now);
  const start = now + 128 / sampleRate;
  param.setValueAtTime(0, start); param.linearRampToValueAtTime(1, start + fade);
  return start + fade;
}
