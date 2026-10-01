import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Check, X } from 'lucide-react';
import { isNativeShell } from '../utils/nativeShell';

const SEEN_KEY = 'alivia-tour-v2';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourStep {
  /** Selector CSS del elemento que se resalta. */
  selector: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="via"]',
    title: 'VIA está aquí',
    body: 'Toca este cartel para hablar con ella. Puedes escribirle o mantener pulsado el micrófono para hablarle.',
  },
  {
    selector: '[data-tour="sos"]',
    title: 'SOS arriba a la derecha',
    body: 'Si un día la pasas mal de verdad, está a un toque. No es para cuando la pases bien.',
  },
  {
    selector: '[data-tour="breathe"]',
    title: 'La barra inferior',
    body: 'Respirar, desahogarse, apoyo, retos y explorar. Todo desde aquí, sin buscar nada.',
  },
];

const PAD = 10;

const styles: { [key: string]: React.CSSProperties } = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    pointerEvents: 'none',
  },
  scrim: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'auto',
  },
  ring: {
    position: 'absolute',
    borderRadius: 18,
    border: '2px solid var(--accent-gold)',
    boxShadow:
      '0 0 0 9999px rgba(0, 0, 0, 0), 0 0 28px rgba(var(--accent-gold-rgb), 0.45)',
    transition:
      'top 0.4s cubic-bezier(0.34, 1.3, 0.64, 1), left 0.4s cubic-bezier(0.34, 1.3, 0.64, 1), width 0.4s cubic-bezier(0.34, 1.3, 0.64, 1), height 0.4s cubic-bezier(0.34, 1.3, 0.64, 1)',
    pointerEvents: 'none',
  },
  card: {
    position: 'absolute',
    width: 'min(320px, calc(100vw - 32px))',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color-glow)',
    borderRadius: '24px',
    padding: '20px 20px 18px',
    boxShadow: '0 26px 70px rgba(0, 0, 0, 0.55)',
    transition:
      'top 0.4s cubic-bezier(0.34, 1.3, 0.64, 1), left 0.4s cubic-bezier(0.34, 1.3, 0.64, 1)',
    pointerEvents: 'auto',
  },
  step: {
    fontSize: 10,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 8,
    lineHeight: 1.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--text-secondary)',
    marginBottom: 16,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  skip: {
    marginRight: 'auto',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    padding: '6px 2px',
  },
  next: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '11px 18px',
    borderRadius: '16px',
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sage))',
    color: '#1a2a20',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
};

export const FirstRunSpotlight: React.FC = () => {
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    const target = document.querySelector(STEPS[step].selector);
    if (!target) {
      // Si el elemento no existe todavia (o no se renderiza), el paso no
      // tiene sentido: mejor saltarlo que mostrar un anillo flotando.
      setRect(null);
      return;
    }
    const r = target.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    if (isNativeShell) return;
    try {
      // El tour v1 (tarjetas) se reemplaza por este. Si alguien ya vio el
      // anterior no debe volver a ver un tutorial, solo que este sea mejor.
      if (localStorage.getItem(SEEN_KEY) === '1') return;
      if (localStorage.getItem('alivia-tutorial-seen-v1') === '1') {
        localStorage.setItem(SEEN_KEY, '1');
        return;
      }
    } catch {
      /* modo privado: se muestra igual */
    }
    // Espera a que el Dashboard termine de montar antes de medir.
    const t = setTimeout(() => {
      setActive(true);
      measure();
    }, 1200);
    return () => clearTimeout(t);
  }, [measure]);

  // Recalcular en resize y en scroll: los elementos se mueven.
  useEffect(() => {
    if (!active) return;
    const onResize = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, measure]);

  useEffect(() => {
    if (active) measure();
  }, [step, active, measure]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* noop */
    }
    setActive(false);
  }, []);

  // Escape / flechas, igual que el tour de tarjetas.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, STEPS.length - 1));
      else if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  const cardPos = useMemo(() => {
    if (!rect) return null;
    const h = 210;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.left + rect.width / 2 - 160;
    left = Math.max(16, Math.min(left, vw - 336));
    // Preferimos putting la tarjeta debajo; si no cabe, arriba.
    let top = rect.top + rect.height + PAD + 14;
    if (top + h > vh - 12) top = Math.max(12, rect.top - h - PAD - 14);
    return { left, top };
  }, [rect]);

  if (!active) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div style={styles.root} role="dialog" aria-modal="true" aria-label="Tour de la app">
      {/* Scrim con un agujero: cuatro paneles alrededor del elemento. */}
      {rect && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: Math.max(0, rect.top - PAD),
              background: 'rgba(0,0,0,0.62)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: rect.top + rect.height + PAD,
              bottom: 0,
              background: 'rgba(0,0,0,0.62)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: rect.top - PAD,
              bottom: 0,
              left: 0,
              width: Math.max(0, rect.left - PAD),
              background: 'rgba(0,0,0,0.62)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: rect.top - PAD,
              bottom: 0,
              right: 0,
              width: Math.max(0, window.innerWidth - (rect.left + rect.width + PAD)),
              background: 'rgba(0,0,0,0.62)',
            }}
          />
          <div
            style={{
              ...styles.ring,
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
            }}
          />
        </>
      )}

      {cardPos && (
        <div style={{ ...styles.card, left: cardPos.left, top: cardPos.top }}>
          <button style={styles.closeBtn} onClick={finish} aria-label="Cerrar tour">
            <X size={15} />
          </button>
          <div style={styles.step}>
            {step + 1} / {STEPS.length}
          </div>
          <div style={styles.title}>{current.title}</div>
          <div style={styles.body}>{current.body}</div>
          <div style={styles.actions}>
            <button style={styles.skip} onClick={finish}>
              Saltar
            </button>
            <button
              style={styles.next}
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            >
              {isLast ? <Check size={15} strokeWidth={2.5} /> : null}
              {isLast ? 'Listo' : 'Siguiente'}
              {!isLast && <ChevronRight size={15} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};