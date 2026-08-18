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