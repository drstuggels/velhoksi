import { fadeLoopIn, fadeLoopOut, holdGain } from './loop-envelope.ts';
type LoopRange = { start: number; end: number };
type Clock = { set: (callback: () => void, delay: number) => number; clear: (id: number) => void };
const browserClock: Clock = { set: (fn, delay) => window.setTimeout(fn, delay), clear: id => window.clearTimeout(id) };

/** Fade the output, seek while silent, then restore it after decoded audio is ready.
 * The media element remains the only playback clock, including for video/pitch correction.
 */
export class SmoothLoop {
  private media: HTMLMediaElement;
  private getRange: () => LoopRange | undefined;
  private createContext: () => AudioContext;
  private clock: Clock;
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private poll = 0;
  private pending = 0;
  private revision = 0;
  private key = '';
  private phase: 'idle' | 'out' | 'seek' | 'in' = 'idle';
  private fade = .008;
  private transitions = 0;
  private lastSeekGain: number | null = null;

  constructor(media: HTMLMediaElement, getRange: () => LoopRange | undefined, createContext = () => new AudioContext(), clock = browserClock) {
    this.media = media; this.getRange = getRange; this.createContext = createContext; this.clock = clock;
    media.addEventListener('playing', () => { this.finishSeek(); this.startPolling(); });
    media.addEventListener('pause', () => { if (!media.ended) this.reset(); });
    media.addEventListener('ended', () => { this.check(); });
    media.addEventListener('ratechange', () => { this.cancel(); this.check(); });
    media.addEventListener('seeking', () => { if (this.phase !== 'seek') this.cancel(); });
    media.addEventListener('seeked', () => { this.finishSeek(); this.check(); });
    media.addEventListener('canplay', () => this.finishSeek());
    media.addEventListener('waiting', () => { if (this.phase !== 'seek') this.cancel(); });
    media.addEventListener('emptied', () => this.reset());
    media.addEventListener('error', () => this.reset());
  }
  async prepare() {
    if (!this.context) {
      this.context = this.createContext();
      this.gain = this.context.createGain();
      const source = this.context.createMediaElementSource(this.media);
      source.connect(this.gain); this.gain.connect(this.context.destination);
    }
    if (this.context.state !== 'running') await this.context.resume();
  }
  get status() {
    return { enabled: !!this.gain, context: this.context?.state ?? 'not-started', phase: this.phase, transitions: this.transitions, lastSeekGain: this.lastSeekGain };
  }
  reset() {
    this.clock.clear(this.poll); this.poll = 0; this.key = ''; this.cancel();
  }
  /** Invalidate a pending jump before manual seeks, file switches or loop edits. */
  cancel() {
    ++this.revision; this.clock.clear(this.pending); this.pending = 0; this.phase = 'idle';
    if (this.context && this.gain) {
      const now = this.context.currentTime;
      holdGain(this.gain.gain, now); this.gain.gain.linearRampToValueAtTime(1, now + .008);
    }
  }
  check() {
    const range = this.getRange();
    const key = range ? `${range.start}:${range.end}:${this.media.playbackRate}` : '';
    if (key !== this.key) { this.key = key; this.cancel(); }
    if (!range || !this.context || !this.gain || this.context.state !== 'running' || this.media.seeking || (this.media.paused && !this.media.ended) || this.phase !== 'idle') return;
    const remaining = (range.end - this.media.currentTime) / this.media.playbackRate;
    // Look ahead rather than cutting audio from a requestAnimationFrame callback.
    if (remaining > .06) return;
    this.fade = Math.min(.008, (range.end - range.start) / this.media.playbackRate / 8);
    const now = this.context.currentTime, end = now + Math.max(this.fade, remaining);
    fadeLoopOut(this.gain.gain, now, end, this.fade);
    this.phase = 'out'; const revision = this.revision;
    // Allow a render quantum to finish before changing the decoded media stream.
    const silentAt = end + 128 / this.context.sampleRate;
    const jump = () => {
      if (revision !== this.revision) return;
      const current = this.getRange();
      if (!current || current.start !== range.start || current.end !== range.end || (this.media.paused && !this.media.ended)) { this.cancel(); return; }
      if (this.context!.state !== 'running') { this.cancel(); return; }
      if (this.context!.currentTime < silentAt) { this.pending = this.clock.set(jump, 4); return; }
      this.phase = 'seek'; this.lastSeekGain = this.gain!.gain.value; this.transitions++;
      const restart = this.media.ended;
      this.media.currentTime = range.start;
      if (restart) void this.media.play().catch(() => this.reset());
    };
    this.pending = this.clock.set(jump, Math.max(0, silentAt - now) * 1000);
  }
  private finishSeek() {
    if (this.phase !== 'seek' || this.media.seeking || this.media.readyState < 3 || !this.context || !this.gain) return;
    const now = this.context.currentTime;
    // Keep the seek discontinuity and decoder startup behind zero gain.
    const end = fadeLoopIn(this.gain.gain, now, this.fade, this.context.sampleRate);
    this.phase = 'in'; const revision = this.revision;
    this.pending = this.clock.set(() => {
      if (revision !== this.revision) return;
      this.phase = 'idle'; this.check();
    }, (end - now) * 1000);
  }
  private startPolling() {
    this.clock.clear(this.poll);
    const poll = () => {
      this.check();
      if (!this.media.paused || this.phase !== 'idle') this.poll = this.clock.set(poll, 20);
    };
    poll();
  }
}
