import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share, Download, X, Home, MoreHorizontal, Smartphone } from 'lucide-react';

type Platform = 'ios' | 'android';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SHOWN_KEY = 'alivia-install-shown-v1';

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    animation: 'fadeInFast 0.25s ease forwards',
  },
  sheet: {
    width: 'min(400px, calc(100% - 32px))',
    marginBottom: 'max(16px, env(safe-area-inset-bottom))',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color-glow)',
    borderRadius: '28px',
    padding: '10px 20px 20px',
    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    animation: 'modalPop 0.4s cubic-bezier(0.34, 1.4, 0.5, 1) forwards',
  },
  handle: {
    width: '44px',
    height: '5px',
    borderRadius: '3px',
    background: 'var(--border-color)',
    margin: '0 auto 14px',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: 22,
    right: 18,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: 6,
    cursor: 'pointer',
  },
  head: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(var(--accent-gold-rgb), 0.14)',
    border: '1px solid var(--border-color-glow)',
    color: 'var(--accent-gold)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: '6px 0 0',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '12.5px',
    lineHeight: '1.55',
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
    maxWidth: 300,
    margin: '2px 0 14px',
  },
  steps: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    marginBottom: 18,
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '9px 12px',
    borderRadius: 14,
    background: 'rgba(var(--accent-lavender-rgb), 0.07)',
    border: '1px solid var(--border-color)',
  },
  stepNum: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--accent-lavender)',
    background: 'rgba(var(--accent-lavender-rgb), 0.16)',
    flexShrink: 0,
  },
  stepIcon: {
    color: 'var(--accent-lavender)',
    flexShrink: 0,
    display: 'flex',
  },
  stepText: {
    fontSize: '12px',
    lineHeight: '1.5',
    color: 'var(--text-primary)',
  },
  cta: {
    width: '100%',
    padding: '13px 0',
    borderRadius: 16,
    border: 'none',
    background: 'var(--accent-gold)',
    color: '#1a2a20',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '14px',
    letterSpacing: '0.02em',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  later: {
    width: '100%',
    marginTop: 10,
    padding: '10px 0',
    borderRadius: 14,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12.5px',
    cursor: 'pointer',
  },
};

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const detectPlatform = (): Platform | null => {
  const ua = navigator.userAgent;
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    ((navigator as unknown as { platform?: string }).platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return null;
};

export const InstallPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [installReady, setInstallReady] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // En la app nativa no tiene sentido instalar la PWA.
    if (Capacitor.isNativePlatform()) return;
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(SHOWN_KEY) === '1') return;
    } catch {
      /* noop */
    }

    const plat = detectPlatform();
    if (plat === 'ios') {
      setPlatform('ios');
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setInstallReady(true);
      setPlatform(plat ?? 'android');
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    if (plat === 'android') {
      const t = setTimeout(() => {
        if (!deferredRef.current) {
          setPlatform('android');
          setVisible(true);
        }
      }, 6000);
      return () => {
        window.removeEventListener('beforeinstallprompt', onPrompt);
        clearTimeout(t);
      };
    }
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const close = () => {
    try {
      localStorage.setItem(SHOWN_KEY, '1');
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  const doInstall = async () => {
    if (deferredRef.current) {
      try {
        await deferredRef.current.prompt();
      } catch {
        /* noop */
      }
    }
    close();
  };

  if (!visible || !platform) return null;

  const iosSteps = [
    { icon: <Share size={16} />, text: 'Toca el botón Compartir (cuadro con flecha) en la barra del navegador.' },
    { icon: <Home size={16} />, text: 'Desliza hacia abajo y elige "Agregar a pantalla de inicio".' },
    { icon: <Download size={16} />, text: 'Toca "Agregar" en la esquina superior derecha.' },
  ];

  const androidSteps = [
    { icon: <MoreHorizontal size={16} />, text: 'Toca el menú de tres puntos (⋮) en la barra del navegador.' },
    { icon: <Smartphone size={16} />, text: 'Elige "Instalar aplicación" o "Agregar a pantalla de inicio".' },
    { icon: <Download size={16} />, text: 'Toca "Instalar" y la app quedará en tu inicio.' },
  ];

  const steps = platform === 'ios' ? iosSteps : androidSteps;

  return (
    <div style={styles.overlay} onClick={close} role="dialog" aria-modal="true" aria-label="Agregar ALIVIA a tu pantalla de inicio">
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.handle} />
        <button type="button" onClick={close} style={styles.closeBtn} aria-label="Cerrar">
          <X size={18} />
        </button>

        <div style={styles.head}>
          <div style={styles.iconWrap}>
            <Download size={24} />
          </div>
          <h2 style={styles.title}>Agrega ALIVIA a tu inicio</h2>
          <p style={styles.subtitle}>
            Instala la app en tu dispositivo para tener tu espacio de calma siempre a un toque, incluso sin internet.
          </p>
        </div>

        <div style={styles.steps}>
          {steps.map((s, i) => (
            <div key={i} style={styles.step}>
              <span style={styles.stepNum}>{i + 1}</span>
              <span style={styles.stepIcon}>{s.icon}</span>
              <span style={styles.stepText}>{s.text}</span>
            </div>
          ))}
        </div>

        <button type="button" onClick={doInstall} style={styles.cta}>
          {installReady && platform !== 'ios' ? (
            <>
              <Download size={16} /> Instalar ahora
            </>
          ) : (
            'Entendido, gracias'
          )}
        </button>
        <button type="button" onClick={close} style={styles.later}>
          Ahora no
        </button>
      </div>
    </div>
  );
};
