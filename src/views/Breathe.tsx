import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, HelpCircle } from 'lucide-react';
import { CalmaAudio } from '../utils/audioSynth';

type BreathMode = 'box' | 'relax' | 'coherent';
type BreathPhase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

interface PhaseTiming {
  label: string;
  action: string;
  scale: number;
  bg: string;
  circleColor: string;
}

const MODE_TIMINGS: Record<BreathMode, { inhale: number; holdIn: number; exhale: number; holdOut: number }> = {
  box: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
  relax: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },
  coherent: { inhale: 5, holdIn: 0, exhale: 5, holdOut: 0 },
};

export const Breathe: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [mode, setMode] = useState<BreathMode>('box');
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [secondsLeft, setSecondsLeft] = useState<number>(4);

  const [playOcean, setPlayOcean] = useState<boolean>(false);
  const [volOcean, setVolOcean] = useState<number>(0.5);
  const [playBrown, setPlayBrown] = useState<boolean>(false);
  const [volBrown, setVolBrown] = useState<number>(0.3);
  const [playBinaural, setPlayBinaural] = useState<boolean>(false);
  const [volBinaural, setVolBinaural] = useState<number>(0.4);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<BreathPhase>(phase);
  phaseRef.current = phase;

  useEffect(() => {
    return () => {
      CalmaAudio.stopAll();
    };
  }, []);

  useEffect(() => {
    if (playOcean) CalmaAudio.startOceanWaves(volOcean);
    else CalmaAudio.stopOceanWaves();
  }, [playOcean, volOcean]);

  useEffect(() => {
    if (playBrown) CalmaAudio.startBrownNoise(volBrown);
    else CalmaAudio.stopBrownNoise();
  }, [playBrown, volBrown]);

  useEffect(() => {
    if (playBinaural) CalmaAudio.startBinauralBeats(volBinaural);
    else CalmaAudio.stopBinauralBeats();
  }, [playBinaural, volBinaural]);

  const currentTiming = MODE_TIMINGS[mode];

  const getNextPhase = (current: BreathPhase): { phase: BreathPhase; seconds: number } => {
    switch (mode) {
      case 'box':
        switch (current) {
          case 'inhale': return { phase: 'holdIn', seconds: currentTiming.holdIn };
          case 'holdIn': return { phase: 'exhale', seconds: currentTiming.exhale };
          case 'exhale': return { phase: 'holdOut', seconds: currentTiming.holdOut };
          case 'holdOut': return { phase: 'inhale', seconds: currentTiming.inhale };
        }
      case 'relax':
        switch (current) {
          case 'inhale': return { phase: 'holdIn', seconds: currentTiming.holdIn };
          case 'holdIn': return { phase: 'exhale', seconds: currentTiming.exhale };
          case 'exhale': return { phase: 'inhale', seconds: currentTiming.inhale };
          default: return { phase: 'inhale', seconds: currentTiming.inhale };
        }
      case 'coherent':
        switch (current) {
          case 'inhale': return { phase: 'exhale', seconds: currentTiming.exhale };
          case 'exhale': return { phase: 'inhale', seconds: currentTiming.inhale };
          default: return { phase: 'inhale', seconds: currentTiming.inhale };
        }
    }
  };

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('inhale');
      setSecondsLeft(currentTiming.inhale);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          const next = getNextPhase(phaseRef.current);
          setPhase(next.phase);
          return next.seconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, mode]);

  const handleToggleActive = () => {
    setIsActive(!isActive);
    if (!isActive) {
      setPhase('inhale');
      setSecondsLeft(currentTiming.inhale);
      setPlayOcean(true);
    }
  };

  const getPhaseData = (): PhaseTiming => {
    if (!isActive) {
      return {
        label: 'Listo para empezar',
        action: 'Presiona Iniciar',
        scale: 0.85,
        bg: 'radial-gradient(circle, rgba(var(--accent-gold-rgb), 0.25) 0%, transparent 70%)',
        circleColor: 'var(--accent-gold)',
      };
    }

    switch (phase) {
      case 'inhale':
        return {
          label: 'Inhala aire profundamente',
          action: 'INHALA',
          scale: 1.3,
          bg: 'radial-gradient(circle, rgba(var(--accent-gold-rgb), 0.6) 0%, rgba(var(--accent-sage-rgb), 0.2) 60%, transparent 80%)',
          circleColor: 'var(--accent-gold)',
        };
      case 'holdIn':
        return {
          label: 'Sostén el aire en tu pecho',
          action: 'RETÉN',
          scale: 1.3,
          bg: 'radial-gradient(circle, rgba(var(--accent-sage-rgb), 0.5) 0%, rgba(var(--accent-lavender-rgb), 0.2) 60%, transparent 80%)',
          circleColor: 'var(--accent-sage)',
        };
      case 'exhale':
        return {
          label: 'Suelta el aire muy despacio',
          action: 'EXHALA',
          scale: 0.85,
          bg: 'radial-gradient(circle, rgba(var(--accent-lavender-rgb), 0.5) 0%, rgba(var(--accent-rose-rgb), 0.2) 60%, transparent 80%)',
          circleColor: 'var(--accent-lavender)',
        };
      case 'holdOut':
        return {
          label: 'Espera antes de volver a inhalar',
          action: 'RETÉN',
          scale: 0.85,
          bg: 'radial-gradient(circle, rgba(var(--accent-rose-rgb), 0.4) 0%, transparent 70%)',
          circleColor: 'var(--accent-rose)',
        };
    }
  };

  const phaseData = getPhaseData();
  const totalSeconds = phase === 'inhale' ? currentTiming.inhale
    : phase === 'holdIn' ? currentTiming.holdIn
    : phase === 'exhale' ? currentTiming.exhale
    : currentTiming.holdOut;

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const circumference = 2 * Math.PI * 72;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="glass-card flex flex-col items-center gap-6" style={styles.guideCard}>
        <div style={styles.tabSelector}>
          {(['box', 'relax', 'coherent'] as BreathMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { if (!isActive) setMode(m); }}
              style={{
                ...styles.tabBtn,
                background: mode === m ? 'var(--bg-elevated)' : 'transparent',
                color: mode === m ? 'var(--accent-gold)' : 'var(--text-muted)',
                cursor: isActive ? 'not-allowed' : 'pointer',
              }}
              disabled={isActive}
            >
              {m === 'box' ? 'Caja (4-4-4-4)' : m === 'relax' ? 'Relax (4-7-8)' : 'Coherente'}
            </button>
          ))}
        </div>

        <div style={styles.circleOuter}>
          <div
            style={{
              ...styles.circleGlow,
              background: phaseData.bg,
              transform: `scale(${phaseData.scale * 1.25})`,
            }}
          />
          <svg width="176" height="176" style={styles.svgRing}>
            <circle
              cx="88" cy="88" r="72"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="3"
            />
            <circle
              cx="88" cy="88" r="72"
              fill="none"
              stroke={phaseData.circleColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={isActive ? strokeDashoffset : circumference}
              style={{
                transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
              }}
            />
          </svg>
          <div
            style={{
              ...styles.circleMain,
              transform: `scale(${phaseData.scale})`,
              borderColor: isActive ? 'rgba(var(--accent-gold-rgb), 0.35)' : 'var(--border-color)',
            }}
          >
            <span style={styles.circleAction}>{phaseData.action}</span>
            {isActive && <span style={{ ...styles.circleTimer, color: phaseData.circleColor }}>{secondsLeft}s</span>}
          </div>
        </div>

        <div style={styles.guideText}>
          <h3 className="title-medium" style={{ fontSize: '18px' }}>{phaseData.label}</h3>
          <p className="body-standard" style={{ marginTop: '4px', opacity: 0.6 }}>
            {mode === 'box'
              ? 'Técnica militar para enfocar la mente'
              : mode === 'relax'
                ? 'Técnica de relajación profunda para el insomnio/pánico'
                : 'Ritmo suave de 5 segundos para regular el sistema nervioso'}
          </p>
        </div>

        <button
          onClick={handleToggleActive}
          className={isActive ? 'btn-danger' : 'btn-primary'}
          style={{ width: '80%', maxWidth: '240px', borderRadius: '24px' }}
        >
          {isActive ? (
            <>
              <Square size={16} />
              Detener calma
            </>
          ) : (
            <>
              <Play size={16} />
              Iniciar respiración
            </>
          )}
        </button>
      </div>

      <div className="glass-card flex flex-col gap-4">
        <div style={styles.mixerHeader}>
          <Volume2 size={16} color="var(--accent-gold)" />
          <h3 className="title-small">MEZCLADOR DE CALMA (OFFLINE)</h3>
        </div>

        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.7 }}>
          Combina sonidos generados matemáticamente por tu dispositivo sin consumir datos.
        </p>

        <div className="flex flex-col gap-4" style={{ marginTop: '8px' }}>
          <div style={styles.channelRow}>
            <div style={styles.channelInfo}>
              <button
                onClick={() => setPlayOcean(!playOcean)}
                style={{
                  ...styles.channelActiveBtn,
                  background: playOcean ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'rgba(255,255,255,0.02)',
                  color: playOcean ? 'var(--accent-gold)' : 'var(--text-muted)',
                }}
              >
                Olas
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volOcean}
              onChange={(e) => setVolOcean(parseFloat(e.target.value))}
              style={styles.volumeSlider}
              disabled={!playOcean}
            />
          </div>

          <div style={styles.channelRow}>
            <div style={styles.channelInfo}>
              <button
                onClick={() => setPlayBrown(!playBrown)}
                style={{
                  ...styles.channelActiveBtn,
                  background: playBrown ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'rgba(255,255,255,0.02)',
                  color: playBrown ? 'var(--accent-gold)' : 'var(--text-muted)',
                }}
              >
                Marrón
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volBrown}
              onChange={(e) => setVolBrown(parseFloat(e.target.value))}
              style={styles.volumeSlider}
              disabled={!playBrown}
            />
          </div>

          <div style={styles.channelRow}>
            <div style={styles.channelInfo}>
              <button
                onClick={() => setPlayBinaural(!playBinaural)}
                style={{
                  ...styles.channelActiveBtn,
                  background: playBinaural ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'rgba(255,255,255,0.02)',
                  color: playBinaural ? 'var(--accent-gold)' : 'var(--text-muted)',
                }}
