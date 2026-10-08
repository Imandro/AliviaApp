import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handler } from './alert-handler';
import type { LambdaEvent } from './adapter';

/**
 * Prueba de punta a punta del bot: evento de API Gateway → alert-handler →
 * api/alerts.ts → graph.facebook.com (WhatsApp Cloud API). La red se stubea:
 * verificar que el payload que sale hacia Meta es exactamente el mensaje del
 * SILAIS es la parte que no se puede probar contra la API real sin token.
 */

let ipSeq = 0;

const makeEvent = (over: Partial<LambdaEvent> = {}): LambdaEvent => {
  const method = over.requestContext?.http?.method ?? over.httpMethod ?? 'POST';
  const path = over.rawPath ?? over.path ?? '/api/alerts';
  return {
    version: '2.0',
    rawPath: path,
    requestContext: { http: { method, path } },
    headers: { 'x-forwarded-for': `172.16.0.${(ipSeq++ % 250) + 1}` },
    ...over,
    ...(over.body ? { body: typeof over.body === 'string' ? over.body : JSON.stringify(over.body) } : {}),
  } as LambdaEvent;
};

const alertBody = {
  name: 'María López',
  phone: '88887777',
  department: 'Managua',
  municipality: 'Managua',
  address: 'Barrio Santa Ana, casa roja',
  lat: 12.136378,
  lng: -86.251376,
  alertType: 'Ideación suicida (pensamientos de quitarse la vida)',
  note: 'Tengo un plan y pastillas guardadas',
};

const graphOk = () =>
  vi.fn(async () =>
    new Response(JSON.stringify({ messages: [{ id: 'wamid.INTEGRATION123' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );

const originalToken = process.env.WHATSAPP_TOKEN;
const originalPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const originalTemplate = process.env.WHATSAPP_TEMPLATE_NAME;

beforeEach(() => {
  process.env.WHATSAPP_TOKEN = 'EAAG-test-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '999888777';
  delete process.env.WHATSAPP_TEMPLATE_NAME;
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalToken === undefined) delete process.env.WHATSAPP_TOKEN;
  else process.env.WHATSAPP_TOKEN = originalToken;
  if (originalPhoneId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  else process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneId;
  if (originalTemplate === undefined) delete process.env.WHATSAPP_TEMPLATE_NAME;
  else process.env.WHATSAPP_TEMPLATE_NAME = originalTemplate;
});

describe('alert-handler — flujo completo del bot', () => {
  it('entrega la alerta a graph.facebook.com y responde ok', async () => {
    const fetchMock = graphOk();
    vi.stubGlobal('fetch', fetchMock);

    const res = await handler(makeEvent({ body: alertBody }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true, waMessageId: 'wamid.INTEGRATION123' });

    // Una sola llamada saliente, al endpoint de WhatsApp del número de la app.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v21.0/999888777/messages');
    expect(String((init.headers as Record<string, string>).Authorization)).toBe('Bearer EAAG-test-token');

    const payload = JSON.parse(String(init.body));
    expect(payload.messaging_product).toBe('whatsapp');
    expect(payload.to).toBe('50584132841');
    expect(payload.type).toBe('text');

    // El mensaje es el texto completo con los datos esenciales del paciente.
    const text: string = payload.text.body;
    for (const fragment of [
      'ALERTA SILAIS',
      'Ideación suicida',
      'María López',
      '88887777',
      'Departamento: Managua',
      'Municipio: Managua',
      'Barrio Santa Ana, casa roja',
      '12.136378, -86.251376',
      'maps.google.com/?q=12.136378,-86.251376',
      'hora de Nicaragua',
      'Tengo un plan y pastillas guardadas',
    ]) {
      expect(text).toContain(fragment);
    }

    // Vista previa: así se veriría el mensaje entrante en el WhatsApp del SILAIS.
    // eslint-disable-next-line no-console
    console.log(
      `\n—— Mensaje que recibe el SILAIS (+505 8413 2841) ——\n${text}\n${'—'.repeat(54)}`
    );
  });

  it('aplica plantilla de Meta cuando WHATSAPP_TEMPLATE_NAME está definida', async () => {
    process.env.WHATSAPP_TEMPLATE_NAME = 'silais_alerta';
    const fetchMock = graphOk();
    vi.stubGlobal('fetch', fetchMock);

    const res = await handler(makeEvent({ body: alertBody }));
    expect(res.statusCode).toBe(200);

    const payload = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(payload.type).toBe('template');
    expect(payload.template.name).toBe('silais_alerta');
    expect(payload.template.language.code).toBe('es');
    expect(payload.template.components[0].parameters[0].text).toContain('María López');
  });

  it('responde 502 si Meta rechaza el mensaje', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { message: '(#100) Invalid parameter', code: 100 } }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const res = await handler(makeEvent({ body: alertBody }));
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toContain('Invalid parameter');
  });

  it('responde 503 si falta el token de Meta (secreto sin configurar)', async () => {
    delete process.env.WHATSAPP_TOKEN;
    const res = await handler(makeEvent({ body: alertBody }));
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).error).toMatch(/WhatsApp no configurado|configur/i);
  });

  it('valida nombre y tipo de alerta (400)', async () => {
    const res = await handler(makeEvent({ body: { name: '', alertType: '' } }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/name y alertType/);
  });

  it('responde 405 a un método que no sea POST', async () => {
    const res = await handler(
      makeEvent({ requestContext: { http: { method: 'GET', path: '/api/alerts' } }, body: undefined })
    );
    expect(res.statusCode).toBe(405);
  });

  it('responde 404 a rutas que no son /api/alerts', async () => {
    const res = await handler(
      makeEvent({ rawPath: '/api/otra-cosa', requestContext: { http: { method: 'POST', path: '/api/otra-cosa' } } })
    );
    expect(res.statusCode).toBe(404);
  });

  it('contesta el preflight CORS con 204', async () => {
    const res = await handler(
      makeEvent({ requestContext: { http: { method: 'OPTIONS', path: '/api/alerts' } }, body: undefined })
    );
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Content-Type');
  });

  it('acepta /alerts sin prefijo /api (como lo enruta CloudFront)', async () => {
    vi.stubGlobal('fetch', graphOk());
    const res = await handler(
      makeEvent({ rawPath: '/alerts', requestContext: { http: { method: 'POST', path: '/alerts' } }, body: alertBody })
    );
    expect(res.statusCode).toBe(200);
  });

  it('limita las alertas por IP (6ª en un minuto → 429)', async () => {
    vi.stubGlobal('fetch', graphOk());
    const ip = `10.20.${ipSeq % 250}.${(ipSeq++ % 250) + 1}`;
    let last = 0;
    for (let i = 0; i < 6; i++) {
      const res = await handler(
        makeEvent({ headers: { 'x-forwarded-for': ip }, body: alertBody })
      );
      last = res.statusCode;
    }
    expect(last).toBe(429);
  });
});
