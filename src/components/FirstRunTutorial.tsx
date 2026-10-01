import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  MessageCircleHeart,
  Wind,
  ShieldAlert,
  BookOpen,
  ChevronRight,
  Check,
  X,
  type LucideIcon,
} from 'lucide-react';
import { isNativeShell } from '../utils/nativeShell';

const SEEN_KEY = 'alivia-tutorial-seen-v1';

interface Step {
  icon: LucideIcon;
  /** Tripleta RGB del token, p. ej. '242, 227, 160', para los rgba. */
  rgb: string;
  title: string;
  body: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    rgb: '242, 227, 160',
    title: 'Bienvenida a ALIVIA',
    body: 'Este espacio es tuyo y de nadie más. Todo lo que escribas se guarda cifrado en tu dispositivo.',
    tip: 'Puedes borrar todo cuando quieras desde tu perfil.',
  },
  {
    icon: MessageCircleHeart,
    rgb: '140, 176, 141',
    title: 'Habla con VIA',
    body: 'Cuéntale cómo te sientes, en voz o por escrito. Te escucha sin juzgar y responde como un amigo.',
    tip: 'Mantén pulsado el micrófono para hablarle.',
  },
  {
    icon: Wind,
    rgb: '196, 184, 212',
    title: 'Respira con calma',
    body: 'Un minuto al día ayuda más de lo que parece. El radar te muestra cómo vas con el tiempo.',
  },
  {
    icon: ShieldAlert,
    rgb: '232, 196, 201',
    title: 'Si la necesitas, está ahí',
    body: 'El botón SOS siempre está a mano. No es para cuando la pases bien: es para cuando la pases mal.',
    tip: 'Está abajo, siempre visible.',
  },
  {
    icon: BookOpen,
    rgb: '212, 200, 160',
    title: 'Todo a tu ritmo',
    body: 'Sin streaks que te castiguen. Si un día no vienes, aquí seguirás cuando vuelvas.',
  },
];

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.62)',
    backdropFilter: 'blur(14px) saturate(1.1)',
    WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))',
    animation: 'fadeInFast 0.3s ease forwards',
  },
  card: {
    width: 'min(420px, 100%)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color-glow)',
    borderRadius: '32px',
    padding: '30px 26px 24px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow:
      '0 40px 100px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    animation: 'modalPop 0.5s cubic-bezier(0.34, 1.3, 0.64, 1) forwards',
  },
  halo: {
    position: 'absolute',
    top: '-70px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 220,
    height: 220,
    borderRadius: '50%',
    filter: 'blur(50px)',
    opacity: 0.22,
    pointerEvents: 'none',
    transition: 'background 0.5s ease',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.3s var(--spring-fast)',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '4px auto 20px',
    border: '1px solid',
    animation: 'softFloat 4s ease-in-out infinite',
  },
  stepLabel: {
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'var(--font-body)',
  },
  progressTrack: {
    height: 3,
    borderRadius: '3px',
    background: 'var(--border-color)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-sage))',
    transition: 'width 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(20px, 5.5vw, 25px)',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 1.25,
  },
  body: {
    fontSize: 'clamp(14px, 4vw, 15.5px)',
    lineHeight: 1.65,
    color: 'var(--text-secondary)',
    textAlign: 'center',
    marginBottom: 16,
  },
  tip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    fontSize: 12.5,
    color: 'var(--text-muted)',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '10px 14px',
    marginBottom: 18,
    textAlign: 'center',
  },
  dots: {
    display: 'flex',
    gap: 7,
    justifyContent: 'center',
    marginBottom: 22,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    transition: 'all 0.35s var(--spring-smooth)',
  },
  actions: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  primary: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '15px 20px',
    borderRadius: '20px',
    border: 'none',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sage))',
    color: '#1a2a20',
    transition: 'all 0.3s var(--spring-fast)',
  },
  skip: {
    padding: '15px 16px',
    borderRadius: '20px',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.3s var(--spring-fast)',
  },
};

export const FirstRunTutorial: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // En un shell nativo (Capacitor o iOS WKWebView) ya se conoce la app: no
    // tiene sentido el tutorial de primera visita.
    if (isNativeShell) return;
    try {
      if (localStorage.getItem(SEEN_KEY) === '1') return;
    } catch {
      /* modo privado: se muestra igual */
    }
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  const current = useMemo(() => STEPS[step], [step]);
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  // Escape cierra, flechas navegan. Sin esto el modal es un bucle de teclado
  // trampa: el foco se queda dentro y no hay forma de salir con el teclado.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStep((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, step]);

  // Bloquea el scroll de fondo mientras el modal está abierto.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  // Mueve el foco al botón principal al abrir y lo mantiene dentro del modal,
  // para que un lector de pantalla y el teclado entren al tour.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!visible) return;
    const first = cardRef.current?.querySelector<HTMLElement>('button');
    first?.focus();
  }, [visible, step]);

  const onFocusTrap = (e: React.FocusEvent) => {
    if (!cardRef.current) return;
    if (!cardRef.current.contains(e.target as Node)) {
      cardRef.current.querySelector<HTMLElement>('button')?.focus();
    }
  };

  if (!visible) return null;

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="Tour de bienvenida">
      <div ref={cardRef} onFocus={onFocusTrap} style={styles.card}>
        <div
          style={{ ...styles.halo, background: `rgb(${current.rgb})` }}
          aria-hidden="true"
        />

        <button style={styles.closeBtn} onClick={finish} aria-label="Cerrar tour">
          <X size={17} />
        </button>

        <div
          style={{
            ...styles.iconCircle,
            color: `rgb(${current.rgb})`,
            borderColor: `rgba(${current.rgb}, 0.28)`,
            background: `rgba(${current.rgb}, 0.12)`,
          }}
        >
          <Icon size={32} strokeWidth={1.5} />
        </div>

        <div style={styles.stepLabel}>
          Paso {step + 1} de {STEPS.length}
        </div>

        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${((step + 1) / STEPS.length) * 100}%`,
            }}
          />
        </div>

        <h2 style={styles.title}>{current.title}</h2>
        <p style={styles.body}>{current.body}</p>

        {current.tip && <div style={styles.tip}>{current.tip}</div>}

        <div style={styles.dots} aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                ...styles.dot,
                background:
                  i === step ? 'var(--accent-gold)' : 'var(--border-color)',
                transform: i === step ? 'scale(1.5)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <div style={styles.actions}>
          <button style={styles.skip} onClick={finish}>
            {isLast ? 'Empezar' : 'Saltar'}
          </button>
          <button
            style={styles.primary}
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {isLast ? <Check size={17} strokeWidth={2.5} /> : null}
            {isLast ? 'Listo' : 'Siguiente'}
            {!isLast && <ChevronRight size={17} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </div>
  );
};