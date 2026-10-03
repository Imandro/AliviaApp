import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HomeCompanionStreak, type CompanionProgress } from './HomeCompanionContext';
import './HomeCompanion.css';
import { animateHomeCompanion } from '../utils/homeCompanion';
import { useCompanionDialog } from './useCompanionDialog';
import { enableHomeCompanionDrag } from '../utils/homeCompanionDrag';

/** Vive únicamente dentro de la ruta de Inicio. El seguimiento es CSS sticky. */
export function HomeCompanion({ children }: { children: ReactNode }) {
  const mascot = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const touch = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (anchor.current && touch.current) return enableHomeCompanionDrag(anchor.current, touch.current);
  }, []);
  const [progress, setProgress] = useState<CompanionProgress | null>(null);
  const lastActivation = useRef('');
  const { message, queueAutomatic, dismiss, showManual } = useCompanionDialog();
  const manualPhrase = useRef(0);
  const progressReady = progress !== null;
  useEffect(() => {
    if (progress?.challengeDone) queueAutomatic('¡Reto cumplido! Date un respiro ✨', 2, 1600);
  }, [progress?.challengeDone, queueAutomatic]);
  useEffect(() => {
    if (!progressReady) return;
    queueAutomatic('Qué bueno verte. A tu ritmo 🌿', 0, 3000);
    const reminder = setTimeout(() => queueAutomatic('Un pequeño paso también cuenta.'), 63000);
    return () => clearTimeout(reminder);
  }, [progressReady, queueAutomatic]);
  useEffect(() => {
    const element = mascot.current;
    if (!element) return;
    const key = progress?.activationKey ?? '';
    let celebrate = Boolean(key && key !== lastActivation.current);
    try {
      celebrate = celebrate && sessionStorage.getItem('alivia-mascota-celebrada') !== key;
      if (celebrate) sessionStorage.setItem('alivia-mascota-celebrada', key);
    } catch { /* El gesto sigue funcionando si el almacenamiento está bloqueado. */ }
    lastActivation.current = key;
    if (celebrate) queueAutomatic('¡Primer paso del día! Bien hecho ✨', 1, 1600);
    return animateHomeCompanion(element, { inactive: progress?.days === 0, celebrate });
  }, [progress?.days, progress?.activationKey, queueAutomatic]);

  return (
    <div className="home-companion-layout">
      <div className="home-companion-content"><HomeCompanionStreak.Provider value={setProgress}>{children}</HomeCompanionStreak.Provider></div>
      <aside className="home-companion-rail" aria-label="Mascota de Alivia">
        <div className="home-companion-anchor" ref={anchor}>
        <div className="home-companion-thought" role="status" aria-live="polite">
          <svg viewBox="0 0 220 110" preserveAspectRatio="none" aria-hidden="true">
            <path d="M30 23 C17 6 46 0 62 12 C76 -1 100 1 110 12 C128 0 153 1 165 14 C189 3 211 19 203 35 C222 44 222 66 204 74 C214 94 189 107 170 96 C157 111 132 110 118 99 C101 113 77 109 64 98 C43 109 18 96 25 79 C3 76 0 51 17 41 C7 32 18 20 30 23Z" />
          </svg>
          <p>Grrr… ¡yo estaba<br />tranquila!</p>
        </div>
        {message && (
          <div className="home-companion-dialog">
            <div className="home-companion-dialog-heading"><span>VIA · A TU RITMO</span><button type="button" onClick={dismiss} aria-label="Cerrar mensaje de VIA">×</button></div>
            <p role="status" aria-live="polite" aria-atomic="true">{message}</p>
          </div>
        )}
        <button ref={touch} className="home-companion-touch" type="button" aria-label="Hablar con la mascota VIA" title="Toca para hablar o arrastra para mover. También puedes usar las flechas del teclado." aria-expanded={Boolean(message)} onClick={() => {
          const phrases = ['Aquí estoy, sin prisa.', '¿Respiramos un momento?', 'Un pequeño paso también cuenta.', 'Puedes tomarte una pausa 🌿'];
          showManual(phrases[manualPhrase.current++ % phrases.length]);
        }}>
        <div className="home-companion-mascot" data-pose="normal" ref={mascot}>
          <img className="home-companion-normal" src={`${import.meta.env.BASE_URL}mascota-inicio-normal.webp`} width="144" height="324" alt="" decoding="async" draggable={false} />
          <img className="home-companion-blink" src={`${import.meta.env.BASE_URL}mascota-inicio-parpadeo.webp`} width="144" height="324" alt="" decoding="async" draggable={false} />
          <img className="home-companion-relax" src={`${import.meta.env.BASE_URL}mascota-inicio-relax.webp`} width="144" height="324" alt="" decoding="async" draggable={false} />
          <img className="home-companion-happy" src={`${import.meta.env.BASE_URL}mascota-inicio-feliz.webp`} width="144" height="324" alt="" decoding="async" draggable={false} />
          <img className="home-companion-sad" src={`${import.meta.env.BASE_URL}mascota-inicio-triste.webp`} width="144" height="324" alt="" decoding="async" draggable={false} />
          <img className="home-companion-caring" src={`${import.meta.env.BASE_URL}mascota-inicio-comprensiva.webp`} width="144" height="324" alt="" decoding="async" draggable={false} />
          <img className="home-companion-blush" src={`${import.meta.env.BASE_URL}mascota-inicio-sonrojada.webp`} width="144" height="324" alt="" decoding="async" draggable={false} />
          <svg className="home-companion-angry" viewBox="0 0 144 324" aria-hidden="true">
            <defs>
              <radialGradient id="companion-angry-cheek"><stop stopColor="#f04b43" stopOpacity=".85" /><stop offset="1" stopColor="#f04b43" stopOpacity="0" /></radialGradient>
            </defs>
            <ellipse cx="33" cy="148" rx="19" ry="17" fill="url(#companion-angry-cheek)" />
            <ellipse cx="108" cy="148" rx="19" ry="17" fill="url(#companion-angry-cheek)" />
            <path d="M22 107 L60 122 L59 133 L24 119Z M120 107 L82 122 L83 133 L118 119Z" fill="#f5f7ed" />
            <path d="M24 113 L59 128 M118 113 L83 128" fill="none" stroke="#193e2d" strokeWidth="9" strokeLinecap="round" />
            <g className="home-companion-anger-mark" fill="none" stroke="#ef4d43" strokeWidth="6" strokeLinecap="round">
              <path d="M117 76v9h-9 M130 76v9h9 M117 101v-9h-9 M130 101v-9h9" />
            </g>
            <g className="home-companion-angry-steam" fill="none" stroke="#f5f7ed" strokeWidth="5" strokeLinecap="round">
              <path d="M8 110q-13-9-4-19t-1-16 M139 124q13-9 4-19t1-16" />
            </g>
          </svg>
        </div>
        </button>
        <span className="home-companion-ground" />
        </div>
      </aside>
    </div>
  );
}
