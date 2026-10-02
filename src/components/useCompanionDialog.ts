import { useCallback, useEffect, useRef, useState } from 'react';

/** Dos mensajes automáticos por visita, sin intervalos ni llamadas de red. */
export function useCompanionDialog() {
  const [message, setMessage] = useState<string | null>(null);
  const automaticCount = useRef(0);
  const lastDisplayed = useRef<number | null>(null);
  const pendingPriority = useRef(-1);
  const pending = useRef<ReturnType<typeof setTimeout>>();
  const hide = useRef<ReturnType<typeof setTimeout>>();
  const reveal = useCallback((text: string) => {
    clearTimeout(hide.current);
    lastDisplayed.current = Date.now();
    setMessage(text);
    hide.current = setTimeout(() => setMessage(null), 6000);
  }, []);
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
    clearTimeout(hide.current);
    clearTimeout(pending.current);
    automaticCount.current = 2;
    pendingPriority.current = -1;
    setMessage(null);
  }, []);
  const showManual = useCallback((text: string) => {
    clearTimeout(pending.current);
    pendingPriority.current = -1;
    reveal(text);
  }, [reveal]);
  useEffect(() => {
    const onHidden = () => { if (document.hidden) { clearTimeout(hide.current); setMessage(null); } };
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      clearTimeout(pending.current);
      clearTimeout(hide.current);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, []);
  return { message, queueAutomatic, dismiss, showManual };
}
