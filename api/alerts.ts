/* ----------------------------------------------------
   ALIVIA - ALERTA SILAIS POR WHATSAPP (Meta Cloud API)
   Recibe los datos esenciales del paciente desde el cliente
   y los envia al numero del SILAIS (+505 8413 2841).

   Corre en una Lambda FUERA del VPC (ver api/lambda/alert-handler.ts):
   graph.facebook.com no alcanzable desde la VPC sin NAT Gateway.
   ---------------------------------------------------- */

import type { ApiRequest, ApiResponse } from './_types.js';

const SILAIS_NUMBER = process.env.SILAIS_NUMBER || '50584132841';
const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

/** Prefijo de las pruebas tecnicas: sendToSilais las redirige al numero de
 *  prueba (SILAIS_TEST_NUMBER) y, si no hay numero configurado, NO envia
 *  nada. Asi una prueba jamas llega al SILAIS real. */
export const PRUEBA_PREFIX = '[PRUEBA';

/** Tipos oficiales de alerta: mismo listado que src/utils/silaisAlert.ts
 *  (un test de igualdad evita que cliente y servidor se desincronicen).
 *  El servidor solo acepta estos valores: bloquea payloads inventados. */
export const ALERT_TIPOS = [
  'Ideación suicida (pensamientos de quitarse la vida)',
  'Intento de autolesión / autolisis',
  'Sobredosis',
  'Violencia o agresión en curso',
  'Crisis de salud mental severa',
  'Otro',
] as const;

/* Rate-limit en memoria por IP. El contenedor Lambda no es eterno, pero
 * aguanta varios minutos y basta para disuadir el spam del endpoint publico. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();

/* Anti-duplicados: la misma alerta (persona + tipo + zona) no se reenvia
 * dentro de los 10 minutos. Evita que un doble toque o un reintento dispare
 * dos alarmas falsas al SILAIS. */
const DUP_WINDOW_MS = 10 * 60_000;
const recentes = new Map<string, number>();

const allow = (ip: string): boolean => {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    hits.set(ip, list);
    return false;
  }
  list.push(now);
  hits.set(ip, list);
  return true;
};

const clientIp = (req: ApiRequest): string => {
  const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return fwd || String(req.headers['x-real-ip'] ?? '').trim() || 'anon';
};

const clampStr = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

/** Auditoria de cada envio/rechazo (CloudWatch): hora de Nicaragua, IP, tipo. */
const audit = (evento: string, data: Record<string, unknown>): void => {
  try {
    console.log(`[alerts] ${evento} ${JSON.stringify({ hora: horaNicaragua(), ...data })}`);
  } catch {
    /* la auditoria jamas debe tumbar un envio */
  }
};

const normalizeFirma = (s: string): string =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/** Firma de la alerta para anti-duplicados: persona + tipo + zona aproximada,
 *  siempre dentro de la misma IP (reintentos del mismo equipo). */
const fingerprint = (a: SilaisAlertInput, ip: string): string => {
  const coord =
    typeof a.lat === 'number' && typeof a.lng === 'number'
      ? `${a.lat.toFixed(3)},${a.lng.toFixed(3)}` // ~110 m
      : 'sin-coordenadas';
  return `${ip}|${normalizeFirma(a.name)}|${a.alertType}|${coord}`;
};

const esDuplicada = (firma: string): boolean => {
  const now = Date.now();
  if (recentes.size > 400) {
    for (const [k, t] of recentes) if (now - t > DUP_WINDOW_MS) recentes.delete(k);
  }
  const prev = recentes.get(firma);
  return prev !== undefined && now - prev < DUP_WINDOW_MS;
};

const marcarEnviada = (firma: string): void => {
  recentes.set(firma, Date.now());
};

export interface SilaisAlertInput {
  name: string;
  phone?: string;
  department?: string;
  municipality?: string;
  address?: string;
  lat?: number;
  lng?: number;
  alertType: string;
  note?: string;
}

