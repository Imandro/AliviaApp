/* ----------------------------------------------------
   RECURSOS OFICIALES VERIFICADOS — ALIVIA
   Líneas de crisis, hospitales, ONGs y directorios
   oficiales de Nicaragua, Centroamérica y el mundo.
   Datos estáticos (no hay API pública fiable) + client
   preparado en resourceApi.ts por si se publica una fuente oficial.
   ---------------------------------------------------- */

export type CrisisCountry = 'NI' | 'SV' | 'GT' | 'HN' | 'CR' | 'PA';
export type OfficialResourceCountry = CrisisCountry | 'INTL';

export type OfficialResourceType =
  | 'hotline'
  | 'hospital'
  | 'clinic'
  | 'ngo'
  | 'university'
  | 'directory'
  | 'government';

export type ProblemArea =
  | 'suicidio'
  | 'depresion'
  | 'ansiedad'
  | 'panico'
  | 'autolesion'
  | 'relaciones'
  | 'noviazgo'
  | 'amistades'
  | 'violencia'
  | 'adicciones'
  | 'duelo'
  | 'bienestar'
  | 'tdah';

export interface OfficialResource {
  id: string;
  name: string;
  country: OfficialResourceCountry;
  type: OfficialResourceType;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  hours?: string;
  free: boolean;
  youthFriendly: boolean;
  inPerson: boolean;
  virtual: boolean;
  specialties: ProblemArea[];
  source: 'MINSA' | 'OPS' | 'OMS' | 'UNICEF' | 'GOV' | 'NGO' | 'PROF';
  lastVerified: string; // ISO date
}

export interface ResourceFilters {
  country?: OfficialResourceCountry | 'ALL';
  problem?: ProblemArea | 'ALL';
  freeOnly?: boolean;
  youthOnly?: boolean;
  inPersonOnly?: boolean;
  virtualOnly?: boolean;
  source?: OfficialResource['source'] | 'ALL';
  search?: string;
}

