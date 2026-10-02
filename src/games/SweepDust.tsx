import React, { useEffect, useRef, useState } from 'react';
import { SensoryStage, fitCanvas, toStagePoint } from './SensoryStage';
import { sweepSound } from '../utils/sounds';
import { hapticTick } from '../utils/haptics';

const TARGET_COUNT = 260;
const KEEP_ABOVE = 150;
const BROOM_R = 46;
const SOUND_GAP_MS = 150;

const MOTE_COLORS = ['#e6dcc4', '#d9c9a6', '#cfc3ae', '#f0e7d2'];

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  a: number;
}

/**
 * Barrer polvo de la mesa.
 *
 * El puntero hace de escoba: empuja las motas y las que caen por el borde
 * desaparecen. Al rato cae polvo nuevo, así que siempre hay algo que
 * limpiar. No queda contador de "cuánto has barrido".
 */
export const SweepDust: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motes = useRef<Mote[]>([]);
  const broom = useRef({ x: -999, y: -999, px: -999, py: -999, on: false });
  const soundAt = useRef(0);
  const statusRef = useRef('');
  const [status, setStatus] = useState('Pasa el dedo por la mesa');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let last = performance.now();

    const spawn = (w: number, h: number, near: boolean): Mote => ({
      x: Math.random() * w,
      y: near ? h + 6 : Math.random() * h,
      vx: (Math.random() - 0.5) * 6,
      vy: near ? -(10 + Math.random() * 26) : (Math.random() - 0.5) * 4,
      r: 0.7 + Math.random() * 2.2,
      c: MOTE_COLORS[Math.floor(Math.random() * MOTE_COLORS.length)],
      a: 0.18 + Math.random() * 0.5,
    });

    const frame = (t: number) => {
      const dt = Math.min(0.032, (t - last) / 1000);
      last = t;
      const size = fitCanvas(canvas);
      if (!size) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const { ctx, w, h } = size;

      if (motes.current.length === 0) {
        motes.current = Array.from({ length: TARGET_COUNT }, () => spawn(w, h, false));
      }
      // Reponer despacio: el polvo vuelve a caer mientras limpias.
      const live = motes.current.filter(m => m.y < h + 14);
      if (live.length < KEEP_ABOVE) {
        const missing = Math.min(6, KEEP_ABOVE - live.length);
        for (let i = 0; i < missing; i += 1) live.push(spawn(w, h, true));
      }
      motes.current = live;

      const b = broom.current;
      const bdx = b.on ? b.x - b.px : 0;
      const bdy = b.on ? b.y - b.py : 0;
      const push = Math.hypot(bdx, bdy);
      const dirX = push > 0.4 ? bdx / push : 0;
      const dirY = push > 0.4 ? bdy / push : 0;
      const force = Math.min(46, push * 5.5);

      // Mesa de madera.
      const wood = ctx.createLinearGradient(0, 0, 0, h);
      wood.addColorStop(0, 'rgba(120, 96, 62, 0.16)');
      wood.addColorStop(1, 'rgba(74, 58, 36, 0.28)');
      ctx.fillStyle = wood;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < motes.current.length; i += 1) {
        const m = motes.current[i];
        const dx = m.x - b.x;
        const dy = m.y - b.y;
        const dist = Math.hypot(dx, dy);

        if (b.on && dist < BROOM_R) {
          const falloff = 1 - dist / BROOM_R;
          m.vx += (dirX * force + (dx / (dist || 1)) * 14) * falloff;
          m.vy += (dirY * force + (dy / (dist || 1)) * 14) * falloff;
        }

        m.vx *= 0.9;
        m.vy *= 0.9;
        m.x += m.vx * dt * 60;
        m.y += m.vy * dt * 60;

        if (m.y < 0) {
          m.y = 0;
          m.vy = Math.abs(m.vy) * 0.3;
        }

        ctx.globalAlpha = m.a;
        ctx.fillStyle = m.c;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Ceso de la escoba: un halo claro donde estás empujando.
      if (b.on) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, BROOM_R);
        g.addColorStop(0, 'rgba(255,255,255,0.10)');
        g.addColorStop(0.7, 'rgba(255,255,255,0.04)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BROOM_R, 0, Math.PI * 2);
        ctx.fill();
      }

      b.px = b.x;
      b.py = b.y;
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const move = (e: React.PointerEvent<HTMLCanvasElement>, down: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = toStagePoint(canvas, e.clientX, e.clientY);
    const b = broom.current;
    if (!b.on) {
      b.px = x;
      b.py = y;
    }
    b.x = x;
    b.y = y;
    b.on = down || e.pointerType === 'mouse';

    if (b.on) {
      const now = Date.now();
      if (now - soundAt.current > SOUND_GAP_MS) {
        soundAt.current = now;
        sweepSound();
        hapticTick();
        if (statusRef.current !== 'sweep') {
          statusRef.current = 'sweep';
          setStatus('Sigue barriendo');
        }
      }
    }
  };

  return (
    <SensoryStage
      kicker="BARRENDO"
      status={status}
      hint="Arrastra el puntero como si fuera una escoba. El polvo vuelve a caer solo."
      onExit={onExit}
      stageStyle={{ padding: 0 }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e, true);
        }}
        onPointerMove={e => move(e, false)}
        onPointerUp={e => {
          broom.current.on = false;
          move(e, false);
        }}
        onPointerLeave={() => {
          broom.current.on = false;
        }}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
        aria-label="Mesa con polvo que barrer"
      />
    </SensoryStage>
  );
};
