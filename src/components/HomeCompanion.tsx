import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HomeCompanionStreak, type CompanionProgress } from './HomeCompanionContext';
import './HomeCompanion.css';
import { animateHomeCompanion } from '../utils/homeCompanion';
import { useCompanionDialog } from './useCompanionDialog';

/** Vive únicamente dentro de la ruta de Inicio. El seguimiento es CSS sticky. */
export function HomeCompanion({ children }: { children: ReactNode }) {
  const mascot = useRef<HTMLDivElement>(null);
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
        <div className="home-companion-anchor">
        {message && (
          <div className="home-companion-dialog">
            <div className="home-companion-dialog-heading"><span>VIA · A TU RITMO</span><button type="button" onClick={dismiss} aria-label="Cerrar mensaje de VIA">×</button></div>
            <p role="status" aria-live="polite" aria-atomic="true">{message}</p>
          </div>
        )}
        <button className="home-companion-touch" type="button" aria-label="Hablar con la mascota VIA" aria-expanded={Boolean(message)} onClick={() => {
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
        </div>
        </button>
        <span className="home-companion-ground" />
        </div>
      </aside>
    </div>
  );
}
