/* ----------------------------------------------------
   ALIVIA - LÍNEAS DE CRISIS GRATUITAS (NICARAGUA)
   Directorio compartido por SOS y el Chequeo de Bienestar.
   Solo Nicaragua: la app es para personas en Nicaragua.
   ---------------------------------------------------- */

export type CrisisCountry = 'NI';

export interface CrisisLine {
  name: string;
  phone: string;
  desc: string;
  type: 'call' | 'sms' | 'chat';
}

export const CRISIS_COUNTRIES: CrisisCountry[] = ['NI'];

export const CRISIS_COUNTRY_LABELS: Record<CrisisCountry, string> = {
  NI: 'Nicaragua',
};

export const CRISIS_LINES: Record<CrisisCountry, CrisisLine[]> = {
  NI: [
    {
      name: 'Cruz Blanca Nicaragüense (Línea Nacional)',
      phone: '128',
      desc: 'Atención de emergencias gratuita y confidencial, disponible las 24 horas en todo el país.',
      type: 'call'
    },
    {
      name: 'Línea 611 — Ministerio de la Familia',
      phone: '611',
      desc: 'Violencia, infancia y familia: atención 24/7 del gobierno de Nicaragua.',
      type: 'call'
    },
    {
      name: 'Línea 111 — Infancia y Adolescencia',
      phone: '111',
      desc: 'Orientación y protección para niñas, niños y adolescentes, 24/7.',
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
