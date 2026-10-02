import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SensoryStage, STAGE_HEIGHT, TINTS, toStagePoint } from './SensoryStage';
import { placeSound } from '../utils/sounds';
import { hapticTick } from '../utils/haptics';

const TOKEN = 34;
const TRAY_H = 66;
const TRAY_TOP = STAGE_HEIGHT - TRAY_H - 12;
const PER_TRAY = 4;
const TRAYS = 3;

const SHAPES = ['circle', 'square', 'triangle'] as const;
type Shape = (typeof SHAPES)[number];

interface Piece {
  id: number;
  shape: Shape;
  tint: number;
  /** Coordenadas absolutas dentro del escenario. */
  x: number;
  y: number;
  /** Bandeja donde está, o -1 si sigue en la mesa. */
  tray: number;
  slot: number;
}

const shapeStyle = (shape: Shape, color: string): React.CSSProperties => {
  if (shape === 'circle') return { borderRadius: '50%', background: color };
  if (shape === 'square') return { borderRadius: 5, background: color };
  // clipPath en vez de bordes: la ficha conserva su caja y el brillo se alinea.
  return {
    background: color,
    clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  };
};

/**
 * Repartir fichas en bandejas.
 *
 * Cualquier ficha vale en cualquier bandeja: no hay forma correcta, ni
 * puntos, ni castigo. Cuando las tres bandejas se llenan, se vacían solas
 * con un parpadeo y vuelven a pedir fichas. Solo hay que mover cosas.
 */
export const SortTokens: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [size, setSize] = useState({ w: 320, h: STAGE_HEIGHT });
  const [status, setStatus] = useState('Arrastra las fichas a una bandeja');

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const read = () => {
      const r = stage.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const feed = useCallback(() => {
    setPieces(prev => {
      if (prev.filter(p => p.tray < 0).length >= 5) return prev;
      const id = nextId.current;
      nextId.current += 1;
      return [
        ...prev,
        {
          id,
          shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
          tint: Math.floor(Math.random() * TINTS.length),
          x: 18 + Math.random() * Math.max(10, size.w - TOKEN - 36),
          y: 24 + Math.random() * Math.max(10, TRAY_TOP - TOKEN - 40),
          tray: -1,
          slot: -1,
        },
      ];
    });
  }, [size.w]);

  useEffect(() => {
    const t = window.setTimeout(feed, 400);
    return () => window.clearTimeout(t);
  }, [feed, pieces]);

  const trayAt = useCallback(
    (x: number, y: number): number => {
      if (y < TRAY_TOP) return -1;
      const gap = 8;
      const w = (size.w - gap * (TRAYS - 1)) / TRAYS;
      const i = Math.floor((x - 6) / (w + gap));
      return i >= 0 && i < TRAYS ? i : -1;
    },
    [size.w],
  );

  const grab = (e: React.PointerEvent<HTMLDivElement>, id: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const stage = stageRef.current;
    if (!stage) return;
    const { x, y } = toStagePoint(stage, e.clientX, e.clientY);
    const p = pieces.find(q => q.id === id);
    if (!p) return;
    drag.current = { id, dx: x - p.x, dy: y - p.y };
    setPieces(prev => prev.map(q => (q.id === id ? { ...q, tray: -1, slot: -1 } : q)));
  };

  const dragTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const stage = stageRef.current;
    if (!d || !stage) return;
    const { x, y } = toStagePoint(stage, e.clientX, e.clientY);
    setPieces(prev =>
      prev.map(q =>
        q.id === d.id
          ? {
              ...q,
              x: Math.max(0, Math.min(size.w - TOKEN, x - d.dx)),
              y: Math.max(0, Math.min(size.h - TOKEN, y - d.dy)),
            }
          : q,
      ),
    );
  };

  const release = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const stage = stageRef.current;
    if (!d || !stage) return;
    drag.current = null;
    const { x, y } = toStagePoint(stage, e.clientX, e.clientY);
    const tray = trayAt(x, y);

    setPieces(prev => {
      const next = prev.map(q => {
        if (q.id !== d.id) return q;
        if (tray < 0) return { ...q, x, y };
        const used = prev.filter(p => p.tray === tray).length;
        if (used >= PER_TRAY) return { ...q, x, y };
        return { ...q, tray, slot: used, x, y };
      });

      const full = Array.from({ length: TRAYS }, (_, i) => next.filter(p => p.tray === i).length >= PER_TRAY);
      if (full.some(Boolean)) {
        placeSound();
        hapticTick();
        setStatus('Sigue repartiendo');
        if (full.every(Boolean)) setStatus('Se vacían solas. Vienen más fichas');
      }
      return next;
    });
  };

  /** Cuando las tres bandejas están llenas, se vacían y el ciclo continúa. */
  useEffect(() => {
    if (pieces.length === 0) return;
    const counts = Array.from({ length: TRAYS }, (_, i) => pieces.filter(p => p.tray === i).length);
    if (!counts.every(c => c >= PER_TRAY)) return;
    const t = window.setTimeout(() => setPieces([]), 700);
    return () => window.clearTimeout(t);
  }, [pieces]);

  const gap = 8;
  const trayW = (size.w - gap * (TRAYS - 1)) / TRAYS;

  return (
    <SensoryStage
      kicker="ORDENANDO"
      status={status}
      hint="Arrastra cada ficha a la bandeja que quieras. Todas valen en todas."
      onExit={onExit}
      stageStyle={{ padding: 0 }}
    >
      <div
        ref={stageRef}
        onPointerMove={dragTo}
        onPointerUp={release}
        onPointerCancel={release}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
      >
        {/* Bandejas. */}
        {Array.from({ length: TRAYS }, (_, i) => {
          const count = pieces.filter(p => p.tray === i).length;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 6 + i * (trayW + gap),
                top: TRAY_TOP,
                width: trayW,
                height: TRAY_H,
                borderRadius: '14px 14px 18px 18px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.24) 100%)',
                border: '1px solid var(--border-color)',
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.28)',
              }}
            >
              {count >= PER_TRAY && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    background: 'rgba(255,255,255,0.1)',
                    animation: 'trayIn 400ms ease-out',
                  }}
                />
              )}
            </div>
          );
        })}

        {pieces.map(p => {
          const tint = TINTS[p.tint];
          const held = drag.current?.id === p.id;
          const inTray = p.tray >= 0;
          return (
            <div
              key={p.id}
              onPointerDown={e => grab(e, p.id)}
              className="cm-press"
              role="button"
              aria-label="Ficha arrastrable"
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: TOKEN,
                height: TOKEN,
                cursor: 'grab',
                zIndex: held ? 5 : inTray ? 1 : 3,
                filter: held ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' : 'drop-shadow(0 3px 7px rgba(0,0,0,0.36))',
                transform: `scale(${held ? 1.14 : 1}) rotate(${held ? 0 : (p.slot % 2 ? 4 : -3)}deg)`,
                transition: held ? 'none' : 'transform 0.34s cubic-bezier(0.34,1.56,0.64,1), filter 0.2s ease',
                animation: inTray ? `trayIn 300ms cubic-bezier(0.34,1.56,0.64,1)` : 'none',
                ...shapeStyle(p.shape, tint.color),
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '30%',
                  top: '32%',
                  width: '26%',
                  height: '26%',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.5)',
                }}
              />
            </div>
          );
        })}
      </div>
    </SensoryStage>
  );
};
