import { LivingDrone } from './drone.mjs';
import { masterVolume } from '../preferences.mjs';

const SAMPLE_BASE = new URL('../audio/samples/', import.meta.url);
export const SAMPLE_CACHE = 'velhoksi-instruments-v1';
const MAX_BUFFER_BYTES = 96 * 1024 * 1024;
const NOTE_LEAD = 0.025;
const onsetOffsets = new WeakMap();
let manifestPromise;
const cancelledLoad = () => new DOMException('Playback replaced', 'AbortError');
const instrumentFiles = instrument => [...new Set([...instrument.regions, ...(instrument.releaseRegions || [])].map(region => region.file))];

// Search backwards only: never trim off the recorded hammer transient or add a fade.
export function pianoOnset(buffer, offset = 0) {
  let offsets = onsetOffsets.get(buffer);
  if (!offsets) { offsets = new Map(); onsetOffsets.set(buffer, offsets); }
  if (offsets.has(offset)) return offsets.get(offset);
  const end = Math.min(buffer.length - 1, Math.round(offset * buffer.sampleRate));
  const first = Math.max(0, end - Math.round(buffer.sampleRate * .002));
  const energy = new Float32Array(end - first + 1);
  const channel = new Float32Array(energy.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    buffer.copyFromChannel(channel, c, first);
    for (let i = 0; i < channel.length; i++) energy[i] += channel[i] ** 2;
  }
  let best = energy.length - 1;
  for (let i = best - 1; i >= 0; i--) if (energy[i] < energy[best]) best = i;
  const start = (first + best) / buffer.sampleRate;
  offsets.set(offset, start);
  return start;
}

const ROOMS = {
  dry: { decay: 0.25, damping: 0.5, preDelay: 0 },
  studio: { decay: 0.36, damping: 0.45, preDelay: 0.012 },
  room: { decay: 0.58, damping: 0.35, preDelay: 0.022 },
  hall: { decay: 0.78, damping: 0.25, preDelay: 0.038 },
};

export function regionWeight(region, velocity) {
  if (velocity < region.velLow || velocity > region.velHigh) return 0;
  let weight = 1;
  const fade = (low, high) => Math.max(0, Math.min(1, (velocity - low) / Math.max(1, high - low)));
  if (Number.isFinite(region.fadeInLow)) weight *= Math.sin(fade(region.fadeInLow, region.fadeInHigh) * Math.PI / 2);
  if (Number.isFinite(region.fadeOutLow)) weight *= Math.cos(fade(region.fadeOutLow, region.fadeOutHigh) * Math.PI / 2);
  return weight < 0.000001 ? 0 : weight;
}

