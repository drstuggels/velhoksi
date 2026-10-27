import { ImportClient, type ImportJob, type Provenance } from './import-client';
import { time } from './marks';

export function createImporter(root: ShadowRoot, onFile: (file: File, source: Provenance, id: string, signal: AbortSignal) => Promise<void>, onBegin: () => void) {
  const $ = <T extends HTMLElement>(id: string) => root.getElementById(id) as T;
  const dialog = $<HTMLDialogElement>('link-dialog');
  const input = $<HTMLInputElement>('link-url');
  const button = $<HTMLButtonElement>('resolve-link');
  const cancel = $<HTMLButtonElement>('cancel-import');
  const retry = $<HTMLButtonElement>('retry-import');
  const status = $('import-status');
  const indicator = $('import-indicator');
  const list = $('import-candidates');
  const progress = $<HTMLProgressElement>('import-progress');
  const mode = $<HTMLSelectElement>('import-mode');
  let current: ImportJob | null = null;
  let submitted = false;
  let client: ImportClient;
  function render(job: ImportJob | null, error?: string) {
    current = job;
    submitted = false;
    status.textContent = error || job?.message || '';
    indicator.textContent = job ? (job.state === 'choosing' ? 'choose recording' : job.message) : error ? 'import needs attention' : '';
    indicator.hidden = !job && !error;
    const busy = !!job && !['choosing', 'failed'].includes(job.state);
    button.disabled = busy; input.disabled = busy;
    cancel.hidden = !client?.pending;
    retry.hidden = !error || !client?.pending;
    progress.hidden = !busy;
    if (typeof job?.progress === 'number') progress.value = job.progress; else progress.removeAttribute('value');
    list.replaceChildren();
    $('import-details').hidden = job?.state !== 'choosing';
    if (job?.state !== 'choosing') return;
    const spotify = job.source === 'spotify';
    mode.value = spotify ? 'audio' : mode.value;
    mode.disabled = spotify;
    $('import-track').textContent = `${job.track?.artists.join(', ')} · ${job.track?.title}${job.track?.duration ? ` · ${time(job.track.duration)}` : ''}`;
    $('match-help').textContent = spotify ? 'Choose the recording to practice. These are YouTube matches; versions can differ.' : 'Save this recording in your browser for practice.';
    for (const [index, candidate] of (job.candidates || []).entries()) {
      const row = document.createElement('div'); row.className = 'import-candidate';
      const text = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = candidate.title;
      const detail = document.createElement('span'); detail.textContent = `${candidate.artist}${candidate.duration ? ` · ${time(candidate.duration)}` : ''}${spotify && index === 0 ? ' · suggested' : ''}`;
      const source = document.createElement('a'); source.textContent = 'view source ↗'; source.href = candidate.url;
      source.target = '_blank'; source.rel = 'noopener noreferrer';
      text.append(title, detail, source);
      const choose = document.createElement('button'); choose.type = 'button'; choose.textContent = spotify ? 'use recording' : 'import';
      choose.addEventListener('click', () => {
        if (submitted) return; submitted = true;
        list.querySelectorAll('button').forEach(b => { b.disabled = true; });
        void client.choose(candidate.id, mode.value);
      });
      row.append(text, choose); list.append(row);
    }
  }
  let storage: Storage | undefined;
  try { storage = window.sessionStorage; } catch {}
  client = new ImportClient(render, async (...args) => { await onFile(...args); if (dialog.open) dialog.close(); }, storage);
  function open(url?: string) {
    if (url) input.value = url;
    if (!dialog.open) dialog.showModal();
    if (!input.disabled) input.focus();
  }
  for (const id of ['open-link', 'import-indicator']) $(id).addEventListener('click', () => open());
  $('close-link').addEventListener('click', () => dialog.close());
  $('link-form').addEventListener('submit', event => {
    event.preventDefault(); onBegin();
    void client.begin(input.value.trim()).catch(error => render(null, error instanceof Error ? error.message : 'Paste a complete media URL.'));
  });
  cancel.addEventListener('click', () => { void client.cancel(); });
  retry.addEventListener('click', () => client.retry());
  client.resume();
  return {
    open,
    cancel: () => client.cancel(),
    state: () => current,
  };
}
