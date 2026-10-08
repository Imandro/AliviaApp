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
      alertType: 'Ideación suicida (pensamientos de quitarse la vida)',
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
const originalTestNumber = process.env.SILAIS_TEST_NUMBER;

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
  if (originalTestNumber === undefined) delete process.env.SILAIS_TEST_NUMBER;
  else process.env.SILAIS_TEST_NUMBER = originalTestNumber;
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
    expect(captured.body).toEqual({ ok: true, waMessageId: 'wamid.ABC', duplicate: false });

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
    expect(captured.body).toEqual({ ok: true, waMessageId: 'wamid.TPL', duplicate: false });
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

  it('rechaza alertType fuera de la lista oficial', async () => {
    const { res, captured } = makeRes();
    await alertsHandler(makeReq({ body: { name: 'Test', alertType: 'Tipo inventado' } }), res);
    expect(captured.status).toBe(400);
    expect((captured.body as { error: string }).error).toBe('alertType no permitido');
  });

  it('marca duplicada y no reenvia a Meta (mismo IP + misma alerta en 10 min)', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ messages: [{ id: 'wamid.UNICA' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const ip = `10.8.8.${(ipCounter++ % 250) + 1}`;

    // Primera vez: envio real
    const { res: res1, captured: c1 } = makeRes();
    await alertsHandler(makeReq({ headers: { 'x-forwarded-for': ip } }), res1);
    expect(c1.status).toBe(200);
    expect((c1.body as { ok: boolean }).ok).toBe(true);
    expect((c1.body as { duplicate: boolean }).duplicate).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Segunda vez con misma IP y misma alerta: duplicada
    const { res: res2, captured: c2 } = makeRes();
    await alertsHandler(makeReq({ headers: { 'x-forwarded-for': ip } }), res2);
    expect(c2.status).toBe(200);
    expect((c2.body as { ok: boolean }).ok).toBe(true);
    expect((c2.body as { duplicate: boolean }).duplicate).toBe(true);
    expect((c2.body as { waMessageId: null }).waMessageId).toBeNull();
    // Meta NO debe haberse llamado de nuevo
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('auditoria: loguea envio, duplicada y rechazo', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ messages: [{ id: 'wamid.AUDIT' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const ip = `10.7.7.${(ipCounter++ % 250) + 1}`;

    // Envio exitoso
    await alertsHandler(makeReq({ headers: { 'x-forwarded-for': ip } }), makeRes().res);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\[alerts\] enviada/));

    // Duplicada
    await alertsHandler(makeReq({ headers: { 'x-forwarded-for': ip } }), makeRes().res);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\[alerts\] duplicada/));

    // Rechazo por allowlist
    await alertsHandler(makeReq({ headers: { 'x-forwarded-for': ip }, body: { name: 'X', alertType: 'Inventado' } }), makeRes().res);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\[alerts\] rechazada/));

    logSpy.mockRestore();
  });
});

describe('ALERT_TIPOS — servidor === cliente (evita desincronizacion)', () => {
  it('el servidor exporta la misma lista que src/utils/silaisAlert.ts', async () => {
    const { ALERT_TIPOS: SERVER } = await import('./alerts');
    const { ALERT_TIPOS: CLIENT } = await import('../src/utils/silaisAlert');
    expect([...SERVER]).toEqual([...CLIENT]);
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

  it('redirige mensajes [PRUEBA al numero de prueba', async () => {
    process.env.SILAIS_TEST_NUMBER = '50577776666';
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ messages: [{ id: 'wamid.TEST' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const out = await sendToSilais('[PRUEBA ALIVIA - NO ES UNA EMERGENCIA]\nPrueba');
    expect(out.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    expect(payload.to).toBe('50577776666');
  });

  it('rechaza [PRUEBA si no hay numero de prueba configurado', async () => {
    delete process.env.SILAIS_TEST_NUMBER;
    const out = await sendToSilais('[PRUEBA ALIVIA - NO ES UNA EMERGENCIA]\nPrueba');
    expect(out).toEqual({ ok: false, status: 503, detail: 'Numero de prueba no configurado' });
  });
});
