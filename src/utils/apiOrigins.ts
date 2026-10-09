/**
 * Origenes de la API segun donde corre la app.
 *
 * Hay dos entornos y cada uno necesita un origen distinto:
 *
 *  - Web: rutas relativas. La SPA y la API las sirve el mismo nginx de la VM,
 *    asi que /api/* ya es el origen correcto y no hay CORS de por medio.
 *  - Nativo (Capacitor / iOS WKWebView): rutas relativas no valen, porque en
 *    nativo se resuelven contra file://. Hace falta el absoluto.
 *
 * En Azure la API vive en la IP publica de la VM (ver infra/azure/vm.bicep). El
 * dominio propio queda como fallback para cuando alivia.lat resuelva contra el
 * proxy: si el registrador todavia no ha delegado los nameservers, o el telefono
 * no tiene DNS, la IP es lo unico que funciona.
 */

/**
 * IP publica de la VM de Azure.
 *
 * PLACEHOLDER: se rellena cuando se despliegue. La IP real la imprime
 * `az deployment group show` en la salida publicIpAddress. Hasta entonces esta
 * cadena no resuelve y el build nativo quedara apuntando a un origen inexistente.
 */
export const AZURE_IP = 'RELLENAR_CON_LA_IP_PUBLICA_DE_AZURE';

/** Origen absoluto del backend. Sin https: una IP publica no tiene certificado. */
export const AZURE_ORIGIN = `http://${AZURE_IP}`;

/** Dominio propio, con https. */
export const SITE_ORIGIN = 'https://alivia.lat';

/**
 * Origen para un shell nativo: variable de build > IP de Azure > dominio.
 *
 * La IP va antes que el dominio a proposito: es el estado real del despliegue,
 * mientras que alivia.lat puede seguir sin resolver.
 */
export const originFor = (envVar: string): string =>
  import.meta.env[envVar] || AZURE_ORIGIN || SITE_ORIGIN;