>
                432 Hz
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volBinaural}
              onChange={(e) => setVolBinaural(parseFloat(e.target.value))}
              style={styles.volumeSlider}
              disabled={!playBinaural}
            />
          </div>
        </div>

        {playBinaural && (
          <div style={styles.binauralTip}>
            <HelpCircle size={14} color="var(--accent-sage)" style={{ minWidth: '14px' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Usa **auriculares estéreo** para percibir el efecto binaural de 4Hz para calmar el pánico.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  guideCard: {
    padding: '24px 16px',
    textAlign: 'center',
  },
  tabSelector: {
    display: 'flex',
    background: 'rgba(0, 0, 0, 0.15)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '3px',
    width: '100%',
    maxWidth: '280px',
  },
  tabBtn: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    borderRadius: '13px',
    fontSize: '13px',
    fontFamily: 'var(--font-title)',
    fontWeight: 500,
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  circleOuter: {
    width: '200px',
    height: '200px',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '16px 0',
  },
  svgRing: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    zIndex: 3,
  },
  circleGlow: {
    position: 'absolute',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    filter: 'blur(30px)',
    transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  circleMain: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    border: '4px solid var(--border-color)',
    background: 'var(--bg-surface)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    transition: 'transform 4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.5s ease',
  },
  circleAction: {
    fontFamily: 'var(--font-title)',
    fontWeight: 600,
    fontSize: '20px',
    letterSpacing: '0.08em',
    color: 'var(--text-primary)',
  },
  circleTimer: {
    fontSize: '13px',
    marginTop: '4px',
    fontWeight: 500,
  },
  guideText: {
    minHeight: '64px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mixerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  channelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
  },
  channelInfo: {
    width: '90px',
    minWidth: '90px',
  },
  channelActiveBtn: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    fontSize: '12px',
    fontFamily: 'var(--font-title)',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.3s ease',
  },
  volumeSlider: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
    opacity: 0.8,
  },
  binauralTip: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    background: 'rgba(var(--accent-sage-rgb), 0.05)',
    padding: '10px 14px',
    borderRadius: '16px',
    border: '1px solid rgba(var(--accent-sage-rgb), 0.1)',
  },
};
