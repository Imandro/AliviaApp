import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, Fingerprint, Lock } from 'lucide-react';
import { getPrivacyPrefs, setPrivacyPrefs, hasAppPin, type LockMethod } from '../utils/appLock';
import { PinSetupModal } from './PinSetupModal';
import { PIN_LENGTH } from '../utils/appLock';

const DISMISSED_KEY = 'alivia_first_lock_prompt_dismissed';

interface FirstLockPromptProps {
  onClose: () => void;
}

const METHOD_OPTIONS: { id: LockMethod; label: string; icon: React.ReactNode }[] = [
  { id: 'biometric', label: 'Biometría', icon: <Fingerprint size={16} /> },
  { id: 'pin', label: 'PIN', icon: <Lock size={16} /> },
  { id: 'both', label: 'Biometría + PIN', icon: <span style={{ display: 'flex', gap: 2 }}><Fingerprint size={14} /><Lock size={14} /></span> },
];

export const FirstLockPrompt: React.FC<FirstLockPromptProps> = ({ onClose }) => {
  const [method, setMethod] = useState<LockMethod>('biometric');
  const [pinFlow, setPinFlow] = useState<{ mode: 'create'; then: 'enable'; method: LockMethod } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
    onClose();
  };

  const handleActivate = async () => {
    if (busy) return;
    const needsPin = method !== 'biometric';
    if (needsPin && !hasAppPin()) {
      setPinFlow({ mode: 'create', then: 'enable', method });
      return;
    }
    setBusy(true);
    const next = setPrivacyPrefs({ biometricLock: true, lockMethod: method });
    setBusy(false);
    onClose();
  };

  const handlePinFlowClose = (ok: boolean) => {
    if (!ok) { setPinFlow(null); return; }
    setPrivacyPrefs({ biometricLock: true, lockMethod: method });
    setPinFlow(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Proteger ALIVIA"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100001,
        background: 'rgba(6, 14, 10, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: 'min(380px, 100%)',
          padding: '28px 24px 22px',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(160deg, #23392C 0%, #16241C 100%)',
          boxShadow: '0 24px 60px rgba(0,0,0,.55)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-muted, #9DB8A4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <ShieldCheck size={44} color="#F2E3A0" />

        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-title, sans-serif)',
            fontSize: 20,
            fontWeight: 700,
            color: '#F3F6F3',
            textAlign: 'center',
          }}
        >
          Protege tu espacio
        </p>

        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--text-muted, #9DB8A4)',
            textAlign: 'center',
          }}
        >
          Activa el bloqueo para que ALIVIA pida tu huella, rostro o un PIN de {PIN_LENGTH} dígitos al abrir la app.
          Funciona en la app instalada y en el navegador.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MÉTODO DE BLOQUEO
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {METHOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={busy}
                onClick={() => setMethod(opt.id)}
                aria-pressed={method === opt.id}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: 12,
                  border: '1px solid var(--border-color)',
                  background: method === opt.id ? 'rgba(var(--accent-gold-rgb), 0.14)' : 'transparent',
                  borderColor: method === opt.id ? 'rgba(var(--accent-gold-rgb), 0.45)' : 'var(--border-color)',
                  color: method === opt.id ? 'var(--accent-gold)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-display, sans-serif)',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: busy ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all .2s',
                }}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-display, sans-serif)',
              fontWeight: 600,
              fontSize: 13,
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            Más tarde
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={busy}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #F2E3A0, #E9C86B)',
              color: '#1A2A20',
              fontFamily: 'var(--font-display, sans-serif)',
              fontWeight: 700,
              fontSize: 13,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Activando…' : 'Activar ahora'}
          </button>
        </div>

        {pinFlow ? (
          <PinSetupModal mode="create" onClose={handlePinFlowClose} />
        ) : null}
      </div>
    </div>
  );
};

export const shouldShowFirstLockPrompt = (): boolean => {
  const prefs = getPrivacyPrefs();
  if (prefs.biometricLock) return false;
  try { return !localStorage.getItem(DISMISSED_KEY); } catch { return true; }
};