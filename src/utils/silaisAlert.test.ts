import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  ALERT_TIPOS,
  DEPARTAMENTOS_NI,
  SILAIS_DISPLAY,
  SILAIS_NUMBER,
  buildSilaisMessage,
  horaNicaragua,
  reverseGeocode,
  sendSilaisAlert,
  silaisWaLink,
} from './silaisAlert';

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('silaisAlert — datos base', () => {
  it('publica el número del SILAIS de Nicaragua', () => {
    expect(SILAIS_NUMBER).toBe('50584132841');
    expect(SILAIS_DISPLAY).toContain('+505');
  });

  it('lista los 15 departamentos de Nicaragua', () => {
    expect(DEPARTAMENTOS_NI).toHaveLength(15);
    expect(DEPARTAMENTOS_NI).toContain('Managua');
    expect(DEPARTAMENTOS_NI).toContain('Río San Juan');
  });

  it('los tipos de alerta son español neutro', () => {
    expect(ALERT_TIPOS.length).toBeGreaterThan(0);
    expect(ALERT_TIPOS[0]).toContain('suicida');
  });

  it('horaNicaragua devuelve algo no vacío', () => {
    expect(horaNicaragua().length).toBeGreaterThan(0);
  });
});

describe('buildSilaisMessage', () => {
  it('incluye nombre, ubicación, coordenadas y mapa', () => {
    const msg = buildSilaisMessage({
      name: 'Juan Pérez',
      alertType: 'Sobredosis',
      department: 'León',
      municipality: 'León',
      address: 'Calle Real',
      lat: 12.4354,
      lng: -86.8781,
      phone: '88888888',
      note: 'Última frase',
    });
    expect(msg).toContain('ALERTA SILAIS');
    expect(msg).toContain('Sobredosis');
    expect(msg).toContain('Juan Pérez');
    expect(msg).toContain('León');
    expect(msg).toContain('12.435400, -86.878100');
    expect(msg).toContain('maps.google.com/?q=12.4354,-86.8781');
    expect(msg).toContain('88888888');
    expect(msg).toContain('Última frase');
  });

  it('marca lo faltante como Por confirmar', () => {
    const msg = buildSilaisMessage({ name: '', alertType: 'Otro' });
    expect(msg).toContain('Nombre: Sin nombre');
    expect(msg).toContain('Departamento: Por confirmar');
    expect(msg).not.toContain('Coordenadas:');
  });
});

describe('silaisWaLink', () => {
  it('construye wa.me con el número correcto y el texto codificado', () => {
    const link = silaisWaLink({ name: 'Ana', alertType: 'Crisis de salud mental severa' });
    expect(link.startsWith(`https://wa.me/${SILAIS_NUMBER}?text=`)).toBe(true);
    expect(decodeURIComponent(link)).toContain('Crisis de salud mental severa');
  });
});

describe('sendSilaisAlert', () => {
  it('ok cuando el endpoint responde ok:true', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, waMessageId: 'wamid.1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ));
    const out = await sendSilaisAlert({ name: 'Ana', alertType: 'Otro' });
    expect(out).toEqual({ ok: true, waMessageId: 'wamid.1' });
  });

  it('propaga el error del backend (429 rate limit)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: 'Demasiadas alertas, inténtalo en un minuto' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    ));
    const out = await sendSilaisAlert({ name: 'Ana', alertType: 'Otro' });
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.error).toContain('Demasiadas alertas');
  });

  it('marca network cuando no hay servidor', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    const out = await sendSilaisAlert({ name: 'Ana', alertType: 'Otro' });
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.network).toBe(true);
  });
});

describe('reverseGeocode', () => {
  it('traduce la respuesta de Nominatim a departamento/municipio/dirección', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        address: {
          state: 'Managua',
          city: 'Managua',
          road: 'Avenida Bolívar',
          house_number: '12',
          suburb: 'Barrio Luis Huembes',
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    ));
    const geo = await reverseGeocode(12.13, -86.25);
    expect(geo).toEqual({
      department: 'Managua',
      municipality: 'Managua',
      address: 'Avenida Bolívar 12, Barrio Luis Huembes',
    });
  });

  it('devuelve null si la red falla (los campos se completan a mano)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    const geo = await reverseGeocode(12.13, -86.25);
    expect(geo).toBeNull();
  });
});
