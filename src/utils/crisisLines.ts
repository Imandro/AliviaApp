/* ----------------------------------------------------
   ALIVIA - LÍNEAS DE CRISIS GRATUITAS (Centroamérica)
   Directorio compartido por SOS y el Chequeo de Bienestar
   ---------------------------------------------------- */

export type CrisisCountry = 'NI' | 'SV' | 'GT' | 'HN' | 'CR' | 'PA';

export interface CrisisLine {
  name: string;
  phone: string;
  desc: string;
  type: 'call' | 'sms' | 'chat';
}

export const CRISIS_COUNTRIES: CrisisCountry[] = ['NI', 'SV', 'GT', 'HN', 'CR', 'PA'];

export const CRISIS_COUNTRY_LABELS: Record<CrisisCountry, string> = {
  NI: 'Nicaragua',
  SV: 'El Salvador',
  GT: 'Guatemala',
  HN: 'Honduras',
  CR: 'Costa Rica',
  PA: 'Panamá',
};

export const CRISIS_LINES: Record<CrisisCountry, CrisisLine[]> = {
  NI: [
    {
      name: 'Cruz Blanca Nicaragüense (Línea Nacional)',
      phone: '128',
      desc: 'Atención de emergencias gratuita y confidencial, disponible las 24 horas en todo el país.',
      type: 'call'
    }
  ],
  SV: [
    {
      name: 'Sistema de Emergencias Médicas (SEM)',
      phone: '132',
      desc: 'Atención 24/7 con psicólogas y psicólogos de guardia; atiende también emergencias de salud mental.',
      type: 'call'
    }
  ],
  GT: [
    {
      name: 'MSPAS — Orientación en Salud Mental',
      phone: '123',
      desc: 'Línea del Ministerio de Salud Pública para orientación y acompañamiento en salud mental.',
      type: 'call'
    }
  ],
  HN: [
    {
      name: '911 — Sistema Nacional de Emergencias',
      phone: '911',
      desc: 'Coordina atención psicosocial gratuita en alianza con la Secretaría de Salud y la OPS.',
      type: 'call'
    },
    {
      name: 'Línea 114 (Mujer Vivir Sin Miedo)',
      phone: '114',
      desc: 'Policía Nacional: apoyo y atención psicológica para mujeres en situación de violencia.',
      type: 'call'
    }
  ],
  CR: [
    {
      name: 'Colegio de Psicólogos — Línea 1322',
      phone: '1322',
      desc: 'Atención psicológica gratuita las 24 horas para personas en crisis.',
      type: 'call'
    },
    {
      name: 'Línea Aquí Estoy',
      phone: '800 273 7869',
      desc: 'Apoyo emocional del Ministerio de Salud en horario limitado; en crisis usa el 1322 o el 911.',
      type: 'call'
    }
  ],
  PA: [
    {
      name: 'MIDES — Línea 147',
      phone: '147',
      desc: 'Atención 24/7 gratuita del Ministerio de Desarrollo Social para crisis y salud mental.',
      type: 'call'
    },
    {
      name: 'MIDES — WhatsApp',
      phone: '+507 6694 2747',
      desc: 'Chat directo de apoyo emocional; el número también responde por WhatsApp.',
      type: 'call'
    }
  ]
};

export const crisisHref = (line: CrisisLine): string => {
  const digits = line.phone.replace(/\s+/g, '');
  if (line.type === 'sms') return `sms:${digits}?body=APOYO`;
  if (line.type === 'chat') return `https://wa.me/${digits}`;
  return `tel:${digits}`;
};