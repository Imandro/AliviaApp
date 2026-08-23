import { VercelRequest, VercelResponse } from '@vercel/node';
import { Buffer } from 'node:buffer';
import WebSocket from 'ws';

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

const SPLIT_MS = 180;

const splitForGoogle = (text: string): string[] => {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let buf = '';
  for (const ch of clean) {
    buf += ch;
    const len = buf.trim().length;
    if (len >= SPLIT_MS || (len >= 150 && /[.!?;,:]/.test(ch))) {
      chunks.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.filter((c) => c.length > 0 && c.length <= 220);
};

const synthesizeGoogle = async (text: string): Promise<Buffer> => {
  const parts = splitForGoogle(text);
  if (parts.length === 0) throw new Error('texto vacío');
  const bufs: Buffer[] = [];
  for (const p of parts) {
    const res = await fetch(
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es&q=${encodeURIComponent(p)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Accept: 'audio/mpeg' } }
    );
    if (!res.ok) throw new Error(`gtts ${res.status}`);
    bufs.push(Buffer.from(new Uint8Array(await res.arrayBuffer())));
  }
  return Buffer.concat(bufs);
};

const synthesize = (text: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const connId = randId().toUpperCase();
    let ws: WebSocket | null = null;
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
        try { ws?.close(); } catch { /* noop */ }
        reject(new Error('timeout'));
      }
    }, 6000);

    ws.on('open', () => {
      const ts = new Date().toUTCString().replace('GMT', 'GMT');
      ws?.send(
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
          ws?.send(
            `X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts2}\r\nPath:ssml\r\nSec-MS-GEC:${gec}\r\nSec-MS-GEC-Version:1\r\n\r\n${ssml}`
          );
        })
        .catch(() => { /* noop */ });
    });

    ws.on('message', (data: Buffer) => {
      const head = data.toString('latin1').slice(0, 160);
      if (head.startsWith('Path:turn.end')) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          try { ws?.close(); } catch { /* noop */ }
        }
        resolve(Buffer.concat(chunks));
        return;
      }
      if (head.startsWith('Path:audio')) {
        const idx = data.indexOf('\r\n\r\n');
        if (idx >= 0) {
          chunks.push(data.subarray(idx + 4));
        } else {
          chunks.push(data);
        }
      }
    });

    ws.on('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error('ws error'));
      }
    });
    ws.on('close', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error('ws closed'));
      }
    });
  });

import { applyCors } from './_cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  try {
    const text = String(req.query.text ?? '').trim().slice(0, MAX_TEXT);
    if (!text) {
      return res.status(400).json({ error: 'text requerido' });
    }
    let audio: Buffer | null = null;
    try {
      audio = await synthesize(text);
    } catch {
      audio = null;
    }
    if (!audio || audio.length === 0) {
      try {
        audio = await synthesizeGoogle(text);
      } catch (err) {
        console.error('TTS Google falló:', err);
      }
    }
    if (!audio || audio.length === 0) {
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