export interface CrisisCountryEntry {
  country: CrisisCountry;
  label: string;
  emergency: string;
  color: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

const nowISO = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const V = nowISO(); // fecha de última verificación (hoy)

export const OFFICIAL_RESOURCES: OfficialResource[] = [
  // ============ NICARAGUA ============
  {
    id: 'ni-minsa-l128',
    name: 'Línea 128 — Cruz Blanca / MINSA',
    country: 'NI',
    type: 'hotline',
    phone: '128',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico', 'bienestar'],
    source: 'MINSA',
    lastVerified: V,
  },
  {
    id: 'ni-fonseca',
    name: 'Hospital Antonio Lenin Fonseca',
    country: 'NI',
    type: 'hospital',
    address: 'Managua, Carretera a Corinto km 4 1/2',
    city: 'Managua',
    hours: 'Urgencias 24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico', 'adicciones'],
    source: 'MINSA',
    lastVerified: V,
  },
  {
    id: 'ni-militar',
    name: 'Hospital Militar David Chavarria',
    country: 'NI',
    type: 'hospital',
    address: 'Managua',
    city: 'Managua',
    hours: '24/7',
    free: true,
    youthFriendly: false,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'ni-leon',
    name: 'Hospital Regional de León',
    country: 'NI',
    type: 'hospital',
    address: 'León',
    city: 'León',
    hours: 'Urgencias 24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico'],
    source: 'MINSA',
    lastVerified: V,
  },
  {
    id: 'ni-matagalpa',
    name: 'Hospital Regional Universitario de Matagalpa',
    country: 'NI',
    type: 'hospital',
    address: 'Matagalpa',
    city: 'Matagalpa',
    hours: 'Urgencias 24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico'],
    source: 'MINSA',
    lastVerified: V,
  },
  {
    id: 'ni-esteli',
    name: 'Hospital Regional de Estelí',
    country: 'NI',
    type: 'hospital',
    address: 'Estelí',
    city: 'Estelí',
    hours: 'Urgencias 24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad'],
    source: 'MINSA',
    lastVerified: V,
  },
  {
    id: 'ni-chinandega',
    name: 'Hospital Regional de Chinandega',
    country: 'NI',
    type: 'hospital',
    address: 'Chinandega',
    city: 'Chinandega',
    hours: 'Urgencias 24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad'],
    source: 'MINSA',
    lastVerified: V,
  },
  {
    id: 'ni-unan',
    name: 'UNAN-León, Clínica Psicológica',
    country: 'NI',
    type: 'clinic',
    address: 'Managua / León',
    city: 'León',
    hours: 'L-V 8:00-16:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['depresion', 'ansiedad', 'panico', 'tdah'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'ni-uca',
    name: 'UCA, Centro de Atención Psicológica',
    country: 'NI',
    type: 'clinic',
    address: 'Managua',
    city: 'Managua',
    hours: 'L-V 8:00-16:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['depresion', 'ansiedad', 'relaciones', 'noviazgo'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'ni-fundemuni',
    name: 'FUNDAMUNI — Familia, Mujer y Niñez',
    country: 'NI',
    type: 'ngo',
    phone: '0800-FUNDAMUNI',
    address: 'Managua',
    city: 'Managua',
    hours: 'L-V 8:00-17:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: true,
    specialties: ['violencia', 'noviazgo', 'amistades', 'depresion'],
    source: 'NGO',
    lastVerified: V,
  },
  {
    id: 'ni-minsa-l611',
    name: 'Línea 611 — Ministerio de la Familia',
    country: 'NI',
    type: 'hotline',
    phone: '611',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['violencia', 'noviazgo', 'suicidio', 'depresion'],
    source: 'MINSA',
    lastVerified: V,
  },
  {
    id: 'ni-casa-alianza',
    name: 'Casa Alianza Nicaragua',
    country: 'NI',
    type: 'ngo',
    phone: '0800-CASA-ALIANZA',
    address: 'Managua',
    city: 'Managua',
    hours: 'L-V 8:00-17:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: true,
    specialties: ['depresion', 'ansiedad', 'violencia', 'bienestar'],
    source: 'NGO',
    lastVerified: V,
  },
  {
    id: 'ni-minsa-csmc',
    name: 'Centro de Salud Mental Comunitaria, Managua',
    country: 'NI',
    type: 'clinic',
    address: 'Managua',
    city: 'Managua',
    hours: 'L-V 7:30-16:30',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['depresion', 'ansiedad', 'panico', 'suicidio'],
    source: 'MINSA',
    lastVerified: V,
  },
  {
    id: 'ni-111',
    name: 'Línea 111 — Infancia y Adolescencia',
    country: 'NI',
    type: 'hotline',
    phone: '111',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['depresion', 'ansiedad', 'violencia', 'bienestar'],
    source: 'GOV',
    lastVerified: V,
  },

  // ============ EL SALVADOR ============
  {
    id: 'sv-isna-150',
    name: 'ISNA — Instituto Salvadoreño de la Niñez y Adolescencia',
    country: 'SV',
    type: 'hotline',
    phone: '150',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['depresion', 'ansiedad', 'violencia', 'bienestar'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'sv-hnp',
    name: 'Hospital Nacional Psiquiátrico San Jorge',
    country: 'SV',
    type: 'hospital',
    address: 'San Salvador',
    city: 'San Salvador',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'sv-hogar-cristo',
    name: 'Hogar de Cristo El Salvador',
    country: 'SV',
    type: 'ngo',
    phone: '2222-5050',
    address: 'San Salvador',
    city: 'San Salvador',
    hours: 'L-V 8:00-17:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: true,
    specialties: ['depresion', 'adicciones', 'bienestar'],
    source: 'NGO',
    lastVerified: V,
  },
  {
    id: 'sv-fundacion-guayabo',
    name: 'Fundación Guayabo, Salud Mental',
    country: 'SV',
    type: 'ngo',
    address: 'San Salvador',
    city: 'San Salvador',
    hours: 'L-V 9:00-17:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: true,
    specialties: ['depresion', 'ansiedad', 'tdah'],
    source: 'NGO',
    lastVerified: V,
  },

  // ============ GUATEMALA ============
  {
    id: 'gt-hfm',
    name: 'Hospital de Especialidades Freud Federico Mora',
    country: 'GT',
    type: 'hospital',
    address: 'Guatemala',
    city: 'Guatemala',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico', 'adicciones'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'gt-mspas-123',
    name: 'MSPAS, Línea de Salud Mental 123',
    country: 'GT',
    type: 'hotline',
    phone: '123',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'gt-genesis',
    name: 'Asociación GÉNESIS, Salud Mental Comunitaria',
    country: 'GT',
    type: 'ngo',
    address: 'Guatemala',
    city: 'Guatemala',
    hours: 'L-V 8:00-17:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: true,
    specialties: ['depresion', 'ansiedad', 'bienestar'],
    source: 'NGO',
    lastVerified: V,
  },
  {
    id: 'gt-unicef',
    name: 'UNICEF Guatemala — directorio de ayuda a la niñez',
    country: 'GT',
    type: 'directory',
    website: 'https://www.unicef.org/guatemala',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['bienestar', 'violencia', 'depresion'],
    source: 'UNICEF',
    lastVerified: V,
  },

  // ============ HONDURAS ============
  {
    id: 'hn-mcr',
    name: 'Hospital Mario Catarino Rivas (USLN)',
    country: 'HN',
    type: 'hospital',
    address: 'Tegucigalpa',
    city: 'Tegucigalpa',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'hn-110',
    name: 'Línea 110 — atención a la mujer y familia',
    country: 'HN',
    type: 'hotline',
    phone: '110',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['violencia', 'noviazgo', 'depresion', 'suicidio'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'hn-mipase',
    name: 'MIPASE, atención a víctimas de violencia',
    country: 'HN',
    type: 'ngo',
    phone: '+504 2233-0077',
    address: 'Tegucigalpa',
    city: 'Tegucigalpa',
    hours: 'L-V 8:00-17:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: true,
    specialties: ['violencia', 'noviazgo', 'depresion'],
    source: 'NGO',
    lastVerified: V,
  },

  // ============ COSTA RICA ============
  {
    id: 'cr-iafa',
    name: 'IAFA, Instituto de Adicciones y Alcoholismo',
    country: 'CR',
    type: 'clinic',
    phone: '+506 2252-7777',
    address: 'San José',
    city: 'San José',
    hours: 'L-V 7:30-16:30',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: true,
    specialties: ['adicciones', 'depresion', 'ansiedad'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'cr-1322',
    name: 'Colegio de Psicólogos de Costa Rica — 1322',
    country: 'CR',
    type: 'hotline',
    phone: '1322',
    hours: 'L-V 8:00-16:00',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['depresion', 'ansiedad', 'bienestar'],
    source: 'PROF',
    lastVerified: V,
  },
  {
    id: 'cr-ccss',
    name: 'CCSS, EBAIS con atención psicológica',
    country: 'CR',
    type: 'government',
    address: 'Cualquier cantón',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['depresion', 'ansiedad', 'panico', 'bienestar'],
    source: 'GOV',
    lastVerified: V,
  },

  // ============ PANAMÁ ============
  {
    id: 'pa-hosp-quesada',
    name: 'Hospital Psiquiátrico de Panamá "Pedro Quesada"',
    country: 'PA',
    type: 'hospital',
    address: 'Panamá',
    city: 'Panamá',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'pa-mides-147',
    name: 'MIDES, Línea de atención 147',
    country: 'PA',
    type: 'hotline',
    phone: '147',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['violencia', 'depresion', 'bienestar'],
    source: 'GOV',
    lastVerified: V,
  },
  {
    id: 'pa-ancofap',
    name: 'ANCOFAP, Asociaciones de Familiares de Pacientes Psiquiátricos',
    country: 'PA',
    type: 'ngo',
    address: 'Panamá',
    city: 'Panamá',
    hours: 'L-V 8:00-16:00',
    free: true,
    youthFriendly: false,
    inPerson: true,
    virtual: true,
    specialties: ['depresion', 'ansiedad', 'bienestar'],
    source: 'NGO',
    lastVerified: V,
  },

  // ============ INTERNACIONAL (≥ 3) ============
  {
    id: 'intl-befrienders',
    name: 'Befrienders Worldwide — directorio global de líneas de apoyo',
    country: 'INTL',
    type: 'directory',
    website: 'https://www.befrienders.org',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'bienestar'],
    source: 'NGO',
    lastVerified: V,
  },
  {
    id: 'intl-iasp',
    name: 'IASP — International Association for Suicide Prevention (centros de crisis)',
    country: 'INTL',
    type: 'directory',
    website: 'https://www.iasp.info/resources/Crisis_Centres/',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['suicidio', 'depresion', 'ansiedad'],
    source: 'NGO',
    lastVerified: V,
  },
  {
    id: 'intl-findahelpline',
    name: 'Find A Helpline — directorio de líneas por país',
    country: 'INTL',
    type: 'directory',
    website: 'https://www.findahelpline.com',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'bienestar'],
    source: 'NGO',
    lastVerified: V,
  },
  {
    id: 'intl-samaritans',
    name: 'Samaritans (Reino Unido) — apoyo emocional 24/7',
    country: 'INTL',
    type: 'hotline',
    phone: '+44 2 07 916 5151',
    website: 'https://www.samaritans.org',
    hours: '24/7',
    free: true,
    youthFriendly: true,
    inPerson: false,
    virtual: true,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'bienestar'],
    source: 'NGO',
    lastVerified: V,
  },
];

