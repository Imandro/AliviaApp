import { Capacitor } from '@capacitor/core';

// En la web las llamadas a /api/* son relativas (mismo origen).
// Dentro de la app nativa de Android no hay servidor: se usa la API desplegada en Vercel.
export const PROD_API_ORIGIN = 'https://alivia-tu-salud.vercel.app';

export const API_BASE: string = Capacitor.isNativePlatform() ? PROD_API_ORIGIN : '';
