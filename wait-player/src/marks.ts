export type Mark = { id: string; kind: 'checkpoint' | 'range'; name: string; start: number; end: number };
export type Part = 'move' | 'start' | 'end';
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const minSpan = (duration: number) => Math.min(.1, duration);

/** Prefer the enabled loop, then the selected/innermost range at the playhead. */
export function loopBoundary(marks: Mark[], position: number, direction: -1 | 1, loop: string | null, selected: string | null): number | null {
  const ranges = marks.filter(mark => mark.kind === 'range');
  const containing = ranges.filter(mark => position >= mark.start && position <= mark.end);
  const current = containing.find(mark => mark.id === loop)
    ?? containing.find(mark => mark.id === selected)
    ?? containing.sort((a, b) => (a.end - a.start) - (b.end - b.start) || a.start - b.start)[0];
  if (current) return direction < 0 ? current.start : current.end;
  const boundaries = ranges.map(mark => direction < 0 ? mark.end : mark.start)
    .filter(boundary => direction < 0 ? boundary < position : boundary > position);
  return boundaries.length ? (direction < 0 ? Math.max(...boundaries) : Math.min(...boundaries)) : null;
}

export function moveMark(mark: Mark, part: Part, delta: number, duration: number): Mark {
  if (mark.kind === 'checkpoint') {
    const start = clamp(mark.start + delta, 0, duration);
    return { ...mark, start, end: start };
  }
  if (part === 'start') return { ...mark, start: clamp(mark.start + delta, 0, mark.end - minSpan(duration)) };
  if (part === 'end') return { ...mark, end: clamp(mark.end + delta, mark.start + minSpan(duration), duration) };
  const span = mark.end - mark.start;
  const start = clamp(mark.start + delta, 0, duration - span);
  return { ...mark, start, end: start + span };
}
export function parseTime(value: string): number | null {
  if (!/^\d+(?::[0-5]?\d){0,2}(?:\.\d{1,3})?$/.test(value.trim())) return null;
  const result = value.trim().split(':').reduce((total, part) => total * 60 + Number(part), 0);
  return Number.isFinite(result) ? result : null;
}
export function time(seconds: number, precise = false): string {
  const total = Math.round(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 1000);
  const s = Math.floor(total / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s % 60).padStart(2, '0')}${precise ? `.${String(total % 1000).padStart(3, '0')}` : ''}`;
}
