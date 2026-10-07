import { clamp, minSpan, moveMark, parseTime, time, type Mark, type Part } from './marks';
export type MarkerState = { marks: Mark[]; selected: string | null; loop: string | null; duration: number };

export class MarkerEditor {
  private state: MarkerState | null = null;
  private dragging = false;
  private cancelDrag: (() => void) | null = null;
  constructor(private lanes: HTMLElement, private list: HTMLElement, private changed: () => void, private seek: (seconds: number) => void, private report: (text: string) => void) {}
  get isDragging() { return this.dragging; }
  bind(state: MarkerState | null) { this.cancelDrag?.(); this.state = state; this.render(); }
  add(kind: Mark['kind'], position: number) {
    const s = this.state;
    if (!s?.duration) return;
    const start = clamp(position, 0, kind === 'range' ? s.duration - minSpan(s.duration) : s.duration);
    const mark: Mark = { id: crypto.randomUUID(), kind, name: `${kind} ${s.marks.filter(m => m.kind === kind).length + 1}`, start, end: kind === 'range' ? Math.min(s.duration, start + Math.max(minSpan(s.duration), Math.min(5, s.duration / 4))) : start };
    s.marks.push(mark); s.selected = mark.id;
    this.render(); this.changed();
  }
  activeRange() { return this.state?.marks.find(m => m.id === this.state?.loop && m.kind === 'range'); }
  toggleSelected() {
    const s = this.state, m = s?.marks.find(m => m.id === s.selected && m.kind === 'range');
    if (s && m) this.toggleLoop(m);
  }
  private toggleLoop(mark: Mark) {
    const s = this.state!; s.selected = mark.id;
    s.loop = s.loop === mark.id ? null : mark.id;
    if (s.loop) this.seek(mark.start);
    this.render(); this.changed();
  }
  private remove(mark: Mark) {
    const s = this.state!;
    s.marks = s.marks.filter(m => m.id !== mark.id);
    if (s.loop === mark.id) s.loop = null;
    if (s.selected === mark.id) s.selected = null;
    this.render(); this.changed();
    (this.lanes.getRootNode() as ShadowRoot).getElementById('add-checkpoint')?.focus();
  }
  private button(text: string, label: string, action: () => void) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.setAttribute('aria-label', label); b.addEventListener('click', action); return b;
  }
  private placement(track: HTMLElement, mark: Mark, duration: number) {
    track.style.left = `${mark.start / duration * 100}%`;
    track.style.width = mark.kind === 'checkpoint' ? '0px' : `${(mark.end - mark.start) / duration * 100}%`;
  }
  private refreshMark(mark: Mark) {
    if (!this.state) return;
    const track = this.lanes.querySelector<HTMLElement>(`[data-id="${mark.id}"] .marker-track`);
    if (track) {
      this.placement(track, mark, this.state.duration);
      const body = track.querySelector<HTMLButtonElement>('.marker-body')!;
      body.textContent = mark.kind === 'checkpoint' ? '◆' : mark.name;
      body.setAttribute('aria-label', `move ${mark.name}`);
      body.title = `${mark.name} · ${time(mark.start, true)}${mark.kind === 'range' ? `–${time(mark.end, true)}` : ''}`;
      for (const part of ['start', 'end'] as const) {
        const handle = track.querySelector<HTMLElement>(`[data-part="${part}"]`);
        handle?.setAttribute('aria-label', `${mark.name} ${part}`);
        handle?.setAttribute('aria-valuenow', String(mark[part]));
        handle?.setAttribute('aria-valuetext', time(mark[part], true));
      }
    }
    const row = this.list.querySelector<HTMLElement>(`[data-id="${mark.id}"]`);
    row?.querySelector('.mark-jump')?.setAttribute('aria-label', `go to ${mark.name}`);
    row?.querySelector('.mark-remove')?.setAttribute('aria-label', `remove ${mark.name}`);
    row?.querySelector('.mark-name')?.setAttribute('aria-label', `${mark.name} name`);
    row?.querySelector('.mark-loop')?.setAttribute('aria-label', `loop ${mark.name}`);
    for (const field of row?.querySelectorAll<HTMLInputElement>('[data-time]') || []) field.setAttribute('aria-label', `${mark.name} ${field.dataset.time} time`);
  }
  private attachDrag(button: HTMLButtonElement, mark: Mark, part: Part, lane: HTMLElement, track: HTMLElement) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !this.state) return;
      event.preventDefault();
      const s = this.state, original = { ...mark }, startX = event.clientX;
      const width = lane.getBoundingClientRect().width;
      let moved = false;
      this.dragging = true; s.selected = mark.id;
      button.focus(); button.setPointerCapture(event.pointerId);
      const move = (e: PointerEvent) => {
        moved ||= Math.abs(e.clientX - startX) > 2;
        Object.assign(mark, moveMark(original, part, (e.clientX - startX) / width * s.duration, s.duration));
        this.placement(track, mark, s.duration);
        button.setAttribute('aria-valuetext', time(part === 'end' ? mark.end : mark.start, true));
        const row = this.list.querySelector<HTMLElement>(`[data-id="${mark.id}"]`);
        for (const field of row?.querySelectorAll<HTMLInputElement>('[data-time]') || []) field.value = time(mark[field.dataset.time as 'start' | 'end'], true);
        this.changed();
      };
      const finish = (cancelled = false) => {
        if (cancelled) Object.assign(mark, original);
        this.dragging = false; this.cancelDrag = null;
        button.removeEventListener('pointermove', move); button.removeEventListener('pointerup', up); button.removeEventListener('pointercancel', cancel); button.removeEventListener('lostpointercapture', cancel);
        if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
        if (!cancelled && !moved && part === 'move') this.seek(mark.start);
        this.render(); this.changed();
        this.lanes.querySelector<HTMLElement>(`[data-id="${mark.id}"] [data-part="${part}"]`)?.focus();
      };
      const up = () => finish(); const cancel = () => finish(true);
      this.cancelDrag = cancel;
      button.addEventListener('pointermove', move); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', cancel); button.addEventListener('lostpointercapture', cancel);
    });
    button.addEventListener('keydown', event => {
      if (!this.state) return;
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); event.stopPropagation(); this.remove(mark); return; }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault(); event.stopPropagation();
      Object.assign(mark, moveMark(mark, part, (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : .1), this.state.duration));
      this.state.selected = mark.id; this.render(); this.changed();
      this.lanes.querySelector<HTMLElement>(`[data-id="${mark.id}"] [data-part="${part}"]`)?.focus();
    });
  }
  render() {
    this.lanes.replaceChildren(); this.list.replaceChildren();
    const s = this.state;
    (this.lanes.getRootNode() as ShadowRoot).getElementById('no-marks')!.hidden = !!s?.marks.length;
    if (!s?.duration) return;
    for (const mark of s.marks) {
      const lane = document.createElement('div'); lane.className = 'marker-lane'; lane.dataset.id = mark.id;
      const track = document.createElement('div'); track.className = `marker-track ${mark.kind}${s.loop === mark.id ? ' looping' : ''}${s.selected === mark.id ? ' selected' : ''}`;
      this.placement(track, mark, s.duration);
      const body = this.button(mark.kind === 'checkpoint' ? '◆' : mark.name, `move ${mark.name}`, () => { s.selected = mark.id; this.seek(mark.start); this.changed(); });
      body.className = 'marker-body'; body.dataset.part = 'move'; body.title = `${mark.name} · ${time(mark.start, true)}${mark.kind === 'range' ? `–${time(mark.end, true)}` : ''}`;
      this.attachDrag(body, mark, 'move', lane, track); track.append(body);
      if (mark.kind === 'range') for (const part of ['start', 'end'] as const) {
        const handle = this.button('', `${mark.name} ${part}`, () => {});
        handle.className = `range-handle ${part}`; handle.dataset.part = part;
        handle.setAttribute('role', 'slider'); handle.setAttribute('aria-valuemin', '0'); handle.setAttribute('aria-valuemax', String(s.duration)); handle.setAttribute('aria-valuenow', String(mark[part])); handle.setAttribute('aria-valuetext', time(mark[part], true));
        this.attachDrag(handle, mark, part, lane, track); track.append(handle);
      }
      lane.append(track); this.lanes.append(lane);
      const row = document.createElement('div'); row.className = `mark-row ${mark.kind}`; row.dataset.id = mark.id;
      const jump = this.button(mark.kind === 'checkpoint' ? '◆' : '↔', `go to ${mark.name}`, () => { s.selected = mark.id; this.seek(mark.start); this.render(); this.changed(); }); jump.className = 'mark-jump'; row.append(jump);
      const name = document.createElement('input'); name.className = 'mark-name'; name.value = mark.name; name.maxLength = 80; name.setAttribute('aria-label', `${mark.name} name`);
      const commitName = () => { mark.name = name.value.trim() || mark.kind; name.value = mark.name; this.refreshMark(mark); this.changed(); };
      name.addEventListener('change', commitName); name.addEventListener('blur', commitName); name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); }); row.append(name);
      const times = document.createElement('div'); times.className = 'mark-times';
      for (const part of (mark.kind === 'checkpoint' ? ['start'] : ['start', 'end']) as ('start' | 'end')[]) {
        const field = document.createElement('input'); field.value = time(mark[part], true); field.dataset.time = part; field.setAttribute('aria-label', `${mark.name} ${part} time`); field.title = 'minutes:seconds.milliseconds';
        const commitTime = () => {
          const value = parseTime(field.value);
          if (value === null || value > s.duration || (mark.kind === 'range' && (part === 'start' ? value > mark.end - minSpan(s.duration) : value < mark.start + minSpan(s.duration)))) {
            this.report('enter a time within the file; range end must follow its start'); field.value = time(mark[part], true); return;
          }
          mark[part] = value; if (mark.kind === 'checkpoint') mark.end = value;
          s.selected = mark.id; this.report(''); field.value = time(mark[part], true); this.refreshMark(mark); this.changed();
        };
        field.addEventListener('change', commitTime); field.addEventListener('blur', commitTime); field.addEventListener('keydown', e => { if (e.key === 'Enter') field.blur(); }); times.append(field);
      }
      row.append(times);
      if (mark.kind === 'range') {
        const loop = this.button(s.loop === mark.id ? 'looping' : 'loop', `loop ${mark.name}`, () => this.toggleLoop(mark));
        loop.className = 'mark-loop'; loop.setAttribute('aria-pressed', String(s.loop === mark.id)); row.append(loop);
      }
      const remove = this.button('×', `remove ${mark.name}`, () => this.remove(mark)); remove.className = 'mark-remove'; row.append(remove); this.list.append(row);
    }
  }
}
