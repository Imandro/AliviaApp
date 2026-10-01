/**
 * Tipos minimos con la misma forma que usaba @vercel/node.
 *
 * Los handlers seoriginally escribieron para Vercel, pero la API ya corre en AWS
 * Lambda (ver api/lambda/): el adaptador convierte el evento de Function URL en
 * estos objetos y la respuesta de vuelta. Mantener los tipos aqui evita
 * depender del paquete @vercel/node, que ya no hace falta en la migracion a AWS.
 */

export interface ApiRequest {
  method?: string;
  url?: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  ok?: boolean;
  status?: number;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => ApiResponse;
  send: (data: unknown) => ApiResponse;
  setHeader: (key: string, value: string) => void;
  end: () => void;
}