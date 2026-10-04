import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, X, Shield, MapPin } from 'lucide-react';
import { detectUserCountryWithCoords } from '../utils/officialResources';
import { hapticSos } from '../utils/haptics';

const STYLES: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    bottom: '100px', // above bottom nav (which is ~88px from bottom)
    right: '16px',
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '10px',
    pointerEvents: 'none',
  },
  fab: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 20px',
    borderRadius: '30px',
    background: 'linear-gradient(135deg, #e57373 0%, #d32f2f 100%)',
    boxShadow: '0 8px 30px rgba(211, 47, 47, 0.45), 0 0 0 4px rgba(211, 47, 47, 0.1)',
    cursor: 'pointer',
    border: 'none',
    color: '#fff',
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '0.04em',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    whiteSpace: 'nowrap',
  },
  fabIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pulse: {
    position: 'absolute',
    inset: '-4px',
    borderRadius: '34px',
    border: '2px solid rgba(229, 115, 115, 0.5)',
    animation: 'pulseSOS 2s infinite ease-out',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  },
  pulse2: {
    position: 'absolute',
    inset: '-4px',
    borderRadius: '34px',
    border: '2px solid rgba(229, 115, 115, 0.3)',
    animation: 'pulseSOS 2s infinite ease-out',
    animationDelay: '0.6s',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  },
  tooltip: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontFamily: 'var(--font-body)',
    whiteSpace: 'nowrap',
    opacity: 0,
    transform: 'translateX(20px)',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
  },
  tooltipVisible: {
    opacity: 1,
    transform: 'translateX(0)',
  },
  tooltipIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '10px',
    background: 'rgba(var(--accent-sage-rgb), 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-sage)',
    flexShrink: 0,
  },
};

export const UrgentHelpFAB: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showTooltip, setShowTooltip] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [geoMethod, setGeoMethod] = useState<'gps' | 'locale' | 'ip' | 'default' | null>(null);

  const handleClick = useCallback(() => {
    hapticSos();
    navigate('/resources');
  }, [navigate]);

  const handleHover = useCallback((show: boolean) => {
    setShowTooltip(show);
  }, []);

  // Detect user location once on mount (non-blocking)
  useEffect(() => {
    const init = async () => {
      try {
        const result = await detectUserCountryWithCoords();
        if (result.latitude && result.longitude) {
          setUserLat(result.latitude);
          setUserLng(result.longitude);
          setGeoMethod(result.method);
        }
      } catch {
        /* ignore */
      }
    };
    init();
  }, []);

  // Hide FAB when already on /resources or /sos
  const isOnHelpPage = location.pathname === '/resources' || location.pathname === '/sos';

  if (isOnHelpPage) return null;

  const tooltipText = userLat && userLng
    ? `Ubicación GPS ✓ — Recursos ordenados por distancia`
    : geoMethod
      ? `País: ${geoMethod.toUpperCase()} — Recursos disponibles`
      : 'Recursos oficiales: hospitales, líneas, centros';

  return (
    <div style={STYLES.container}>
      <div
        style={STYLES.fab}
        onClick={handleClick}
        onMouseEnter={() => handleHover(true)}
        onMouseLeave={() => handleHover(false)}
        onTouchStart={() => handleHover(true)}
        onTouchEnd={() => { handleHover(false); handleClick(); }}
        aria-label="Ayuda urgente - Recursos oficiales"
        data-tour="ayuda-fab"
      >
        <div style={STYLES.pulse} />
        <div style={STYLES.pulse2} />
        <div style={STYLES.fabIcon}>
          <Phone size={16} color="#fff" />
        </div>
        <span style={{ flex: 1, textAlign: 'center' }}>AYUDA URGENTE</span>
      </div>

      <div
        style={{
          ...STYLES.tooltip,
          ...(showTooltip ? STYLES.tooltipVisible : {}),
        }}
      >
        <div style={STYLES.tooltipIcon}>
          <Shield size={14} />
        </div>
        <span>{tooltipText}</span>
        <MapPin size={14} color="var(--accent-sage)" />
      </div>
    </div>
  );
};
