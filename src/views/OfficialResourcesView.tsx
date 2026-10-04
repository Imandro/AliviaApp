/* ----------------------------------------------------
   ALIVIA — RECURSOS OFICIALES VERIFICADOS
   País auto_detectado, buscador, filtros y tarjetas de
   líneas de crisis, hospitales, ONGs y directorios.
   Botones "Llamar", WhatsApp, Web, Guardar y Compartir.
   Orden por distancia (cuando hay GPS) y badges de verificación.
   ---------------------------------------------------- */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Heart,
  Share2,
  Building,
  Globe,
  BookOpen,
  Check,
  UserCheck,
  Info,
  ShieldCheck,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import {
  OFFICIAL_RESOURCES,
  CRISIS_COUNTRIES,
  resourcesMatchProblem,
  getCountryInfo,
  getEmergencyNumber,
  formatHours,
  resourceCardTitle,
  contactHref,
  saveResourceFavorite,
  loadResourceFavorites,
  isResourceFavorite,
  shareResource,
  detectCountryFromLocale,
  detectUserCountryWithCoords,
  resourceHasContact,
  sortResourcesByDistance,
  type OfficialResource,
  type OfficialResourceCountry,
  type ProblemArea,
  type ContactStatus,
} from '../utils/officialResources';
import { CrisisModeBanner, type CrisisBannerVariant } from './CrisisModeBanner';

const PROBLEM_LABELS: Record<ProblemArea, string> = {
  suicidio: 'Suicidio',
  depresion: 'Depresión',
  ansiedad: 'Ansiedad',
  panico: 'Ataques de pánico',
  autolesion: 'Autolesión',
  relaciones: 'Relaciones',
  noviazgo: 'Noviazgo',
  amistades: 'Amistades',
  violencia: 'Violencia',
  adicciones: 'Adicciones',
  duelo: 'Duelo',
  bienestar: 'Bienestar',
  tdah: 'TDAH',
};

const TYPE_EMOJI: Record<string, string> = {
  hotline: '📞',
  hospital: '🏥',
  clinic: '🏥',
  ngo: '❤️',
  university: '🎓',
  directory: '🌐',
  government: '🏛️',
};

const TYPE_RGB: Record<string, string> = {
  hotline: '229,115,115',
  hospital: '140,176,141',
  clinic: '140,176,141',
  ngo: '242,227,160',
  university: '140,176,141',
  directory: '175,214,255',
  government: '140,176,141',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  hotline: Phone,
  hospital: Building,
  clinic: Building,
  ngo: Heart,
  university: BookOpen,
  directory: Globe,
  government: Building,
};

