const idPattern = /^[a-f0-9]{32}$/;
const tokenPattern = /^[a-f0-9]{64}$/;
const json = (status, error) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

/** Validate before starting a paid container; never relay caller-supplied auth headers. */
export async function importGateway(request, env) {
  const url = new URL(request.url);
  const match = /^\/api\/imports(?:\/([a-f0-9]{32})(\/download|\/file)?)?$/.exec(url.pathname);
  if (!match || url.search) return json(404, 'Not found.');
  const [, existingId, operation] = match;
  const allowed = !existingId ? ['POST'] : operation === '/download' ? ['POST'] : operation === '/file' ? ['GET'] : ['GET', 'DELETE'];
  if (!allowed.includes(request.method)) return json(405, 'Method not allowed.');
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site' ||
      (request.headers.has('Origin') && request.headers.get('Origin') !== url.origin)) return json(403, 'Use Wait to import media.');
  const token = request.headers.get('X-Import-Token') ?? '';
  if (!tokenPattern.test(token)) return json(403, 'Invalid import token.');
  let body, id = existingId;
  if (request.method === 'POST') {
    if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') return json(415, 'Expected JSON.');
    // Bound the actual stream, not just the declared Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json(400, 'Missing import request.');
    const chunks = []; let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return json(413, 'Request is too large.'); }
      chunks.push(value);
    }
    try {
      body = JSON.parse(await new Blob(chunks).text());
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    } catch { return json(400, 'Invalid import request.'); }
    if (!existingId) {
      id = body.id;
      if (typeof id !== 'string' || !idPattern.test(id) || typeof body.url !== 'string' || body.url.length > 2048) return json(400, 'Enter a complete media link.');
      try {
        const source = new URL(body.url);
        if (!['http:', 'https:'].includes(source.protocol) || source.username || source.password ||
            (source.port && !['80', '443'].includes(source.port)) || /[\s\x00-\x1f]/.test(body.url)) throw new Error();
      } catch { return json(400, 'Use a complete public http or https media link without login details.'); }
    }
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    if (env.IMPORT_RATE_LIMIT && !(await env.IMPORT_RATE_LIMIT.limit({ key: ip })).success) return json(429, 'Too many imports. Please try again shortly.');
  }
  const owner = request.headers.get('CF-Connecting-IP') || 'local';
  const headers = new Headers({ 'X-Import-Token': token, 'X-Import-Owner': owner });
  const serialized = body ? JSON.stringify(body) : undefined;
  if (serialized) {
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Length', String(new TextEncoder().encode(serialized).byteLength));
  }
  // Two fixed shards bound global capacity; random job IDs distribute work and keep routing stable.
  const shard = parseInt(id.slice(0, 2), 16) % 2;
  try {
    const response = await env.MEDIA_IMPORT.getByName(`imports-${shard}`).fetch(new Request(
      `http://container${url.pathname}`, { method: request.method, headers, body: serialized, signal: request.signal },
    ));
    const output = new Headers();
    for (const name of ['Content-Type', 'Content-Length', 'Retry-After']) {
      const value = response.headers.get(name); if (value) output.set(name, value);
    }
    output.set('Cache-Control', 'private, no-store');
    output.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, { status: response.status, headers: output });
  } catch {
    return json(503, 'The importer is temporarily unavailable. Please retry or open a local file.');
  }
}
