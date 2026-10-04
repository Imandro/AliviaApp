import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStorage } from '../test/setup';

import {
  OFFICIAL_RESOURCES,
  type OfficialResource,
  type ResourceFilters,
} from './officialResources';
import {
  ResourceNotFoundError,
  ResourceFetchError,
  clearResourceCache,
  filterResources,
  getReadyResources,
  loadOfficialResources,
  loadResourceById,
  setCachedResources,
  suggestContactKind,
} from './resourceApi';

describe('resourceApi — cliente offline-first de recursos', () => {
  beforeEach(() => {
    resetStorage();
    clearResourceCache();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadOfficialResources devuelve el set verificado estatico', async () => {
    const resources = await loadOfficialResources();
    expect(resources).toEqual(OFFICIAL_RESOURCES);
    expect(resources.length).toBe(35);
  });

  it('loadResourceById encuentra recurso existente', async () => {
    const r = await loadResourceById('ni-minsa-l128');
    expect(r.id).toBe('ni-minsa-l128');
    expect(r.name).toBe('Línea 128 — Cruz Blanca / MINSA');
    expect(r.country).toBe('NI');
  });

  it('loadResourceById lanza ResourceNotFoundError para ID inexistente', async () => {
    await expect(loadResourceById('no-existe')).rejects.toThrow(ResourceNotFoundError);
    await expect(loadResourceById('no-existe')).rejects.toThrow('no-existe');
  });

  it('setCachedResources guarda en localStorage', () => {
    const sample: OfficialResource[] = [
      {
        id: 'test-1',
        name: 'Test',
        country: 'NI',
        type: 'hotline',
        free: true,
        youthFriendly: true,
        inPerson: false,
        virtual: true,
        specialties: ['suicidio'],
        source: 'GOV',
      contactStatus: 'verified',
        lastVerified: '2024-01-01',
      },
    ];
    setCachedResources(sample);
    const cached = getReadyResources({ country: 'NI' });
    expect(cached).toEqual(sample);
  });

  it('clearResourceCache limpia la cache', () => {
    const sample: OfficialResource[] = [{ ...OFFICIAL_RESOURCES[0] }];
    setCachedResources(sample);
    clearResourceCache();
    const resources = getReadyResources({ country: 'NI' });
    expect(resources.length).toBeGreaterThan(0);
  });

  it('getReadyResources nunca lanza y filtra por pais', () => {
    const all = getReadyResources();
    expect(all.length).toBe(35);
    const ni = getReadyResources({ country: 'NI' });
    expect(ni.every((r) => r.country === 'NI')).toBe(true);
    expect(ni.length).toBe(14);
  });

  it('getReadyResources filtra por problema (specialties)', () => {
    const suicidio = getReadyResources({ problem: 'suicidio' });
    expect(suicidio.every((r) => r.specialties.includes('suicidio'))).toBe(true);
    expect(suicidio.length).toBeGreaterThan(0);
  });

  it('getReadyResources filtra por freeOnly', () => {
    const free = getReadyResources({ freeOnly: true });
    expect(free.every((r) => r.free)).toBe(true);
  });

  it('getReadyResources filtra por youthOnly', () => {
    const youth = getReadyResources({ youthOnly: true });
    expect(youth.every((r) => r.youthFriendly)).toBe(true);
  });

  it('getReadyResources filtra por source', () => {
    const gov = getReadyResources({ source: 'GOV' });
    expect(gov.every((r) => r.source === 'GOV')).toBe(true);
  });

  it('getReadyResources busca por nombre/ciudad/especialidad', () => {
    const search = getReadyResources({ search: 'cruz blanca' });
    expect(search.some((r) => r.name.toLowerCase().includes('cruz blanca'))).toBe(true);
  });

  it('filterResources ordena por pais y nombre', () => {
    const filtered = filterResources(OFFICIAL_RESOURCES, { country: 'NI' });
    expect(filtered[0].country).toBe('NI');
    for (let i = 1; i < filtered.length; i++) {
      expect(filtered[i].name.localeCompare(filtered[i - 1].name)).toBeGreaterThanOrEqual(0);
    }
  });

  it('suggestContactKind prefiere llamada para hotlines', () => {
    const hotline: OfficialResource = {
      id: 'test',
      name: 'Test',
      country: 'NI',
      type: 'hotline',
      phone: '128',
      free: true,
      youthFriendly: true,
      inPerson: false,
      virtual: true,
      specialties: ['suicidio'],
      source: 'GOV',
      contactStatus: 'verified',
      lastVerified: '2024-01-01',
    };
    expect(suggestContactKind(hotline)).toBe('call');
  });

  it('suggestContactKind prefiere WhatsApp si hotline lo tiene', () => {
    const hotline: OfficialResource = {
      id: 'test',
      name: 'Test',
      country: 'NI',
      type: 'hotline',
      phone: '128',
      whatsapp: '50512345678',
      free: true,
      youthFriendly: true,
      inPerson: false,
      virtual: true,
      specialties: ['suicidio'],
      source: 'GOV',
      contactStatus: 'verified',
      lastVerified: '2024-01-01',
    };
    expect(suggestContactKind(hotline)).toBe('wa');
  });

  it('suggestContactKind sugiere visit para recursos presenciales con ciudad', () => {
    const hospital: OfficialResource = {
      id: 'test',
      name: 'Test',
      country: 'NI',
      type: 'hospital',
      address: 'Managua',
      city: 'Managua',
      free: true,
      youthFriendly: true,
      inPerson: true,
      virtual: false,
      specialties: ['suicidio'],
      source: 'GOV',
      contactStatus: 'verified',
      lastVerified: '2024-01-01',
    };
    expect(suggestContactKind(hospital)).toBe('visit');
  });

  it('suggestContactKind para directorio sin whatsapp devuelve call', () => {
    const dir: OfficialResource = {
      id: 'test',
      name: 'Test',
      country: 'NI',
      type: 'directory',
      website: 'https://example.org',
      free: true,
      youthFriendly: true,
      inPerson: false,
      virtual: true,
      specialties: ['bienestar'],
      source: 'NGO',
      contactStatus: 'verified',
      lastVerified: '2024-01-01',
    };
    expect(suggestContactKind(dir)).toBe('call');
  });

  it('suggestContactKind sugiere web para recursos inPerson sin city pero con website', () => {
    const clinic: OfficialResource = {
      id: 'test',
      name: 'Test',
      country: 'NI',
      type: 'clinic',
      website: 'https://example.org',
      free: true,
      youthFriendly: true,
      inPerson: true,
      virtual: false,
      specialties: ['bienestar'],
      source: 'NGO',
      contactStatus: 'verified',
      lastVerified: '2024-01-01',
    };
    // inPerson=true pero sin city -> cae al fallback website -> 'web'
    expect(suggestContactKind(clinic)).toBe('web');
  });
});