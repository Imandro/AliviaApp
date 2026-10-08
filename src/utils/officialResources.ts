/* ----------------------------------------------------
   RECURSOS OFICIALES VERIFICADOS — ALIVIA
   Líneas de crisis, hospitales, ONGs y directorios
   oficiales de NICARAGUA (solo Nicaragua).
   Datos estáticos (no hay API pública fiable) + client
   preparado en resourceApi.ts por si se publica una fuente oficial.
   ---------------------------------------------------- */

export type CrisisCountry = 'NI';
export type OfficialResourceCountry = CrisisCountry;

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

export type ContactStatus = 'verified' | 'unverified' | 'none';

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
  contactStatus: ContactStatus;
  lat?: number;
  lng?: number;
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

// Fechas de verificación reales (ISO: YYYY-MM-DD). Se actualizan solo cuando se confirma el dato.
const V_MINSA_HOTLINES = '2026-10-03';      // 128, 611, 111 confirmados en portal MINSA
const V_MINSA_PORTAL = '2026-10-03';         // portal MINSA verificado online
const V_MINSA_HOSPITALS = '2025-12-15';      // directorio hospitales MINSA (fecha acceso)
const V_UNAN = '2025-11-01';                 // UNAN-Managua portal ok; clínica sin teléfono confirmado
const V_FUNDAMUNI = '2025-09-20';            // 0800-FUNDAMUNI no válido; sin teléfono real
const V_CASA_ALIANZA = '2025-09-20';         // 0800-CASA-ALIANZA no válido; sin teléfono real
const V_CENTRO_SM = '2025-08-01';            // Centro Salud Mental sin contacto confirmado

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
    lastVerified: V_MINSA_HOTLINES,
    contactStatus: 'verified',
    lat: 12.1364,
    lng: -86.2511,
  },
  {
    id: 'ni-fonseca',
    name: 'Hospital Antonio Lenin Fonseca',
    country: 'NI',
    type: 'hospital',
    address: 'Managua, 43a Avenida N.O., Sector Paseo Las Brisas, Distrito II',
    city: 'Managua',
    hours: 'Urgencias 24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico', 'adicciones'],
    source: 'MINSA',
    lastVerified: V_MINSA_HOSPITALS,
    contactStatus: 'unverified',
    lat: 12.1487,
    lng: -86.3117,
    website: 'https://www.minsa.gob.ni/',
  },
  {
    id: 'ni-militar',
    name: 'Hospital Militar Dr. Alejandro Dávila Bolaños',
    country: 'NI',
    type: 'hospital',
    address: 'Managua, Pista General Benjamín Zeledón',
    city: 'Managua',
    hours: '24/7',
    free: true,
    youthFriendly: false,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico'],
    source: 'GOV',
    lastVerified: V_MINSA_HOSPITALS,
    contactStatus: 'unverified',
    lat: 12.1359,
    lng: -86.2769,
    website: 'https://www.minsa.gob.ni/',
  },
  {
    id: 'ni-esteli',
    name: 'Hospital Regional San Juan de Dios',
    country: 'NI',
    type: 'hospital',
    address: 'Salida sur de Estelí Km 146, Bo. Justo Flores',
    city: 'Estelí',
    hours: 'Urgencias 24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico'],
    source: 'MINSA',
    lastVerified: V_MINSA_HOSPITALS,
    contactStatus: 'unverified',
    website: 'https://www.minsa.gob.ni/',
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
    lastVerified: V_MINSA_HOSPITALS,
    contactStatus: 'none',
  },
  {
    id: 'ni-chinandega',
    name: 'Hospital Dr. Mauricio Abdalah',
    country: 'NI',
    type: 'hospital',
    address: 'Chinandega, Carretera Chinandega - Corinto',
    city: 'Chinandega',
    hours: 'Urgencias 24/7',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['suicidio', 'depresion', 'ansiedad', 'panico'],
    source: 'MINSA',
    lastVerified: V_MINSA_HOSPITALS,
    contactStatus: 'unverified',
    lat: 12.5650,
    lng: -87.1636,
    website: 'https://www.minsa.gob.ni/',
  },
  {
    id: 'ni-unan',
    name: 'UNAN-León, Clínica Psicológica',
    country: 'NI',
    type: 'clinic',
    address: 'León / Managua',
    city: 'León',
    hours: 'L-V 8:00-16:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: false,
    specialties: ['depresion', 'ansiedad', 'panico', 'tdah'],
    source: 'GOV',
    lastVerified: V_UNAN,
    contactStatus: 'none',
    website: 'https://www.unan.edu.ni/',
  },
  {
    id: 'ni-fundemuni',
    name: 'FUNDAMUNI — Familia, Mujer y Niñez',
    country: 'NI',
    type: 'ngo',
    phone: undefined,
    address: 'Managua',
    city: 'Managua',
    hours: 'L-V 8:00-17:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: true,
    specialties: ['violencia', 'noviazgo', 'amistades', 'depresion'],
    source: 'NGO',
    lastVerified: V_FUNDAMUNI,
    contactStatus: 'none',
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
    lastVerified: V_MINSA_HOTLINES,
    contactStatus: 'verified',
    lat: 12.1364,
    lng: -86.2511,
  },
  {
    id: 'ni-casa-alianza',
    name: 'Casa Alianza Nicaragua',
    country: 'NI',
    type: 'ngo',
    phone: undefined,
    address: 'Managua',
    city: 'Managua',
    hours: 'L-V 8:00-17:00',
    free: true,
    youthFriendly: true,
    inPerson: true,
    virtual: true,
    specialties: ['depresion', 'ansiedad', 'violencia', 'bienestar'],
    source: 'NGO',
    lastVerified: V_CASA_ALIANZA,
    contactStatus: 'none',
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
    lastVerified: V_CENTRO_SM,
    contactStatus: 'none',
    website: 'https://www.minsa.gob.ni/',
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
    lastVerified: V_MINSA_HOTLINES,
    contactStatus: 'verified',
    lat: 12.1364,
    lng: -86.2511,
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
];

