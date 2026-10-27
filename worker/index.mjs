import { DurableObject } from 'cloudflare:workers';
import { ImportContainer } from './container-runtime.mjs';
import { importGateway } from './import-gateway.mjs';

export class MediaImporter extends DurableObject {
  runtime = new ImportContainer(this.ctx.container);
  fetch(request) { return this.runtime.fetch(request); }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/imports' || path.startsWith('/api/imports/')) return importGateway(request, env);
    return env.ASSETS.fetch(request);
  },
};