/** Hora de Nicaragua (America/Managua, UTC-6 sin horario de verano). */
const horaNicaragua = (): string => {
  try {
    return new Intl.DateTimeFormat('es-NI', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Managua',
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
};

/** Mensaje que llega al SILAIS: datos esenciales, legibles en el chat. */
export const buildAlertMessage = (a: SilaisAlertInput): string => {
  const lineas = [
    '\u{1F6A8} *ALERTA SILAIS - ALIVIA*',
    `Tipo: ${a.alertType}`,
    `Nombre: ${a.name}`,
  ];
  if (a.phone) lineas.push(`Telefono: ${a.phone}`);
  lineas.push(`Departamento: ${a.department || 'Por confirmar'}`);
  lineas.push(`Municipio: ${a.municipality || 'Por confirmar'}`);
  if (a.address) lineas.push(`Direccion: ${a.address}`);
  if (typeof a.lat === 'number' && typeof a.lng === 'number') {
    lineas.push(`Coordenadas: ${a.lat.toFixed(6)}, ${a.lng.toFixed(6)}`);
    lineas.push(`Mapa: https://maps.google.com/?q=${a.lat},${a.lng}`);
  }
  lineas.push(`Fecha: ${horaNicaragua()} (hora de Nicaragua)`);
  if (a.note) lineas.push(`Nota: ${a.note}`);
  return lineas.join('\n');
};

type ValidateResult = { ok: true; alert: SilaisAlertInput } | { ok: false; error: string };

const validate = (raw: unknown): ValidateResult => {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Faltan datos: name y alertType son requeridos' };
  }
  const b = raw as Record<string, unknown>;

  const name = clampStr(b.name, 80);
  const alertType = clampStr(b.alertType, 120);
  if (!name || !alertType) {
    return { ok: false, error: 'Faltan datos: name y alertType son requeridos' };
  }
  if (!(ALERT_TIPOS as readonly string[]).includes(alertType)) {
    return { ok: false, error: 'alertType no permitido' };
  }

  const lat = typeof b.lat === 'number' ? b.lat : Number(b.lat);
  const lng = typeof b.lng === 'number' ? b.lng : Number(b.lng);
  const coordOk = (n: number, min: number, max: number): boolean =>
    Number.isFinite(n) && n >= min && n <= max;

  return {
    ok: true,
    alert: {
      name,
      alertType,
      phone: clampStr(b.phone, 30),
      department: clampStr(b.department, 80),
      municipality: clampStr(b.municipality, 80),
      address: clampStr(b.address, 160),
      note: clampStr(b.note, 400),
      lat: coordOk(lat, -90, 90) ? lat : undefined,
      lng: coordOk(lng, -180, 180) ? lng : undefined,
    },
  };
};

interface WaTextResponse {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; code?: number };
}

/** Envia el mensaje via WhatsApp Cloud API.
 *  Un mensaje que empieza con [PRUEBA es una prueba tecnica: va SOLO al
 *  numero de prueba (SILAIS_TEST_NUMBER); sin ese numero configurado se
 *  rechaza. Asi ninguna prueba puede llegar al SILAIS real. */
export const sendToSilais = async (message: string): Promise<{ ok: true; waMessageId?: string } | { ok: false; status: number; detail: string }> => {
  const token = (process.env.WHATSAPP_TOKEN ?? '').trim();
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID ?? '').trim();
  if (!token || !phoneId) return { ok: false, status: 503, detail: 'WhatsApp no configurado' };

  const esPrueba = message.trimStart().startsWith(PRUEBA_PREFIX);
  let destino = SILAIS_NUMBER;
  if (esPrueba) {
    const testNumber = (process.env.SILAIS_TEST_NUMBER ?? '').replace(/\D/g, '');
    if (!testNumber) {
      return { ok: false, status: 503, detail: 'Numero de prueba no configurado' };
    }
    destino = testNumber;
  }

  // Meta exige una plantilla aprobada para el primer mensaje fuera de la
  // ventana de 24 h. Si el secreto trae nombre de plantilla (con un unico
  // parametro {{1}}), se envia como template; si no, texto libre.
  const template = (process.env.WHATSAPP_TEMPLATE_NAME ?? '').trim();
  const payload = template
    ? {
        messaging_product: 'whatsapp',
        to: destino,
        type: 'template',
        template: {
          name: template,
          language: { code: 'es' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to: destino,
        type: 'text',
        text: { preview_url: false, body: message },
      };

  try {
    const res = await fetch(`${GRAPH_BASE}/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const body = (await res.json().catch(() => ({}))) as WaTextResponse;
    if (!res.ok) {
      const detail = body.error?.message || `HTTP ${res.status}`;
      console.warn(`[alerts] Meta rechazo la alerta (${res.status}): ${detail}`);
      return { ok: false, status: 502, detail };
    }
    return { ok: true, waMessageId: body.messages?.[0]?.id };
  } catch (err) {
    console.error('[alerts] fallo la llamada a WhatsApp:', err);
    return { ok: false, status: 502, detail: 'Sin respuesta de WhatsApp' };
  }
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const ip = clientIp(req);

  if (!allow(ip)) {
    audit('rechazada', { ip, motivo: 'rate-limit' });
    return res.status(429).json({ error: 'Demasiadas alertas, intentalo en unos segundos' });
  }

  const v = validate(req.body);
  if (!v.ok) {
    audit('rechazada', { ip, motivo: v.error });
    return res.status(400).json({ error: v.error });
  }
  const alert = v.alert;

  const firma = fingerprint(alert, ip);
  if (esDuplicada(firma)) {
    audit('duplicada', { ip, tipo: alert.alertType });
    return res.status(200).json({ ok: true, duplicate: true, waMessageId: null });
  }

  const sent = await sendToSilais(buildAlertMessage(alert));
  if (!sent.ok) {
    audit('rechazada', { ip, motivo: sent.detail });
    return res.status(sent.status).json({ error: sent.detail });
  }

  marcarEnviada(firma);
  audit('enviada', {
    ip,
    tipo: alert.alertType,
    depto: alert.department || 'por confirmar',
    waMessageId: sent.waMessageId ?? null,
  });
  return res.status(200).json({ ok: true, waMessageId: sent.waMessageId ?? null, duplicate: false });
}
