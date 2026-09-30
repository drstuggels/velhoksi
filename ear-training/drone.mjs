// Long, phase-matched loops from real held organ recordings. Each pitch keeps
// its own voice so adding a note never restarts the reference underneath it.
const loops = new Map();
const bufferIds = new WeakMap();
let nextBufferId = 0, loopBytes = 0;
const MAX_LOOP_BYTES = 32 * 1024 * 1024;
const FADE = 2.4;
const RELEASE = 1.2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function droneLoop(context, buffer, region) {
  if (!bufferIds.has(buffer)) bufferIds.set(buffer, ++nextBufferId);
  const key = `${region.file || bufferIds.get(buffer)}:${buffer.sampleRate}:${region.loopStart}:${region.loopEnd}:${region.root}`;
  if (loops.has(key)) {
    const entry = loops.get(key);
    loops.delete(key); loops.set(key, entry);
    return entry;
  }
  const rate = buffer.sampleRate;
  const start = Math.max(0, Math.round(region.loopStart * rate));
  const end = Math.min(buffer.length, Math.round(region.loopEnd * rate));
  if (!(end - start > 8)) throw new Error('This recording has no usable sustain section.');
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const fade = Math.max(2, Math.min(Math.round(rate * .5), Math.floor((end - start) / 4)));
  const period = Math.max(2, Math.round(rate / (440 * 2 ** ((region.root - 69) / 12))));
  const first = Math.max(start + fade * 2 + 1, end - period);
  const last = Math.min(buffer.length, end + period);
  const stride = Math.max(1, Math.floor(fade / 1024));
  const correlation = edge => {
    let dot = 0, headPower = 0, tailPower = 0;
    for (const channel of channels) for (let i = 0; i < fade; i += stride) {
      const a = channel[start + i], b = channel[edge - fade + i];
      dot += a * b; headPower += a * a; tailPower += b * b;
    }
    return dot / Math.max(1e-12, Math.sqrt(headPower * tailPower));
  };
  // Search one pitch period either side, then refine around the best match.
  // Matching both stereo channels avoids a short, out-of-phase crossfade dip.
  const step = Math.max(1, Math.floor(period / 64));
  let best = end, score = correlation(end);
  for (let edge = first; edge <= last; edge += step) {
    const candidate = correlation(edge);
    if (candidate > score) { best = edge; score = candidate; }
  }
  const coarse = best;
  for (let edge = Math.max(first, coarse - step); edge <= Math.min(last, coarse + step); edge++) {
    const candidate = correlation(edge);
    if (candidate > score) { best = edge; score = candidate; }
  }
  const length = best - start - fade;
  const loop = context.createBuffer(buffer.numberOfChannels, length, rate);
  let energy = 0, peak = 0;
  for (let channel = 0; channel < channels.length; channel++) {
    const source = channels[channel], target = loop.getChannelData(channel);
    target.set(source.subarray(start + fade, best));
    for (let i = 0; i < fade; i++) {
      const mix = .5 - .5 * Math.cos(Math.PI * i / (fade - 1));
      const a = 1 - mix, b = mix;
      const power = Math.sqrt(a * a + b * b + 2 * clamp(score, 0, 1) * a * b);
      target[length - fade + i] = (a * source[best - fade + i] + b * source[start + i]) / power;
    }
    const mean = target.reduce((sum, sample) => sum + sample, 0) / length;
    for (let i = 0; i < length; i++) {
      target[i] -= mean;
      energy += target[i] ** 2; peak = Math.max(peak, Math.abs(target[i]));
    }
  }
  const result = { buffer: loop, rms: Math.sqrt(energy / (length * channels.length)), peak };
  loops.set(key, result);
  loopBytes += loop.length * loop.numberOfChannels * 4;
  for (const [id, entry] of loops) {
    if (loopBytes <= MAX_LOOP_BYTES) break;
    loops.delete(id);
    loopBytes -= entry.buffer.length * entry.buffer.numberOfChannels * 4;
  }
  return result;
}

function hold(parameter, time) {
  if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(time);
  else {
    const value = parameter.value;
    parameter.cancelScheduledValues(time);
    parameter.setValueAtTime(value, time);
  }
}

class DroneTone {
  constructor(context, destination, layers, motion, onEnded) {
    this.context = context;
    this.sources = [];
    this.modulators = [];
    this.nodes = [];
    this.ended = 0;
    this.output = context.createGain();
    this.output.gain.value = 0;
    this.output.connect(destination);
    // Build loops before choosing an onset, including when decoding was cached.
    const prepared = layers.map(({ layer }) => ({ layer, loop: droneLoop(context, layer.buffer, layer.region) }));
    const start = context.currentTime + .03;
    this.startAt = start;
    this.output.gain.setValueAtTime(0, start);
    this.output.gain.linearRampToValueAtTime(1, start + FADE);
    for (const { layer, loop } of prepared) {
      const { region, midi } = layer;
      const strength = Math.min(.085 / Math.max(.0001, loop.rms), .35 / Math.max(.0001, loop.peak)) * (layer.weight ?? 1);
      const source = context.createBufferSource();
      source.buffer = loop.buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = loop.buffer.length / loop.buffer.sampleRate;
      source.playbackRate.value = 2 ** ((midi - region.root + (region.tune || 0) / 100) / 12);
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.Q.value = .45;
      const cutoff = Math.min(6500, Math.max(1000, 440 * 2 ** ((midi - 69) / 12) * 5));
      filter.frequency.value = cutoff;
      const gain = context.createGain(); gain.gain.value = strength;
      source.connect(filter).connect(gain).connect(this.output);
      this.nodes.push(filter, gain);
      // A gentle breath over roughly a minute, with no detuning or registration beating.
      for (const [parameter, frequency, depth] of [[filter.frequency, .012 + midi * .00002, cutoff * .10], [gain.gain, .009 + midi * .00001, strength * .025]]) {
        const oscillator = context.createOscillator(), amount = context.createGain();
        oscillator.frequency.value = frequency;
        amount.gain.value = depth * motion;
        oscillator.connect(amount).connect(parameter);
        oscillator.start(start);
        this.modulators.push({ oscillator, amount, depth });
      }
      source.onended = () => {
        source.onended = null;
        source.disconnect(); source.buffer = null;
        if (++this.ended === this.sources.length) { this.disconnect(); onEnded(this); }
      };
      source.start(start, 0);
      this.sources.push(source);
    }
  }