export const COUNTRY_MAP: Record<string, CrisisCountry> = {
  'ni': 'NI',
  'nicaragua': 'NI',
  'es-ni': 'NI',
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
  return (CRISIS_COUNTRIES.find((c) => c.country === country) ??
    null) as CrisisCountryEntry | null;
}

export function getEmergencyNumber(country: OfficialResourceCountry): string {
  const info = getCountryInfo(country);
  return info?.emergency ?? '911';
}

export function getResourcesByCountry(country: OfficialResourceCountry): OfficialResource[] {
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
    const order: OfficialResourceCountry[] = ['NI'];
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
  // Solo contactos verificados o no verificados (con dato); 'none' no tiene botón
  if (r.contactStatus === 'none') return false;
  return !!(r.phone || r.whatsapp || r.email || r.website);
}

export function contactHref(r: OfficialResource, kind: 'call' | 'sms' | 'wa' | 'web'): string | null {
  // No generar enlaces para contactStatus 'none'
  if (r.contactStatus === 'none') return null;
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

/** Calcula distancia haversine en km entre dos puntos lat/lng. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // radio Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Devuelve recursos con coordenadas ordenados por distancia al punto dado (más cerca primero). */
export function sortResourcesByDistance(
  resources: OfficialResource[],
  userLat: number,
  userLng: number
): (OfficialResource & { distanceKm: number })[] {
  return resources
    .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
    .map((r) => ({
      ...r,
      distanceKm: haversineKm(userLat, userLng, r.lat!, r.lng!),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
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
  const text = `${r.name} — ${CRISIS_COUNTRIES.find((c) => c.country === r.country)?.label ?? r.country}\n${r.phone ? 'Tel: ' + r.phone + '\n' : ''}${r.hours ? 'Horario: ' + r.hours + '\n' : ''}${r.address ? 'Dirección: ' + r.address : ''}`;
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

/** Resultado de detectUserCountryWithCoords — país detectado + coordenadas si se obtuvo GPS. */
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
          // Desambiguar: elegir el país cuyo bounding box contiene el punto con mayor precisión
          hits.sort((a, b) => {
            const areaA = (a.maxLat! - a.minLat!) * (a.maxLng! - a.minLng!);
            const areaB = (b.maxLat! - b.minLat!) * (b.maxLng! - b.minLng!);
            return areaA - areaB; // bounding box más pequeño = más preciso
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
  const result = await detectUserCountryWithCoords();
  return result.country;
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
