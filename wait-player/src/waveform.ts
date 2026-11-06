export type WaveView = { zoom: number; start: number };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const maxWaveZoom = 32;

export function constrainWave(view?: WaveView): WaveView {
  const zoom = clamp(Number.isFinite(view?.zoom) ? view!.zoom : 1, 1, maxWaveZoom);
  return { zoom, start: clamp(Number.isFinite(view?.start) ? view!.start : 0, 0, 1 - 1 / zoom) };
}
export function waveWindow(duration: number, view: WaveView) {
  const { zoom, start } = constrainWave(view);
  return { start: start * duration, end: (start + 1 / zoom) * duration };
}
/** Keep the time under the pointer (or playhead) fixed while zooming. */
export function zoomWave(view: WaveView, zoom: number, anchor = .5): WaveView {
  const current = constrainWave(view), next = constrainWave({ zoom, start: 0 });
  const point = clamp(anchor, 0, 1);
  return constrainWave({ zoom: next.zoom, start: current.start + point / current.zoom - point / next.zoom });
}
/** Aggregate every visible peak rather than skipping transients when zoomed out. */
export function visiblePeaks(peaks: number[], view: WaveView, count: number): number[] {
  const { zoom, start } = constrainWave(view);
  return Array.from({ length: count }, (_, i) => {
    const from = Math.floor((start + i / count / zoom) * peaks.length);
    const to = Math.min(peaks.length, Math.ceil((start + (i + 1) / count / zoom) * peaks.length));
    let peak = 0;
    for (let j = from; j < to; j++) peak = Math.max(peak, peaks[j]);
    return peak;
  });
}