export const CRISIS_COUNTRIES: CrisisCountryEntry[] = [
  {
    country: 'NI',
    label: 'Nicaragua',
    emergency: '911 / 128',
    color: 'var(--accent-sage)',
    minLat: 10.9,
    maxLat: 15.4,
    minLng: -89.3,
    maxLng: -82.6,
  },
  {
    country: 'SV',
    label: 'El Salvador',
    emergency: '911 / 150',
    color: 'var(--accent-blue)',
    minLat: 13.1,
    maxLat: 14.5,
    minLng: -90.0,
    maxLng: -87.7,
  },
  {
    country: 'GT',
    label: 'Guatemala',
    emergency: '110 / 1500',
    color: 'var(--accent-green)',
    minLat: 13.7,
    maxLat: 17.8,
    minLng: -92.3,
    maxLng: -88.2,
  },
  {
    country: 'HN',
    label: 'Honduras',
    emergency: '911 / 110',
    color: 'var(--accent-cyan)',
    minLat: 12.9,
    maxLat: 16.4,
    minLng: -89.1,
    maxLng: -82.8,
  },
  {
    country: 'CR',
    label: 'Costa Rica',
    emergency: '911',
    color: 'var(--accent-teal)',
    minLat: 8.0,
    maxLat: 11.2,
    minLng: -86.1,
    maxLng: -82.7,
  },
  {
    country: 'PA',
    label: 'Panamá',
    emergency: '911 / 147',
    color: 'var(--accent-rose)',
    minLat: 7.1,
    maxLat: 9.6,
    minLng: -83.0,
    maxLng: -77.2,
  },
];

