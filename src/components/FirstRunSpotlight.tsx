import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    selector: '[data-tour="ayuda"]',
    title: 'Ayuda — Recursos Oficiales',
    body: 'Aquí tienes hospitales, líneas de crisis y centros verificados cerca de ti. Con distancia, teléfono real y portal web. 34 recursos actualizados.',
  },
  {
    selector: '[data-tour="breathe"]',
    title: 'La barra inferior',
    body: 'Respirar, desahogarse, apoyo, retos, explorar y ayuda. Todo desde aquí, sin buscar nada.',
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
    width: 'min(320px, calc(100vw - 24px))',
    maxWidth: 'calc(100vw - 24px)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color-glow)',
    borderRadius: '24px',
    padding: '20px 20px 18px',
    boxShadow: '0 26px 70px rgba(0, 0, 0, 0.55)',
    transition:
      'top 0.4s cubic-bezier(0.34, 1.3, 0.64, 1), left 0.4s cubic-bezier(0.34, 1.3, 0.64, 1)',
    pointerEvents: 'auto',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
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
  const cardRef = useRef<HTMLDivElement>(null);


  // Posiciona la tarjeta midiendo su TAMANO REAL, no suponiendo 320x210. Asi el
// texto mas largo de un paso, un movil estrecho o una pantalla baja no la
// empujan fuera. Estrategia, en orden: debajo del elemento, encima, y si no cabe
// de ninguna forma se ancla como hoja al fondo.
const place = useCallback(
  (target: Rect): { left: number; top: number; maxHeight: number } | null => {
    const card = cardRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 14;

    const cw = card?.offsetWidth ?? Math.min(320, vw - 24);
    const ch = card?.offsetHeight ?? 210;
    const margin = 12;

    const maxH = Math.max(160, vh - margin * 2);
    const height = Math.min(ch, maxH);

    // Horizontal: centrada bajo el elemento pero nunca saliendo de la pantalla.
    let left = target.left + target.width / 2 - cw / 2;
    left = Math.max(margin, Math.min(left, vw - cw - margin));

    const below = target.top + target.height + PAD + gap;
    const above = target.top - PAD - gap - height;
    const bottomSheet = vh - height - margin;

    let top: number;
    if (below + height <= vh - margin) top = below;
    else if (above >= margin) top = above;
    else top = Math.max(margin, bottomSheet);

    return { left, top, maxHeight: maxH };
  },
  []
);
  const [cardPos, setCardPos] = useState<{ left: number; top: number; maxHeight: number } | null>(null);

  

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
    const t = setTimeout(() => setActive(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Recalcular en resize y en scroll: los elementos se mueven y la tarjeta se
  // ancla a ellos, asi que ambas medidas se refrescan juntas.
  useEffect(() => {
    if (!active) return;
    const onResize = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const target = document.querySelector(STEPS[step].selector);
        if (!target) {
          setRect(null);
          setCardPos(null);
          return;
        }
        const r = target.getBoundingClientRect();
        const next: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
        setRect(next);
        setCardPos(place(next));
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      window.removeEventListener('orientationchange', onResize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, step, place]);

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



// Recalcula la posicion cuando cambia el paso o el elemento, y tras pintar.
useEffect(() => {
  if (!active) return;
  const update = () => {
    const target = document.querySelector(STEPS[step].selector);
    if (!target) {
      setRect(null);
      setCardPos(null);
      return;
    }
    const r = target.getBoundingClientRect();
    const next: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
    setRect(next);
    setCardPos(place(next));
  };
  update();
  const id = requestAnimationFrame(update);
  return () => cancelAnimationFrame(id);
}, [active, step, place]);

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
        <div
          ref={cardRef}
          style={{
            ...styles.card,
            left: cardPos.left,
            top: cardPos.top,
            maxHeight: cardPos.maxHeight,
          }}
        >
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
