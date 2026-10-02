import { isNativeShell } from './nativeShell';

// Origen por defecto para las apps nativas: el dominio propio que sirve la web,
// asi hay un solo origen y la Lambda responde CORS para file:// y capacitor://.
// En nativo NO valen las rutas relativas (serian relativas a file://), asi que
// hace falta el absoluto.
//
// Se puede sobrescribir con VITE_API_URL / VITE_TTS_URL en el momento de build
// (los workflows de iOS y Android los inyectan desde las variables del repo).
//
// La URL de CloudFront queda como referencia por si el dominio propio todavia
// no resuelve (por ejemplo, mientras el registrador no delega los nameservers).
const SITE_ORIGIN = 'https://alivia.lat';
const CLOUDFRONT_ORIGIN = 'https://d3gm2ziao5tkw0.cloudfront.net';

// Origen de la API de base de datos. En web las llamadas a /api/* son relativas
// (mismo origen servido por CloudFront). En shells nativos (Capacitor o iOS
// WKWebView) se apunta al dominio absoluto.
export const PROD_API_ORIGIN = isNativeShell
  ? import.meta.env.VITE_API_URL || SITE_ORIGIN || CLOUDFRONT_ORIGIN
  : '';

// El TTS corre en una Lambda separada FUERA del VPC, porque necesita salida a
// internet (Bing Edge TTS / Google Translate) y una Lambda en VPC lo exigiria
// con un NAT Gateway de ~$32/mes. Por eso el cliente no lo pide a la API de
// datos: en web CloudFront enruta /api/tts a esa Lambda, y en nativo se usa el
// origen absoluto.
export const TTS_ORIGIN: string = isNativeShell
  ? import.meta.env.VITE_TTS_URL || SITE_ORIGIN || CLOUDFRONT_ORIGIN
  : '';

export const API_BASE: string = PROD_API_ORIGIN;