export const OfficialResourcesView: React.FC = () => {
  const [country, setCountry] = useState<OfficialResourceCountry>(() => detectCountryFromLocale());
  const [search, setSearch] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<ProblemArea | 'ALL'>('ALL');
  const [freeOnly, setFreeOnly] = useState(false);
  const [youthOnly, setYouthOnly] = useState(false);
  const [contactFilter, setContactFilter] = useState<ContactStatus | 'ALL'>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => loadResourceFavorites());
  const [geoLoading, setGeoLoading] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [geoMethod, setGeoMethod] = useState<'gps' | 'locale' | 'ip' | 'default' | null>(null);

  const countryInfo = getCountryInfo(country);
  const emergency = getEmergencyNumber(country);
  const isINTL = country === 'INTL';

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!prev.includes(id)) saveResourceFavorite(id);
      else localStorage.removeItem('alivia-fav-resources');
      return next;
    });
  }, []);

  const handleShare = useCallback(
    async (r: OfficialResource) => {
      await shareResource(r);
    },
    []
  );

  const handleGeoClick = useCallback(async () => {
    setGeoLoading(true);
    try {
      const detected = await detectUserCountryWithCoords();
      if (detected.country !== country) {
        setCountry(detected.country);
      }
      if (detected.latitude && detected.longitude) {
        setUserLat(detected.latitude);
        setUserLng(detected.longitude);
        setGeoMethod(detected.method);
      }
    } finally {
      setGeoLoading(false);
    }
  }, [country]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const detected = await detectUserCountryWithCoords();
      if (mounted && detected.country !== country) {
        setCountry(detected.country);
      }
      if (mounted && detected.latitude && detected.longitude) {
        setUserLat(detected.latitude);
        setUserLng(detected.longitude);
        setGeoMethod(detected.method);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const problems: Array<{ key: ProblemArea | 'ALL'; label: string }> = [
    { key: 'ALL', label: 'Todos los temas' },
    ...Object.entries(PROBLEM_LABELS).map(([k, v]) => ({ key: k as ProblemArea, label: v })),
  ];

  const filtered = useMemo(() => {
    let res = OFFICIAL_RESOURCES.filter((r) => {
      if (!isINTL && r.country !== country) return false;
      if (selectedProblem !== 'ALL' && !r.specialties.includes(selectedProblem)) return false;
      if (freeOnly && !r.free) return false;
      if (youthOnly && !r.youthFriendly) return false;
      if (contactFilter !== 'ALL' && r.contactStatus !== contactFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.name.toLowerCase().includes(q) &&
          !r.city?.toLowerCase().includes(q) &&
          !r.specialties.some((s) => s.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      return true;
    });

    // Si tenemos coordenadas del usuario, ordenar por distancia
    if (userLat !== null && userLng !== null) {
      res = sortResourcesByDistance(res, userLat, userLng);
    } else {
      const order = ['NI', 'SV', 'GT', 'HN', 'CR', 'PA', 'INTL'];
      res = res.sort((a, b) => {
        const ia = order.indexOf(a.country);
        const ib = order.indexOf(b.country);
        if (ia !== ib) return ia - ib;
        const fa = favorites.includes(a.id) ? 1 : 0;
        const fb = favorites.includes(b.id) ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return a.name.localeCompare(b.name);
      });
    }

    return res;
  }, [country, isINTL, selectedProblem, freeOnly, youthOnly, contactFilter, search, favorites, userLat, userLng]);

  const shown = filtered.slice(0, 40);

  const CONTACT_STATUS_LABEL: Record<ContactStatus, { label: string; color: string; icon: React.ElementType }> = {
    verified: { label: 'Verificado', color: 'var(--accent-sage)', icon: ShieldCheck },
    unverified: { label: 'Por confirmar', color: 'var(--accent-amber)', icon: AlertCircle },
    none: { label: 'Sin contacto', color: 'var(--text-muted)', icon: AlertCircle },
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '110px' }}>
      <CrisisModeBanner variant="compact" countryEmergency={emergency} localeLine={isINTL ? '800-SUICIDIO' : undefined} />

      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '14px 12px', marginTop: '6px' }}>
        <div>
          <div style={{ fontSize: '10px', fontFamily: 'var(--font-title)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isINTL ? 'INTERNACIONAL' : 'RECURSOS OFICIALES'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)', margin: 0 }}>
            {isINTL ? 'Ayuda internacional' : countryInfo?.label + ' — ayuda verificada'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {countryInfo && (
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as OfficialResourceCountry)}
              className="input-apple"
              style={{ padding: '8px 10px', borderRadius: '12px', fontSize: '12px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              aria-label="Cambiar país"
            >
              <option value={country}>{countryInfo.label}</option>
              {CRISIS_COUNTRIES.map((c) => (
                <option key={c.country} value={c.country}>{c.label}</option>
              ))}
              <option value="INTL">Internacional</option>
            </select>
          )}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
              borderRadius: '12px', background: freeOnly || youthOnly ? 'var(--accent-sage)' : 'var(--bg-surface)',
              color: freeOnly || youthOnly ? '#0c1810' : 'var(--text-primary)',
              border: '1px solid var(--border-color)', fontSize: '12px', fontFamily: 'var(--font-title)',
              cursor: 'pointer',
            }}
          >
            <Info size={14} /> Filtros
          </button>
        </div>
      </div>

      {/* Filtros */}
      {filtersOpen && (
        <div className="glass-card" style={{ padding: '14px 12px', marginBottom: '10px' }}>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-title)', color: 'var(--text-muted)', marginBottom: '6px' }}>TEMA</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {problems.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedProblem(p.key)}
                  style={{
                    padding: '6px 12px', borderRadius: '12px', fontSize: '11.5px',
                    background: selectedProblem === p.key ? 'var(--accent-sage)' : 'rgba(0,0,0,0.18)',
                    color: selectedProblem === p.key ? '#0c1810' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)', fontFamily: 'var(--font-title)',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
              Gratis
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={youthOnly} onChange={(e) => setYouthOnly(e.target.checked)} />
              Amigable con jóvenes
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-title)', color: 'var(--text-muted)', marginBottom: '6px' }}>ESTADO DE CONTACTO</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(['ALL', 'verified', 'unverified', 'none'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setContactFilter(key)}
                  style={{
                    padding: '6px 12px', borderRadius: '12px', fontSize: '11.5px',
                    background: contactFilter === key ? 'var(--accent-sage)' : 'rgba(0,0,0,0.18)',
                    color: contactFilter === key ? '#0c1810' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)', fontFamily: 'var(--font-title)',
                    cursor: 'pointer',
                  }}
                >
                  {key === 'ALL' ? 'Todos' : CONTACT_STATUS_LABEL[key as ContactStatus].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 12px', marginBottom: '10px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Buscar línea, hospital, ONG o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-apple"
            style={{
              paddingLeft: '38px', paddingRight: '12px', height: '40px', borderRadius: '14px',
              fontSize: '13px', background: 'var(--bg-surface)', color: 'var(--text-primary)',
              border: '1px solid var(--border-color)', width: '100%',
            }}
          />
        </div>
        <button
          onClick={() => { setFiltersOpen(false); setCountry(isINTL ? 'NI' : (CRISIS_COUNTRIES[0].country as OfficialResourceCountry)); setSearch(''); setSelectedProblem('ALL'); setFreeOnly(false); setYouthOnly(false); setContactFilter('ALL'); }}
          style={{
            padding: '0 14px', borderRadius: '14px', fontSize: '13px', fontFamily: 'var(--font-title)',
            background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
            cursor: 'pointer',
          }}
          aria-label="Limpiar filtros"
        >
          Limpiar
        </button>
      </div>

      {/* Lista */}
      {shown.length === 0 ? (
        <div className="glass-card" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <p className="body-standard" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            No encontramos recursos con estos filtros.
            {' '}
            <button onClick={() => { setSearch(''); setFreeOnly(false); setYouthOnly(false); setSelectedProblem('ALL'); setContactFilter('ALL'); }} style={{ color: 'var(--accent-sage)', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px' }}>
              Ver todos
            </button>
          </p>
        </div>
      ) : (
        shown.map((r) => {
          const isFav = favorites.includes(r.id);
          const Icon = TYPE_ICON[r.type];
          const contactStatusInfo = CONTACT_STATUS_LABEL[r.contactStatus];
          const distanceKm = (r as any).distanceKm as number | undefined;
          return (
            <div key={r.id} className="glass-card fade-in" style={{ padding: '14px 12px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
                  background: `rgba(${TYPE_RGB[r.type]}, 0.15)`, border: `1px solid rgba(${TYPE_RGB[r.type]}, 0.25)`,
                }}>
                  {r.type === 'ngo' && isFav ? <Heart size={17} fill="var(--accent-gold)" color="var(--accent-gold)" /> : <Icon size={17} color={r.type === 'ngo' ? 'var(--accent-gold)' : 'var(--text-primary)'} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-title)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {resourceCardTitle(r)} · {formatHours(r)}
                    </span>
                    <span style={{
                      fontSize: '9px', fontFamily: 'var(--font-title)', fontWeight: 600,
                      padding: '2px 8px', borderRadius: '8px',
                      background: `${contactStatusInfo.color}20`,
                      color: contactStatusInfo.color,
                      border: `1px solid ${contactStatusInfo.color}`,
                    }}>
                      <contactStatusInfo.icon size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                      {contactStatusInfo.label}
                    </span>
                    {distanceKm !== undefined && (
                      <span style={{
                        fontSize: '9px', fontFamily: 'var(--font-title)', fontWeight: 600,
                        padding: '2px 8px', borderRadius: '8px',
                        background: 'rgba(140,176,141,0.15)',
                        color: 'var(--accent-sage)',
                        border: '1px solid var(--accent-sage)',
                      }}>
                        <Navigation size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                        {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name}
                  </h4>
                  {r.address && (
                    <p className="body-standard" style={{ fontSize: '11.5px', opacity: 0.7, margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.address}
                      {r.city && ` · ${r.city}`}
                    </p>
                  )}
                  {r.specialties.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                      {r.specialties.slice(0, 4).map((s) => (
                        <span key={s} style={{
                          fontSize: '10.5px', color: 'var(--text-secondary)',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                          padding: '3px 9px', borderRadius: '9px',
                        }}>
                          {PROBLEM_LABELS[s as keyof typeof PROBLEM_LABELS] || s}
                        </span>
                      ))}
                      {r.specialties.length > 4 && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>+{r.specialties.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleFavorite(r.id)}
                  style={{
                    padding: '8px', borderRadius: '10px', background: 'rgba(0,0,0,0.1)', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isFav ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  }}
                  aria-label={isFav ? 'Quitar de guardados' : 'Guardar'}
                >
                  <Heart size={17} fill={isFav ? 'var(--accent-gold)' : 'none'} color={isFav ? 'var(--accent-gold)' : 'currentColor'} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                {resourceHasContact(r) && r.phone && (
                  <a href={contactHref(r, 'call')!} className="btn-primary" style={{ padding: '9px 15px', borderRadius: '12px', fontSize: '12px', background: 'var(--accent-sage)', color: '#0c1810' }}>
                    <Phone size={14} style={{ marginRight: '4px' }} /> Llamar
                  </a>
                )}
                {resourceHasContact(r) && r.whatsapp && (
                  <a href={contactHref(r, 'wa')!} className="btn-secondary" style={{ padding: '9px 15px', borderRadius: '12px', fontSize: '12px' }}>
                    <MessageCircle size={14} style={{ marginRight: '4px' }} /> WhatsApp
                  </a>
                )}
                {resourceHasContact(r) && r.website && (
                  <a href={contactHref(r, 'web')!} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '9px 15px', borderRadius: '12px', fontSize: '12px' }}>
                    <Globe size={14} style={{ marginRight: '4px' }} /> Web
                  </a>
                )}
                <button onClick={() => handleShare(r)} className="btn-secondary" style={{ padding: '9px 15px', borderRadius: '12px', fontSize: '12px' }}>
                  <Share2 size={14} style={{ marginRight: '4px' }} /> Compartir
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Botón flotante de geolocalización */}
      <button
        onClick={handleGeoClick}
        style={{
          position: 'fixed', bottom: '22px', right: '22px', zIndex: 50,
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 18px', borderRadius: '16px',
          background: 'var(--accent-sage)', color: '#0c1810',
          border: 'none', fontFamily: 'var(--font-title)', fontWeight: 600, fontSize: '13px',
          boxShadow: '0 6px 20px rgba(140, 176, 141, 0.35)', cursor: 'pointer',
        }}
      >
        <MapPin size={16} />
        {geoLoading ? 'Detectando...' : userLat ? `Ubicación: GPS ✓` : geoMethod ? `País: ${geoMethod.toUpperCase()}` : 'Ayuda cerca de mí'}
      </button>
    </div>
  );
};