  setMotion(motion) {
    for (const { amount, depth } of this.modulators) amount.gain.setTargetAtTime(depth * motion, this.context.currentTime, 2);
  }

  levelAt(time) {
    if (this.releaseEnvelope) {
      if (time >= this.stopAt) return 0;
      const { start, length, level } = this.releaseEnvelope;
      const progress = clamp((time - start) / length, 0, 1);
      const position = progress * 48, step = Math.min(47, Math.floor(position));
      const from = .5 + .5 * Math.cos(Math.PI * step / 48);
      const to = .5 + .5 * Math.cos(Math.PI * (step + 1) / 48);
      return level * (from + (to - from) * (position - step));
    }
    return clamp((time - this.startAt) / FADE, 0, 1);
  }

  stop(fade = RELEASE) {
    const time = this.context.currentTime;
    if (this.stopped && time + fade >= this.stopAt) return;
    const level = this.levelAt(time);
    this.stopped = true;
    this.stopAt = time + fade;
    this.releaseEnvelope = { start: time, length: fade, level };
    // Anchor the envelope explicitly, even if removed during its entrance.
    // The cosine release eases into and out of silence instead of dropping
    // suddenly or cutting off an exponential tail at the source stop time.
    hold(this.output.gain, time);
    this.output.gain.setValueAtTime(level, time);
    for (let step = 1; step <= 48; step++) {
      this.output.gain.linearRampToValueAtTime(level * (.5 + .5 * Math.cos(Math.PI * step / 48)), time + fade * step / 48);
    }
    for (const source of this.sources) source.stop(time + fade + .02);
    for (const { oscillator } of this.modulators) oscillator.stop(time + fade + .02);
  }

  disconnect() {
    for (const { oscillator, amount } of this.modulators) { oscillator.disconnect(); amount.disconnect(); }
    for (const node of this.nodes) node.disconnect();
    this.output.disconnect();
    this.sources.length = this.modulators.length = this.nodes.length = 0;
  }
}

export class LivingDrone {
  constructor(context, dry, send, layers, { level = .85, motion = .4 } = {}) {
    this.context = context;
    this.tones = new Map();
    this.retiring = new Set();
    this.level = clamp(level, 0, 1.5);
    this.motion = clamp(motion, 0, 1);
    this.output = context.createGain();
    this.output.gain.value = this.level;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.meterData = new Float32Array(256);
    this.output.connect(this.analyser);
    this.analyser.connect(dry);
    this.analyser.connect(send);
    this.setNotes(layers);
  }

  setNotes(layers, notes = layers.map(item => item.layer.midi)) {
    if (this.stopped) return;
    const grouped = new Map();
    for (const item of layers) {
      const midi = item.layer.midi;
      if (!grouped.has(midi)) grouped.set(midi, []);
      grouped.get(midi).push(item);
    }
    for (const [midi, recordings] of grouped) if (!this.tones.has(midi)) {
      this.tones.set(midi, new DroneTone(this.context, this.output, recordings, this.motion, tone => {
        this.retiring.delete(tone);
        if (this.stopped && !this.retiring.size) this.disconnect();
      }));
    }
    this.retainNotes(notes);
  }

  retainNotes(notes) {
    for (const [midi, tone] of this.tones) if (!notes.includes(midi)) {
      this.tones.delete(midi); this.retiring.add(tone); tone.stop();
    }
  }

  configure({ level, motion }) {
    if (this.stopped) return;
    if (Number.isFinite(level) && clamp(level, 0, 1.5) !== this.level) {
      this.level = clamp(level, 0, 1.5);
      hold(this.output.gain, this.context.currentTime);
      this.output.gain.setTargetAtTime(this.level, this.context.currentTime, .65);
    }
    if (Number.isFinite(motion) && clamp(motion, 0, 1) !== this.motion) {
      this.motion = clamp(motion, 0, 1);
      for (const tone of this.tones.values()) tone.setMotion(this.motion);
    }
  }

  meter() {
    this.analyser.getFloatTimeDomainData(this.meterData);
    const measured = Math.min(1, Math.sqrt(this.meterData.reduce((sum, v) => sum + v * v, 0) / this.meterData.length) * 8);
    this.visualLevel = this.visualLevel === undefined ? measured : this.visualLevel * .86 + measured * .14;
    return this.visualLevel;
  }

  stop(fade = RELEASE) {
    if (this.stopped) return;
    this.stopped = true;
    for (const tone of this.tones.values()) this.retiring.add(tone);
    for (const tone of this.retiring) tone.stop(fade);
    this.tones.clear();
    if (!this.retiring.size) this.disconnect();
  }

  disconnect() { this.output.disconnect(); this.analyser.disconnect(); }
}
