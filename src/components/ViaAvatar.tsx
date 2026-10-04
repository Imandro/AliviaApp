import { useEffect, useRef, useState } from 'react';
import './ViaAvatar.css';

/* ----------------------------------------------------
   ALIVIA - AVATAR DE Livi EN EL CHAT
   La mascota ya existe como ilustracion de cuerpo entero
   (mascota-inicio-*.webp). Para un globo de 28px esas
   figuras no se leen, asi que los avatares de este
   componente son recortes de rostro generados a partir de
   esas mismas 7 poses en public/avatars/via-*.png.
   Mismo lenguaje visual, tamano legible.
   ---------------------------------------------------- */

export type ViaPose =
  | 'normal'
  | 'feliz'
  | 'triste'
  | 'comprensiva'
  | 'sonrojada'
  | 'relax'
  | 'parpadeo';

interface ViaAvatarProps {
  /** Expresion base segun el estado del mensaje. El parpadeo se suma encima. */
  pose?: Exclude<ViaPose, 'parpadeo'>;
  size?: number;
  className?: string;
}

/** Segundos entre parpadeos. Similar al intervalo de la pantalla 404. */
const BLINK_MS = 5200;
const BLINK_DURATION = 190;

/**
 * El parpadeo vive aqui y no en el mensaje: son 7 imagenes ya precacheadas y
 * solo se descargan de verdad si el service worker todavia no las tiene.
 */
export function ViaAvatar({ pose = 'normal', size = 28, className }: ViaAvatarProps) {
  const [blinking, setBlinking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!motion || motion.matches) return;
    let cancelled = false;

    const schedule = () => {
      timer.current = setTimeout(() => {
        // Si la pestana esta en segundo plano se salta el gesto: al volver se
        // resincroniza, en vez de dejar el avatar congelado a media parpadeo.
        if (cancelled || document.hidden) return;
        setBlinking(true);
        timer.current = setTimeout(() => {
          setBlinking(false);
          schedule();
        }, BLINK_DURATION);
      }, BLINK_MS);
    };

    schedule();
    const onVisible = () => {
      if (document.hidden) return;
      clearTimeout(timer.current);
      setBlinking(false);
      schedule();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pose]);

  const shown: ViaPose = blinking ? 'parpadeo' : pose;

  return (
    <span
      className={`via-avatar${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={`${import.meta.env.BASE_URL}avatars/via-${shown}.png`}
        width={size}
        height={size}
        alt=""
        decoding="async"
        draggable={false}
      />
    </span>
  );
}