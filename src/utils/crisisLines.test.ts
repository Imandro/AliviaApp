import { describe, expect, it } from 'vitest';

import {
  CRISIS_COUNTRIES,
  CRISIS_COUNTRY_LABELS,
  CRISIS_LINES,
  crisisHref,
  type CrisisLine,
} from './crisisLines';

describe('crisisLines — directorio de líneas de crisis', () => {
  it('cubre solo Nicaragua (la app no opera en otros países)', () => {
    expect(CRISIS_COUNTRIES).toEqual(['NI']);
  });

  it('tiene etiqueta legible para cada país', () => {
    for (const c of CRISIS_COUNTRIES) {
      expect(typeof CRISIS_COUNTRY_LABELS[c]).toBe('string');
      expect(CRISIS_COUNTRY_LABELS[c].length).toBeGreaterThan(0);
    }
  });

  it('publica al menos una línea por país', () => {
    for (const c of CRISIS_COUNTRIES) {
      const lines = CRISIS_LINES[c];
      expect(Array.isArray(lines)).toBe(true);
      expect(lines.length).toBeGreaterThan(0);
    }
  });

  it('cada línea trae nombre, teléfono, descripción y tipo válido', () => {
    for (const c of CRISIS_COUNTRIES) {
      for (const line of CRISIS_LINES[c]) {
        expect(line.name.length).toBeGreaterThan(0);
        expect(line.phone.length).toBeGreaterThan(0);
        expect(line.desc.length).toBeGreaterThan(0);
        expect(['call', 'sms', 'chat']).toContain(line.type);
      }
    }
  });

  it('los números cortos de emergencia son solo dígitos', () => {
    for (const c of CRISIS_COUNTRIES) {
      for (const line of CRISIS_LINES[c]) {
        if (/^\d+$/.test(line.phone)) {
          expect(line.phone.length).toBeGreaterThanOrEqual(3);
          expect(line.phone.length).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it('crisisHref construye tel: para llamadas', () => {
    const line: CrisisLine = { name: 'Test', phone: '128', desc: 'd', type: 'call' };
    expect(crisisHref(line)).toBe('tel:128');
  });

  it('crisisHref quita espacios del número', () => {
    const line: CrisisLine = { name: 'Test', phone: '  800  273  7869 ', desc: 'd', type: 'call' };
    expect(crisisHref(line)).toBe('tel:8002737869');
  });

  it('crisisHref construye sms: con cuerpo de apoyo', () => {
    const line: CrisisLine = { name: 'Test', phone: '123', desc: 'd', type: 'sms' };
    expect(crisisHref(line)).toBe('sms:123?body=APOYO');
  });

  it('crisisHref construye wa.me para chat', () => {
    const line: CrisisLine = { name: 'Test', phone: '555 123 456', desc: 'd', type: 'chat' };
    expect(crisisHref(line)).toBe('https://wa.me/555123456');
  });

  it('toda línea del directorio produce un href utilizable', () => {
    for (const c of CRISIS_COUNTRIES) {
      for (const line of CRISIS_LINES[c]) {
        const href = crisisHref(line);
        expect(href).toMatch(/^(tel:|sms:|https:\/\/wa\.me\/)/);
        expect(href).not.toContain(' ');
      }
    }
  });
});
