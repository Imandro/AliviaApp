/* ----------------------------------------------------
   ALIVIA — BANNER DE CRISIS
   Banner superior compacto (peligro inmediato) y
   variante crítica con botones de llamada grandes.
   Se usa en el SOS Screen y en OfficialResourcesView.
   ---------------------------------------------------- */

import React from 'react';
import { AlertTriangle, Phone, ShieldCheck } from 'lucide-react';

export type CrisisBannerVariant = 'compact' | 'critical';

export interface CrisisBannerProps {
  variant?: CrisisBannerVariant;
  countryEmergency?: string;
  localeLine?: string;
  showLock?: boolean;
  onLock?: () => void;
}

const EMERGENCY = '911';

export const CrisisModeBanner: React.FC<CrisisBannerProps> = ({
  variant = 'compact',
  countryEmergency,
  localeLine,
  showLock = false,
  onLock,
}) => {
  const emergency = countryEmergency ?? EMERGENCY;
  const line = localeLine ?? '128';
  const isCritical = variant === 'critical';

  if (isCritical) {
    return (
      <div
        className="glass-card fade-in"
        style={{
          padding: '20px 16px',
          textAlign: 'center',
          background:
            'linear-gradient(135deg, rgba(232, 196, 201, 0.14) 0%, rgba(229, 115, 115, 0.1) 100%)',
          border: '1px solid rgba(232, 196, 201, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <AlertTriangle size={20} color="var(--accent-rose)" />
          <h3
            className="title-medium"
            style={{ color: 'var(--text-primary)', margin: 0, fontSize: '14.5px' }}
          >
            ¿ESTÁS EN PELIGRO INMEDIATO?
          </h3>
        </div>
        <p
          className="body-standard"
          style={{
            fontSize: '12.5px',
            opacity: 0.85,
            margin: '0 0 12px',
          }}
        >
          Llama ahora. No esperes a que empeore.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <a
            href={`tel:${emergency}`}
            className="btn-primary"
            style={{
              padding: '12px 24px',
              borderRadius: '14px',
              fontSize: '13.5px',
              background: 'var(--accent-rose)',
              color: '#0c1810',
            }}
          >
            <Phone size={15} /> Llama {emergency}
          </a>
          {line !== emergency && (
            <a
              href={`tel:${line}`}
              className="btn-secondary"
              style={{
                padding: '12px 24px',
                borderRadius: '14px',
                fontSize: '13.5px',
              }}
            >
              <Phone size={15} /> {line}
            </a>
          )}
          {showLock && onLock && (
            <button
              onClick={onLock}
              className="btn-primary"
              style={{
                padding: '12px 24px',
                borderRadius: '14px',
                fontSize: '13.5px',
              }}
            >
              <ShieldCheck size={15} /> Modo seguro
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--accent-rose)',
        color: '#0c1810',
        padding: '8px 14px',
        textAlign: 'center',
        fontSize: '11.5px',
        fontWeight: 600,
      }}
    >
      <span style={{ marginRight: '6px' }} aria-hidden>
        ⚠
      </span>
      Peligro inmediato? Llama al {emergency}
      {line !== emergency && ` o a ${line}`}
    </div>
  );
};
