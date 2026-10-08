import React from 'react';
import { Delete } from 'lucide-react';
import { haptic } from '../utils/haptics';
import { PIN_LENGTH } from '../utils/appLock';

interface PinKeypadProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  error?: string;
  hint?: React.ReactNode;
}

interface KeyBtnProps {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
}

const KeyBtn: React.FC<KeyBtnProps> = ({ onClick, disabled, ariaLabel, children }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={onClick}
    style={{
      width: 64,
      height: 56,
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.10)',
      background: 'rgba(255,255,255,0.06)',
      color: 'var(--text-primary, #F3F6F3)',
      fontFamily: 'var(--font-display, sans-serif)',
      fontWeight: 700,
      fontSize: 20,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background .15s ease, opacity .15s ease',
      WebkitTapHighlightColor: 'transparent',
    }}
  >
    {children}
  </button>
);

/** Teclado numérico para el PIN de ALIVIA (4 dígitos). */
export const PinKeypad: React.FC<PinKeypadProps> = ({ value, onChange, disabled = false, error, hint }) => {
  const push = (digit: string) => {
    if (disabled || value.length >= PIN_LENGTH) return;
    haptic();
    onChange(value + digit);
  };

  const back = () => {
    if (disabled || value.length === 0) return;
    haptic();
    onChange(value.slice(0, -1));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      {hint ? (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-muted, #9DB8A4)', textAlign: 'center' }}>
          {hint}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 14 }} aria-label={`${value.length} de ${PIN_LENGTH} dígitos`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => {
          const filled = i < value.length;
          const next = i === value.length && !disabled;
          return (
            <span
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: filled ? 'linear-gradient(135deg, #F2E3A0, #E9C86B)' : 'rgba(255,255,255,0.14)',
                border: filled ? 'none' : '1px solid rgba(255,255,255,0.22)',
                transform: next ? 'scale(1.15)' : 'scale(1)',
                transition: 'background .15s ease, transform .15s ease',
              }}
            />
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gap: 10 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <KeyBtn key={k} onClick={() => push(k)} disabled={disabled}>
            {k}
          </KeyBtn>
        ))}
        <span />
        <KeyBtn onClick={() => push('0')} disabled={disabled}>
          0
        </KeyBtn>
        <KeyBtn onClick={back} disabled={disabled || value.length === 0} ariaLabel="Borrar dígito">
          <Delete size={20} />
        </KeyBtn>
      </div>

      <p
        style={{
          margin: 0,
          minHeight: 16,
          fontSize: 12.5,
          textAlign: 'center',
          color: '#F2A9A9',
        }}
      >
        {error ?? ''}
      </p>
    </div>
  );
};
