import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import alertsHandler, { buildAlertMessage, sendToSilais } from './alerts';
import type { ApiRequest, ApiResponse } from '../_types.js';

interface Captured {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

const makeRes = (): { res: ApiResponse; captured: Captured } => {
  const captured: Captured = { status: 200, headers: {}, body: undefined };
  const res = {
    status(code: number) {
      captured.status = code;
      return res;
    },
    json(data: unknown) {
      captured.body = data;
      return res;
    },
    setHeader(key: string, value: string) {
      captured.headers[key] = value;
      return res;
    },
    send(data: unknown) {
      captured.body = data;
      return res;
    },
    end() {
      return res;
    },
  };
  return { res: res as unknown as ApiResponse, captured };
};

let ipCounter = 0;
const makeReq = (over: Partial<ApiRequest> = {}): ApiRequest =>
  ({
    method: 'POST',
    url: '/api/alerts',
    headers: { 'x-forwarded-for': `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}` },
    query: {},
    body: {
      name: 'Maria Lopez',
      alertType: 'Ideacion suicida',
      department: 'Managua',
      municipality: 'Managua',
      address: 'Barrio Santa Ana',
      lat: 12.136378,
      lng: -86.251376,
      phone: '88888888',
      note: 'Tengo un plan',
    },
    ...over,
  }) as ApiRequest;

const originalToken = process.env.WHATSAPP_TOKEN;
const originalPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const originalTemplate = process.env.WHATSAPP_TEMPLATE_NAME;

beforeEach(() => {
  process.env.WHATSAPP_TOKEN = 'test-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
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

describe('buildAlertMessage', () => {
  it('incluye los datos esenciales y el link de mapa', () => {
    const msg = buildAlertMessage({
      name: 'Maria Lopez',
      alertType: 'Intento de autolisis',
      department: 'Chinandega',
      municipality: 'Chinandega',
      address: 'Calle 1',
      lat: 12.628,
      lng: -87.146,
      phone: '88888888',
      note: 'Ultima frase del usuario',
    });
    expect(msg).toContain('ALERTA SILAIS');
    expect(msg).toContain('Intento de autolisis');
    expect(msg).toContain('Maria Lopez');
    expect(msg).toContain('Chinandega');
    expect(msg).toContain('Calle 1');
    expect(msg).toContain('12.628000, -87.146000');
    expect(msg).toContain('maps.google.com/?q=12.628,-87.146');
    expect(msg).toContain('88888888');
    expect(msg).toContain('Ultima frase del usuario');
    expect(msg).toContain('hora de Nicaragua');
  });

  it('usa "Por confirmar" cuando faltan ubicacion y coordenadas', () => {
    const msg = buildAlertMessage({ name: 'Ana', alertType: 'Crisis' });
    expect(msg).toContain('Departamento: Por confirmar');
    expect(msg).toContain('Municipio: Por confirmar');
    expect(msg).not.toContain('Coordenadas:');
    expect(msg).not.toContain('Telefono:');
  });
});

describe('POST /api/alerts', () => {
  it('rechaza metodos que no sean POST', async () => {
    const { res, captured } = makeRes();
    await alertsHandler(makeReq({ method: 'GET' }), res);
    expect(captured.status).toBe(405);
  });

  it('valida name y alertType', async () => {
    const { res, captured } = makeRes();
    await alertsHandler(makeReq({ body: { name: '', alertType: '' } }), res);
    expect(captured.status).toBe(400);
    expect((captured.body as { error: string }).error).toMatch(/name y alertType/);
  });

  it('devuelve 503 si falta la configuracion de WhatsApp', async () => {
    delete process.env.WHATSAPP_TOKEN;
    const { res, captured } = makeRes();
    await alertsHandler(makeReq(), res);
    expect(captured.status).toBe(503);
  });

  it('envia texto libre a graph.facebook.com y responde ok', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ messages: [{ id: 'wamid.ABC' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { res, captured } = makeRes();
    await alertsHandler(makeReq(), res);

    expect(captured.status).toBe(200);
    expect(captured.body).toEqual({ ok: true, waMessageId: 'wamid.ABC' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v21.0/123456/messages');
    const payload = JSON.parse(String(init.body));
    expect(payload.to).toBe('50584132841');
    expect(payload.type).toBe('text');
    expect(payload.text.body).toContain('Maria Lopez');
    expect(String((init.headers as Record<string, string>).Authorization)).toBe('Bearer test-token');
  });

  it('usa plantilla cuando WHATSAPP_TEMPLATE_NAME esta definida', async () => {
    process.env.WHATSAPP_TEMPLATE_NAME = 'silais_alerta';
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ messages: [{ id: 'wamid.TPL' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { res, captured } = makeRes();
    await alertsHandler(makeReq(), res);

    expect(captured.status).toBe(200);
    const payload = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(payload.type).toBe('template');
    expect(payload.template.name).toBe('silais_alerta');
    expect(payload.template.components[0].parameters[0].text).toContain('Maria Lopez');
  });

  it('devuelve 502 cuando Meta rechaza el mensaje', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { message: 'Invalid parameter', code: 100 } }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const { res, captured } = makeRes();
    await alertsHandler(makeReq(), res);
    expect(captured.status).toBe(502);
    expect((captured.body as { error: string }).error).toMatch(/Invalid parameter/);
  });

  it('limita el numero de alertas por IP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ messages: [{ id: 'wamid.X' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const ip = `10.9.9.${(ipCounter++ % 250) + 1}`;
    let last = 0;
    for (let i = 0; i < 6; i++) {
      const { res, captured } = makeRes();
      await alertsHandler(makeReq({ headers: { 'x-forwarded-for': ip } }), res);
      last = captured.status;
    }
    expect(last).toBe(429);
  });
});

describe('sendToSilais', () => {
  it('no intenta llamar si no hay token', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    delete process.env.WHATSAPP_TOKEN;
    const out = await sendToSilais('hola');
    expect(out).toEqual({ ok: false, status: 503, detail: 'WhatsApp no configurado' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propaga 502 si fetch revienta (sin red)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNRESET');
      })
    );
    const out = await sendToSilais('hola');
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.status).toBe(502);
  });
});
