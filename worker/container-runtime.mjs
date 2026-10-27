async function bounded(promise, label, ms = 90_000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Container ${label} timed out`)), ms);
    })]);
  } finally { clearTimeout(timer); }
}

export class ImportContainer {
  constructor(container) { this.container = container; }
  ready = null;
  prepared = false;

  async prepare() {
    const container = this.container;
    const image = container.images.importer;
    const running = container.running ? await bounded(container.inspect(), 'inspection') : null;
    // Each Worker version selects its pinned image. A deploy replaces stale instances.
    if (running && running.image !== image) await bounded(container.destroy(), 'image replacement');
    if (!container.running) container.start({
      image, instance: 'standard-1', enableInternet: true,
      entrypoint: ['/usr/local/bin/python', '/app/server.py'],
      env: { IMPORT_BIND: '0.0.0.0', PORT: '8091', PYTHONUNBUFFERED: '1', PATH: '/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin' },
    });
    let stopped;
    void container.monitor().then(
      () => { stopped = new Error('Media importer exited during startup'); },
      error => { stopped = error instanceof Error ? error : new Error(String(error)); },
    );
    await bounded(container.setInactivityTimeout(35 * 60 * 1000), 'idle timeout setup');
    const port = container.getTcpPort(8091);
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      if (stopped) throw stopped;
      try {
        const response = await bounded(port.fetch('http://container/health', { signal: AbortSignal.timeout(5000) }), 'health check', 5000);
        await response.body?.cancel();
        if (response.ok) return;
      } catch { /* Startup is asynchronous; wait for the HTTP service to listen. */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    await bounded(container.destroy(), 'shutdown');
    throw new Error('Media importer startup timed out');
  }

  async fetch(request) {
    // One shared readiness attempt per shard, even when multiple requests arrive cold.
    if (!this.ready || (this.prepared && !this.container.running)) {
      this.prepared = false;
      this.ready = this.prepare().then(() => { this.prepared = true; }).catch(error => { this.ready = null; throw error; });
    }
    await this.ready;
    return this.container.getTcpPort(8091).fetch(request);
  }
}
