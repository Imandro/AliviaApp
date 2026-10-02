import React from 'react';
import { LogOut } from 'lucide-react';

export const STAGE_HEIGHT = 320;

const panel: React.CSSProperties = {
  padding: '14px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
};

const kickerStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 800,
  letterSpacing: '0.18em',
  color: 'var(--text-muted)',
};

const stage: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: STAGE_HEIGHT,
  borderRadius: '24px',
  border: '1px solid var(--border-color)',
  background: 'rgba(0,0,0,0.14)',
  overflow: 'hidden',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const exitBtn: React.CSSProperties = {
  flexShrink: 0,
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  border: '1px solid var(--border-color)',
  background: 'rgba(0,0,0,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const hintStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: '11.5px',
  lineHeight: 1.55,
  fontWeight: 600,
  color: 'var(--text-muted)',
  margin: 0,
};

interface SensoryStageProps {
  kicker: string;
  /** Frase corta que sustituye al marcador: nunca hay puntuación. */
  status: string;
  hint: string;
  onExit: () => void;
  children: React.ReactNode;
  /** Se aplica al contenedor del área jugable. */
  stageStyle?: React.CSSProperties;
}

/**
 * Cascarón común de los juegos sensoriales.
 *
 * Deliberadamente no hay marcador, estrellas, niveles, botón de reinicio ni
 * tarjeta de "terminaste". El juego no acaba nunca: solo se sale.
 */
export const SensoryStage: React.FC<SensoryStageProps> = ({
  kicker,
  status,
  hint,
  onExit,
  children,
  stageStyle,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div className="glass-card" style={panel}>
      <div style={{ minWidth: 0 }}>
        <div style={kickerStyle}>{kicker}</div>
        <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{status}</div>
      </div>
      <button className="cm-press" style={exitBtn} onClick={onExit} aria-label="Salir del juego">
        <LogOut size={16} color="var(--text-secondary)" />
      </button>
    </div>

    <div style={{ ...stage, ...stageStyle }}>{children}</div>

    <p style={hintStyle}>{hint}</p>
  </div>
);

/** Paleta de acentos para dar variedad visual sin salirse del sistema de diseño. */
export const TINTS: { color: string; soft: string }[] = [
  { color: 'var(--accent-lavender)', soft: 'rgba(var(--accent-lavender-rgb), 0.22)' },
  { color: 'var(--accent-sage)', soft: 'rgba(var(--accent-sage-rgb), 0.22)' },
  { color: 'var(--accent-warm)', soft: 'rgba(var(--accent-warm-rgb), 0.22)' },
  { color: 'var(--accent-gold)', soft: 'rgba(var(--accent-gold-rgb), 0.22)' },
  { color: 'var(--accent-rose)', soft: 'rgba(var(--accent-rose-rgb), 0.22)' },
];

/** Convierte coordenadas de pantalla a coordenadas del escenario (píxeles CSS). */
export const toStagePoint = (
  stage: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } => {
  const rect = stage.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
};

export interface StageSize {
  ctx: CanvasRenderingContext2D;
  /** Ancho y alto en píxeles lógicos, no en píxeles de buffer. */
  w: number;
  h: number;
}

/** Ajusta el buffer del canvas al tamaño en pantalla para que no se vea pixeleado. */
export const fitCanvas = (canvas: HTMLCanvasElement): StageSize | null => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
};
