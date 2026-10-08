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

/* Rate-limit en memoria por IP. El contenedor Lambda no es eterno, pero
 * aguanta varios minutos y basta para disuadir el spam del endpoint publico. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();

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

const validate = (raw: unknown): SilaisAlertInput | null => {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;

  const name = clampStr(b.name, 80);
  const alertType = clampStr(b.alertType, 120);
  if (!name || !alertType) return null;

  const lat = typeof b.lat === 'number' ? b.lat : Number(b.lat);
  const lng = typeof b.lng === 'number' ? b.lng : Number(b.lng);
  const coordOk = (n: number, min: number, max: number): boolean =>
    Number.isFinite(n) && n >= min && n <= max;

  return {
    name,
    alertType,
    phone: clampStr(b.phone, 30),
    department: clampStr(b.department, 80),
    municipality: clampStr(b.municipality, 80),
    address: clampStr(b.address, 160),
    note: clampStr(b.note, 400),
    lat: coordOk(lat, -90, 90) ? lat : undefined,
    lng: coordOk(lng, -180, 180) ? lng : undefined,
  };
};

interface WaTextResponse {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; code?: number };
}

/** Envia el mensaje al SILAIS via WhatsApp Cloud API. */
export const sendToSilais = async (message: string): Promise<{ ok: true; waMessageId?: string } | { ok: false; status: number; detail: string }> => {
  const token = (process.env.WHATSAPP_TOKEN ?? '').trim();
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID ?? '').trim();
  if (!token || !phoneId) return { ok: false, status: 503, detail: 'WhatsApp no configurado' };

  // Meta exige una plantilla aprobada para el primer mensaje fuera de la
  // ventana de 24 h. Si el secreto trae nombre de plantilla (con un unico
  // parametro {{1}}), se envia como template; si no, texto libre.
  const template = (process.env.WHATSAPP_TEMPLATE_NAME ?? '').trim();
  const payload = template
    ? {
        messaging_product: 'whatsapp',
        to: SILAIS_NUMBER,
        type: 'template',
        template: {
          name: template,
          language: { code: 'es' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to: SILAIS_NUMBER,
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

  if (!allow(clientIp(req))) {
    return res.status(429).json({ error: 'Demasiadas alertas, intentalo en unos segundos' });
  }

  const alert = validate(req.body);
  if (!alert) {
    return res.status(400).json({ error: 'Faltan datos: name y alertType son requeridos' });
  }

  const sent = await sendToSilais(buildAlertMessage(alert));
  if (!sent.ok) {
    return res.status(sent.status).json({ error: sent.detail });
  }
  return res.status(200).json({ ok: true, waMessageId: sent.waMessageId ?? null });
}
