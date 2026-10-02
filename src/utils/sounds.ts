let audioCtx: AudioContext | null = null;

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

const tone = (
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.06,
  delay = 0,
  slideTo?: number,
) => {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  } catch {
    /* noop */
  }
};

export const popSound = () => {
  tone(620, 0.09, 'triangle', 0.07);
  tone(320, 0.07, 'sine', 0.05, 0.01);
};

export const flipSound = () => {
  tone(500, 0.06, 'triangle', 0.05);
};

export const goodSound = () => {
  tone(523, 0.12, 'sine', 0.06);
  tone(784, 0.16, 'sine', 0.06, 0.09);
};

export const badSound = () => {
  tone(300, 0.18, 'sine', 0.05, 0, 220);
};

export const chimeSound = () => {
  tone(659, 0.14, 'sine', 0.05);
  tone(880, 0.2, 'sine', 0.05, 0.11);
};

export const tapSound = () => {
  tone(440, 0.05, 'sine', 0.04);
};

export const fanfareSound = () => {
  tone(523, 0.12, 'sine', 0.06);
  tone(659, 0.12, 'sine', 0.06, 0.1);
  tone(784, 0.12, 'sine', 0.06, 0.2);
  tone(1047, 0.3, 'sine', 0.07, 0.3);
};

export const levelUpSound = () => {
  tone(392, 0.1, 'triangle', 0.05);
  tone(523, 0.1, 'triangle', 0.05, 0.09);
  tone(659, 0.16, 'triangle', 0.05, 0.18);
};

export const noteSound = (freq: number) => {
  tone(freq, 0.22, 'sine', 0.06);
};

/* ------------------------------------------------------------------ *
 * Tonos suaves para los juegos sensoriales.
 * Sin arpeg, sin eco, sin Granny: nunca premian ni castigan.
 * ------------------------------------------------------------------ */

let noiseBuf: AudioBuffer | null = null;

const getNoise = (ctx: AudioContext): AudioBuffer => {
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    const len = Math.floor(ctx.sampleRate * 0.6);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
};

interface NoiseOpts {
  dur?: number;
  gain?: number;
  freq?: number;
  q?: number;
  type?: BiquadFilterType;
  delay?: number;
  sweepTo?: number;
}

export const noiseSound = ({ dur = 0.14, gain = 0.05, freq = 1800, q = 0.7, type = 'bandpass', delay = 0, sweepTo }: NoiseOpts = {}) => {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, start);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, start + dur);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(start);
    src.stop(start + dur + 0.05);
  } catch {
    /* noop */
  }
};

/** Madera hueca: bloque que cae sobre la pila. */
export const woodSound = () => {
  tone(196, 0.16, 'triangle', 0.07, 0, 150);
  noiseSound({ dur: 0.07, gain: 0.035, freq: 900, q: 1.2 });
};

/** Barba de marimba: fundamental cálida + armónico corto. */
export const marimbaNote = (freq: number, gain = 0.055) => {
  tone(freq, 0.62, 'sine', gain);
  tone(freq * 4, 0.12, 'sine', gain * 0.28);
  tone(freq * 2, 0.28, 'sine', gain * 0.2);
};

/** Vaina rozando metal: la moneda toma brillo. */
export const polishSound = () => {
  noiseSound({ dur: 0.1, gain: 0.028, freq: 5200, q: 0.5, type: 'highpass' });
  tone(1560 + Math.random() * 240, 0.09, 'sine', 0.014);
};

/** Papel plegándose. */
export const creaseSound = () => {
  noiseSound({ dur: 0.3, gain: 0.05, freq: 3400, q: 0.4, type: 'highpass', sweepTo: 1100 });
};

/** Cepillo rozando la superficie. */
export const sweepSound = () => {
  noiseSound({ dur: 0.22, gain: 0.03, freq: 2400, q: 0.35, type: 'bandpass', sweepTo: 700 });
};

/** Cuenta de madera atravesando el hilo. */
export const beadSound = () => {
  tone(880, 0.07, 'sine', 0.04);
  tone(1320, 0.05, 'sine', 0.02, 0.03);
};

/** Dardo clavándose en el corcho. */
export const dartSound = () => {
  noiseSound({ dur: 0.1, gain: 0.05, freq: 420, q: 1.6 });
  tone(140, 0.13, 'sine', 0.04, 0, 100);
};

/** Ficha posándose en la bandeja. */
export const placeSound = () => {
  noiseSound({ dur: 0.06, gain: 0.03, freq: 2600, q: 0.9 });
  tone(520, 0.07, 'sine', 0.025);
};