export function selectRegions(instrument, midi, velocity, { allowOutside = false, choose = () => 0 } = {}) {
  let candidates = instrument.regions.filter(r => regionWeight(r, velocity) > 0);
  const distance = r => Math.max(r.low - midi, midi - r.high, 0);
  const nearest = candidates.length ? Math.min(...candidates.map(distance)) : Infinity;
  if (!Number.isFinite(nearest) || (nearest > 0 && !allowOutside)) throw new Error('This pitch is outside the selected instrument’s range.');
  candidates = candidates.filter(r => distance(r) === nearest);
  const groups = new Map();
  for (const region of candidates) {
    const key = region.variantGroup || `${region.root}:${region.velLow}:${region.velHigh}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(region);
  }
  return [...groups].map(([key, takes]) => {
    const region = takes[choose(key, takes.length) % takes.length];
    return { region, weight: regionWeight(region, velocity) };
  });
}

export class SampleEngine {
  constructor(onStatus = () => {}) {
    this.onStatus = onStatus;
    this.buffers = new Map();
    this.pending = new Map();
    this.voices = new Set();
    this.roundRobin = new Map();
    this.parameterTargets = new WeakMap();
    this.epoch = 0;
    this.droneEpoch = 0;
    this.activeDrone = null;
    this.activeLoads = 0;
    this.waiters = [];
    this.settings = { instrument: 'salamander', velocity: 68, volume: 0.65, ambience: 0.2, room: 'studio' };
  }

  async manifest() {
    if (!manifestPromise) manifestPromise = fetch(new URL('manifest.json', SAMPLE_BASE))
      .then(response => { if (!response.ok) throw new Error('The instrument catalog could not load. Try again while online.'); return response.json(); })
      .catch(error => { manifestPromise = null; throw error; });
    return manifestPromise;
  }

  async unlock() {
    if (!this.context || this.context.state === 'closed') {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) throw new Error('This browser does not support Web Audio.');
      this.context = new Context({ latencyHint: 'interactive' });
      const ctx = this.context;
      this.master = ctx.createGain();
      this.master.gain.value = this.settings.volume * 0.7;
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -6;
      this.compressor.knee.value = 6;
      this.compressor.ratio.value = 16;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.15;
      // Keep graph construction and the first worklet blocks off the output.
      // This gate only opens on startup/resume, never on replay.
      this.output = ctx.createGain();
      this.output.gain.value = 0;
      this.outputArmed = false;
      this.master.connect(this.compressor).connect(this.output).connect(ctx.destination);
      this.dry = ctx.createGain();
      this.dry.connect(this.master);
      this.send = ctx.createGain();
      this.send.gain.value = this.settings.room === 'dry' ? 0 : this.settings.ambience;
      this.return = ctx.createGain();
      this.return.gain.value = 0.8;
      this.return.connect(this.master);
      this.context.addEventListener('statechange', () => {
        if (ctx.state === 'interrupted' || ctx.state === 'suspended') {
          this.outputArmed = false;
          this.output.gain.cancelScheduledValues(ctx.currentTime);
          this.output.gain.setValueAtTime(0, ctx.currentTime);
          this.cancel();
          this.onStatus('Audio paused. Press play to resume.', 'paused');
        }
      });
      this.reverbReady = null;
    }
    // Resume inside the originating user gesture, before fetching or decoding anything.
    if (this.context.state !== 'running') {
      this.outputArmed = false;
      this.output.gain.cancelScheduledValues(this.context.currentTime);
      this.output.gain.setValueAtTime(0, this.context.currentTime);
      await this.context.resume();
    }
    if (!this.reverbReady) this.reverbReady = this.createReverb().catch(error => { this.reverbReady = null; throw error; });
    await this.reverbReady;
    this.configure(this.settings);
    if (!this.outputArmed) {
      const now = this.context.currentTime;
      this.readyAt = now + 0.06;
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.setValueAtTime(0, now);
      this.output.gain.setValueAtTime(0, now + 0.02);
      this.output.gain.linearRampToValueAtTime(1, this.readyAt);
      this.outputArmed = true;
    }
  }

  async createReverb() {
    const ctx = this.context;
    if (!ctx.audioWorklet) throw new Error('The room engine needs AudioWorklet support over HTTPS or localhost.');
    await ctx.audioWorklet.addModule(new URL('../vendor/dattorro/dattorroReverb.js', import.meta.url));
    const preset = ROOMS[this.settings.room] || ROOMS.studio;
    this.reverb = new AudioWorkletNode(ctx, 'DattorroReverb', {
      outputChannelCount: [2],
      parameterData: { dry: 0, wet: 1, excursionDepth: 0, ...preset, preDelay: preset.preDelay * ctx.sampleRate },
    });
    const lowCut = ctx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = 140;
    this.send.connect(lowCut).connect(this.reverb).connect(this.return);
    this.reverb.addEventListener('processorerror', () => this.onStatus('The room processor stopped. Reload to restore reverb.', 'error'));
  }

  target(parameter, value, time, constant) {
    if (this.parameterTargets.get(parameter) === value) return;
    if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(time);
    else { const current = parameter.value; parameter.cancelScheduledValues(time); parameter.setValueAtTime(current, time); }
    parameter.setTargetAtTime(value, time, constant);
    this.parameterTargets.set(parameter, value);
  }

  configure(settings) {
    this.settings = { ...this.settings, ...settings, volume: masterVolume() };
    if (!this.context) return;
    const t = this.context.currentTime;
    this.target(this.master.gain, this.settings.volume * 0.7, t, 0.025);
    this.target(this.send.gain, this.settings.room === 'dry' ? 0 : this.settings.ambience, t, 0.04);
    this.target(this.return.gain, 0.8, t, 0.04);
    if (this.reverb) {
      const preset = ROOMS[this.settings.room] || ROOMS.studio;
      for (const [key, value] of Object.entries(preset)) this.target(this.reverb.parameters.get(key), key === 'preDelay' ? value * this.context.sampleRate : value, t, 0.03);
    }
  }

  async fetchSample(file, requireStorage = false) {
    const url = new URL(file, SAMPLE_BASE).href;
    let cache;
    try { if (globalThis.caches) cache = await caches.open(SAMPLE_CACHE); } catch { /* Storage may be unavailable; playback can still work. */ }
    const cached = cache && await cache.match(url).catch(() => null);
    if (cached) {
      if (!requireStorage) return cached.arrayBuffer();
      await cached.body?.cancel();
      return;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('A recording could not load. Reconnect and press play to retry.');
    if (requireStorage) {
      if (!cache) { await response.body?.cancel(); throw new Error('Browser storage is unavailable. Offline download was not saved.'); }
      try { await cache.put(url, response); }
      catch { throw new Error('Browser storage is full. Remove downloaded recordings or free some space, then retry.'); }
      return;
    }
    // Consume both branches together; never leave the playback branch buffering
    // while waiting for a full disk-cache write.
    const copy = cache ? response.clone() : null;
    const [data] = await Promise.all([
      response.arrayBuffer(),
      copy ? cache.put(url, copy).catch(() => {}) : undefined,
    ]);
    return data;
  }

  async buffer(file, isCurrent = () => true) {
    if (!isCurrent()) throw cancelledLoad();
    if (this.buffers.has(file)) {
      const entry = this.buffers.get(file);
      this.buffers.delete(file);
      this.buffers.set(file, entry);
      return entry;
    }
    if (this.pending.has(file)) {
      const job = this.pending.get(file);
      job.wanted.add(isCurrent);
      return job.promise;
    }
    const job = { wanted: new Set([isCurrent]) };
    const promise = (async () => {
      if (this.activeLoads >= 3) await new Promise(resolve => this.waiters.push(resolve));
      else this.activeLoads++;
      // A released slot is handed directly to its waiter, so new arrivals cannot steal it.
      try {
        if (![...job.wanted].some(wanted => wanted())) throw cancelledLoad();
        const data = await this.fetchSample(file);
        if (![...job.wanted].some(wanted => wanted())) throw cancelledLoad();
        let buffer;
        try { buffer = await this.context.decodeAudioData(data); }
        catch { throw new Error('This browser could not decode the lossless recordings. Try an up-to-date browser.'); }
        this.buffers.set(file, buffer);
        this.trimBuffers();
        return buffer;
      } finally {
        const next = this.waiters.shift();
        if (next) next();
        else this.activeLoads--;
      }
    })().finally(() => this.pending.delete(file));
    job.promise = promise;
    this.pending.set(file, job);
    return promise;
  }

  trimBuffers() {
    let bytes = [...this.buffers.values()].reduce((sum, b) => sum + b.length * b.numberOfChannels * 4, 0);
    for (const [key, buffer] of this.buffers) {
      if (bytes <= MAX_BUFFER_BYTES) break;
      this.buffers.delete(key);
      bytes -= buffer.length * buffer.numberOfChannels * 4;
    }
  }

  sustainedBuffer(file, buffer, region) {
    if (!region.loopCrossfade) return buffer;
    const key = `${file}:sustain`;
    if (this.buffers.has(key)) {
      const cached = this.buffers.get(key);
      this.buffers.delete(key);
      this.buffers.set(key, cached);
      return cached;
    }
    const rate = buffer.sampleRate;
    const start = Math.round(region.loopStart * rate);
    const end = Math.min(buffer.length, Math.round(region.loopEnd * rate));
    const fade = Math.min(Math.round(region.loopCrossfade * rate), Math.floor((end - start) / 2));
    const looped = this.context.createBuffer(buffer.numberOfChannels, end, rate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const source = buffer.getChannelData(channel);
      const target = looped.getChannelData(channel);
      target.set(source.subarray(0, end));
      // Finish at the beginning of the held section, then continue after the blend.
      for (let frame = 0; frame < fade; frame++) {
        const mix = frame / Math.max(1, fade - 1);
        target[end - fade + frame] = source[end - fade + frame] * (1 - mix) + source[start + frame] * mix;
      }
    }
    this.buffers.set(key, looped);
    this.trimBuffers();
    return looped;
  }

  async prepare(notes, settings = this.settings, { allowOutside = false, sustain = true, isCurrent = () => true } = {}) {
    const manifest = await this.manifest();
    const instrument = manifest.instruments[settings.instrument];
    if (!instrument) throw new Error('Choose an available instrument.');
    const choose = prefix => (group, length) => {
      const key = `${settings.instrument}:${prefix}:${group}`;
      const next = this.roundRobin.get(key) || 0;
      this.roundRobin.set(key, (next + 1) % length);
      return next;
    };
    const load = async (midi, { region, weight }) => {
      const original = await this.buffer(region.file, isCurrent);
      if (!isCurrent()) throw cancelledLoad();
      const buffer = sustain ? this.sustainedBuffer(region.file, original, region) : original;
      const velocityGain = region.velocityTracking === undefined ? 1 : (settings.velocity / 127) ** (region.velocityTracking / 50);
      return { midi, region, buffer, instrument, weight, velocityGain, offset: settings.instrument === 'salamander' ? pianoOnset(buffer, region.offset) : region.offset };
    };
    return Promise.all(notes.map(async midi => {
      const selected = selectRegions(instrument, midi, settings.velocity, { allowOutside, choose: choose('attack') });
      const layers = await Promise.all(selected.map(region => load(midi, region)));
      const releaseRegions = instrument.releaseRegions?.length
        ? selectRegions({ regions: instrument.releaseRegions }, midi, settings.velocity, { allowOutside, choose: choose('release') }) : [];
      const releases = await Promise.all(releaseRegions.map(region => load(midi, region)));
      return { midi, instrument, layers, releases };
    }));
  }

  voice(prepared, time, duration, options = {}) {
    if (prepared.layers) {
      const voices = prepared.layers.map(layer => this.voice(layer, time, duration, options));
      if (Number.isFinite(duration)) {
        const strength = (options.strength ?? .6) * (prepared.instrument.releaseNoiseGain || 0) * 10 ** (-7 * duration / 20);
        for (const release of prepared.releases) {
          voices.push(this.voice(release, time + duration, .2, { strength, releaseNoise: true }));
        }
      }
      return voices;
    }
    const ctx = this.context;
    const { midi, region, buffer, instrument } = prepared;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 2 ** ((midi - region.root + (region.tune || 0) / 100) / 12);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const strength = (options.strength ?? 0.6) * (prepared.weight ?? 1) * (prepared.velocityGain ?? 1) * instrument.gain * 10 ** ((region.volume || 0) / 20);
    gain.gain.setValueAtTime(0, time);
    const attack = region.attack ?? 0;
    if (attack > 0) gain.gain.linearRampToValueAtTime(strength, time + attack);
    else gain.gain.setValueAtTime(strength, time);
    const release = options.releaseNoise ? .05 : region.release ?? instrument.release;
    if (Number.isFinite(duration)) {
      gain.gain.setValueAtTime(strength, time + duration);
      gain.gain.exponentialRampToValueAtTime(0.00001, time + duration + release);
    }
    source.connect(gain);
    gain.connect(this.dry); gain.connect(this.send);
    source.loop = Number.isFinite(region.loopEnd);
    if (source.loop) {
      source.loopStart = region.loopStart + (region.loopCrossfade || 0);
      source.loopEnd = region.loopEnd;
    }
    const voice = { source, gain, time };
    source.onended = () => {
      this.voices.delete(voice);
      source.onended = null;
      source.disconnect(); gain.disconnect();
      source.buffer = null;
    };
    try {
      // Even a future stop must be scheduled after the source has been started.
      source.start(time, prepared.offset ?? region.offset ?? 0);
    } catch (error) {
      source.onended = null; source.buffer = null;
      source.disconnect();
      gain.disconnect();
      throw error;
    }
    this.voices.add(voice);
    if (Number.isFinite(duration)) source.stop(time + duration + release + 0.02);
    if (this.voices.size > 48) this.stopVoice([...this.voices][0]);
    return voice;
  }

  stopVoice(voice, fade = 0.025) {
    const t = this.context.currentTime;
    const gain = voice.gain.gain;
    // Hold the current envelope value: removing an in-progress release ramp
    // outright can jump back to its previous sustain level before fading out.
    if (voice.time > t) {
      gain.cancelScheduledValues(t);
      gain.setValueAtTime(0, t);
    } else {
      if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(t);
      else {
        const current = gain.value;
        gain.cancelScheduledValues(t);
        gain.setValueAtTime(current, t);
      }
      gain.setTargetAtTime(0, t, fade / 4);
    }
    try { voice.source.stop(t + fade); } catch { /* Already stopped. */ }
    this.voices.delete(voice);
  }

  cancel(includeDrone = true, { resetReverb = includeDrone, fade = 0.025 } = {}) {
    this.epoch++;
    for (const voice of this.voices) this.stopVoice(voice, fade);
    if (includeDrone) {
      this.droneEpoch++;
      this.activeDrone?.stop(resetReverb ? .1 : .65);
      this.activeDrone = null;
      this.droneNotes = [];
    }
    if (resetReverb) this.reverb?.port.postMessage('reset');
  }

  async play(notes, { direction = 'ascending', duration = 0.8, gap = 0.25, keepDrone = false, allowOutside = false, ...settings } = {}) {
    // Replace the notes while letting the existing room tail decay naturally.
    this.cancel(!keepDrone, { resetReverb: false, fade: 0.12 });
    const epoch = this.epoch;
    await this.unlock();
    if (epoch !== this.epoch) return null;
    const snapshot = { ...this.settings, ...settings };
    this.configure(snapshot);
    this.onStatus('Loading lossless recordings…', 'loading');
    const isCurrent = () => epoch === this.epoch;
    let prepared;
    try { prepared = snapshot.noteInstruments?.length
      ? await Promise.all(notes.map(async (midi, index) => (await this.prepare([midi], { ...snapshot, instrument: snapshot.noteInstruments[index % snapshot.noteInstruments.length] }, { allowOutside, isCurrent }))[0]))
      : await this.prepare(notes, snapshot, { allowOutside, isCurrent });
    } catch (error) { if (!isCurrent()) return null; throw error; }
    if (epoch !== this.epoch) return null;
    const start = Math.max(this.context.currentTime + 0.14, this.readyAt || 0);
    const together = direction === 'harmonic';
    const strength = (0.4 + snapshot.velocity / 127 * 0.3) / Math.sqrt(together ? notes.length : 1);
    prepared.forEach((note, index) => this.voice(note, start + (together ? 0 : index * (duration + gap)), duration, { strength }));
    const end = start + (together ? 0 : (notes.length - 1) * (duration + gap)) + duration;
    this.onStatus('Playing', 'playing');
    return { start, end, epoch };
  }

  async drone(notes, options = {}) {
    const token = ++this.droneEpoch;
    await this.unlock();
    if (token !== this.droneEpoch) return false;
    if (this.activeDrone && JSON.stringify(notes) === JSON.stringify(this.droneNotes)) {
      this.activeDrone.configure(options);
      this.onStatus('Sustaining', 'drone');
      return true;
    }
    // Removal only releases the outgoing voices. It needs no sample fetch,
    // decode, round-robin selection, or reconstruction of the held notes.
    if (this.activeDrone && notes.every(note => this.activeDrone.tones.has(note))) {
      this.activeDrone.retainNotes(notes);
      this.activeDrone.configure(options);
      this.droneNotes = [...notes];
      this.onStatus('Sustaining', 'drone');
      return true;
    }
    this.onStatus('Preparing sustain…', 'loading');
    const added = notes.filter(note => !this.activeDrone?.tones.has(note));
    let prepared;
    try {
      prepared = await this.prepare(added, { ...this.settings, instrument: 'pipe-organ', velocity: 76 }, { sustain: false, isCurrent: () => token === this.droneEpoch });
    } catch (error) {
      if (token !== this.droneEpoch) return false;
      this.stopDrone();
      throw error;
    }
    if (token !== this.droneEpoch) return false;
    const layers = prepared.flatMap(note => note.layers.map(layer => ({ layer })));
    if (this.activeDrone) {
      this.activeDrone.setNotes(layers, notes);
      this.activeDrone.configure(options);
    } else this.activeDrone = new LivingDrone(this.context, this.dry, this.send, layers, options);
    this.droneNotes = [...notes];
    this.onStatus('Sustaining', 'drone');
    return true;
  }

  stopDrone() {
    this.droneEpoch++;
    this.activeDrone?.stop();
    this.activeDrone = null;
    this.droneNotes = [];
  }

  configureDrone(options) { this.activeDrone?.configure(options); }
  droneLevel() { return this.activeDrone?.meter() || 0; }

  async preview(midi, settings = this.settings) {
    const epoch = this.epoch;
    await this.unlock();
    if (epoch !== this.epoch) return;
    // Every fret remains an answer option, including notes beyond the native bank.
    let prepared;
    try { prepared = await this.prepare([midi], settings, { allowOutside: true, isCurrent: () => epoch === this.epoch }); }
    catch (error) { if (epoch !== this.epoch) return null; throw error; }
    const [note] = prepared;
    if (epoch !== this.epoch) return null;
    const start = Math.max(this.context.currentTime + NOTE_LEAD, this.readyAt || 0);
    const duration = settings.duration ?? .6;
    this.voice(note, start, duration);
    return { start, end: start + duration, epoch };
  }

  async downloadInstrument(id, progress, isCancelled = () => false) {
    const manifest = await this.manifest();
    const instrument = manifest.instruments[id];
    const files = instrumentFiles(instrument);
    let index = 0;
    // Cache compressed originals without decoding the whole bank into memory.
    for (const file of files) {
      if (isCancelled()) return false;
      await this.fetchSample(file, true);
      progress(++index, files.length);
    }
    return true;
  }

  async cacheInfo() {
    const manifest = await this.manifest();
    let cached = new Set();
    try {
      const cache = await caches.open(SAMPLE_CACHE);
      cached = new Set((await cache.keys()).map(request => request.url));
    } catch { return { available: false, bytes: 0, total: 0 }; }
    let bytes = 0;
    for (const [name, meta] of Object.entries(manifest.files)) if (cached.has(new URL(name, SAMPLE_BASE).href)) bytes += meta.bytes;
    const instruments = Object.fromEntries(Object.entries(manifest.instruments).map(([id, instrument]) => {
      const files = instrumentFiles(instrument);
      const stored = files.filter(file => cached.has(new URL(file, SAMPLE_BASE).href));
      return [id, { count: stored.length, total: files.length,
        bytes: stored.reduce((sum, file) => sum + manifest.files[file].bytes, 0),
        size: files.reduce((sum, file) => sum + manifest.files[file].bytes, 0) }];
    }));
    return { available: true, bytes, instruments, total: Object.values(manifest.files).reduce((sum, meta) => sum + meta.bytes, 0) };
  }

  async clearCache() {
    this.cancel();
    this.buffers.clear();
    if (globalThis.caches) await caches.delete(SAMPLE_CACHE);
  }

  suspend() {
    this.cancel();
    if (this.context?.state === 'running') this.context.suspend().catch(() => {});
  }
}
