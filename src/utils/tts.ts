import { API_BASE } from './apiBase';

const EDGE_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_VOICE = 'es-AR-ElenaNeural';
const EDGE_OUTPUT = 'audio-24khz-96kbitrate-mono-mp3';

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentWs: WebSocket | null = null;
let fallbackTimer: number | null = null;
let activePlayResolver: (() => void) | null = null;
let edgeFailed = false;

export const unlockAudio = () => {
  try {
    getCtx();
  } catch {
    /* noop */
  }
};

const uuid = (): string => {
  const p = (x: number) => (x < 16 ? '0' : '') + x.toString(16);
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return `${p(b[0])}${p(b[1])}${p(b[2])}${p(b[3])}-${p(b[4])}${p(b[5])}-${p(b[6])}${p(b[7])}-${p(b[8])}${p(b[9])}-${p(b[10])}${p(b[11])}${p(b[12])}${p(b[13])}${p(b[14])}${p(b[15])}`;
};

const randomId = (len = 36): string => {
  let s = '';
  const chars = '0123456789abcdef';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) s += chars[arr[i] % 16];
  return s;
};

const gmtNow = (): string => new Date().toUTCString().replace('GMT', 'GMT');

const sha256Hex = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const getCtx = (): AudioContext | null => {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
};

const bestFallbackVoice = (): SpeechSynthesisVoice | null => {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    const voices = synth.getVoices();
    if (voices.length === 0) return null;
    const es = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
    if (es.length === 0) return null;
    const calm = /elen|dalia|helena|sabina|m[oó]nica|paulina|mia|sof[íi]a|valentina|marisol|angelica|gabriela|laura|clara|andrea|luci|silvia|rosa|ana/i;
    const isCalm = (v: SpeechSynthesisVoice) => calm.test(v.name);
    return (
      es.find(v => !v.localService && isCalm(v)) ||
      es.find(v => isCalm(v)) ||
      es.find(v => !v.localService && /google/i.test(v.name)) ||
      es.find(v => /google/i.test(v.name)) ||
      es.find(v => !v.localService) ||
      es[0]
    );
  } catch {
    return null;
  }
};

export const stopSpeaking = () => {
  try {
    if (currentSource) {
      const r = activePlayResolver;
      activePlayResolver = null;
      currentSource.onended = null;
      try { currentSource.stop(); } catch { /* noop */ }
      try { currentSource.disconnect(); } catch { /* noop */ }
      currentSource = null;
      if (r) r();
    }
    if (currentWs) {
      currentWs.onclose = null;
      currentWs.onerror = null;
      try { currentWs.close(); } catch { /* noop */ }
      currentWs = null;
    }
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const r = activePlayResolver;
      activePlayResolver = null;
      if (r) r();
    }
  } catch {
    /* noop */
  }
};

const playMp3 = async (bytes: ArrayBuffer): Promise<'ok' | 'fail'> => {
  const ctx = getCtx();
  if (!ctx) return 'fail';
  try {
    const buffer = await ctx.decodeAudioData(bytes);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    source.connect(gain);
    gain.connect(ctx.destination);
    currentSource = source;
    await new Promise<void>((resolve) => {
      activePlayResolver = resolve;
      source.onended = () => {
        if (activePlayResolver === resolve) activePlayResolver = null;
        resolve();
      };
      source.start();
    });
    if (currentSource === source) currentSource = null;
    return 'ok';
  } catch {
    return 'fail';
  }
};

