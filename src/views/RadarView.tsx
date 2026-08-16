import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, TrendingUp, Calendar, Heart } from 'lucide-react';
import { getMoodHistory, getTodayString } from '../utils/localDb';

interface RadarPoint {
  key: string;
  label: string;
  valueDiario: number; // promedio diario 1-5
  days: number;
}

const MOOD_COLORS = ['var(--accent-rose)', 'var(--accent-warm)', 'var(--accent-sage)', 'var(--accent-gold)', 'var(--accent-lavender)'];
const MOOD_LABELS = ['Muy abrumado', 'Inestable', 'Estable', 'Tranquilo', 'En paz'];
const MOOD_EMOJIS = ['🌧️', '🌫️', '🍃', '☀️', '🌸'];

export const RadarView: React.FC = () => {
  const navigate = useNavigate();
  const [points, setPoints] = useState<RadarPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7' | '30' | 'all'>('7');

  useEffect(() => {
    loadRadar();
  }, [range]);

  const loadRadar = async () => {
    setLoading(true);
    try {
      const history = await getMoodHistory();
      const days = range === '7' ? 7 : range === '30' ? 30 : Infinity;
      const cutoff = days === Infinity
        ? new Date(0)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() - days);
            return d;
          })();

      const recent = history.filter(h => {
        const d = new Date(h.date + 'T00:00:00');
        return d >= cutoff;
      });

      // Dimensiones del radar: frecuencia (días registrados) e intensidad (promedio de ánimo)
      let maxDays = 0;
      for (let i = 0; i < 5; i++) {
        const count = recent.filter(h => h.score === i + 1).length;
        if (count > maxDays) maxDays = count;
      }

      const points: RadarPoint[] = MOOD_LABELS.map((label, i) => {
        const scored = recent.filter(h => h.score === i + 1);
        const valueDiario = scored.length > 0 ? (scored.reduce((a, b) => a + b.score, 0) / scored.length) : 0;
        return { key: String(i + 1), label, valueDiario, days: scored.length };
      });

      setPoints(points);
    } finally {
      setLoading(false);
    }
  };

  // Conversión a polígono SVG
  const ringCount = 5;
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;

  const makePolygon = (scale: number): string => points
    .map((p, i) => {
      const angle = (Math.PI * 2 * i) / points.length - Math.PI / 2;
      const rr = r * scale;
      return `${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)}`;
    })
    .join(' ');

  const dataPolygon = makePolygon(0.12 + 0.88 * (points.reduce((a, p) => a + p.days, 0) / Math.max(1, points.reduce((a, p) => a + (p.days > 0 ? 1 : 0), 0) * 3)));

  const averageScore = points.length ? points.reduce((sum, p) => sum + p.valueDiario, 0) / points.filter(p => p.valueDiario > 0).length || 0 : 0;

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="glass-card flex flex-col gap-3" style={styles.heroCard}>
        <div style={styles.heroHeader}>
          <Radar size={16} color="var(--accent-lavender)" />
          <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>RADAR DE BIENESTAR</h3>
        </div>
        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.75 }}>
          Observa cómo cambia tu estado emocional con el tiempo. Cada registro de ánimo alimenta tu radar.
        </p>
        <div style={styles.rangeSelector}>
          {([['7', '7 días'], ['30', '30 días'], ['all', 'Todo']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              style={{
                ...styles.rangeBtn,
                ...(range === key ? { background: 'rgba(var(--accent-lavender-rgb), 0.15)', color: 'var(--accent-lavender)' } : {}),
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card flex flex-col items-center gap-2" style={{ padding: '20px' }}>
        {loading ? (
          <p className="body-standard" style={{ fontSize: '12px', opacity: 0.6 }}>Cargando radar…</p>
        ) : (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: 'drop-shadow(0 6px 18px rgba(var(--accent-lavender-rgb), 0.18))' }}>
            {/* Anillos */}
            {[...Array(ringCount)].map((_, idx) => (
              <polygon
                key={idx}
                points={makePolygon((idx + 1) / ringCount)}
                fill="none"
                stroke="rgba(var(--accent-lavender-rgb), 0.12)"
                strokeWidth="1"
              />
            ))}
            {/* Ejes */}
            {points.map((p, i) => {
              const angle = (Math.PI * 2 * i) / points.length - Math.PI / 2;
              return (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={cx + r * Math.cos(angle)}
                  y2={cy + r * Math.sin(angle)}
                  stroke="rgba(var(--accent-lavender-rgb), 0.12)"
                  strokeWidth="1"
                />
              );
            })}
            {/* Datos */}
            <polygon
              points={dataPolygon}
              fill="rgba(var(--accent-lavender-rgb), 0.25)"
              stroke="var(--accent-lavender)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Nodos */}
            {points.map((p, i) => {
              const angle = (Math.PI * 2 * i) / points.length - Math.PI / 2;
              const rr = r * (0.12 + 0.88 * (p.days / Math.max(1, Math.max(...points.map(x => x.days)))));
              return (
                <circle key={i} cx={cx + rr * Math.cos(angle)} cy={cy + rr * Math.sin(angle)} r="5"
                  fill={MOOD_COLORS[i]} stroke="#fff" strokeWidth="1.5" opacity={p.days > 0 ? 1 : 0.3} />
              );
            })}
          </svg>
        )}

        <div style={styles.legendGrid}>
          {points.map((p, i) => (
            <div key={i} style={styles.legendItem}>
              <span style={{ fontSize: '12px' }}>{MOOD_EMOJIS[i]}</span>
              <span style={styles.legendLabel}>{p.label}</span>
              <span style={{ ...styles.legendCount, color: MOOD_COLORS[i] }}>
                {p.days} {p.days === 1 ? 'día' : 'días'}
              </span>
            </div>
          ))}
        </div>

        {averageScore > 0 && (
          <div style={styles.insightCard}>
            <TrendingUp size={14} color="var(--accent-gold)" />
            <p className="body-standard" style={{ fontSize: '12px' }}>
              Tu ánimo promedio es <b>{averageScore.toFixed(1)}/5</b> en este periodo.
              {averageScore >= 3.5
                ? ' Vas manteniendo una base de calma. 🌿'
                : ' Hay espacio para cuidarte más: cada registro es un paso para observarte mejor.'}
            </p>
          </div>
        )}

        {points.reduce((a, p) => a + p.days, 0) === 0 && (
          <div className="flex flex-col items-center gap-3" style={{ padding: '8px 0' }}>
            <p className="body-standard text-center" style={{ fontSize: '11.5px', opacity: 0.65, maxWidth: '260px' }}>
              Aún no hay registros en este periodo. Registra tu ánimo en el inicio para alimentar tu radar.
            </p>
            <button onClick={() => navigate('/')} className="btn-primary" style={{ padding: '10px 18px', borderRadius: '14px', fontSize: '12.5px' }}>
              <Heart size={14} />
              Registrar mi emoción
            </button>
          </div>
        )}
      </div>

      <div className="glass-card flex flex-col gap-2">
        <div style={styles.cardHeader}>
          <Calendar size={15} color="var(--text-muted)" />
          <h4 className="title-small" style={{ fontSize: '12px' }}>¿CÓMO LEO MI RADAR?</h4>
        </div>
        <p className="body-standard" style={{ fontSize: '11.5px', opacity: 0.7 }}>
          Cada pétalo representa una emoción (de 🌧️ muy abrumado a 🌸 en paz). Cuanto más crece un pétalo, más días la viviste en el periodo elegido. El polígomo azul conecta tus emociones para mostrar tu paisaje emocional completo.
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  heroCard: {
    background: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.07) 0%, rgba(var(--accent-sage-rgb), 0.03) 100%)',
    border: '1px solid rgba(var(--accent-lavender-rgb), 0.12)',
    padding: '16px',
  },
  heroHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rangeSelector: {
    display: 'flex',
    gap: '8px',
  },
  rangeBtn: {
    flex: 1,
    padding: '9px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    background: 'rgba(0,0,0,0.15)',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-title)',
    fontSize: '11.5px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  legendGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    width: '100%',
    marginTop: '8px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 10px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
  },
  legendLabel: {
    flex: 1,
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  legendCount: {
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--font-title)',
  },
  insightCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    borderRadius: '14px',
    background: 'rgba(var(--accent-gold-rgb), 0.07)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
    marginTop: '10px',
    width: '100%',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
};