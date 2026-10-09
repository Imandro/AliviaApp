import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createApiServer, type HttpHandler } from './server';
import { strictDatabaseUrl, getPool } from '../_db';

const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
async function start(routes: Record<string, HttpHandler> = {}, overrides: Partial<Parameters<typeof createApiServer>[0]> = {}) {
  const server = createApiServer({
    routes, allowAiRequest: () => true, readiness: async () => {},
    streamChat: async (_body, res) => { res.write('data: {"type":"delta","text":"hola"}\n\n'); res.end('data: {"type":"done"}\n\n'); },
    ...overrides,
  });
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw Error('Missing address');
  return `http://127.0.0.1:${addr.port}`;
}

describe('Portable API HTTP contract', () => {
  it('rejects using socket-only mode to disable TLS for a network database', () => {
    const originalUrl = process.env.DATABASE_URL;
    const originalMode = process.env.DATABASE_TLS_MODE;
    try {
      process.env.DATABASE_TLS_MODE = 'local-socket';
      process.env.DATABASE_URL = 'postgres://user:pass@remote.example/db?host=/var/run/postgresql';
      expect(() => getPool()).toThrow('local PostgreSQL Unix socket');
    } finally {
      if (originalUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalUrl;
      if (originalMode === undefined) delete process.env.DATABASE_TLS_MODE;
      else process.env.DATABASE_TLS_MODE = originalMode;
    }
  });
  it('preserves authorization, JSON, query strings and response status', async () => {
    const base = await start({ '/api/echo': (req, res) => res.status(201).json(req) });
    const response = await fetch(`${base}/api/echo?text=hola%20mundo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ score: 4 }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ query: { text: 'hola mundo' }, body: { score: 4 }, headers: { authorization: 'Bearer test-token' } });
  });
  it('keeps health independent from a failing database and rejects readiness', async () => {
    const base = await start({}, { readiness: async () => { throw Error('offline'); } });
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
    expect((await fetch(`${base}/readyz`)).status).toBe(503);
    expect((await fetch(`${base}/api/unknown`)).status).toBe(404);
    expect((await fetch(`${base}/api/auth/login`, { method: 'OPTIONS' })).status).toBe(204);
  });
  it('rejects malformed JSON without invoking the handler', async () => {
    let calls = 0;
    const base = await start({ '/api/echo': () => { calls++; } });
    const result = await fetch(`${base}/api/echo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
    expect(result.status).toBe(400);
    expect(calls).toBe(0);
  });
  it('rejects requests over the byte limit', async () => {
    const base = await start({ '/api/echo': (_req, res) => res.json({}) }, { maxBodyBytes: 16 });
    const result = await fetch(`${base}/api/echo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(32) }) });
    expect(result.status).toBe(413);
  });
  it('preserves binary TTS audio', async () => {
    const base = await start({ '/api/tts': (_req, res) => { res.setHeader('Content-Type', 'audio/mpeg'); return res.send(Buffer.from([0, 255, 128, 1])); } });
    const result = await fetch(`${base}/api/tts`);
    expect(result.headers.get('content-type')).toBe('audio/mpeg');
    expect([...new Uint8Array(await result.arrayBuffer())]).toEqual([0, 255, 128, 1]);
  });
  it('parses multipart audio without corrupting its bytes', async () => {
    const base = await start({ '/api/ai/transcribe': (req, res) => res.json({ size: req.body.size, bytes: [...req.body.buffer] }) });
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([0, 255, 128])], { type: 'audio/webm' }), 'audio.webm');
    const result = await fetch(`${base}/api/ai/transcribe`, { method: 'POST', body: form });
    expect(await result.json()).toEqual({ size: 3, bytes: [0, 255, 128] });
  });
  it('sends SSE chat and applies the limiter before opening the stream', async () => {
    const base = await start();
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"messages":[]}' };
    const response = await fetch(`${base}/api/ai/chat`, options);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(await response.text()).toContain('"type":"done"');
    const limited = await start({}, { allowAiRequest: () => false });
    expect((await fetch(`${limited}/api/ai/chat`, options)).status).toBe(429);
  });
  it('blocks notification/WhatsApp delivery in staging before calling providers', async () => {
    const base = await start({ '/api/alerts': () => { throw Error('Must not run'); } });
    expect((await fetch(`${base}/api/alerts`, { method: 'POST' })).status).toBe(503);
  });
  it('prevents URL sslmode parameters from overriding strict TLS', () => {
    const parsed = new URL(strictDatabaseUrl('postgres://user:pass@host/db?sslmode=no-verify&sslrootcert=bad&application_name=alivia'));
    expect(parsed.searchParams.has('sslmode')).toBe(false);
    expect(parsed.searchParams.has('sslrootcert')).toBe(false);
    expect(parsed.searchParams.get('application_name')).toBe('alivia');
  });
});
