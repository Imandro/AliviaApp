import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SensoryStage, STAGE_HEIGHT, TINTS, toStagePoint } from './SensoryStage';
import { dartSound } from '../utils/sounds';
import { hapticTick } from '../utils/haptics';

const MAX_DARTS = 14;
const BOARD_W = 216;
const BOARD_H = 216;
/** Anillo exterior del corcho, como fracción de la mitad del lado. */
const RADIUS = BOARD_W / 2;

interface Dart {
  id: number;
  x: number;
  y: number;
  tint: number;
  /** Fase de la animación: 'volando' | 'clavado'. */
  phase: 'volando' | 'clavado';
  /** Ángulo con el que se clava: siempre apuntando al centro. */
  angle: number;
}

/**
 * Dardos a un corcho fijo.
 *
 * Toca el corcho y el dardo vuela desde abajo, se clava y tiembla. No hay
 * puntos ni dianas que premien: fallar también es válido. Los dardos viejos
 * se desvanecen solos para que el corcho nunca se llene.
 */
export const Darts: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const flyTimers = useRef<number[]>([]);
  const [darts, setDarts] = useState<Dart[]>([]);
  const [status, setStatus] = useState('Toca el corcho para lanzar');

  const throwAt = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const { x, y } = toStagePoint(stage, e.clientX, e.clientY);
    const boardCx = rect.width / 2;
    const boardCy = rect.height / 2 - 16;
    const angle = (Math.atan2(boardCy - y, boardCx - x) * 180) / Math.PI;

    const id = nextId.current;
    nextId.current += 1;
    const tint = Math.floor(Math.random() * TINTS.length);

    setDarts(prev =>
      [...prev, { id, x, y, tint, phase: 'volando' as const, angle }].slice(-MAX_DARTS),
    );
    setStatus('Lanzando');

    const t = window.setTimeout(() => {
      setDarts(prev => prev.map(d => (d.id === id ? { ...d, phase: 'clavado' } : d)));
      dartSound();
      hapticTick();
      setStatus('Otra vez si quieres');
    }, 260);
    flyTimers.current.push(t);
  }, []);

  useEffect(
    () => () => {
      flyTimers.current.forEach(window.clearTimeout);
      flyTimers.current = [];
    },
    [],
  );

  const rings = [
    { f: 1, color: 'rgba(var(--accent-rose-rgb), 0.30)' },
    { f: 0.72, color: 'rgba(var(--accent-warm-rgb), 0.34)' },
    { f: 0.44, color: 'rgba(var(--accent-sage-rgb), 0.36)' },
    { f: 0.17, color: 'rgba(var(--accent-gold-rgb), 0.5)' },
  ];

  return (
    <SensoryStage
      kicker="TIRANDO"
      status={status}
      hint="Toca donde quieras dentro o fuera del corcho. Da igual dónde caiga: no hay puntos."
      onExit={onExit}
      stageStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        ref={stageRef}
        onPointerDown={throwAt}
        style={{ position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'none' }}
      >
        {/* Corcho. */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: STAGE_HEIGHT / 2 - 16,
            width: BOARD_W,
            height: BOARD_H,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 34% 28%, #c9a878 0%, #9c7c4e 52%, #6b5432 100%)',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), 0 12px 30px rgba(0,0,0,0.4)',
            border: '3px solid rgba(0,0,0,0.28)',
          }}
        >
          {rings.map(ring => (
            <div
              key={ring.f}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: RADIUS * 2 * ring.f,
                height: RADIUS * 2 * ring.f,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: ring.color,
              }}
            />
          ))}
          {/* Fibra del corcho. */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              opacity: 0.16,
              backgroundImage:
                'repeating-conic-gradient(from 0deg, rgba(0,0,0,0.5) 0deg 1deg, rgba(0,0,0,0) 1deg 3deg)',
            }}
          />
        </div>

        {darts.map(d => {
          const tint = TINTS[d.tint];
          // El dardo se dibuja apuntando hacia abajo-derecha desde su punto de entrada.
          const tf = `translate(${d.x}px, ${d.y}px) rotate(${d.angle - 90}deg)`;
          return (
            <div
              key={d.id}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                pointerEvents: 'none',
                ['--dart-transform' as string]: tf,
                transform: d.phase === 'volando' ? 'translate(0px, 190px) scale(0.7)' : tf,
                opacity: d.phase === 'volando' ? 0 : 1,
                animation:
                  d.phase === 'volando'
                    ? 'dartHit 260ms cubic-bezier(0.4,0,0.6,1) forwards'
                    : 'dartWobble 420ms cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              <div style={{ width: 3, height: 30, marginLeft: -1.5, borderRadius: 2, background: tint.color }} />
              <div
                style={{
                  position: 'absolute',
                  top: -3,
                  left: -4,
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: tint.color,
                  boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: -7,
                  width: 3,
                  height: 13,
                  borderRadius: '2px 2px 0 0',
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
