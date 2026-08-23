import type { VercelRequest, VercelResponse } from '@vercel/node';

// Permite que la app nativa (Capacitor/WebView) consuma la API desde otro origen.
const CORS_HEADERS: Array<[string, string]> = [
  ['Access-Control-Allow-Origin', '*'],
  ['Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS'],
  ['Access-Control-Allow-Headers', 'Content-Type, Authorization'],
  ['Access-Control-Max-Age', '86400'],
];

// Aplica cabeceras CORS y responde preflight OPTIONS. Devuelve true si la petición ya fue respondida.
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  for (const [key, value] of CORS_HEADERS) {
    res.setHeader(key, value);
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