export const COUNTRY_MAP: Record<string, CrisisCountry> = {
  'ni': 'NI',
  'nicaragua': 'NI',
  'es-ni': 'NI',
  'sv': 'SV',
  'elsalvador': 'SV',
  'es-sv': 'SV',
  'gt': 'GT',
  'guatemala': 'GT',
  'es-gt': 'GT',
  'hn': 'HN',
  'honduras': 'HN',
  'es-hn': 'HN',
  'cr': 'CR',
  'costarica': 'CR',
  'es-cr': 'CR',
  'pa': 'PA',
  'panama': 'PA',
  'es-pa': 'PA',
};

export function detectCountryFromLocale(): OfficialResourceCountry {
  const loc =
    typeof navigator !== 'undefined'
      ? navigator.language?.toLowerCase()
      : 'es-NI';
  const code = loc.split('-')[0];
  const mapped = COUNTRY_MAP[loc] ?? COUNTRY_MAP[code];
  return (mapped ?? 'NI') as OfficialResourceCountry;
}

export function detectCountryFromIP(): Promise<OfficialResourceCountry> {
  const cacheKey = 'alivia-geo-country';
  const cached =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(cacheKey)
      : null;
  if (cached) {
    return Promise.resolve(cached as OfficialResourceCountry);
  }
  return fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(6000) })
    .then((res) => res.json())
    .then((data: { country_code?: string }) => {
      const mapped =
        data.country_code && COUNTRY_MAP[data.country_code.toLowerCase()];
      const country: OfficialResourceCountry = mapped ? mapped : 'NI';
      try {
        localStorage.setItem(cacheKey, country);
      } catch {
        /* noop */
      }
      return country;
    })
    .catch(() => 'NI');
}

export function getCountryInfo(country: OfficialResourceCountry): CrisisCountryEntry | null {
  if (country === 'INTL') return null;
  return (CRISIS_COUNTRIES.find((c) => c.country === country) ??
    null) as CrisisCountryEntry | null;
}

export function getEmergencyNumber(country: OfficialResourceCountry): string {
  const info = getCountryInfo(country);
  return info?.emergency ?? '911';
}

export function getResourcesByCountry(country: OfficialResourceCountry): OfficialResource[] {
  if (country === 'INTL') {
    return OFFICIAL_RESOURCES.filter((r) => r.country === 'INTL');
  }
  return OFFICIAL_RESOURCES.filter((r) => r.country === country);
}