const speakViaEdge = (text: string): Promise<'ok' | 'fail'> => {
  return new Promise((resolve) => {
    const connId = randomId().toUpperCase();
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EDGE_TOKEN}&ConnectionId=${connId}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      resolve('fail');
      return;
    }
    currentWs = ws;
    const chunks: ArrayBuffer[] = [];
    let settled = false;

    const finish = (result: 'ok' | 'fail') => {
      if (settled) return;
      settled = true;
      currentWs = null;
      try { ws.close(); } catch { /* noop */ }
      resolve(result);
    };

    ws.onopen = () => {
      const ts = gmtNow();
      const config = {
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'true' },
              outputFormat: EDGE_OUTPUT,
            },
          },
        },
      };
      const configMsg = `X-RequestId:${uuid()}\r\nContent-Type:application/json; charset=utf-8\r\nX-Timestamp:${ts}\r\nPath:speech.config\r\n\r\n${JSON.stringify(config)}`;
      ws.send(configMsg);

      const clean = text.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ¿¡\s.,;:!?()'’-]/gu, ' ').replace(/\s+/g, ' ').trim();
      const safe = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='es-AR'><voice name='${EDGE_VOICE}'><prosody rate='-12%' pitch='-2%' volume='loud'>${safe || 'Hola'}</prosody></voice></speak>`;
      const ts2 = gmtNow();
      sha256Hex(ts2 + EDGE_TOKEN).then((gec) => {
        const speechMsg = `X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts2}\r\nPath:ssml\r\nSec-MS-GEC:${gec}\r\nSec-MS-GEC-Version:1\r\n\r\n${ssml}`;
        ws.send(speechMsg);
      });
    };

    ws.onmessage = (ev: MessageEvent) => {
      const data: unknown = ev.data;
      if (typeof data === 'string') {
        if (String(data).includes('turn.end')) {
          const total = chunks.reduce((a, b) => a + b.byteLength, 0);
          if (total > 0) {
            const merged = new Uint8Array(total);
            let offset = 0;
            for (const chunk of chunks) {
              merged.set(new Uint8Array(chunk), offset);
              offset += chunk.byteLength;
            }
            playMp3(merged.buffer).then((r) => {
              finish(r);
            });
          } else {
            finish('fail');
          }
        }
        if (String(data).includes('audio.metadata')) {
          try {
            const meta = JSON.parse(String(data).slice(String(data).indexOf('{')));
            const duration = meta?.Metadata?.Duration ?? 0;
            if (duration > 0 && fallbackTimer === null) {
              fallbackTimer = window.setTimeout(() => {
                if (chunks.length === 0) finish('fail');
              }, 1400);
            }
          } catch {
            /* noop */
          }
        }
        return;
      }
      if (data instanceof Blob) {
        data.arrayBuffer().then((buf) => {
          chunks.push(buf);
        });
      } else if (data instanceof ArrayBuffer) {
        chunks.push(data);
      } else if (data && typeof data === 'object' && 'buffer' in data && data.buffer instanceof ArrayBuffer) {
        chunks.push((data as { buffer: ArrayBuffer }).buffer);
      }
    };

    ws.onerror = () => {
      finish('fail');
    };
    ws.onclose = () => {
      if (!settled) finish('fail');
    };

window.setTimeout(() => {
      finish('fail');
    }, 8000);
  });
};

const speakViaFallback = (text: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      resolve(false);
      return;
    }
    synth.cancel();
    const clean = text.replace(/[💛🎉✅⭐]/gu, '').replace(/\s+/g, ' ').trim();
    if (!clean) {
      resolve(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'es-AR';
    const voice = bestFallbackVoice();
    if (voice) utter.voice = voice;
    utter.rate = 0.82;
    utter.pitch = 0.9;
    activePlayResolver = () => resolve(false);
    utter.onend = () => {
      if (activePlayResolver) activePlayResolver = null;
      resolve(true);
    };
    utter.onerror = () => {
      if (activePlayResolver) activePlayResolver = null;
      resolve(false);
    };
    synth.speak(utter);
  });
};

const speakViaProxy = async (text: string): Promise<'ok' | 'fail'> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/api/tts?text=${encodeURIComponent(text)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return 'fail';
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return 'fail';
    return await playMp3(buf);
  } catch {
    return 'fail';
  } finally {
    window.clearTimeout(timer);
  }
};

export const speakNatural = async (text: string): Promise<boolean> => {
  if (currentSource || currentWs) {
    stopSpeaking();
  }
  if (!edgeFailed) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const ok = await speakViaEdge(text);
        if (ok === 'ok') {
          edgeFailed = false;
          return true;
        }
      } catch {
        /* noop */
      }
    }
    edgeFailed = true;
  }
  if ((await speakViaProxy(text)) === 'ok') return true;
  return speakViaFallback(text);
};

export const preloadVoices = () => {
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  } catch {
    /* noop */
  }
};