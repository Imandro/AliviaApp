import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Phone, Contrast } from 'lucide-react';
import logoBanner from '../assets/logo-banner.png';

export type ThemeMode = 'light' | 'dark' | 'mono';

interface HeaderProps {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  onSosClick: () => void;
  userName?: string;
}

const THEME_ORDER: ThemeMode[] = ['dark', 'light', 'mono'];

const THEME_INFO: Record<ThemeMode, { icon: React.ComponentType<any>; title: string; next: ThemeMode }> = {
  dark: { icon: Sun, title: 'Modo Salvia Suave (claro)', next: 'light' },
  light: { icon: Moon, title: 'Modo Calma Profunda (oscuro)', next: 'mono' },
  mono: { icon: Contrast, title: 'Modo Calma Bicolor (blanco y negro)', next: 'dark' },
};

export const Header: React.FC<HeaderProps> = ({ theme, setTheme, onSosClick, userName }) => {
  const navigate = useNavigate();

  const toggleTheme = () => {
    const nextTheme = THEME_INFO[theme].next;
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const initial = (userName || 'A').trim().charAt(0).toUpperCase() || 'A';
  const ThemeIcon = THEME_INFO[theme].icon;

  return (
    <header style={styles.header}>
      <div style={styles.logoArea}>
        <img src={logoBanner} alt="ALIVIA" style={styles.logo} />
        {userName && <span style={styles.greeting}>Hola, {userName.split(' ')[0]}</span>}
      </div>

      <div style={styles.actions}>
        <button
          onClick={toggleTheme}
          style={styles.iconBtn}
          title={THEME_INFO[theme].title}
        >
          <div style={styles.iconInner}>
            <ThemeIcon size={18} color="var(--text-secondary)" />
          </div>
        </button>

        <button
          onClick={() => navigate('/profile')}
          style={styles.avatarBtn}
          title="Mi perfil"
        >
          <div style={styles.avatarInner}>{initial}</div>
        </button>

        <button
          onClick={onSosClick}
          style={styles.sosBtn}
          title="Ayuda Inmediata (SOS)"
        >
          <div style={styles.sosPulse} />
          <div style={styles.sosPulse2} />
          <Phone size={14} color="#fff" />
          <span style={styles.sosText}>SOS</span>
        </button>
      </div>
    </header>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    height: '64px',
    minHeight: '64px',
    width: '100%',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--bg-nav)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border-color)',
    position: 'relative',
    zIndex: 10,
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
  },
  greeting: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '140px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    width: '38px',
    height: '38px',
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
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  avatarInner: {
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--accent-gold)',
    lineHeight: 1,
  },
  sosBtn: {
    position: 'relative',
    height: '36px',
    padding: '0 14px',
    borderRadius: '18px',
    border: 'none',
    background: 'linear-gradient(135deg, #e57373 0%, #d32f2f 100%)',
    boxShadow: '0 4px 15px rgba(211, 47, 47, 0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  sosText: {
    color: '#fff',
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.06em',
  },
  sosPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '18px',
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
    borderRadius: '18px',
    border: '2px solid rgba(229, 115, 115, 0.3)',
    animation: 'pulseSOS 2s infinite ease-out',
    animationDelay: '0.6s',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  },
};
