import React, { useEffect, useRef, useState } from 'react';
import { PinKeypad } from './PinKeypad';
import { PIN_LENGTH, setAppPin, verifyAppPin } from '../utils/appLock';
import { hapticSuccess } from '../utils/haptics';

type Step = 'current' | 'first' | 'confirm';

interface PinSetupModalProps {
  /** 'create': no hay PIN todavía. 'change': pide el actual antes del nuevo. */
  mode: 'create' | 'change';
  onClose: (success: boolean) => void;
}

const COPY: Record<Step, { title: string; subtitle: string }> = {
  current: { title: 'Confirma tu PIN', subtitle: 'Ingresa el PIN actual de ALIVIA.' },
  first: { title: 'Crea tu PIN', subtitle: `Elige ${PIN_LENGTH} dígitos que puedas recordar.` },
  confirm: { title: 'Repite tu PIN', subtitle: 'Para confirmarlo, ingrésalo una vez más.' },
};

/** Modal para crear o cambiar el PIN propio de ALIVIA. */
export const PinSetupModal: React.FC<PinSetupModalProps> = ({ mode, onClose }) => {
  const [step, setStep] = useState<Step>(mode === 'change' ? 'current' : 'first');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const firstPin = useRef('');

  useEffect(() => {
    if (value.length < PIN_LENGTH) return;
    let cancelled = false;
    const pin = value;
    const run = async () => {
      if (step === 'current') {
        const ok = await verifyAppPin(pin);
        if (cancelled) return;
        if (!ok) {
          setError('PIN incorrecto.');
          setValue('');
          return;
        }
        setError('');
        setValue('');
        setStep('first');
        return;
      }
      if (step === 'first') {
        firstPin.current = pin;
        setError('');
        setValue('');
        setStep('confirm');
        return;
      }
      if (pin !== firstPin.current) {
        if (cancelled) return;
        setError('Los PIN no coinciden. Inténtalo de nuevo.');
        setValue('');
        setStep('first');
        firstPin.current = '';
        return;
      }
      const saved = await setAppPin(pin);
      if (cancelled) return;
      if (saved) hapticSuccess();
      onClose(saved);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [value, step, onClose]);

  const copy = COPY[step];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(false);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(8, 16, 12, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: 'min(360px, 100%)',
          padding: '26px 22px 20px',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(160deg, #23392C 0%, #16241C 100%)',
          boxShadow: '0 24px 60px rgba(0,0,0,.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-title, sans-serif)',
            fontSize: 17,
            fontWeight: 700,
            color: '#F2E3A0',
            textAlign: 'center',
          }}
        >
          {copy.title}
        </p>

        <PinKeypad
          value={value}
          onChange={(next) => {
            setError('');
            setValue(next);
          }}
          error={error}
          hint={copy.subtitle}
        />

        <button
          type="button"
          onClick={() => onClose(false)}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted, #9DB8A4)',
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
