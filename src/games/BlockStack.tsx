import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SensoryStage, STAGE_HEIGHT, TINTS, toStagePoint } from './SensoryStage';
import { woodSound } from '../utils/sounds';
import { hapticTick } from '../utils/haptics';

const BASE = 14;
const BLOCK_W = 116;
const BLOCK_H = 22;
const GAP = 1.5;
/** Al apilar, el error de posición e inclinación se reduce: la torre endereza sola. */
const SETTLE = 0.86;
const MIN_BLOCK_H = 3;
const MAX_BLOCKS = 90;

interface Block {
  id: number;
  /** Desviación horizontal respecto al centro, en px. */
  dx: number;
  /** Inclinación en grados. */
  tilt: number;
  tint: number;
  width: number;
}

/**
 * Apila tablitas.
 *
 * Un bloque sigue al dedo mientras arrastras y cae al soltar. Nunca hay
 * derrumbe: la torre endereza sola y, si se hace muy alta, los bloques se
 * comprimen para caber enteros. Al llegar al tope, se van cayendo por la
 * base y la torre sigue hacia arriba.
 */
export const BlockStack: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [hover, setHover] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('Abre la mano para soltar la primera');

  const hoverRef = useRef(0);
  const draggingRef = useRef(false);

  const aim = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const { x } = toStagePoint(stage, e.clientX, e.clientY);
    /* El alcance iba ligado al ancho del escenario: con un contenedor de
       1100px permitía ±470px mientras la base mide 176px, y los bloques se
       apilaban flotando fuera de ella. El tope de 200px no afecta al móvil
       (allí el escenario da ~172px de alcance). */
    const max = Math.min(stage.getBoundingClientRect().width / 2 - BLOCK_W / 2 - 10, 200);
    const next = Math.max(-max, Math.min(max, x - stage.getBoundingClientRect().width / 2));
    if (Math.abs(next - hoverRef.current) < 0.5) return;
    hoverRef.current = next;
    setHover(next);
  }, []);

  const drop = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    setBlocks(prev => {
      const next: Block[] = [
        ...prev,
        {
          id: nextId.current,
          dx: hoverRef.current,
          tilt: (Math.random() - 0.5) * 5,
          tint: Math.floor(Math.random() * TINTS.length),
          width: BLOCK_W * (0.9 + Math.random() * 0.2),
        },
      ];
      nextId.current += 1;
      return next.length > MAX_BLOCKS ? next.slice(next.length - MAX_BLOCKS) : next;
    });
    woodSound();
    hapticTick();
    setStatus('Sigue apilando');
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setBlocks(prev => {
        let touched = false;
        const next = prev.map(b => {
          const ndx = b.dx * SETTLE;
          const ntilt = b.tilt * SETTLE;
          if (Math.abs(ndx - b.dx) < 0.04 && Math.abs(ntilt - b.tilt) < 0.04) return b;
          touched = true;
          return { ...b, dx: ndx, tilt: ntilt };
        });
        return touched ? next : prev;
      });
    }, 90);
    return () => window.clearInterval(tick);
  }, []);

  const visible = STAGE_HEIGHT - BASE;
  const slot = Math.max(MIN_BLOCK_H, Math.min(BLOCK_H + GAP, visible / (blocks.length + 1)));
  const blockH = Math.max(2, slot - GAP);

  return (
    <SensoryStage
      kicker="APILANDO"
      status={status}
      hint="Arrastra para apuntar y suelta. La pila endereza sola: no hay forma de perderla."
      onExit={onExit}
    >
      <div
        ref={stageRef}
        onPointerDown={e => {
          draggingRef.current = true;
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          aim(e);
        }}
        onPointerMove={e => {
          if (draggingRef.current || e.pointerType === 'mouse') aim(e);
        }}
        onPointerUp={drop}
        onPointerCancel={drop}
        style={{ position: 'absolute', inset: 0, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: BASE - 8,
            width: 176,
            height: 5,
            borderRadius: '999px',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.07)',
          }}
        />

        {blocks.map((b, i) => {
          const tint = TINTS[b.tint];
          return (
            <div
              key={b.id}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: BASE + i * slot,
                width: b.width,
                height: blockH,
                borderRadius: Math.min(5, blockH / 2),
                transform: `translateX(calc(-50% + ${b.dx}px)) rotate(${b.tilt}deg)`,
                background: `linear-gradient(180deg, ${tint.color} 0%, ${tint.soft} 100%)`,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 2px 7px rgba(0,0,0,0.28)',
                opacity: Math.min(1, 0.35 + i / 5),
                pointerEvents: 'none',
              }}
            >
              {blockH > 9 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 9,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 13,
                    height: 1.5,
                    borderRadius: 2,
                    background: 'rgba(0,0,0,0.2)',
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Bloque en el aire: sigue al dedo y se coloca sobre la torre. */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: BASE + blocks.length * slot,
            width: BLOCK_W,
            height: Math.max(10, Math.min(BLOCK_H, blockH)),
            borderRadius: 6,
            transform: `translateX(calc(-50% + ${hover}px))`,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.08) 100%)',
            border: '1px dashed rgba(255,255,255,0.3)',
            opacity: dragging ? 1 : 0.45,
            pointerEvents: 'none',
            transition: dragging ? 'none' : 'transform 0.55s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
    </SensoryStage>
  );
};
