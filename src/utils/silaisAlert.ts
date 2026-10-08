/* ----------------------------------------------------
   ALIVIA - ALERTA AL SILAIS POR WHATSAPP
   Recopila los datos esenciales del paciente (nombre,
   ubicación, coordenadas y tipo de alerta), los envía al
   endpoint /api/alerts (que entrega por WhatsApp Cloud API
   al +505 8413 2841) y deja un respaldo wa.me por si la
   red de la app falla.
   ---------------------------------------------------- */

import { API_BASE } from './apiBase';

export const SILAIS_NUMBER = '50584132841';
export const SILAIS_DISPLAY = '+505 8413 2841';

export interface SilaisAlertData {
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

/** Los 15 departamentos de Nicaragua (la Ciudad Managua va en Managua). */
export const DEPARTAMENTOS_NI = [
  'Boaco',
  'Carazo',
  'Chinandega',
  'Chontales',
  'Estelí',
  'Granada',
  'Jinotega',
  'León',
  'Madriz',
  'Managua',
  'Masaya',
  'Matagalpa',
  'Nueva Segovia',
  'Rivas',
  'Río San Juan',
] as const;

export const ALERT_TIPOS = [
  'Ideación suicida (pensamientos de quitarse la vida)',
  'Intento de autolesión / autolisis',
  'Sobredosis',
  'Violencia o agresión en curso',
  'Crisis de salud mental severa',
  'Otro',
] as const;

export interface GeoInfo {
  department?: string;
  municipality?: string;
  address?: string;
}

export interface Coords {
  lat: number;
  lng: number;
}

const normalize = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Coordenadas con timeout: en crisis no se puede esperar un GPS lento. */
export const requestCoords = (timeoutMs = 10000): Promise<Coords | null> =>
  new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });

/**
 * Geocodificación inversa con Nominatim (OSM): devuelve departamento,
 * municipio y dirección aproximados. Red o sin resultado → null (los campos
 * quedan para completar a mano).
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<GeoInfo | null> => {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}` +
      `&zoom=16&addressdetails=1&accept-language=es`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: Record<string, string>;
      display_name?: string;
    };
    const addr = data.address ?? {};

    const rawDept = addr.state ?? addr.region ?? '';
    const deptMatch = DEPARTAMENTOS_NI.find((d) => normalize(d) === normalize(rawDept));
    const municipality = addr.city ?? addr.town ?? addr.village ?? addr.county ?? addr.municipality ?? '';
    const road = addr.road ?? '';
    const house = addr.house_number ?? '';
    const sector = addr.suburb ?? addr.neighbourhood ?? addr.city_district ?? '';
    const addressParts = [road && house ? `${road} ${house}` : road, sector].filter(Boolean);

    const geo: GeoInfo = {
      department: deptMatch ?? (rawDept || undefined),
      municipality: municipality || undefined,
      address: addressParts.length
        ? addressParts.join(', ')
        : (data.display_name?.split(',').slice(0, 2).join(',').trim() || undefined),
    };
    return geo.department || geo.municipality || geo.address ? geo : null;
  } catch {
    return null;
  }
};

/** Hora de Nicaragua (UTC-6, sin horario de verano). */
export const horaNicaragua = (): string => {
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

/**
 * Texto de respaldo (wa.me). El mensaje canónico lo construye el backend
 * (api/alerts.ts) para que lo que llega al SILAIS sea siempre el mismo; este
 * es el que se abre en WhatsApp si la API de la app no responde.
 */
export const buildSilaisMessage = (a: SilaisAlertData): string => {
  const lineas = [`\u{1F6A8} *ALERTA SILAIS - ALIVIA*`, `Tipo: ${a.alertType}`, `Nombre: ${a.name || 'Sin nombre'}`];
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

/** Respaldo directo: chat de WhatsApp con el mensaje ya escrito. */
export const silaisWaLink = (a: SilaisAlertData): string =>
  `https://wa.me/${SILAIS_NUMBER}?text=${encodeURIComponent(buildSilaisMessage(a))}`;

export type SendResult =
  | { ok: true; waMessageId?: string | null; duplicate?: boolean }
  | { ok: false; error: string; network?: boolean };

/**
 * Envía la alerta al endpoint /api/alerts. A propósito NO usa apiMutate: la
 * outbox encolaría el envío para más tarde, y una alerta de crisis tiene que
 * confirmarse (o fallar) ahora para poder abrir WhatsApp como respaldo.
 */
export const sendSilaisAlert = async (a: SilaisAlertData): Promise<SendResult> => {
  try {
    const res = await fetch(`${API_BASE}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(a),
      signal: AbortSignal.timeout(15000),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; duplicate?: boolean } | null;
    if (!res.ok || !body?.ok) {
      return { ok: false, error: body?.error || `Error ${res.status}` };
    }
    return {
      ok: true,
      waMessageId: (body as { waMessageId?: string | null }).waMessageId ?? null,
      duplicate: body.duplicate === true,
    };
  } catch {
    return { ok: false, error: 'Sin conexión con el servidor', network: true };
  }
};
