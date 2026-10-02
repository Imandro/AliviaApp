import React, { useCallback, useState } from 'react';
import { SensoryStage } from './SensoryStage';
import { marimbaNote } from '../utils/sounds';
import { hapticTick } from '../utils/haptics';

/** Escala pentatónica de Re mayor: no tiene semitonos, así que nada suena mal. */
const SCALE = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99];

interface Bar {
  id: string;
  note: number;
  /** Contador de golpes. Cambiarlo remonta el halo y reinicia la animación. */
  pulse: number;
}

/**
 * Marimba de ocho barras.
 *
 * Sin melodías obligadas, sin turnos, sin fallos. Tocas la barra que quieras,
 * en el orden que quieras, tantas veces como quieras. El sonido es lo
 * único que pasa.
 */
export const Marimba: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [bars, setBars] = useState<Bar[]>(() => SCALE.map((note, i) => ({ id: `b${i}`, note, pulse: 0 })));
  const [status, setStatus] = useState('Toca una barra');

  const strike = useCallback((id: string) => {
    setBars(prev => prev.map(b => (b.id === id ? { ...b, pulse: b.pulse + 1 } : b)));
    setStatus('Sigue tocando');
  }, []);

  return (
    <SensoryStage
      kicker="MARIMBA"
      status={status}
      hint="Toca las barras como quieras. No hay melodía que recordar ni turnos que fallar."
      onExit={onExit}
      stageStyle={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 14px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.34) 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 5, width: '100%', height: 196 }}>
        {bars.map(bar => (
          <button
            key={bar.id}
            onPointerDown={() => {
              strike(bar.id);
              marimbaNote(bar.note);
              hapticTick();
            }}
            className="cm-press"
            aria-label={`Barra ${Number(bar.id.slice(1)) + 1}`}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              padding: 0,
              cursor: 'pointer',
              border: '1px solid rgba(0,0,0,0.3)',
              borderRadius: '7px 7px 4px 4px',
              background: 'linear-gradient(180deg, #d3ab72 0%, #a8814c 28%, #6d4f2c 100%)',
              boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.22)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: 12,
            }}
          >
            <div
              style={{
                width: '58%',
                height: 1.5,
                borderRadius: 2,
                background: 'rgba(0,0,0,0.22)',
                pointerEvents: 'none',
              }}
            />
            {bar.pulse > 0 && (
              <div
                key={bar.pulse}
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'linear-gradient(180deg, rgba(255,250,232,0.95) 0%, rgba(255,246,220,0.1) 72%)',
                  animation: 'barGlow 620ms cubic-bezier(0.16,1,0.3,1) forwards',
                }}
              />
            )}
          </button>
        ))}
      </div>
    </SensoryStage>
  );
};
