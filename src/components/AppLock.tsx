import React, { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Lock } from 'lucide-react';
import {
  applyPrivacyScreen,
  authenticateWithBiometry,
  getPrivacyPrefs,
} from '../utils/appLock';
import logoVertical from '../assets/logo-vertical.png';

/**
 * Puerta biométrica: si el usuario activó el bloqueo, cubre toda la app
 * hasta verificar identidad (huella/rostro o PIN del dispositivo).
 */
export const AppLock: React.FC = () => {
  const [locked, setLocked] = useState<boolean>(() =>
    Capacitor.isNativePlatform() ? getPrivacyPrefs().biometricLock : false
  );
  const [attempting, setAttempting] = useState(false);

  useEffect(() => {
    applyPrivacyScreen();
  }, []);

  const attempt = useCallback(() => {
    setAttempting(true);
    authenticateWithBiometry().then((ok) => {
      setLocked(!ok);
      setAttempting(false);
    });
  }, []);

  useEffect(() => {
    if (!locked) return;
    attempt();
  }, [locked, attempt]);

  if (!locked) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'radial-gradient(circle at top right, #2C533D 0%, #1a2a20 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: 24,
      }}
    >
      <img src={logoVertical} alt="ALIVIA" style={{ height: 96, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.35))' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8CB08D', fontFamily: 'var(--font-title)' }}>
        <Lock size={15} />
        <span style={{ fontSize: 13, letterSpacing: '.08em' }}>Tu espacio está protegido</span>
      </div>
      <button
        type="button"
        onClick={attempt}
        disabled={attempting}
        style={{
          marginTop: 6,
          padding: '12px 26px',
          borderRadius: 999,
          border: 'none',
          background: 'linear-gradient(135deg, #F2E3A0, #E9C86B)',
          color: '#1A2A20',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 14,
          opacity: attempting ? 0.6 : 1,
        }}
      >
        {attempting ? 'Verificando…' : 'Desbloquear'}
      </button>
    </div>
  );
};
