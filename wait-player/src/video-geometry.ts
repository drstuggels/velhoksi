export type VideoViewState = { zoom: number; x: number; y: number };
export type Size = { width: number; height: number };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export function fitVideo(source: Size, viewport: Size): Size {
  if (!source.width || !source.height || !viewport.width || !viewport.height) return { width: 0, height: 0 };
  const scale = Math.min(viewport.width / source.width, viewport.height / source.height);
  return { width: source.width * scale, height: source.height * scale };
}
export function constrainView(view: VideoViewState, fit: Size, viewport: Size): VideoViewState {
  const zoom = clamp(view.zoom, 1, 5);
  const boundX = fit.width ? Math.max(0, (fit.width * zoom - viewport.width) / (2 * fit.width)) : 0;
  const boundY = fit.height ? Math.max(0, (fit.height * zoom - viewport.height) / (2 * fit.height)) : 0;
  return { zoom, x: clamp(view.x, -boundX, boundX), y: clamp(view.y, -boundY, boundY) };
}
/** Keep the point beneath the cursor stationary while changing magnification. */
export function zoomAt(view: VideoViewState, zoom: number, point: { x: number; y: number }, fit: Size, viewport: Size): VideoViewState {
  const next = clamp(zoom, 1, 5), ratio = next / view.zoom;
  return constrainView({ zoom: next, x: point.x * (1 - ratio) + view.x * ratio, y: point.y * (1 - ratio) + view.y * ratio }, fit, viewport);
}
