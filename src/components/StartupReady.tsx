import { useEffect } from 'react';
import { signalScreenReady } from '../utils/startup';

/** Al estar dentro de Suspense, el efecto espera a que sus hijos estén listos. */
export function StartupReady() {
  useEffect(() => {
    // Dos frames permiten pintar la pantalla antes de retirar la capa inicial.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(signalScreenReady);
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);
  return null;
}
