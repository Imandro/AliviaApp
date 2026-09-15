import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sun, Moon, Phone, Contrast, Palette } from 'lucide-react';
import { hapticSos } from '../utils/haptics';
import logoBanner from '../assets/logo-banner.png';

export type ThemeMode = 'light' | 'dark' | 'mono';

interface HeaderProps {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  onSosClick: () => void;
  userName?: string;
}

const THEME_ITEMS: Array<{ mode: ThemeMode; label: string; desc: string; icon: React.ComponentType<any>; chip: string }> = [
  { mode: 'dark', label: 'Calma Profunda', desc: 'Oscuro · verde y oro', icon: Moon, chip: 'linear-gradient(135deg, #2C533D, #0d1810)' },
  { mode: 'light', label: 'Salvia Suave', desc: 'Claro · contraste alto', icon: Sun, chip: 'linear-gradient(135deg, #EAEBDD, #d0d5c3)' },
  { mode: 'mono', label: 'Monocromo', desc: 'Blanco y negro puro', icon: Contrast, chip: 'linear-gradient(135deg, #f5f5f5, #3a3a3a)' },
];

export const Header: React.FC<HeaderProps> = ({ theme, setTheme, onSosClick, userName }) => {
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!themeOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setThemeOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [themeOpen]);

  const initial = (userName || 'A').trim().charAt(0).toUpperCase() || 'A';

  return (
    <header style={styles.header}>
      <div style={styles.logoArea}>
        <img src={logoBanner} alt="ALIVIA" style={styles.logo} />
      </div>

      <div style={styles.actions}>
        <div ref={themeRef} style={styles.themeWrap}>
          <button
            onClick={() => setThemeOpen(v => !v)}
            style={styles.iconBtn}
            className="hdr-btn"
            aria-haspopup="menu"
            aria-expanded={themeOpen}
            aria-label="Cambiar tema de la app"
            title="Cambiar tema de la app"
          >
            <div style={styles.iconInner}>
              <Palette size={19} color="var(--text-secondary)" />
            </div>
          </button>

          {themeOpen && (
            <div className="theme-menu" role="menu" aria-label="Cambiar tema">
              {THEME_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = theme === item.mode;
                return (
                  <button
                    key={item.mode}
                    role="menuitemradio"
                    aria-checked={isActive}
                    className="theme-menu-item"
                    onClick={() => {
                      setTheme(item.mode);
                      document.documentElement.setAttribute('data-theme', item.mode);
                      setThemeOpen(false);
                    }}
                    style={isActive ? { borderColor: 'rgba(var(--accent-gold-rgb), 0.4)' } : undefined}
                  >
                    <span className="theme-chip" style={{ background: item.chip }} aria-hidden="true" />
                    <IconComponent size={17} color={isActive ? 'var(--accent-gold)' : 'var(--text-muted)'} aria-hidden="true" />
                    <span style={styles.themeOptionText}>
                      <span style={styles.themeOptionLabel}>{item.label}</span>
                      <span style={styles.themeOptionDesc}>{item.desc}</span>
                    </span>
                    <Check size={16} className="theme-menu-check" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/profile')}
          style={styles.avatarBtn}
          className="hdr-btn"
          title="Mi perfil"
          aria-label="Mi perfil"
        >
          <div style={styles.avatarInner}>{initial}</div>
        </button>

        <button
          onClick={() => { hapticSos(); onSosClick(); }}
          style={styles.sosBtn}
          title="Ayuda Inmediata (SOS)"
          aria-label="Ayuda inmediata, líneas de crisis (SOS)"
        >
          <div style={styles.sosPulse} />
          <div style={styles.sosPulse2} />
          <Phone size={14} color="#fff" aria-hidden="true" />
          <span style={styles.sosText}>SOS</span>
        </button>
      </div>
    </header>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    height: 'calc(64px + env(safe-area-inset-top))',
    minHeight: 'calc(64px + env(safe-area-inset-top))',
    width: '100%',
    padding: 'env(safe-area-inset-top) 20px 0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--bg-nav)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border-color)',
    boxShadow: '0 10px 30px -18px rgba(0, 0, 0, 0.55)',
    position: 'relative',
    zIndex: 30,
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
  },
  logo: {
    height: '26px',
    width: 'auto',
    objectFit: 'contain',
    flexShrink: 0,
    filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35))',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  themeWrap: {
    position: 'relative',
  },
  themeOptionText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minWidth: 0,
  },
  themeOptionLabel: {
    fontSize: '14px',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  themeOptionDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: 1.2,
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    minWidth: '44px',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  iconInner: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBtn: {
    background: 'rgba(var(--accent-gold-rgb), 0.10)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.3)',
    cursor: 'pointer',
    minWidth: '44px',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  avatarInner: {
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    fontSize: '16px',
    color: 'var(--accent-gold)',
    lineHeight: 1,
  },
  sosBtn: {
    position: 'relative',
    height: '44px',
    padding: '0 16px',
    borderRadius: '22px',
    border: 'none',
    background: 'linear-gradient(135deg, #e57373 0%, #d32f2f 100%)',
    boxShadow: '0 4px 15px rgba(211, 47, 47, 0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  sosText: {
    color: '#fff',
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '0.06em',
  },
  sosPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '22px',
    border: '2px solid rgba(229, 115, 115, 0.5)',
    animation: 'pulseSOS 2s infinite ease-out',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  },
  sosPulse2: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '22px',
    border: '2px solid rgba(229, 115, 115, 0.3)',
    animation: 'pulseSOS 2s infinite ease-out',
    animationDelay: '0.6s',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  },
};