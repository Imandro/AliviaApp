export interface LambdaEvent {
  version: string;
  routeKey?: string;
  rawPath?: string;
  rawQueryString?: string;
  httpMethod?: string;
  path?: string;
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  multiValueQueryStringParameters?: Record<string, string[]>;
  body?: string;
  isBase64Encoded?: boolean;
  requestContext?: {
    http?: {
      method: string;
      path: string;
    };
  };
}

export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

export interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (data: unknown) => VercelLikeResponse;
  send: (data: unknown) => VercelLikeResponse;
  setHeader: (key: string, value: string) => void;
  end: () => void;
}

export function createVercelLikeRes(callback: (err: null, result: LambdaResponse) => void): VercelLikeResponse {
  let statusCode = 200;
  let headers: Record<string, string> = {};
  let bodyData: unknown = null;
  let ended = false;

  const res: VercelLikeResponse = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: unknown) {
      bodyData = data;
      headers['Content-Type'] = 'application/json';
      return res;
    },
    send(data: unknown) {
      if (Buffer.isBuffer(data)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/octet-stream';
        callback(null, {
          statusCode,
          headers,
          body: data.toString('base64'),
          isBase64Encoded: true,
        });
        ended = true;
        return res;
      }
      if (typeof data === 'string') {
        callback(null, { statusCode, headers, body: data, isBase64Encoded: false });
        ended = true;
        return res;
      }
      bodyData = data;
      return res;
    },
    setHeader(key: string, value: string) {
      headers[key] = value;
    },
    end() {
      if (ended) return;
      const body = bodyData !== null ? JSON.stringify(bodyData) : '';
      callback(null, {
        statusCode,
        headers,
        body,
        isBase64Encoded: false,
      });
    },
  };

  return res;
}

export function parseEvent(event: LambdaEvent): { method: string; path: string; query: Record<string, string>; body: unknown; headers: Record<string, string> } {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.rawPath || event.path || '/';
  const headers = event.headers || {};

  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(event.queryStringParameters || {})) {
    query[key] = value;
  }
  for (const [key, values] of Object.entries(event.multiValueQueryStringParameters || {})) {
    if (query[key] === undefined && values.length > 0) query[key] = values[0];
  }

  let body: unknown = null;
  if (event.body) {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }

  return { method, path, query, body, headers };
}
