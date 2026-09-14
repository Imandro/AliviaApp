import { isNativeShell } from './nativeShell';

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        aliviaBridge?: {
          postMessage: (msg: { id: string; method: string; args: Record<string, unknown> }) => void;
        };
      };
    };
    AliviaBridge?: {
      call: (method: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
    isSecureContext: boolean;
  }
}

/**
 * Invoca el bridge Swift↔JS (shell iOS WKWebView).
 * Rechaza si no hay bridge disponible (web, Android o dev sin shell).
 */
export const callNative = (method: string, args: Record<string, unknown> = {}): Promise<unknown> => {
  const bridge = window.AliviaBridge;
  if (!bridge) return Promise.reject(new Error('AliviaBridge no disponible'));
  return bridge.call(method, args);
};

/** True si el bridge nativo está disponible en runtime. */
export const hasNativeBridge = (): boolean => {
  if (!isNativeShell) return false;
  return typeof window !== 'undefined' && typeof window.AliviaBridge === 'object';
};

/** Escapa una cadena para usarla en mensajes de notificación. */
export const nativeError = (err: unknown): string =>
  err instanceof Error ? err.message : String(err ?? 'Error nativo');