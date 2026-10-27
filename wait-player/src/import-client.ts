export type Provenance = {
  inputUrl: string; sourceUrl: string; sourceId: string; provider: string;
  title: string; artist: string; matchedTitle: string; importedAt: string;
};
export type Candidate = { id: string; title: string; artist: string; duration: number | null; url: string; kind: string };
export type ImportJob = {
  id: string; state: 'resolving' | 'matching' | 'choosing' | 'downloading' | 'preparing' | 'ready' | 'failed';
  message: string; progress?: number | null; source?: string;
  track?: { title: string; artists: string[]; duration: number | null };
  candidates?: Candidate[]; filename?: string; mime?: string; bytes?: number; provenance?: Provenance;
};
type Handle = { id: string; token: string };
const MAX_BYTES = 128 * 1024 * 1024;
const KEY = 'wait:pending-import';
const random = (length: number) => Array.from(crypto.getRandomValues(new Uint8Array(length)), x => x.toString(16).padStart(2, '0')).join('');

export async function clearPendingImport() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
    window.sessionStorage.removeItem(KEY);
    if (value && /^[a-f0-9]{32}$/.test(value.id) && /^[a-f0-9]{64}$/.test(value.token)) {
      await fetch(`/api/imports/${value.id}`, { method: 'DELETE', headers: { 'X-Import-Token': value.token }, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    }
  } catch { /* Removal is best effort; remote jobs also expire automatically. */ }
}

/** One resumable job per browser tab. Reset/cancel invalidates every in-flight completion. */
export class ImportClient {
  private handle: Handle | null = null;
  private controller: AbortController | null = null;
  private revision = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private failures = 0;
  private receiving = false;
  private onState: (job: ImportJob | null, error?: string) => void;
  private onFile: (file: File, provenance: Provenance, id: string, signal: AbortSignal) => Promise<void>;
  private storage?: Storage;
  private fetcher: typeof fetch;
  constructor(
    onState: (job: ImportJob | null, error?: string) => void,
    onFile: (file: File, provenance: Provenance, id: string, signal: AbortSignal) => Promise<void>,
    storage?: Storage,
    fetcher: typeof fetch = (...args) => fetch(...args),
  ) { this.onState = onState; this.onFile = onFile; this.storage = storage; this.fetcher = fetcher; }
  get pending() { return !!this.handle; }
  private remember() {
    try { if (this.handle) this.storage?.setItem(KEY, JSON.stringify(this.handle)); else this.storage?.removeItem(KEY); } catch {}
  }
  private stop() {
    ++this.revision; this.controller?.abort(); this.controller = null;
    clearTimeout(this.timer); this.receiving = false;
  }
  private async request(handle: Handle, suffix = '', method = 'GET', body?: unknown, signal = this.controller?.signal): Promise<Response> {
    const url = method === 'POST' && suffix === '/create' ? '/api/imports' : `/api/imports/${handle.id}${suffix}`;
    const response = await this.fetcher(url, {
      method, cache: 'no-store', credentials: 'same-origin', signal,
      headers: { 'X-Import-Token': handle.token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const unavailable = [404, 405, 501].includes(response.status);
      throw new Error(data.error || (unavailable
        ? 'This server does not support link imports. For local development, restart it with pnpm dev, then find the media again.'
        : 'Import request failed. Please retry.'));
    }
    return response;
  }
  async begin(url: string) {
    const cancelling = this.cancel(), starting = this.revision;
    await cancelling;
    if (starting !== this.revision) return;
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Paste a public http or https media link.');
    this.handle = { id: random(16), token: random(32) };
    this.remember(); this.controller = new AbortController(); this.failures = 0;
    const handle = this.handle, revision = this.revision;
    this.onState({ id: handle.id, state: 'resolving', message: 'reading media link' });
    try {
      const response = await this.request(handle, '/create', 'POST', { id: handle.id, url });
      if (revision !== this.revision) return;
      await this.accept(await response.json(), revision);
    } catch (error) { if (revision === this.revision) this.onState(null, error instanceof Error ? error.message : 'Could not start import.'); }
  }
  resume() {
    if (this.handle) { this.retry(); return; }
    try {
      const value = JSON.parse(this.storage?.getItem(KEY) || 'null');
      if (!value || !/^[a-f0-9]{32}$/.test(value.id) || !/^[a-f0-9]{64}$/.test(value.token)) return;
      this.handle = value; this.controller = new AbortController();
      void this.poll(this.revision);
    } catch { try { this.storage?.removeItem(KEY); } catch {} }
  }
  retry() {
    if (!this.handle || this.receiving) return;
    this.stop(); this.controller = new AbortController(); this.failures = 0;
    void this.poll(this.revision);
  }
  async choose(candidateId: string, mode: string) {
    if (!this.handle) return;
    const revision = this.revision;
    try {
      const response = await this.request(this.handle, '/download', 'POST', { candidateId, mode });
      if (revision === this.revision) await this.accept(await response.json(), revision);
    } catch (error) { if (revision === this.revision) this.onState(null, error instanceof Error ? error.message : 'Could not start download.'); }
  }
  private async poll(revision: number) {
    if (!this.handle || revision !== this.revision) return;
    try {
      const response = await this.request(this.handle);
      if (revision !== this.revision) return;
      this.failures = 0;
      await this.accept(await response.json(), revision);
    } catch (error) {
      if (revision !== this.revision) return;
      this.onState(null, error instanceof Error ? error.message : 'Connection interrupted. Retry to reconnect.');
      if (++this.failures <= 3) this.timer = setTimeout(() => void this.poll(revision), 3000 * this.failures);
    }
  }
  private async accept(job: ImportJob, revision: number) {
    if (revision !== this.revision || !this.handle) return;
    this.onState(job);
    if (job.state === 'ready') {
      if (this.receiving) return;
      this.receiving = true;
      try {
        if (!job.bytes || job.bytes > MAX_BYTES || !job.filename || !job.mime || !job.provenance) throw new Error('Invalid downloaded media.');
        const response = await this.request(this.handle, '/file');
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No media received.');
        const chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_BYTES || size > job.bytes) throw new Error('Downloaded media exceeds the size limit.');
            chunks.push(new Uint8Array(value));
            if (revision !== this.revision) return;
            this.onState({ ...job, message: 'saving to this browser', progress: Math.round(size / job.bytes * 100) });
          }
        } finally { await reader.cancel().catch(() => {}); }
        if (revision !== this.revision) return;
        if (size !== job.bytes) throw new Error('Download interrupted. Retry to receive the complete file.');
        const handle = this.handle;
        await this.onFile(new File(chunks, job.filename, { type: job.mime }), job.provenance, handle.id, this.controller!.signal);
        if (revision !== this.revision) return;
        this.handle = null; this.remember();
        this.onState(null);
        // The local copy now owns the media. An unsuccessful acknowledgment expires by TTL.
        void this.request(handle, '', 'DELETE', undefined, AbortSignal.timeout(5000)).catch(() => {});
      } finally { if (revision === this.revision) this.receiving = false; }
    } else if (!['choosing', 'failed'].includes(job.state)) {
      this.timer = setTimeout(() => void this.poll(revision), 1200);
    }
  }
  async cancel() {
    const handle = this.handle;
    this.stop(); this.handle = null; this.remember(); this.onState(null);
    if (handle) await this.request(handle, '', 'DELETE', undefined, AbortSignal.timeout(5000)).catch(() => {});
  }
}
