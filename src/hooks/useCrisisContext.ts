import { useEffect, useCallback, useRef } from 'react';
import { triggerCrisisToast } from '../components/CrisisToast';

/**
 * useCrisisContext - Hook centralizado para detectar señales de crisis
 * y disparar CrisisToast automáticamente.
 * 
 * Fuentes de detección:
 * - Dashboard: mood 1-2 (muy abrumado/algo inestable)
 * - Chat: keywords de crisis en mensajes del usuario
 * - Assessment: score alto (riesgo elevado)
 * - Navegación: visita a /sos
 */

const CRISIS_KEYWORDS = [
  // Autolesión / suicidio
  'suicidio', 'suicidarme', 'matarme', 'quitarme la vida', 'no quiero vivir',
  'autolesión', 'cortarme', 'hacerme daño', 'lastimarme',
  // Desesperanza extrema
  'no aguanto', 'no puedo más', 'ya no aguanto', 'todo es demasiado',
  'sin salida', 'no hay salida', 'todo perdido', 'terminar con todo',
  // Crisis aguda
  'crisis', 'emergencia', 'ayuda urgente', 'necesito ayuda ya',
  'ataque de pánico', 'ansiedad extrema', 'no respiro',
];

const MOOD_CRISIS_THRESHOLD = 2; // mood 1-2 = crisis
const ASSESSMENT_CRISIS_THRESHOLD = 70; // score >= 70 = alto riesgo

let lastToastTime = 0;
const TOAST_COOLDOWN_MS = 5 * 60 * 1000; // 5 min entre toasts

function canShowToast(): boolean {
  const now = Date.now();
  if (now - lastToastTime > TOAST_COOLDOWN_MS) {
    lastToastTime = Date.now();
    return true;
  }
  return false;
}

export function useCrisisContext(options: {
  /** Mood actual del usuario (1-5) */
  mood?: number;
  /** Último mensaje del usuario en chat */
  lastUserMessage?: string;
  /** Score de assessment (0-100) */
  assessmentScore?: number;
  /** Ruta actual */
  pathname?: string;
  /** Habilitar/deshabilitar detección automática */
  enabled?: boolean;
} = {}) {
  const { mood, lastUserMessage, assessmentScore, pathname, enabled = true } = options;
  const triggeredRef = useRef<Set<string>>(new Set());

  const checkMood = useCallback(() => {
    if (!enabled || mood === undefined) return false;
    if (mood <= MOOD_CRISIS_THRESHOLD && canShowToast()) {
      const key = `mood-${mood}`;
      if (!triggeredRef.current.has(key)) {
        triggeredRef.current.add(key);
        import('../components/CrisisToast').then(({ triggerCrisisToast }) => 
          triggerCrisisToast('Tu registro de ánimo indica que lo estás pasando mal. Hay ayuda real cerca de ti.')
        );
        return true;
      }
    }
    return false;
  }, [mood, enabled]);

  const checkChatMessage = useCallback(() => {
    if (!enabled || !lastUserMessage) return false;
    const text = lastUserMessage.toLowerCase();
    const matched = CRISIS_KEYWORDS.find(kw => text.includes(kw));
    if (matched && canShowToast()) {
      const key = `chat-${matched}`;
      if (!triggeredRef.current.has(key)) {
        triggeredRef.current.add(key);
        import('../components/CrisisToast').then(({ triggerCrisisToast }) => 
          triggerCrisisToast('Detecté que estás pasando un momento muy difícil. Hay líneas de crisis 24/7 y recursos cerca de ti.')
        );
        return true;
      }
    }
    return false;
  }, [lastUserMessage, enabled]);

  const checkAssessment = useCallback(() => {
    if (!enabled || assessmentScore === undefined) return false;
    if (assessmentScore >= ASSESSMENT_CRISIS_THRESHOLD && canShowToast()) {
      const key = `assessment-${assessmentScore}`;
      if (!triggeredRef.current.has(key)) {
        triggeredRef.current.add(key);
        import('../components/CrisisToast').then(({ triggerCrisisToast }) => 
          triggerCrisisToast('Tu chequeo indica un nivel de riesgo elevado. Hay ayuda profesional y recursos cerca de ti.')
        );
        return true;
      }
    }
    return false;
  }, [assessmentScore, enabled]);

  const checkPathname = useCallback(() => {
    if (!enabled) return false;
    if (pathname === '/sos' && canShowToast()) {
      const key = 'pathname-sos';
      if (!triggeredRef.current.has(key)) {
        triggeredRef.current.add(key);
        import('../components/CrisisToast').then(({ triggerCrisisToast }) => 
          triggerCrisisToast('Estás en la sección de emergencia. También tienes hospitales y centros verificados ordenados por distancia.')
        );
        return true;
      }
    }
    return false;
  }, [pathname, enabled]);

  useEffect(() => { checkMood(); }, [checkMood]);
  useEffect(() => { checkChatMessage(); }, [checkChatMessage]);
  useEffect(() => { checkAssessment(); }, [checkAssessment]);
  useEffect(() => { checkPathname(); }, [checkPathname]);

  // Reset triggered keys periódicamente (30 min)
  useEffect(() => {
    const interval = setInterval(() => {
      triggeredRef.current.clear();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Trigger manual
  const triggerManually = useCallback((message?: string) => {
    if (canShowToast()) {
      import('../components/CrisisToast').then(({ triggerCrisisToast }) => 
        triggerCrisisToast(message || 'Hay ayuda real disponible para ti. Recursos verificados cerca de ti.')
      );
    }
  }, []);

  return { 
    checkMood, 
    checkChatMessage, 
    checkAssessment, 
    checkPathname, 
    triggerManually 
  };
}

// Helper global
export function triggerCrisisToastManually(message?: string) {
  if ((window as any).__aliviaToastCooldown !== Date.now()) {
    const now = Date.now();
    const last = (window as any).__aliviaLastToast || 0;
    if (now - last > 5 * 60 * 1000) {
      (window as any).__aliviaLastToast = now;
      import('../components/CrisisToast').then(({ triggerCrisisToast }) => 
        triggerCrisisToast(message || 'Hay ayuda real disponible para ti. Recursos verificados cerca de ti.')
      );
    }
  }
}

declare global {
  interface Window {
    aliviaTriggerCrisisToast?: (message?: string) => void;
  }
}

if (typeof window !== 'undefined') {
  window.aliviaTriggerCrisisToast = triggerCrisisToastManually;
}

export default useCrisisContext;
