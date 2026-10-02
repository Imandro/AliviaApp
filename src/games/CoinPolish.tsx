import React, { useEffect, useRef, useState } from 'react';
import { SensoryStage, fitCanvas, toStagePoint } from './SensoryStage';
import { polishSound } from '../utils/sounds';
import { hapticTick } from '../utils/haptics';

const SPECKS = 1600;
const BLOTCHES = 26;
const ERASER = 30;
const SOUND_GAP_MS = 90;

/** Umbrales de la frase de estado. No hay número: solo una palabra que cambia. */
const STAGES: { at: number; text: string }[] = [
  { at: 0.22, text: 'La moneda empieza a verse' },
  { at: 0.5, text: 'Quedan manchas, pero ya se ve metal' },
  { at: 0.78, text: 'Casi reluciente' },
  { at: 0.97, text: 'Reluciente' },
];

/**
 * Frota una moneda oxidada.
 *
 * El óxido vive en un canvas aparte; el puntero lo borra con
 * `destination-out`. El brillo especular de la moneda crece con la limpieza,
 * así que el único "avance" que existe es visual.
 */
export const CoinPolish: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirtRef = useRef<HTMLCanvasElement | null>(null);
  const cleanRef = useRef(0);
  const soundAt = useRef(0);
  const rafRef = useRef<number>(0);
  const [status, setStatus] = useState(STAGES[0].text);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dirt = document.createElement('canvas');
    dirtRef.current = dirt;
    let dpr = 1;

    const seedDirt = (w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.36;
      dirt.width = Math.round(w * dpr);
      dirt.height = Math.round(h * dpr);
      const d = dirt.getContext('2d');
      if (!d) return;
      d.setTransform(dpr, 0, 0, dpr, 0, 0);
      d.clearRect(0, 0, w, h);
      d.fillStyle = '#6b5a3e';

      for (let i = 0; i < BLOTCHES; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * r * 0.96;
        const size = 6 + Math.random() * 26;
        d.globalAlpha = 0.05 + Math.random() * 0.1;
        d.beginPath();
        d.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, size, 0, Math.PI * 2);
        d.fill();
      }

      for (let i = 0; i < SPECKS; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * r;
        d.globalAlpha = 0.08 + Math.random() * 0.42;
        d.beginPath();
        d.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.5 + Math.random() * 2.1, 0, Math.PI * 2);
        d.fill();
      }
      d.globalAlpha = 1;
    };

    /** Muestrea el canvas de óxido para saber cuánto queda, sin mostrarlo. */
    const probe = document.createElement('canvas');
    probe.width = 20;
    probe.height = 20;
    const measure = (): number => {
      const p = probe.getContext('2d', { willReadFrequently: true });
      if (!p) return 0;
      p.clearRect(0, 0, 20, 20);
      p.drawImage(dirt, 0, 0, 20, 20);
      const data = p.getImageData(0, 0, 20, 20).data;
      let sum = 0;
      for (let i = 3; i < data.length; i += 4) sum += data[i];
      return 1 - sum / (20 * 20 * 255);
    };

    const draw = (t: number) => {
      const size = fitCanvas(canvas);
      if (!size) return;
      const { ctx, w, h } = size;
      if (canvas.width !== dirt.width || canvas.height !== dirt.height) {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        seedDirt(w, h);
      }

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.36;
      const clean = cleanRef.current;

      ctx.clearRect(0, 0, w, h);

      // Sombra bajo la moneda.
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.1, r * 1.04, r * 1.04, 0, 0, Math.PI * 2);
      ctx.fill();

      // Canto de la moneda.
      const rim = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
      rim.addColorStop(0, '#f6ecc9');
      rim.addColorStop(0.45, '#d8c48a');
      rim.addColorStop(0.82, '#a88a52');
      rim.addColorStop(1, '#6f5a33');
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Relieve interior.
      ctx.strokeStyle = `rgba(90,72,42,${0.4 - clean * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // Capa de óxido.
      ctx.drawImage(dirt, 0, 0, w, h);

      // Brillo especular: crece a medida que la moneda se limpia.
      const sweep = ((t / 5200) % 1) * 2 - 0.5;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const shine = ctx.createLinearGradient(cx - r, cy - r + sweep * r, cx + r, cy + r + sweep * r);
      const peak = 0.16 + clean * 0.42;
      shine.addColorStop(Math.max(0, sweep - 0.3), 'rgba(255,255,255,0)');
      shine.addColorStop(Math.max(0.02, sweep), `rgba(255,255,255,${peak})`);
      shine.addColorStop(Math.min(0.98, sweep + 0.3), 'rgba(255,255,255,0)');
      ctx.fillStyle = shine;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const probeTimer = window.setInterval(() => {
      const value = measure();
      if (Math.abs(value - cleanRef.current) < 0.01) return;
      cleanRef.current = value;
      const hit = [...STAGES].reverse().find(s => value >= s.at);
      setStatus(hit ? hit.text : STAGES[0].text);
    }, 500);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearInterval(probeTimer);
    };
  }, []);

  const rub = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const dirt = dirtRef.current;
    if (!canvas || !dirt) return;
    const { x, y } = toStagePoint(canvas, e.clientX, e.clientY);
    const d = dirt.getContext('2d');
    if (!d) return;

    const g = d.createRadialGradient(x, y, 0, x, y, ERASER);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.globalCompositeOperation = 'destination-out';
    d.fillStyle = g;
    d.beginPath();
    d.arc(x, y, ERASER, 0, Math.PI * 2);
    d.fill();
    d.globalCompositeOperation = 'source-over';

    const now = Date.now();
    if (now - soundAt.current > SOUND_GAP_MS) {
      soundAt.current = now;
      polishSound();
    }
    hapticTick();
  };

  return (
    <SensoryStage
      kicker="OXIDADO"
      status={status}
      hint="Frota con el dedo o el ratón. Cuando brille, vuelve a empezar y frótala otra vez."
      onExit={onExit}
      stageStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={rub}
        onPointerMove={e => {
          if (e.buttons === 1 || e.pointerType === 'touch') rub(e);
        }}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
        aria-label="Moneda que limpiar frotando"
      />
    </SensoryStage>
  );
};
