import { Container } from '@cloudflare/containers';
import { importGateway } from './import-gateway.mjs';

export class MediaImporter extends Container {
  defaultPort = 8091;
  sleepAfter = '35m';
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/imports' || path.startsWith('/api/imports/')) return importGateway(request, env);
    return env.ASSETS.fetch(request);
  },
};
