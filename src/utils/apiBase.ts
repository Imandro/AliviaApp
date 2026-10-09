import { isNativeShell } from './nativeShell';
import { originFor } from './apiOrigins';

// Origen por defecto para las apps nativas: el absoluto que devuelve
// originFor (VITE_API_URL si se compilo para un host concreto, si no la IP
// publica de la VM de Azure).
//
// En nativo NO valen las rutas relativas (serian relativas a file://), asi que
// API_BASE nunca puede quedar en '': ese caso rompia el registro en la app.
//
// En web sigue siendo '' a proposito: la SPA y la API las sirve el mismo nginx
// de la VM, y las rutas relativas evitan CORS por completo.
export const PROD_API_ORIGIN = isNativeShell ? originFor('VITE_API_URL') : '';

/**
 * Origen del TTS.
 *
 * En AWS era una Lambda aparte FUERA del VPC, porque necesitaba salida a Bing y
 * Google y una Lambda en el VPC lo exigiria con un NAT Gateway (~$32/mes). En la
 * VM de Azure esa separacion desaparece: TTS corre en el mismo proceso, asi que
 * comparte origen con la API.
 *
 * En web el cliente no lo pide a la API de datos: /api/tts va al mismo backend
 * por el proxy de nginx. En nativo se usa el origen absoluto.
 */
export const TTS_ORIGIN: string = isNativeShell ? originFor('VITE_TTS_URL') : '';

export const API_BASE: string = PROD_API_ORIGIN;