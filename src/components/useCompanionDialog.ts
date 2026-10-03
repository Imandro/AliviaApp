import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Duración de la animación de salida, en ms.
 *
 * Tiene que coincidir con `home-companion-dialog-out` de HomeCompanion.css. Si
 * el CSS durara más, el globo se cortaría a media salida; si durara menos,
 * se quedaría congelado un instante antes de desaparecer.
 *
 * Con `prefers-reduced-motion` el CSS pone `animation: none`, así que el
 * globo se queda quieto estos 180 ms y se va. Es imperceptible y evita tener
 * que consultar la preferencia desde JS.
 */
const EXIT_MS = 180;

/** Cuánto permanece cada diálogo antes de cerrarse solo. */
const VISIBLE_MS = 6000;

/**
 * Diálogo de la mascota: dos mensajes automáticos por visita, sin intervalos ni
 * llamadas de red.
 *
 * El texto y la visibilidad se guardan por separado porque el globo no se
 * desmonta al terminar: se queda montado mientras se anima la salida. Con un
 * solo `message` y un render condicional el elemento se eliminaba del DOM de
 * golpe y la animación de salida no llegaba a verse nunca.
 */
export function useCompanionDialog() {
  const [message, setMessage] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const automaticCount = useRef(0);
  const lastDisplayed = useRef<number | null>(null);
  const pendingPriority = useRef(-1);
  const pending = useRef<ReturnType<typeof setTimeout>>();
  const hide = useRef<ReturnType<typeof setTimeout>>();
  const unmount = useRef<ReturnType<typeof setTimeout>>();

  /** Texto vigente en memoria, para no depender del estado al decidir. */
  const vigente = useRef<string | null>(null);

  const close = useCallback(() => {
    clearTimeout(hide.current);
    if (vigente.current === null) return;
    setLeaving(true);
    unmount.current = setTimeout(() => {
      vigente.current = null;
      setLeaving(false);
      setMessage(null);
    }, EXIT_MS);
  }, []);

  const reveal = useCallback((text: string) => {
    clearTimeout(hide.current);
    // Si estaba saliendo, se cancela el desmontaje: aparecer un texto nuevo
    // mientras el globo se desvanecia lo dejaria a medio camino.
    clearTimeout(unmount.current);
    vigente.current = text;
    setLeaving(false);
    lastDisplayed.current = Date.now();
    setMessage(text);
    hide.current = setTimeout(close, VISIBLE_MS);
  }, [close]);

  const queueAutomatic = useCallback((text: string, priority = 0, delay = 0) => {
    if (automaticCount.current >= 2 || priority < pendingPriority.current) return;
    clearTimeout(pending.current);
    pendingPriority.current = priority;
    const remaining = lastDisplayed.current === null ? 0 : Math.max(0, 60000 - (Date.now() - lastDisplayed.current));
    pending.current = setTimeout(() => {
      pendingPriority.current = -1;
      if (document.hidden || automaticCount.current >= 2) return;
      automaticCount.current++;
      reveal(text);
    }, Math.max(delay, remaining));
  }, [reveal]);

  const dismiss = useCallback(() => {
    clearTimeout(pending.current);
    automaticCount.current = 2;
    pendingPriority.current = -1;
    close();
  }, [close]);

  const showManual = useCallback((text: string) => {
    clearTimeout(pending.current);
    pendingPriority.current = -1;
    reveal(text);
  }, [reveal]);

  useEffect(() => {
    // Al ocultar la pestaña no hay animacion que ver: se desmonta de inmediato.
    const onHidden = () => {
      if (!document.hidden) return;
      clearTimeout(hide.current);
      clearTimeout(unmount.current);
      vigente.current = null;
      setLeaving(false);
      setMessage(null);
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      clearTimeout(pending.current);
      clearTimeout(hide.current);
      clearTimeout(unmount.current);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, []);

  return { message, leaving, queueAutomatic, dismiss, showManual };
}