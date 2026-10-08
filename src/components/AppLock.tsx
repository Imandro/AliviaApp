import React, { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { ImpactStyle } from '@capacitor/haptics';
import {
  PIN_LOCKOUT_MS,
  PIN_MAX_ATTEMPTS,
  PIN_LENGTH,
  applyPrivacyScreen,
  authenticateWithBiometry,
  clearAppPin,
  getPrivacyPrefs,
  resolveLockPlan,
  setPrivacyPrefs,
  verifyAppPin,
  type LockPlan,
} from '../utils/appLock';
import { PinKeypad } from './PinKeypad';
import { haptic, hapticSuccess } from '../utils/haptics';
import logoVertical from '../assets/logo-vertical.png';

type Stage = 'checking' | 'biometric' | 'pin' | 'open';

/**
 * Puerta de bloqueo: si el usuario activó el bloqueo, cubre toda la app
 * hasta verificar identidad. Funciona en web y en nativo:
 * biometría del sistema (con respaldo al PIN del dispositivo),
 * PIN propio de ALIVIA, o ambos en ese orden.
 */
export const AppLock: React.FC = () => {
  const [locked, setLocked] = useState<boolean>(() => getPrivacyPrefs().biometricLock);
  const [plan, setPlan] = useState<LockPlan | null>(null);
  const [stage, setStage] = useState<Stage>('checking');
  const [entry, setEntry] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [attempting, setAttempting] = useState(false);
  const [attemptTick, setAttemptTick] = useState(0);

  const unlock = useCallback(() => {
    hapticSuccess();
    setLocked(false);
    setError('');
    setEntry('');
    setAttempts(0);
    setLockedUntil(0);
  }, []);

  /** Calcula qué se pide y lleva la app al estado inicial del bloqueo. */
  const start = useCallback(async () => {
    setStage('checking');
    setError('');
    setEntry('');
    setAttempts(0);
    setLockedUntil(0);
    const resolved = await resolveLockPlan();
    setPlan(resolved);
    if (!resolved.active) {
      setLocked(false);
      return;
    }
    setStage(resolved.needsBiometric ? 'biometric' : 'pin');
  }, []);

  useEffect(() => {
    applyPrivacyScreen();
  }, []);

  useEffect(() => {
    if (locked) void start();
  }, [locked, start]);

  // Intento automático de biometría (se repite con "Reintentar").
  useEffect(() => {
    if (!locked || stage !== 'biometric') return;
    let cancelled = false;
    setAttempting(true);
    authenticateWithBiometry().then((ok) => {
      if (cancelled) return;
      setAttempting(false);
      if (ok) {
        setError('');
        if (plan?.needsPin) setStage('pin');
        else unlock();
      } else {
        setError('No se pudo verificar tu identidad.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locked, stage, attemptTick, plan, unlock]);

  // Cuenta regresiva del bloqueo temporal por intentos fallidos.
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  const handlePinChange = (next: string) => {
    setEntry(next);
    setError('');
    if (next.length < PIN_LENGTH) return;
    void (async () => {
      const ok = await verifyAppPin(next);
      setEntry('');
      if (ok) {
        setAttempts(0);
        unlock();
        return;
      }
      haptic(ImpactStyle.Heavy);
      const failed = attempts + 1;
      setAttempts(failed);
      if (failed >= PIN_MAX_ATTEMPTS) {
        setAttempts(0);
        setLockedUntil(Date.now() + PIN_LOCKOUT_MS);
        setError('Demasiados intentos. Espera un momento.');
        setNow(Date.now());
      } else {
        setError(`PIN incorrecto. Intento ${failed} de ${PIN_MAX_ATTEMPTS}.`);
      }
    })();
  };

  const handleForgotPin = () => {
    const ok = window.confirm(
      '¿Olvidaste tu PIN? ALIVIA eliminará el PIN y, si era el único método, desactivará el bloqueo. Tus datos no se borran.'
    );
    if (!ok) return;
    clearAppPin();
    if (plan && !plan.needsBiometric) {
      setPrivacyPrefs({ biometricLock: false });
      setLocked(false);
      return;
    }
    // Queda la biometría: se recalcula el plan.
    void start();
  };

  if (!locked) return null;

  const remaining = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const lockedOut = remaining > 0;
  const showKeypad = stage === 'pin';

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
        overflowY: 'auto',
      }}
    >
      <img
        src={logoVertical}
        alt="ALIVIA"
        style={{ height: 96, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.35))' }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#8CB08D',
          fontFamily: 'var(--font-title)',
        }}
      >
        <Lock size={15} />
        <span style={{ fontSize: 13, letterSpacing: '.08em' }}>Tu espacio está protegido</span>
      </div>

      {stage === 'biometric' ? (
        <>
          <p style={{ margin: 0, fontSize: 12.5, color: '#9DB8A4', textAlign: 'center', maxWidth: 300 }}>
            {plan?.needsPin
              ? 'Primero verifica tu huella o rostro; después te pediremos tu PIN.'
              : 'Verifica tu huella, rostro o el PIN del dispositivo.'}
          </p>
          <p style={{ margin: 0, minHeight: 16, fontSize: 12.5, color: '#F2A9A9', textAlign: 'center' }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => setAttemptTick((t) => t + 1)}
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
              cursor: attempting ? 'default' : 'pointer',
              opacity: attempting ? 0.6 : 1,
            }}
          >
            {attempting ? 'Verificando…' : 'Desbloquear'}
          </button>
        </>
      ) : null}

      {stage === 'checking' ? (
        <p style={{ margin: 0, fontSize: 12.5, color: '#9DB8A4' }}>Cargando…</p>
      ) : null}

      {showKeypad ? (
        <PinKeypad
          value={entry}
          onChange={handlePinChange}
          disabled={lockedOut}
          error={lockedOut ? `Demasiados intentos. Espera ${remaining}s.` : error}
          hint={
            plan?.needsBiometric
              ? 'Ahora ingresa tu PIN de ALIVIA.'
              : 'Ingresa tu PIN de ALIVIA.'
          }
        />
      ) : null}

      {showKeypad && !lockedOut ? (
        <button
          type="button"
          onClick={handleForgotPin}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#8CB08D',
            fontSize: 12,
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ¿Olvidaste tu PIN?
        </button>
      ) : null}
    </div>
  );
};
