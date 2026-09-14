import { isNativeShell } from './nativeShell';

// En la web las llamadas a /api/* son relativas (mismo origen).
// En shells nativos (Capacitor o iOS WKWebView) se usa la API desplegada en Vercel.
export const PROD_API_ORIGIN = 'https://alivia-tu-salud.vercel.app';

export const API_BASE: string = isNativeShell ? PROD_API_ORIGIN : '';
