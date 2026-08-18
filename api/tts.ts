import { VercelRequest, VercelResponse } from '@vercel/node';
import { Buffer } from 'node:buffer';

const EDGE_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_VOICE = 'es-AR-ElenaNeural';
const EDGE_OUTPUT = 'audio-24khz-96kbitrate-mono-mp3';
const MAX_TEXT = 800;

const uuid = (): string => {
  const p = (x: number) => (x < 16 ? '0' : '') + x.toString(16);
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return `${p(b[0])}${p(b[1])}${p(b[2])}${p(b[3])}-${p(b[4])}${p(b[5])}-${p(b[6])}${p(b[7])}-${p(b[8])}${p(b[9])}-${p(b[10])}${p(b[11])}${p(b[12])}${p(b[13])}${p(b[14])}${p(b[15])}`;
};

const randId = (len = 36): string => {
  let s = '';
  const chars = '0123456789abcdef';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) s += chars[arr[i] % 16];
  return s;
};

const sha256Hex = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const synthesize = (text: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const connId = randId().toUpperCase();
    let ws: WebSocket;
    try {
      ws = new WebSocket(
        `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EDGE_TOKEN}&ConnectionId=${connId}`
      );
    } catch (e) {
      reject(e);
      return;
    }
    const chunks: Buffer[] = [];
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { ws.close(); } catch { /* noop */ }
        reject(new Error('timeout'));
      }
    }, 12000);

    ws.onopen = () => {
      const ts = new Date().toUTCString().replace('GMT', 'GMT');
      ws.send(
        `X-RequestId:${uuid()}\r\nContent-Type:application/json; charset=utf-8\r\nX-Timestamp:${ts}\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'true' },
                outputFormat: EDGE_OUTPUT,
              },
            },
          },
        })
      );
      const clean = text.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ¿¡\s.,;:!?()'"’-]/gu, ' ').replace(/\s+/g, ' ').trim();
      const safe = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='es-AR'><voice name='${EDGE_VOICE}'><prosody rate='-12%' pitch='-2%' volume='loud'>${safe || 'Hola'}</prosody></voice></speak>`;
      const ts2 = new Date().toUTCString().replace('GMT', 'GMT');
      sha256Hex(ts2 + EDGE_TOKEN)
        .then((gec) => {
          ws.send(
            `X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts2}\r\nPath:ssml\r\nSec-MS-GEC:${gec}\r\nSec-MS-GEC-Version:1\r\n\r\n${ssml}`
          );
        })
        .catch(() => { /* noop */ });
    };

    ws.onmessage = (ev: MessageEvent) => {
      const d: unknown = ev.data;
      if (typeof d === 'string') {
        if (d.includes('turn.end')) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            try { ws.close(); } catch { /* noop */ }
          }
          resolve(Buffer.concat(chunks));
        }
        return;
      }
      if (typeof Blob !== 'undefined' && d instanceof Blob) {
        (d as Blob).arrayBuffer()
          .then((buf) => chunks.push(Buffer.from(buf)))
          .catch(() => { /* noop */ });
        return;
      }
      if (d instanceof ArrayBuffer) {
        chunks.push(Buffer.from(d));
        return;
      }
      if (d && typeof d === 'object' && 'buffer' in d && d.buffer instanceof ArrayBuffer) {
        chunks.push(Buffer.from(d.buffer));
      }
    };

    ws.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error('ws error'));
      }
    };
    ws.onclose = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error('ws closed'));
      }
    };
  });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const text = String(req.query.text ?? '').trim().slice(0, MAX_TEXT);
    if (!text) {
      return res.status(400).json({ error: 'text requerido' });
    }
    const audio = await synthesize(text);
    if (audio.length === 0) {
      return res.status(502).json({ error: 'Sin audio' });
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (err) {
    console.error('Error en /api/tts:', err);
    return res.status(502).json({ error: 'TTS no disponible' });
  }
}