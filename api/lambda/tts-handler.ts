import type { LambdaEvent } from './adapter.js';
import { LambdaResponse, createApiRes, parseEvent } from './adapter.js';
import { applyCors } from '../_cors.js';
import ttsHandler from '../tts.js';

/**
 * El TTS es la unica parte de la API que llama a servicios externos
 * (Bing Edge TTS y Google Translate). Esa Lambda NO esta en el VPC, asi que
 * conserva salida a internet sin pagar un NAT Gateway (~$32/mes).
 */
export async function handler(event: LambdaEvent): Promise<LambdaResponse> {
  const { method, path, query, body, headers } = parseEvent(event);

  if (path !== '/api/tts' && path !== '/tts') {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' }),
    };
  }

  const req = { method, url: path, query, body, headers } as never;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: LambdaResponse) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const res = createApiRes((_err, result) => finish(result));

    if (applyCors(req, res as never)) {
      res.end();
      return;
    }

    Promise.resolve(ttsHandler(req, res as never))
      .catch((err) => {
        console.error('TTS handler error:', err);
        if (!settled) {
          res.status(500).json({ error: 'TTS no disponible' });
          res.end();
        }
      })
      .finally(() => {
        if (!settled) res.end();
      });
  });
}
