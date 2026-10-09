import { routes } from '../lambda/router.js';
import { streamChat } from '../lambda/ai-handler.js';
import aiHandler, { allowAiRequest } from '../ai.js';
import ttsHandler from '../tts.js';
import alertsHandler from '../alerts.js';
import { getPool, ensureSchema, ensureFunctions } from '../_db.js';
import { createApiServer } from './server.js';

if (!['verify-full', 'local-socket'].includes(process.env.DATABASE_TLS_MODE || '')) {
  throw new Error('The Azure API requires verified TLS or a local Unix socket');
}
await ensureSchema();
await ensureFunctions();
const server = createApiServer({
  routes: { ...routes, '/api/posts/like': routes['/api/posts'], '/api/ai/chat': aiHandler, '/api/ai/transcribe': aiHandler, '/api/tts': ttsHandler, '/api/alerts': alertsHandler },
  streamChat: async (body, output) => streamChat({
    version: '2.0', rawPath: '/api/ai/chat', body: JSON.stringify(body ?? {}),
    requestContext: { http: { method: 'POST', path: '/api/ai/chat' } },
  }, { write: chunk => { if (!output.destroyed) output.write(chunk); }, end: () => output.end() }),
  allowAiRequest,
  readiness: async () => { await getPool().query('SELECT 1'); },
  allowExternalNotifications: process.env.ALLOW_EXTERNAL_NOTIFICATIONS === 'true',
});
const port = Number(process.env.PORT || 8080);
server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Alivia API listening on port ${port}`));
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    const timeout = setTimeout(() => process.exit(1), 25_000);
    timeout.unref();
    server.close(() => {
      getPool().end().catch(() => {}).finally(() => process.exit(0));
    });
  });
}
