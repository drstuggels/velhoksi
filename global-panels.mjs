import { masterVolume, setMasterVolume } from './preferences.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const size = bytes => `${(bytes / 1048576).toFixed(1)} MB`;
let library;
let loading;
let downloading = null;
let cancelling = false;
let clearing = false;
let inventory;

// Downloads use compressed files only. This engine never opens an audio context.
async function recordings() {
  if (!loading) loading = Promise.all([import('./ear-training/audio.mjs'), import('./ear-training/instruments.mjs')])
    .then(([{ SampleEngine }, { INSTRUMENTS }]) => (library = { engine: new SampleEngine(), instruments: INSTRUMENTS }))
    .catch(error => { loading = null; throw error; });
  return loading;
}

function status(message = '') { $('#offline-status').textContent = message; }
function connection() {
  $('#offline-connection').textContent = navigator.onLine ? 'online' : 'offline';
  $('#offline-connection').dataset.online = String(navigator.onLine);
}

async function appStorage() {
  const label = $('#offline-app-status');
  try {
    const keys = (await caches.keys()).filter(key => /^velhoksi-v\d+$/.test(key));
    const core = [
      '/index.html', '/app.js', '/styles.css', '/global-panels.mjs', '/preferences.mjs',
      '/data/word-lists.json', '/vendor/abcjs-basic-min.js', '/vendor/dattorro/dattorroReverb.js',
      '/ear-training/ear.css', '/audio/samples/manifest.json',
      ...['ui', 'analysis', 'audio', 'theory', 'instruments', 'challenges', 'shortcuts', 'drone'].map(name => `/ear-training/${name}.mjs`),
    ];
    const ready = await Promise.all(keys.map(async key => {
      const cache = await caches.open(key);
      const stored = new Set((await cache.keys()).map(request => new URL(request.url).pathname));
      return core.every(path => stored.has(path));
    }));
    label.textContent = ready.some(Boolean) ? 'app cached' : 'app not fully cached · reconnect and reload';
  } catch { label.textContent = 'app storage unavailable'; }
}

function renderBanks() {
  const { instruments } = library;
  $('#offline-banks').innerHTML = [...new Set(instruments.map(item => item.family))].map(family => {
    const banks = instruments.filter(item => item.family === family);
    const complete = banks.filter(item => {
      const bank = inventory?.instruments?.[item.id];
      return bank && bank.count === bank.total;
    }).length;
    return `<section class="offline-family"><h4>${esc(family)}<span aria-label="${complete} of ${banks.length} instruments downloaded">${complete} / ${banks.length}</span></h4><div class="offline-bank-grid">${banks.map(item => {
      const bank = inventory?.instruments?.[item.id];
      const saved = bank && bank.count === bank.total;
      const busy = downloading === item.id;
      return `<div class="offline-bank ${saved ? 'is-saved' : ''} ${busy ? 'is-downloading' : ''}" data-bank="${item.id}">
        <div><strong>${esc(item.name)}</strong><span class="offline-bank-meta">${bank ? size(bank.size) : 'storage unavailable'}</span>${bank ? `<span class="offline-bank-state">${saved ? 'downloaded' : bank.count ? `${bank.count} / ${bank.total} recordings` : 'not downloaded'}</span>` : ''}</div>
        <button class="text-button" type="button" data-download="${item.id}" aria-label="${saved ? 'Downloaded' : 'Download'} ${esc(item.name)}" ${saved || !inventory?.available || downloading || clearing ? 'disabled' : ''}>${saved ? '✓' : busy ? '…' : bank?.count ? 'resume ↓' : 'download ↓'}</button>
        <progress max="${bank?.total || 1}" value="${bank?.count || 0}" aria-label="${esc(item.name)} download" ${busy || (bank?.count && !saved) ? '' : 'hidden'}></progress>
      </div>`;
    }).join('')}</div></section>`;
  }).join('');
  $('#offline-storage').textContent = inventory?.available ? `${size(inventory.bytes)} stored` : 'recording storage unavailable';
  $('#offline-remove').disabled = Boolean(downloading || clearing || !inventory?.available || !inventory.bytes);
  $('#offline-cancel').hidden = !downloading;
  $('#offline-cancel').disabled = cancelling;
}

async function refreshRecordings() {
  await recordings();
  inventory = await library.engine.cacheInfo();
  renderBanks();
}

async function refreshPreferences() {
  connection();
  syncVolume();
  await Promise.all([appStorage(), refreshRecordings().catch(error => status(error.message || 'Recordings could not load. Reconnect and reopen preferences.'))]);
}

async function download(id) {
  if (downloading || clearing) return;
  downloading = id;
  cancelling = false;
  renderBanks();
  const name = library.instruments.find(item => item.id === id).name;
  status(`Downloading ${name}…`);
  try {
    const complete = await library.engine.downloadInstrument(id, (count, total) => {
      const progress = $(`[data-bank="${id}"] progress`);
      if (progress) { progress.max = total; progress.value = count; }
      if (!cancelling) status(`${name} · ${count} / ${total}`);
    }, () => cancelling);
    status(complete ? `${name} downloaded.` : 'Download stopped. Completed recordings are kept.');
  } catch (error) { status(error.message || 'Download failed. Reconnect to resume.'); }
  finally {
    downloading = null;
    cancelling = false;
    await refreshRecordings().catch(error => status(error.message));
  }
}

async function removeRecordings() {
  if (downloading || clearing) return;
  clearing = true;
  renderBanks();
  status('Removing recordings…');
  try {
    // Let any in-flight audition finish its cache write before deleting recordings.
    const pending = [];
    document.dispatchEvent(new CustomEvent('velhoksi:clear-recordings', { detail: { waitUntil: promise => pending.push(promise) } }));
    await Promise.all(pending);
    await library.engine.clearCache();
    status('Downloaded recordings removed.');
  } catch (error) { status(error.message || 'Recordings could not be removed.'); }
  finally {
    clearing = false;
    await refreshRecordings().catch(error => status(error.message));
  }
}

function syncVolume() {
  $('#global-volume').value = masterVolume();
  $('#global-volume-value').textContent = `${Math.round(masterVolume() * 100)}%`;
}
$('#global-volume').addEventListener('input', event => setMasterVolume(Number(event.target.value)));
window.addEventListener('velhoksi:volume', syncVolume);
window.addEventListener('online', connection);
window.addEventListener('offline', connection);
$('#offline-banks').addEventListener('click', event => {
  const button = event.target.closest('[data-download]');
  if (button && !button.disabled) download(button.dataset.download);
});
$('#offline-cancel').addEventListener('click', () => {
  cancelling = true;
  $('#offline-cancel').disabled = true;
  status('Stopping after the current recording…');
});
$('#offline-remove').addEventListener('click', removeRecordings);

for (const button of document.querySelectorAll('[data-global-panel]')) {
  const dialog = $(`#${button.dataset.globalPanel}-dialog`);
  button.addEventListener('click', () => {
    document.dispatchEvent(new Event('velhoksi:global-panel-open'));
    dialog.showModal();
    dialog.querySelector('h2').focus({ preventScroll: true });
    if (button.dataset.globalPanel === 'preferences') refreshPreferences();
  });
  dialog.querySelector('[data-close-global]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => button.focus({ preventScroll: true }));
}
syncVolume();
