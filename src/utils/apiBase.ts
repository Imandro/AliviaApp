import { isNativeShell } from './nativeShell';

// Origen de la API de base de datos. En web las llamadas a /api/* son relativas
// (mismo origen servido por CloudFront). En shells nativos (Capacitor o iOS
// WKWebView) se apunta a la Lambda desplegada en AWS.
export const PROD_API_ORIGIN = import.meta.env.VITE_API_URL || '';

// El TTS corre en una Lambda separada FUERA del VPC, porque necesita salida a
// internet (Bing Edge TTS / Google Translate) y una Lambda en VPC lo exigiria
// con un NAT Gateway de ~$32/mes. Por eso el cliente no lo pide a la API de
// datos: en web CloudFront enruta /api/tts a esa Lambda, y en nativo se usa el
// origen absoluto.
export const TTS_ORIGIN: string = isNativeShell
  ? import.meta.env.VITE_TTS_URL || PROD_API_ORIGIN
  : '';

export const API_BASE: string = isNativeShell ? PROD_API_ORIGIN : '';
