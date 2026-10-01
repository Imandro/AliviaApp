import type { ApiRequest, ApiResponse } from '../_types.js';
import { LambdaEvent, LambdaResponse, createApiRes, parseEvent } from './adapter.js';
import { applyCors } from '../_cors.js';

import loginHandler from '../auth/login.js';
import registerHandler from '../auth/register.js';
import logoutHandler from '../auth/logout.js';
import meHandler from '../auth/me.js';
import profileHandler from '../auth/profile.js';
import moodsHandler from '../moods.js';
import activitiesHandler from '../activities.js';
import assessmentsHandler from '../assessments.js';
import contactsHandler from '../contacts.js';
import plansHandler from '../plans.js';
import postsHandler from '../posts.js';
import notificationPrefsHandler from '../notifications/preferences.js';
import notificationSubsHandler from '../notifications/subscriptions.js';
import notificationTestHandler from '../notifications/test.js';
// El dispatch lo llama el cron de EventBridge cada minuto con CRON_SECRET,
// no un usuario: por eso NO usa getUserFromRequest.
import notificationDispatchHandler from '../notifications/dispatch.js';

type Handler = (req: ApiRequest, res: ApiResponse) => unknown;

const routes: Record<string, Handler> = {
  '/api/auth/login': loginHandler,
  '/api/auth/register': registerHandler,
  '/api/auth/logout': logoutHandler,
  '/api/auth/me': meHandler,
  '/api/auth/profile': profileHandler,
  '/api/moods': moodsHandler,
  '/api/activities': activitiesHandler,
  '/api/assessments': assessmentsHandler,
  '/api/contacts': contactsHandler,
  '/api/plans': plansHandler,
  '/api/posts': postsHandler,
  '/api/notifications/preferences': notificationPrefsHandler,
  '/api/notifications/subscriptions': notificationSubsHandler,
  '/api/notifications/test': notificationTestHandler,
  '/api/notifications/dispatch': notificationDispatchHandler,
  // /api/tts se sirve desde alivia-tts (Lambda fuera del VPC); ver infra/web.yaml.
};

export async function route(event: LambdaEvent): Promise<LambdaResponse> {
  const { method, path, query, body, headers } = parseEvent(event);

  const handler = routes[path];
  if (!handler) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' }),
    };
  }

  const req = {
    method,
    url: path,
    query,
    body,
    headers,
  } as ApiRequest;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: LambdaResponse) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const res = createApiRes((_err, result) => finish(result));

    if (applyCors(req, res as unknown as ApiResponse)) {
      res.end();
      return;
    }

    Promise.resolve(handler(req, res as unknown as ApiResponse))
      .catch((err) => {
        console.error('Handler error:', err);
        if (!settled) {
          res.status(500).json({ error: 'Internal server error' });
          res.end();
        }
      })
      .finally(() => {
        // Si el handler Lanzo antes de responder, cerramos la respuesta.
        if (!settled) res.end();
      });
  });
}
