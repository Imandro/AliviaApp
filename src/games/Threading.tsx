import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SensoryStage, TINTS } from './SensoryStage';
import { beadSound } from '../utils/sounds';
import { hapticTick } from '../utils/haptics';

const BEAD_R = 13;
const LOOSE_MAX = 6;
const MAX_ON_THREAD = 20;
const TABLE_TOP = 96;

interface Bead {
  id: number;
  tint: number;
  /** Posición en el hilo; -1 si sigue suelta sobre la mesa. */
  slot: number;
  /** Posición suelta, en porcentaje del área de la mesa. */
  x: number;
  y: number;
}

/**
 * Enhebrar cuentas.
 *
 * Las cuentas van apareciendo solas sobre la mesa, cada vez más despacio
 * cuanto más lleno está. Tocas una y sube al hilo; el hilo se afloja con el
 * peso de las que ya lleva. Al llegar a veinte, la más antigua se suelta y
 * vuelve a la mesa. No hay cuenta correcta ni hilo que se salga.
 */
export const Threading: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const [beads, setBeads] = useState<Bead[]>([]);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(224);
  const [status, setStatus] = useState('Las cuentas caen solas, tócalas para enhebrarlas');

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const read = () => {
      const rect = stage.getBoundingClientRect();
      setWidth(rect.width);
      setHeight(Math.max(60, rect.height - TABLE_TOP));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const spawn = useCallback(() => {
    setBeads(prev => {
      if (prev.filter(b => b.slot < 0).length >= LOOSE_MAX) return prev;
      const id = nextId.current;
      nextId.current += 1;
      return [
        ...prev,
        {
          id,
          tint: Math.floor(Math.random() * TINTS.length),
          slot: -1,
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 78,
        },
      ];
    });
  }, []);

  // Una cuenta nueva cada vez que la mesa se queda más despejada. Se rearma
  // sola en cada cambio, así que no queda ningún temporizador huérfano.
  useEffect(() => {
    const loose = beads.filter(b => b.slot < 0).length;
    if (loose >= LOOSE_MAX) return;
    const t = window.setTimeout(spawn, 600 + loose * 900);
    return () => window.clearTimeout(t);
  }, [beads, spawn]);

  const pick = (id: number) => {
    const target = beads.find(b => b.id === id);
    if (!target || target.slot >= 0) return;

    setBeads(prev => {
      const nextSlot = prev.reduce((max, b) => (b.slot > max ? b.slot : max), -1) + 1;
      let out = prev.map(b => (b.id === id ? { ...b, slot: nextSlot } : b));
      if (out.filter(b => b.slot >= 0).length <= MAX_ON_THREAD) return out;

      // Se suelta la más antigua y el resto corre un puesto.
      const oldest = out.reduce((a, b) => (a.slot <= b.slot ? a : b));
      out = out.map(b =>
        b.id === oldest.id
          ? { ...b, slot: -1, x: 10 + Math.random() * 80, y: 10 + Math.random() * 78 }
          : b.slot >= 0
            ? { ...b, slot: b.slot - 1 }
            : b,
      );
      return out;
    });

    beadSound();
    hapticTick();
    setStatus('Sigue enhebrando');
  };

  const strung = beads.filter(b => b.slot >= 0).sort((a, b) => a.slot - b.slot);
  const span = Math.max(60, width * 0.76);
  const left = (width - span) / 2;
  const right = left + span;
  const sag = Math.min(92, 10 + strung.length * 3.6);
  const ctrlY = TABLE_TOP - 34 + sag * 2;

  /** Punto de la cuadrática de Bézier, evaluado en el centro de la cuenta. */
  const onThread = (slot: number) => {
    const t = (slot + 0.5) / Math.max(1, strung.length);
    const u = 1 - t;
    return {
      x: u * u * left + 2 * u * t * (width / 2) + t * t * right,
      y: u * u * (TABLE_TOP - 34) + 2 * u * t * ctrlY + t * t * (TABLE_TOP - 34),
    };
  };

  return (
    <SensoryStage
      kicker="ENHEBRANDO"
      status={status}
      hint="Toca las cuentas sueltas para subirlas al hilo. El hilo se afloja con el peso."
      onExit={onExit}
    >
      <div ref={stageRef} style={{ position: 'absolute', inset: 0, touchAction: 'none' }}>
        {/* Mesa. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: TABLE_TOP,
            bottom: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.3) 100%)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        />

        {/* Hilo, con los dos dedos que lo tensan. */}
        <svg
          width={width}
          height={TABLE_TOP + 8}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
        >
          <path
            d={`M ${left} ${TABLE_TOP - 34} Q ${width / 2} ${ctrlY} ${right} ${TABLE_TOP - 34}`}
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <circle cx={left} cy={TABLE_TOP - 34} r={4} fill="rgba(255,255,255,0.2)" />
          <circle cx={right} cy={TABLE_TOP - 34} r={4} fill="rgba(255,255,255,0.2)" />
        </svg>

        {beads.map(b => {
          const tint = TINTS[b.tint];
          const pos = b.slot >= 0 ? onThread(b.slot) : { x: (b.x / 100) * width, y: TABLE_TOP + (b.y / 100) * height };
          return (
            <button
              key={b.id}
              onPointerDown={() => pick(b.id)}
              aria-label={b.slot < 0 ? 'Enhebrar esta cuenta' : 'Cuenta ya enhebrada'}
              className="cm-press"
              style={{
                position: 'absolute',
                left: pos.x - BEAD_R,
                top: pos.y - BEAD_R,
                width: BEAD_R * 2,
                height: BEAD_R * 2,
                padding: 0,
                borderRadius: '50%',
                border: '1px solid rgba(0,0,0,0.25)',
                cursor: b.slot < 0 ? 'pointer' : 'default',
                background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.6) 0%, ${tint.color} 48%, ${tint.soft} 100%)`,
                boxShadow:
                  'inset 0 -3px 7px rgba(0,0,0,0.26), 0 3px 9px rgba(0,0,0,0.35)' +
                  (b.slot < 0 ? ', 0 0 0 5px rgba(255,255,255,0.045)' : ''),
                opacity: b.slot < 0 ? 0.9 : 1,
                animation: b.slot < 0 ? 'beadIn 340ms cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                transition: 'left 0.44s cubic-bezier(0.34,1.56,0.64,1), top 0.44s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 3,
                  bottom: 3,
                  width: BEAD_R * 0.4,
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.15)',
                  borderRadius: 2,
                }}
              />
            </button>
          );
        })}

        {beads.length === 0 && (
          <p
            style={{
              position: 'absolute',
              left: 20,
              right: 20,
              bottom: 20,
              margin: 0,
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontWeight: 600,
              pointerEvents: 'none',
            }}
          >
            Las cuentas van cayendo solas.
          </p>
        )}
      </div>
    </SensoryStage>
  );
};
