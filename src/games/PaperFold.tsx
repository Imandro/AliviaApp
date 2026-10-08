import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SensoryStage, STAGE_HEIGHT } from './SensoryStage';
import { creaseSound } from '../utils/sounds';
import { hapticTick } from '../utils/haptics';

const PAPER_W = 244;
const PAPER_TOP = 16;
const SPAN = STAGE_HEIGHT - PAPER_TOP - 22;
const MIN_FOLD = 30;
const COMMIT_RATIO = 0.42;

/**
 * Posición horizontal de la hoja, centrada en el escenario.
 *
 * Estaba clavada en PAPER_X (22px desde la izquierda), así que en un escenario
 * ancho la hoja quedaba abandonada en el borde y el mensaje de "hoja agotada"
 * se centraba cientos de píxeles a su derecha. El offset cubre el pequeño
 * desvío de cada capa y el sangrado de la línea de pliegue.
 */
const paperLeft = (offset = 0): string =>
  `calc(50% - ${PAPER_W / 2}px + ${offset}px)`;

const sheet = (alpha: number): string =>
  `linear-gradient(180deg, rgba(252,250,242,${alpha}) 0%, rgba(238,233,218,${alpha}) 100%)`;

interface Layer {
  h: number;
  /** Pequeño desvío lateral, para que el grosor se vea real. */
  skew: number;
  tilt: number;
}

/**
 * Doblar papel.
 *
 * La hoja se pliega hacia ti arrastrando hacia abajo. El pliegue se queda y
 * el papel se vuelve un bloque más estrecho y más grueso. Cuando ya no cabe
 * otro pliegue, se desliza una hoja nueva. No hay manera correcta de
 * doblarla ni forma de hacerlo mal.
 */
export const PaperFold: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const dragY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [top, setTop] = useState(0);
  const [stackH, setStackH] = useState(0);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [foldSeed, setFoldSeed] = useState(0);
  const [status, setStatus] = useState('Arrastra la hoja hacia abajo');

  /** Alto del próximo pliegue: cabe en el papel libre y deja sitio al hueco. */
  const flapH = (() => {
    const free = SPAN - top - stackH;
    const min = Math.max(MIN_FOLD, stackH);
    if (free <= min) return 0;
    return min + (free - min) * (0.36 + ((foldSeed * 37) % 31) / 100);
  })();

  const crease = top + flapH;
  const canFold = flapH > 0;

  const commit = useCallback(() => {
    if (!canFold || pull < flapH * COMMIT_RATIO) {
      setPull(0);
      return;
    }
    setLayers(prev => [...prev, { h: flapH, skew: (Math.random() - 0.5) * 3, tilt: (Math.random() - 0.5) * 2.4 }]);
    setTop(crease);
    setStackH(flapH);
    setPull(0);
    setFoldSeed(s => s + 1);
    setStatus('Otro pliegue más abajo');
    creaseSound();
    hapticTick();
  }, [canFold, crease, flapH, pull]);

  // Los oyentes se registran una sola vez y leen del ref, en vez de
  // depender de `commit`: si no, se re-registrarían en cada pointermove.
  const live = useRef({ commit, flapH });
  live.current = { commit, flapH };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (dragY.current === null) return;
      setPull(Math.max(0, Math.min(live.current.flapH, e.clientY - dragY.current)));
    };
    const up = () => {
      if (dragY.current === null) return;
      dragY.current = null;
      live.current.commit();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  /** Al agotar el papel entra una hoja nueva, sin ruido ni modal. */
  const fresh = !canFold;
  const bodyTop = layers.length === 0 ? 0 : top + stackH;
  const progress = flapH > 0 ? Math.min(1, pull / flapH) : 0;

  return (
    <SensoryStage
      kicker="DOBLANDO"
      status={status}
      hint="Arrastra la hoja hacia abajo hasta que se pliegue. El doblez se queda marcado."
      onExit={onExit}
      stageStyle={{ padding: 0 }}
    >
      <div
        onPointerDown={e => {
          dragY.current = e.clientY;
        }}
        style={{
          position: 'absolute',
          inset: 0,
          perspective: 1000,
          perspectiveOrigin: '50% 0%',
          touchAction: 'none',
          cursor: 'grab',
        }}
      >
        {/* Cuerpo de la hoja: solo la parte que aún no está plegada. */}
        <div
          style={{
          position: 'absolute',
          left: paperLeft(),
          top: PAPER_TOP + bodyTop,
            width: PAPER_W,
            height: SPAN - bodyTop,
            background: sheet(0.96),
            borderRadius: '2px 2px 5px 5px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.36)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 18,
              right: 18,
              top: 16,
              height: 1,
              background: 'rgba(0,0,0,0.1)',
            }}
          />
        </div>

        {/* Bloque plegado: una hoja por pliegue, para que se vea el grosor. */}
        {layers.map((l, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: paperLeft(l.skew),
              top: PAPER_TOP + top + i * 1.4,
              width: PAPER_W,
              height: l.h,
              transform: `rotate(${l.tilt}deg)`,
              transformOrigin: '50% 100%',
              background: sheet(0.97 - i * 0.012),
              borderRadius: '2px',
              boxShadow: i === layers.length - 1 ? '0 8px 22px rgba(0,0,0,0.34)' : '0 1px 0 rgba(0,0,0,0.08)',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Solapa en movimiento. */}
        {canFold && (
          <>
            <div
              style={{
                position: 'absolute',
              left: paperLeft(),
              top: PAPER_TOP + top,
                width: PAPER_W,
                height: flapH,
                transformOrigin: '50% 100%',
                transform: `rotateX(${-progress * 172}deg)`,
                backfaceVisibility: 'hidden',
                background: sheet(1),
                borderRadius: '2px 2px 0 0',
                boxShadow: progress > 0.05 ? `0 ${6 + progress * 26}px ${14 + progress * 30}px rgba(0,0,0,${0.3 + progress * 0.2})` : 'none',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  right: 14,
                  top: 12,
                  height: 1,
                  background: 'rgba(0,0,0,0.1)',
                }}
              />
            </div>

            {/* Línea donde toca plegar. */}
            <div
              style={{
                position: 'absolute',
                left: paperLeft(-8),
                width: PAPER_W + 16,
                top: PAPER_TOP + crease,
                borderTop: '2px dashed rgba(var(--accent-lavender-rgb), 0.75)',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          </>
        )}

        {fresh && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 24,
            }}
          >
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              La hoja está toda plegada.
            </p>
            <button
              className="cm-press"
              onClick={() => {
                setLayers([]);
                setTop(0);
                setStackH(0);
                setPull(0);
                setFoldSeed(s => s + 7);
                setStatus('Hoja nueva. Arrastra hacia abajo');
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '999px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-gold))',
                color: '#0c1810',
                fontFamily: 'var(--font-title)',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Sacar otra hoja
            </button>
          </div>
        )}
      </div>
    </SensoryStage>
  );
};
