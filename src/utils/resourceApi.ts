/* ----------------------------------------------------
   RECURSO API CLIENT — PREPARADO
   Este cliente está preparado para consumir una API
   externa de recursos oficiales (ej. directorios de
   líneas de crisis publicadas por OPs/OMS) cuando
   exista. Por ahora usa el set estático verificado
   (officialResources.ts) y lo sirve desde caché
   offline-first.
   ---------------------------------------------------- */

import { OFFICIAL_RESOURCES } from './officialResources';
import type { OfficialResource, ResourceFilters } from './officialResources';

const RESOURCE_CACHE_KEY = 'alivia_resources_cache';
const RESOURCE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días
/**
 * Sube este número cuando cambie el catálogo para invalidar las listas
 * cacheadas en dispositivos ya instalados (si no, un cliente puede seguir
 * viendo durante 7 días un recurso que ya se retiró de la fuente).
 */
const RESOURCE_CACHE_VERSION = 2;

interface CacheEntry {
  version: number;
  resources: OfficialResource[];
  filters: ResourceFilters;
  ts: number;
}

export class ResourceNotFoundError extends Error {
  constructor(public id: string) {
    super(`Recurso oficial no encontrado: ${id}`);
  }
}

export class ResourceFetchError extends Error {
  constructor(public cause?: unknown) {
    super('No se pudo cargar la base de recursos (offline). Usando la lista verificada local.');
  }
}

/** Carga los recursos verificados (siempre disponibles, offline). */
export async function loadOfficialResources(): Promise<OfficialResource[]> {
  try {
    const cached = getCachedResources();
    if (cached) {
      return cached;
    }
    // Fuente externa preparada: se habilita cuando una OPs/OMS publique una API.
    // const external = await fetchFromExternalDirectory();
    setCachedResources(OFFICIAL_RESOURCES);
    return OFFICIAL_RESOURCES;
  } catch {
    // Offline-first: el set estático siempre está disponible.
    setCachedResources(OFFICIAL_RESOURCES);
    return OFFICIAL_RESOURCES;
  }
}

export async function loadResourceById(id: string): Promise<OfficialResource> {
  const resources = await loadOfficialResources();
  const r = resources.find((x) => x.id === id);
  if (!r) {
    throw new ResourceNotFoundError(id);
  }
  return r;
}

/** Guarda la lista en caché localStorage. */
export function setCachedResources(resources: OfficialResource[]): void {
  try {
    const entry: CacheEntry = {
      version: RESOURCE_CACHE_VERSION,
      resources,
      filters: { country: 'ALL' },
      ts: Date.now(),
    };
    localStorage.setItem(RESOURCE_CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* noop */
  }
}

/** Lee la caché mientras no haya expirado. */
function getCachedResources(): OfficialResource[] | null {
  try {
const raw = localStorage.getItem(RESOURCE_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<CacheEntry> | null;
    if (!entry) return null;
    // Sin versión (catálogo anterior) o versión vieja: se descarta y se recarga.
    if (entry.version !== RESOURCE_CACHE_VERSION) {
      localStorage.removeItem(RESOURCE_CACHE_KEY);
      return null;
    }
    if (Date.now() - (entry.ts ?? 0) > RESOURCE_CACHE_TTL) return null;
    return entry.resources ?? null;
  } catch {
    return null;
  }
}

/** Limpiar caché (ej. al volver una nueva validación oficial). */
export function clearResourceCache(): void {
  try {
    localStorage.removeItem(RESOURCE_CACHE_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Client preparado: llama a una fuente externa si está disponible
 * y la habilitamos. Aquí iría: Befrienders API, Find A Helpline API,
 * o un endpoint propio del equipo.
 */
export async function fetchFromExternalDirectory(): Promise<OfficialResource[]> {
  // Placeholder: se habilitará cuando una fuente oficial publique API.
  // return (await fetch('https://api.ejemplo.org/helplines').then((r) => r.json())) as OfficialResource[];
  throw new ResourceFetchError('fuente externa no habilitada');
}

export async function syncExternalResources(): Promise<{ synced: number; errors: number }> {
  // Placeholder: resincroniza la caché con la fuente externa si se habilita.
  clearResourceCache();
  const resources = await loadOfficialResources();
  return { synced: resources.length, errors: 0 };
}

/**
 * Versión sincrónica y segura para UI (siempre sirve datos, nunca lanza).
 * Úsala directamente en componentes: filtros + búsqueda local.
 */
export function getReadyResources(filters: ResourceFilters = { country: 'ALL' }): OfficialResource[] {
  const resources = getCachedResources() ?? OFFICIAL_RESOURCES;
  return filterResources(resources, filters);
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
  if (filters.freeOnly) out = out.filter((r) => r.free);
  if (filters.youthOnly) out = out.filter((r) => r.youthFriendly);
  if (filters.inPersonOnly) out = out.filter((r) => r.inPerson);
  if (filters.virtualOnly) out = out.filter((r) => r.virtual);
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
    const order = ['NI', 'SV', 'GT', 'HN', 'CR', 'PA', 'INTL'];
    const ia = order.indexOf(a.country);
    const ib = order.indexOf(b.country);
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name);
  });
}

/** Predice de qué tipo de contacto es más probable que el usuario quiera. */
export function suggestContactKind(r: OfficialResource): 'call' | 'wa' | 'web' | 'visit' {
  if (r.type === 'hotline' || r.type === 'directory') {
    return r.whatsapp ? 'wa' : 'call';
  }
  if (r.inPerson && r.city) {
    return 'visit';
  }
  return r.website ? 'web' : 'call';
}
