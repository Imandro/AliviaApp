import { Capacitor } from '@capacitor/core';

/**
 * Detecta si la app corre en un shell nativo:
 * - Android/iOS via Capacitor
 * - iOS via WKWebView (VITE_IOS_SHELL=1 inyectado en build)
 */
export const isNativeShell: boolean =
  Capacitor.isNativePlatform() || import.meta.env.VITE_IOS_SHELL === '1';
