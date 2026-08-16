import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

export const CENTRAL_AMERICA_CODES: CountryCode[] = [
  { code: '505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '504', country: 'Honduras', flag: '🇭🇳' },
  { code: '506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '507', country: 'Panamá', flag: '🇵🇦' },
  { code: '501', country: 'Belice', flag: '🇧🇿' },
];

const DEFAULT_CODE = '505';

// El teléfono es válido solo si tiene al menos 7 dígitos además del código de país
export const isPhoneComplete = (value: string): boolean =>
  value.replace(/[^\d]/g, '').length >= 7;

interface CountryPhoneInputProps {
  id?: string;
  value: string;
  onChange: (full: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export const CountryPhoneInput: React.FC<CountryPhoneInputProps> = ({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}) => {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [number, setNumber] = useState('');

  useEffect(() => {
    const m = value.trim().match(/^\+(\d{1,4})[\s-]?(.*)$/);
    if (m && CENTRAL_AMERICA_CODES.some((c) => c.code === m[1])) {
      setCode(m[1]);
      setNumber(m[2].replace(/[^\d]/g, ''));
    } else {
      setCode(DEFAULT_CODE);
      setNumber(value.replace(/^\+?\d{1,4}[\s-]?/, '').replace(/[^\d]/g, ''));
    }
  }, [value]);

  const emit = (nextCode: string, nextNumber: string) => {
    const digits = nextNumber.replace(/[^\d]/g, '');
    onChange(`+${nextCode} ${digits}`);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.selectWrap}>
        <select
          value={code}
          onChange={(e) => {
            const c = e.target.value;
            setCode(c);
            emit(c, number);
          }}
          style={styles.select}
          aria-label="Código de país"
        >
          {CENTRAL_AMERICA_CODES.map((c) => (
            <option key={c.code} value={c.code} label={`${c.flag} +${c.code}`}>
              {c.flag} +{c.code} · {c.country}
            </option>
          ))}
        </select>
        <ChevronDown size={14} color="var(--text-muted)" style={styles.chevron} />
      </div>

      <input
        id={id}
        type="tel"
        inputMode="numeric"
        className="input-apple"
        style={styles.input}
        placeholder={placeholder ?? '8XXX XXXX'}
        value={number}
        autoComplete={autoComplete}
        onChange={(e) => {
          const n = e.target.value;
          setNumber(n);
          emit(code, n);
        }}
      />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  wrap: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  selectWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  select: {
    appearance: 'none',
    WebkitAppearance: 'none',
    padding: '13px 30px 13px 12px',
    borderRadius: '14px',
    background: 'rgba(0, 0, 0, 0.15)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: '104px',
    maxWidth: '152px',
    transition: 'all 0.3s ease',
  },
  chevron: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '13px 16px',
    borderRadius: '14px',
    fontSize: '16px',
    letterSpacing: '0.03em',
  },
};