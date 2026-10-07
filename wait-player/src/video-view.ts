import { constrainView, fitVideo, zoomAt, type VideoViewState } from './video-geometry';

export class VideoView {
  private $ = <T extends HTMLElement>(id: string) => this.root.getElementById(id) as T;
  private state: VideoViewState | null = null;
  private viewport: HTMLElement;
  private stage: HTMLElement;
  private workspace: HTMLElement;
  private controls: HTMLElement;
  private points = new Map<number, { x: number; y: number }>();
  private gesture: { x: number; y: number; distance: number; view: VideoViewState } | null = null;
  private suppressClick = false;
  constructor(private root: ShadowRoot, private media: HTMLVideoElement, private play: () => void, private changed: () => void = () => {}) {
    this.viewport = this.$('video-viewport'); this.stage = this.$('stage'); this.workspace = this.$('workspace'); this.controls = this.$('video-tools');
    this.$('zoom-in').addEventListener('click', () => this.zoom((this.state?.zoom ?? 1) + .25));
    this.$('zoom-out').addEventListener('click', () => this.zoom((this.state?.zoom ?? 1) - .25));
    this.$('zoom-fit').addEventListener('click', () => { if (this.state) { Object.assign(this.state, { zoom: 1, x: 0, y: 0 }); this.render(); } });
    this.viewport.addEventListener('click', () => { if (!this.suppressClick) this.play(); this.suppressClick = false; });
    this.viewport.addEventListener('wheel', e => {
      if (!this.state || (!e.ctrlKey && !e.metaKey)) return;
      e.preventDefault(); this.zoom(this.state.zoom * Math.exp(-e.deltaY * .008), e.clientX, e.clientY);
    }, { passive: false });
    this.viewport.addEventListener('pointerdown', e => {
      if (!this.state || e.button !== 0) return;
      this.suppressClick = false; this.points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.viewport.setPointerCapture(e.pointerId); this.startGesture();
      if (this.points.size > 1) this.suppressClick = true;
    });
    this.viewport.addEventListener('pointermove', e => {
      if (!this.points.has(e.pointerId) || !this.state || !this.gesture) return;
      this.points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const current = this.center(), origin = this.gesture, fit = this.fit();
      if (!fit.width || !fit.height) return;
      const dx = current.x - origin.x, dy = current.y - origin.y;
      const pinching = this.points.size > 1 && origin.distance > 0;
      if (Math.abs(dx) + Math.abs(dy) > 3 || pinching) this.suppressClick = true;
      let next = { ...origin.view };
      if (pinching) {
        const box = this.viewport.getBoundingClientRect();
        next = zoomAt(next, origin.view.zoom * current.distance / origin.distance, { x: (origin.x - box.left - box.width / 2) / fit.width, y: (origin.y - box.top - box.height / 2) / fit.height }, fit, this.size());
      }
      Object.assign(this.state, constrainView({ ...next, x: next.x + dx / fit.width, y: next.y + dy / fit.height }, fit, this.size()));
      this.render();
    });
    const end = (e: PointerEvent) => { this.points.delete(e.pointerId); this.startGesture(); };
    this.viewport.addEventListener('pointerup', end); this.viewport.addEventListener('pointercancel', end); this.viewport.addEventListener('lostpointercapture', end);
    this.viewport.addEventListener('keydown', e => {
      if (!this.state) return;
      if (e.key === '+' || e.key === '=') this.zoom(this.state.zoom + .25);
      else if (e.key === '-') this.zoom(this.state.zoom - .25);
      else if (e.key === '0') { Object.assign(this.state, { zoom: 1, x: 0, y: 0 }); this.render(); }
      else if (e.key.startsWith('Arrow') && this.state.zoom > 1) {
        const step = e.shiftKey ? .15 : .05;
        if (e.key === 'ArrowLeft') this.state.x += step;
        if (e.key === 'ArrowRight') this.state.x -= step;
        if (e.key === 'ArrowUp') this.state.y += step;
        if (e.key === 'ArrowDown') this.state.y -= step;
        this.render();
      } else return;
      e.preventDefault(); e.stopPropagation();
    });
    new ResizeObserver(() => this.layout()).observe(this.workspace);
    new ResizeObserver(() => this.render()).observe(this.viewport);
    window.addEventListener('resize', () => this.layout());
    document.addEventListener('fullscreenchange', () => { this.$('fullscreen').setAttribute('aria-label', this.root.fullscreenElement === this.stage ? 'exit fullscreen' : 'fullscreen video'); this.layout(); });
  }
  bind(state: VideoViewState | null) {
    this.state = state; this.points.clear(); this.gesture = null; this.suppressClick = false;
    this.viewport.hidden = this.controls.hidden = !state;
    this.stage.classList.toggle('has-video', !!state);
    if (!state) {
      delete this.workspace.dataset.videoLayout;
      this.stage.style.removeProperty('width'); this.stage.style.removeProperty('height');
      this.media.style.transform = ''; this.media.style.width = ''; this.media.style.height = '';
    } else this.layout();
  }
  private size() { return { width: this.viewport.clientWidth, height: this.viewport.clientHeight }; }
  private fit() { return fitVideo({ width: this.media.videoWidth, height: this.media.videoHeight }, this.size()); }
  private center() {
    const points = [...this.points.values()].slice(0, 2), a = points[0], b = points[1] ?? a;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
  }
  private startGesture() {
    this.gesture = this.state && this.points.size ? { ...this.center(), view: { ...this.state } } : null;
  }
  private layout() {
    if (!this.state || !this.media.videoWidth) return;
    const ratio = this.media.videoWidth / this.media.videoHeight;
    // Tall videos leave room for the controls beside them; wide videos span the workspace.
    const side = ratio <= 1.2 && window.innerWidth > 760 && this.workspace.clientWidth >= 580;
    this.workspace.dataset.videoLayout = side ? 'side' : 'wide';
    const width = this.workspace.querySelector<HTMLElement>('.player')!.clientWidth;
    const maxHeight = Math.max(180, Math.min(720, window.innerHeight - 350));
    const height = Math.min(width / ratio, maxHeight);
    this.stage.style.width = `${Math.min(width, height * ratio)}px`;
    this.stage.style.height = `${height}px`;
    this.render();
  }
  private zoom(value: number, clientX?: number, clientY?: number) {
    if (!this.state) return;
    const fit = this.fit(), box = this.viewport.getBoundingClientRect();
    const point = { x: clientX === undefined ? 0 : (clientX - box.left - box.width / 2) / fit.width, y: clientY === undefined ? 0 : (clientY - box.top - box.height / 2) / fit.height };
    Object.assign(this.state, zoomAt(this.state, value, point, fit, this.size())); this.render();
  }
  private render() {
    if (!this.state || !this.media.videoWidth) return;
    const fit = this.fit(); if (!fit.width || !fit.height) return;
    Object.assign(this.state, constrainView(this.state, fit, this.size()));
    const { zoom, x, y } = this.state;
    this.media.style.width = `${fit.width}px`; this.media.style.height = `${fit.height}px`;
    this.media.style.transform = `translate(-50%, -50%) translate(${x * fit.width}px, ${y * fit.height}px) scale(${zoom})`;
    this.viewport.classList.toggle('zoomed', zoom > 1);
    this.changed();
    this.$('zoom-value').textContent = `${Math.round(zoom * 100)}%`;
    this.$<HTMLButtonElement>('zoom-out').disabled = zoom <= 1;
    this.$<HTMLButtonElement>('zoom-in').disabled = zoom >= 5;
    this.$<HTMLButtonElement>('zoom-fit').disabled = zoom === 1 && x === 0 && y === 0;
  }
}