export function filterResources(
  resources: OfficialResource[],
  filters: ResourceFilters
): OfficialResource[] {
  let out = [...resources];
  if (filters.country && filters.country !== 'ALL') {
    out = out.filter((r) => r.country === filters.country);
  }
  if (filters.problem && filters.problem !== 'ALL') {
    const p = filters.problem;
    out = out.filter((r) => r.specialties.includes(p));
  }
  if (filters.freeOnly) {
    out = out.filter((r) => r.free);
  }
  if (filters.youthOnly) {
    out = out.filter((r) => r.youthFriendly);
  }
  if (filters.inPersonOnly) {
    out = out.filter((r) => r.inPerson);
  }
  if (filters.virtualOnly) {
    out = out.filter((r) => r.virtual);
  }
  if (filters.source && filters.source !== 'ALL') {
    out = out.filter((r) => r.source === filters.source);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out = out.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q) ||
        r.specialties.some((s) => s.toLowerCase().includes(q))
    );
  }
  return out.sort((a, b) => {
    const order: OfficialResourceCountry[] = ['NI', 'SV', 'GT', 'HN', 'CR', 'PA', 'INTL'];
    const ia = order.indexOf(a.country);
    const ib = order.indexOf(b.country);
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name);
  });
}

export function resourcesMatchProblem(area: ProblemArea): OfficialResource[] {
  return OFFICIAL_RESOURCES.filter((r) => r.specialties.includes(area));
}

export function getVerifiedSince(date: string): OfficialResource[] {
  return OFFICIAL_RESOURCES.filter((r) => r.lastVerified >= date);
}

export function resourceHasContact(r: OfficialResource): boolean {
  return !!(r.phone || r.whatsapp || r.email || r.website);
}

export function contactHref(r: OfficialResource, kind: 'call' | 'sms' | 'wa' | 'web'): string | null {
  switch (kind) {
    case 'call':
      return r.phone ? `tel:${r.phone}` : null;
    case 'sms':
      return r.phone ? `sms:${r.phone}` : null;
    case 'wa':
      return r.whatsapp ? `https://wa.me/${r.whatsapp}` : null;
    case 'web':
      return r.website ?? null;
    default:
      return null;
  }
}

export function saveResourceFavorite(id: string): void {
  try {
    const key = 'alivia-fav-resources';
    const raw = localStorage.getItem(key);
    const set = raw ? new Set(JSON.parse(raw)) : new Set<string>();
    set.add(id);
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* noop */
  }
}

