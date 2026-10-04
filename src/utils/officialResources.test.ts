import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStorage } from '../test/setup';

import {
  COUNTRY_MAP,
  CRISIS_COUNTRIES,
  OFFICIAL_RESOURCES,
  contactHref,
  detectCountryFromLocale,
  detectUserCountry,
  formatHours,
  getCountryInfo,
  getEmergencyNumber,
  isResourceFavorite,
  loadResourceFavorites,
  resourceCardTitle,
  resourcesMatchProblem,
  saveResourceFavorite,
  shareResource,
  supportsGeolocation,
  clearGeoCache,
  type OfficialResource,
  type ProblemArea,
} from './officialResources';

describe('officialResources — recursos oficiales verificados', () => {
  beforeEach(() => {
    resetStorage();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('OFFICIAL_RESOURCES — conjunto verificado', () => {
    it('contiene 35 recursos totales', () => {
      expect(OFFICIAL_RESOURCES.length).toBe(35);
    });

    it('tiene recursos para los 6 países + INTL', () => {
      const counts = {
        NI: 14,
        SV: 4,
        GT: 4,
        HN: 3,
        CR: 3,
        PA: 3,
        INTL: 4,
      };
      for (const [country, expected] of Object.entries(counts)) {
        const actual = OFFICIAL_RESOURCES.filter((r) => r.country === country).length;
        expect(actual).toBe(expected);
      }
    });

    it('cada recurso tiene campos obligatorios', () => {
      for (const r of OFFICIAL_RESOURCES) {
        expect(r.id).toBeDefined();
        expect(r.name).toBeDefined();
        expect(r.country).toBeDefined();
        expect(r.type).toBeDefined();
        expect(typeof r.free).toBe('boolean');
        expect(typeof r.youthFriendly).toBe('boolean');
        expect(typeof r.inPerson).toBe('boolean');
        expect(typeof r.virtual).toBe('boolean');
        expect(Array.isArray(r.specialties)).toBe(true);
        expect(r.specialties.length).toBeGreaterThan(0);
        expect(r.source).toBeDefined();
        expect(r.lastVerified).toBeDefined();
      }
    });

    it('tipos de recurso válidos', () => {
      const validTypes = ['hotline', 'hospital', 'clinic', 'ngo', 'university', 'directory', 'government'];
      for (const r of OFFICIAL_RESOURCES) {
        expect(validTypes).toContain(r.type);
      }
    });

    it('fuentes válidas', () => {
      const validSources = ['MINSA', 'OPS', 'OMS', 'UNICEF', 'GOV', 'NGO', 'PROF'];
      for (const r of OFFICIAL_RESOURCES) {
        expect(validSources).toContain(r.source);
      }
    });

    it('especialidades son ProblemArea válidas', () => {
      const validAreas: ProblemArea[] = [
        'suicidio', 'depresion', 'ansiedad', 'panico', 'autolesion',
        'relaciones', 'noviazgo', 'amistades', 'violencia', 'adicciones',
        'duelo', 'bienestar', 'tdah',
      ];
      for (const r of OFFICIAL_RESOURCES) {
        for (const s of r.specialties) {
          expect(validAreas).toContain(s);
        }
      }
    });

    it('COUNTRY_MAP mapea códigos de país', () => {
      expect(COUNTRY_MAP['ni']).toBe('NI');
      expect(COUNTRY_MAP['sv']).toBe('SV');
      expect(COUNTRY_MAP['gt']).toBe('GT');
      expect(COUNTRY_MAP['hn']).toBe('HN');
      expect(COUNTRY_MAP['cr']).toBe('CR');
      expect(COUNTRY_MAP['pa']).toBe('PA');
    });
  });

  describe('getCountryInfo / getEmergencyNumber', () => {
    it('getCountryInfo devuelve entrada para países válidos', () => {
      for (const { country } of CRISIS_COUNTRIES) {
        const info = getCountryInfo(country);
        expect(info).not.toBeNull();
        expect(info?.country).toBe(country);
        expect(info?.label).toBeDefined();
        expect(info?.emergency).toBeDefined();
        expect(info?.color).toBeDefined();
      }
    });

    it('getCountryInfo devuelve null para INTL', () => {
      expect(getCountryInfo('INTL')).toBeNull();
    });

    it('getEmergencyNumber devuelve el número de emergencia del país', () => {
      expect(getEmergencyNumber('NI')).toBe('911 / 128');
      expect(getEmergencyNumber('SV')).toBe('911 / 150');
      expect(getEmergencyNumber('GT')).toBe('110 / 1500');
      expect(getEmergencyNumber('HN')).toBe('911 / 110');
      expect(getEmergencyNumber('CR')).toBe('911');
      expect(getEmergencyNumber('PA')).toBe('911 / 147');
    });

    it('getEmergencyNumber fallback a 911 para INTL', () => {
      expect(getEmergencyNumber('INTL')).toBe('911');
    });
  });

  describe('detectCountryFromLocale', () => {
    it('detecta NI por defecto (es-NI)', () => {
      vi.stubGlobal('navigator', { language: 'es-NI' });
      expect(detectCountryFromLocale()).toBe('NI');
    });

    it('detecta SV para es-SV', () => {
      vi.stubGlobal('navigator', { language: 'es-SV' });
      expect(detectCountryFromLocale()).toBe('SV');
    });

    it('detecta GT para es-GT', () => {
      vi.stubGlobal('navigator', { language: 'es-GT' });
      expect(detectCountryFromLocale()).toBe('GT');
    });

    it('fallback a NI para locale desconocido', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      expect(detectCountryFromLocale()).toBe('NI');
    });

    it('fallback a NI si navigator no existe', () => {
      vi.stubGlobal('navigator', undefined);
      expect(detectCountryFromLocale()).toBe('NI');
    });
  });

  describe('detectUserCountry', () => {
    it('devuelve un país válido (nunca INTL)', async () => {
      // Sin geolocalizacion y con locale en espanol: resuelve por idioma,
      // sin tocar la red (el fallback por IP se stubea para que no salga).
      vi.stubGlobal('navigator', { language: 'es-NI' });
      vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
      const country = await detectUserCountry();
      expect(['NI', 'SV', 'GT', 'HN', 'CR', 'PA']).toContain(country);
      expect(country).not.toBe('INTL');
    });

    it('cae a NI cuando no hay geolocalizacion, idioma ni red', async () => {
      vi.stubGlobal('navigator', {
        geolocation: {
          getCurrentPosition: (_s: any, err: (e: any) => void) => err(new Error('denied')),
        },
        language: 'en-US',
      });
      vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
      const country = await detectUserCountry();
      expect(country).toBe('NI');
    });

    it('usa geolocalización si está disponible y tiene geocerca', async () => {
      const mockPos = {
        coords: { latitude: 12.5, longitude: -85.0 },
      };
      vi.stubGlobal('navigator', {
        geolocation: {
          getCurrentPosition: (cb: (p: any) => void) => cb(mockPos),
        },
        language: 'es-NI',
      });
      const country = await detectUserCountry();
      expect(country).toBe('NI');
    });

    it('fallback a idioma si geolocalización falla', async () => {
      vi.stubGlobal('navigator', {
        geolocation: {
          getCurrentPosition: (_s: any, err: (e: any) => void) => err(new Error('denied')),
        },
        language: 'es-CR',
      });
      const country = await detectUserCountry();
      expect(country).toBe('CR');
    });
  });

  describe('formatHours', () => {
    const base: OfficialResource = {
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
    it('formatea 24/7 correctamente', () => {
      expect(formatHours({ ...base, hours: '24/7' })).toBe('24/7');
    });

    it('formatea horarios L-V', () => {
      expect(formatHours({ ...base, hours: 'L-V 8:00-17:00' })).toBe('L-V 8:00-17:00');
    });

    it('maneja horas undefined', () => {
      expect(formatHours(base)).toBe('Consultar horario');
    });
  });

  describe('resourceCardTitle', () => {
    it('incluye badge de fuente y nombre', () => {
      const r: OfficialResource = {
        id: 'test',
        name: 'Test Line',
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
      const title = resourceCardTitle(r);
      expect(title).toContain('Recurso oficial');
      expect(title).toContain('Test Line');
    });
  });

  describe('contactHref', () => {
    it('genera tel: para phone', () => {
      const r: OfficialResource = {
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
      expect(contactHref(r, 'call')).toBe('tel:128');
    });

    it('genera wa.me para whatsapp', () => {
      const r: OfficialResource = {
        id: 'test',
        name: 'Test',
        country: 'NI',
        type: 'hotline',
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
      expect(contactHref(r, 'wa')).toBe('https://wa.me/50512345678');
    });

    it('genera https:// para web', () => {
      const r: OfficialResource = {
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
      expect(contactHref(r, 'web')).toBe('https://example.org');
    });

    it('devuelve null si no hay contacto del tipo solicitado', () => {
      const r: OfficialResource = {
        id: 'test',
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
      };
      expect(contactHref(r, 'wa')).toBeNull();
    });
  });

  describe('shareResource', () => {
    it('usa navigator.share si disponible', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { share: shareMock });
      const r: OfficialResource = {
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
      await shareResource(r);
      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Recursos oficiales de salud mental',
          text: 'Test — Nicaragua\nTel: 128\n',
        })
      );
    });

    it('fallback a clipboard si no hay navigator.share', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });
      const r: OfficialResource = {
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
      await shareResource(r);
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Test'));
    });
  });

  describe('favoritos — saveResourceFavorite / loadResourceFavorites / isResourceFavorite', () => {
    it('saveResourceFavorite guarda y isResourceFavorite detecta', () => {
      expect(isResourceFavorite('ni-minsa-l128')).toBe(false);
      saveResourceFavorite('ni-minsa-l128');
      expect(isResourceFavorite('ni-minsa-l128')).toBe(true);
    });

    it('loadResourceFavorites devuelve lista guardada', () => {
      saveResourceFavorite('ni-minsa-l128');
      saveResourceFavorite('sv-sem-132');
      const favs = loadResourceFavorites();
      expect(favs).toContain('ni-minsa-l128');
      expect(favs).toContain('sv-sem-132');
    });
  });

  describe('resourcesMatchProblem', () => {
    it('true si recurso cubre el problema', () => {
      const r: OfficialResource = {
        id: 'test',
        name: 'Test',
        country: 'NI',
        type: 'hotline',
        free: true,
        youthFriendly: true,
        inPerson: false,
        virtual: true,
        specialties: ['suicidio', 'depresion'],
        source: 'GOV',
      contactStatus: 'verified',
        lastVerified: '2024-01-01',
      };
      expect(resourcesMatchProblem('suicidio').find((r) => r.id === 'ni-minsa-l128')).toBeDefined();
      expect(resourcesMatchProblem('depresion').find((r) => r.id === 'ni-fonseca')).toBeDefined();
    });

    it('false si el recurso no cubre el problema', () => {
      // ni-minsa-l128 solo trata suicidio/depresion/ansiedad/panico/bienestar
      expect(resourcesMatchProblem('noviazgo').find((x) => x.id === 'ni-minsa-l128')).toBeUndefined();
      // y el problema sí tiene cobertura en el directorio
      expect(resourcesMatchProblem('noviazgo').length).toBeGreaterThan(0);
    });
  });

  describe('supportsGeolocation / clearGeoCache', () => {
    it('supportsGeolocation refleja navigator.geolocation', () => {
      vi.stubGlobal('navigator', { geolocation: {} });
      expect(supportsGeolocation()).toBe(true);
      vi.stubGlobal('navigator', {});
      expect(supportsGeolocation()).toBe(false);
    });

    it('clearGeoCache no lanza', () => {
      expect(() => clearGeoCache()).not.toThrow();
    });
  });
});