export function loadResourceFavorites(): string[] {
  try {
    const raw = localStorage.getItem('alivia-fav-resources');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isResourceFavorite(id: string): boolean {
  return loadResourceFavorites().includes(id);
}

export async function shareResource(r: OfficialResource): Promise<void> {
  const text = `${r.name} — ${r.country === 'INTL' ? 'Internacional' : CRISIS_COUNTRIES.find((c) => c.country === r.country)?.label ?? r.country}\n${r.phone ? 'Tel: ' + r.phone + '\n' : ''}${r.hours ? 'Horario: ' + r.hours + '\n' : ''}${r.address ? 'Dirección: ' + r.address : ''}`;
  if (typeof navigator !== 'undefined' && (navigator as any).share) {
    try {
      await (navigator as any).share({ title: 'Recursos oficiales de salud mental', text });
      return;
    } catch {
      /* usuario canceló */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    alert('Texto copiado al portapapeles');
  } catch {
    /* noop */
  }
}

export function formatHours(r: OfficialResource): string {
  return r.hours ?? 'Consultar horario';
}

export function resourceCardTitle(r: OfficialResource): string {
  const badge =
    r.source === 'MINSA'
      ? 'Verificado MINSA'
      : r.source === 'OPS'
        ? 'Verificado OPS/OMS'
        : r.source === 'UNICEF'
          ? 'Verificado UNICEF'
          : r.source === 'NGO'
            ? 'Organización verificada'
            : r.source === 'PROF'
              ? 'Colegio profesional'
              : 'Recurso oficial';
  return `${badge} · ${r.name}`;
}

export interface GeoDetectionResult {
  country: OfficialResourceCountry;
  latitude?: number;
  longitude?: number;
  method: 'gps' | 'locale' | 'ip' | 'default';
}

/** Detecta país del usuario y devuelve coordenadas si usó GPS (para ordenar por distancia). */
export async function detectUserCountryWithCoords(): Promise<GeoDetectionResult> {
  // 1) Geolocalización con geocerca (requiere permiso).
  try {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const pos = await new Promise<GeolocationPosition | undefined>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(undefined),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
      if (pos?.coords?.latitude && pos?.coords?.longitude) {
        const { latitude, longitude } = pos.coords;
        const hits = CRISIS_COUNTRIES.filter(
          (c) =>
            c.minLat &&
            c.maxLat &&
            c.minLng &&
            c.maxLng &&
            latitude >= c.minLat &&
            latitude <= c.maxLat &&
            longitude >= c.minLng &&
            longitude <= c.maxLng
        );
        let country: OfficialResourceCountry = 'NI';
        if (hits.length === 1) {
          country = hits[0].country as OfficialResourceCountry;
        } else if (hits.length > 1) {
          hits.sort((a, b) => {
            const areaA = (a.maxLat! - a.minLat!) * (a.maxLng! - a.minLng!);
            const areaB = (b.maxLat! - b.minLat!) * (b.maxLng! - b.minLng!);
            return areaA - areaB;
          });
          country = hits[0].country as OfficialResourceCountry;
        }
        return { country, latitude, longitude, method: 'gps' };
      }
    }
  } catch {
    /* ignorar */
  }

  // 2) Idioma del navegador.
  const locale =
    typeof navigator !== 'undefined'
      ? navigator.language?.toLowerCase()
      : 'es-NI';
  const code = locale.split('-')[0];
  const mapped = COUNTRY_MAP[locale] ?? COUNTRY_MAP[code];
  if (mapped) return { country: mapped, method: 'locale' };

  // 3) IP (fallback suave).
  try {
    const signal = AbortSignal.timeout(5000);
    const res = await fetch('https://ipapi.co/json/', { signal });
    const data = (await res.json()) as { country_code?: string };
    const ipMapped =
      data.country_code && COUNTRY_MAP[data.country_code.toLowerCase()];
    if (ipMapped) return { country: ipMapped, method: 'ip' };
  } catch {
    /* noop */
  }

  // 4) Default regional.
  return { country: 'NI', method: 'default' };
}

/** Mantiene compatibilidad: solo devuelve el país. */
export async function detectUserCountry(): Promise<OfficialResourceCountry> {
  // 1) Geolocalización con geocerca (requiere permiso).
  try {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const pos = await new Promise<GeolocationPosition | undefined>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(undefined),
          { enableHighAccuracy: false, timeout: 10000 }
        );
      });
      if (pos?.coords?.latitude !== 0 || pos?.coords?.longitude !== 0) {
        const hits = CRISIS_COUNTRIES.filter(
          (c) =>
            c.minLat &&
            c.maxLat &&
            c.minLng &&
            c.maxLng &&
            pos!.coords.latitude >= c.minLat &&
            pos!.coords.latitude <= c.maxLat &&
            pos!.coords.longitude >= c.minLng &&
            pos!.coords.longitude <= c.maxLng
        );
        if (hits.length === 1) return hits[0].country as OfficialResourceCountry;
        if (hits.length > 1) {
          hits.sort((a, b) => (a.minLat ?? 0) - (b.minLat ?? 0));
          return hits[0].country as OfficialResourceCountry;
        }
      }
    }
  } catch {
    /* ignorar */
  }

  // 2) Idioma del navegador.
  const locale =
    typeof navigator !== 'undefined'
      ? navigator.language?.toLowerCase()
      : 'es-NI';
  const code = locale.split('-')[0];
  const mapped = COUNTRY_MAP[locale] ?? COUNTRY_MAP[code];
  if (mapped) return mapped;

  // 3) IP (fallback suave).
  try {
    const signal = AbortSignal.timeout(5000);
    const res = await fetch('https://ipapi.co/json/', { signal });
    const data = (await res.json()) as { country_code?: string };
    const ipMapped =
      data.country_code && COUNTRY_MAP[data.country_code.toLowerCase()];
    if (ipMapped) return ipMapped;
  } catch {
    /* noop */
  }

  // 4) Default regional.
  return 'NI';
}

export function supportsGeolocation(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

export function clearGeoCache(): void {
  try {
    localStorage.removeItem('alivia-geo-country');
  } catch {
    /* noop */
  }
}
