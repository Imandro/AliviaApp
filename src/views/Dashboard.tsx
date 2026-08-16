import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Calendar, Sparkles, Smile, Wind, PenTool, Compass } from 'lucide-react';
import { saveTodayMood, getLastWeekMoods, getTodayString } from '../utils/localDb';

interface MoodInfo {
  score: number;
  emoji: string;
  label: string;
  color: string;
  quote: string;
}

const moodDetails: { [key: number]: MoodInfo } = {
  1: {
    score: 1,
    emoji: '🌧️',
    label: 'Muy abrumado(a)',
    color: 'var(--accent-rose)',
    quote: 'Está bien no estar bien hoy. No tienes que fingir fuerza.'
  },
    2: {
      score: 2,
      emoji: '🌫️',
      label: 'Algo inestable',
      color: 'var(--accent-warm)',
      quote: 'Las nubes siempre pasan. Tómate el tiempo que necesites hoy.'
    },
    3: {
      score: 3,
      emoji: '🍃',
      label: 'Estable / Neutral',
      color: 'var(--accent-sage)',
      quote: 'Un día tranquilo es un buen día. Sigue respirando.'
    },
    4: {
      score: 4,
      emoji: '☀️',
      label: 'Tranquilo(a) y bien',
      color: 'var(--accent-gold)',
      quote: 'Disfruta de este momento de claridad. Lo estás haciendo genial.'
    },
  5: {
    score: 5,
    emoji: '🌸',
    label: 'En paz y excelente',
    color: 'var(--accent-lavender)',
    quote: 'Tu paz es un refugio hermoso. Comparte esa calma si puedes.'
  }
};

const quickLinks = [
  { id: 'breathe', label: 'RESPIRAR', sub: 'Calma al instante', icon: Wind, gradient: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.08) 0%, rgba(var(--accent-sage-rgb), 0.05) 100%)', color: 'var(--accent-gold)' },
  { id: 'journal', label: 'DESAHOGO', sub: 'Libera tu mente', icon: PenTool, gradient: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.08) 0%, rgba(var(--accent-rose-rgb), 0.05) 100%)', color: 'var(--accent-lavender)' },
  { id: 'coping', label: 'APOYO', sub: 'Actividades breves', icon: Compass, gradient: 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.08) 0%, rgba(var(--accent-warm-rgb), 0.05) 100%)', color: 'var(--accent-sage)' },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [moodScore, setMoodScore] = useState<number>(3);
  const [noteText, setNoteText] = useState<string>('');
  const [isSavedToday, setIsSavedToday] = useState<boolean>(false);
  const [weeklyHistory, setWeeklyHistory] = useState<any[]>([]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const history = await getLastWeekMoods();
    setWeeklyHistory(history);

    const todayStr = getTodayString();
    const loggedToday = history.find((h): h is typeof h & { score: number } => h.date === todayStr && h.score !== null);
    if (loggedToday) {
      setMoodScore(loggedToday.score);
      setIsSavedToday(true);
    }
  };

  const handleSaveMood = async () => {
    await saveTodayMood(moodScore, noteText.trim() || undefined);
    setIsSavedToday(true);
    setNoteText('');
    refreshData();
  };

  const currentMood = moodDetails[moodScore];

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="glass-card" style={styles.welcomeCard}>
        <div style={styles.welcomeHeader}>
          <Heart size={18} color="var(--accent-gold)" />
          <span style={styles.welcomeBadge}>ESPACIO SEGURO</span>
        </div>
        <h2 className="title-large" style={{ marginTop: '12px' }}>
          Respira, estás a salvo.
        </h2>
        <p className="body-lead" style={{ marginTop: '6px', fontSize: '14px' }}>
          Este es tu rincón privado sin juicios. ¿Cómo te sientes en este instante?
        </p>
      </div>

      <div className="glass-card flex flex-col gap-4">
        <h3 className="title-small">REGISTRAR EMOCIÓN</h3>

        {isSavedToday ? (
          <div style={styles.savedContainer}>
            <div style={{ ...styles.moodHugeGlow, backgroundColor: currentMood.color }}>
              <span style={styles.moodHugeEmoji}>{currentMood.emoji}</span>
            </div>
            <h4 className="title-medium" style={{ color: currentMood.color }}>
              {currentMood.label}
            </h4>
            <p className="body-standard text-center" style={{ fontStyle: 'italic', padding: '0 10px' }}>
              "{currentMood.quote}"
            </p>
            <button
              onClick={() => setIsSavedToday(false)}
              className="btn-secondary"
              style={{ padding: '10px 20px', borderRadius: '14px', fontSize: '13px', marginTop: '8px' }}
            >
              Actualizar emoción
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div style={styles.sliderDisplay}>
              <div
                style={{
                  ...styles.moodHugeGlow,
                  backgroundColor: currentMood.color,
                  transform: `scale(${0.85 + (moodScore * 0.05)})`,
                  boxShadow: `0 10px 30px rgba(var(--accent-${moodScore === 1 ? 'rose' : moodScore === 2 ? 'warm' : moodScore === 3 ? 'sage' : moodScore === 4 ? 'gold' : 'lavender'}-rgb), 0.25)`
                }}
              >
                <span style={styles.moodHugeEmoji}>{currentMood.emoji}</span>
              </div>
              <div style={styles.sliderCaptions}>
                <h4 className="title-medium" style={{ color: currentMood.color }}>
                  {currentMood.label}
                </h4>
                <p className="body-standard text-center" style={{ fontStyle: 'italic', minHeight: '36px', fontSize: '13px' }}>
                  "{currentMood.quote}"
                </p>
              </div>
            </div>

            <div className="slider-container">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={moodScore}
                onChange={(e) => setMoodScore(parseInt(e.target.value))}
                className="slider-apple"
              />
              <div style={styles.sliderTicks}>
                <span>🌧️</span>
                <span>🌫️</span>
                <span>🍃</span>
                <span>☀️</span>
                <span>🌸</span>
              </div>
            </div>

            <input
              type="text"
              placeholder="¿Qué pasa por tu mente? (opcional)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="input-apple"
            />

            <button onClick={handleSaveMood} className="btn-primary">
              <Smile size={16} />
              Guardar en mi bitácora
            </button>
          </div>
        )}
      </div>

      <div className="glass-card flex flex-col gap-4">
        <div style={styles.historyHeader}>
          <Calendar size={16} color="var(--text-muted)" />
          <h3 className="title-small">MI SEMANA</h3>
        </div>
        <div style={styles.weekGrid}>
          {weeklyHistory.map((item, idx) => {
            const hasScore = item.score !== null;
            const detail = hasScore ? moodDetails[item.score] : null;
            const isToday = idx === 6;

            return (
              <div key={item.date} style={styles.weekDayColumn}>
                <div
                  style={{
                    ...styles.weekDot,
                    background: detail ? detail.color : 'rgba(255, 255, 255, 0.03)',
                    border: isToday
                      ? '1px dashed var(--accent-gold)'
                      : detail
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px dashed rgba(255, 255, 255, 0.15)',
                    boxShadow: detail ? `0 0 12px ${detail.color}80` : 'none',
                  }}
                >
                  {detail && <span style={styles.weekDotEmoji}>{detail.emoji}</span>}
                </div>
                <span style={{
                  ...styles.weekDayLabel,
                  color: isToday ? 'var(--accent-gold)' : 'var(--text-muted)',
                  fontWeight: isToday ? 600 : 400
                }}>
                  {item.dayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.shortcutsGrid}>
        {quickLinks.map((link, i) => {
          const Icon = link.icon;
          return (
            <div
              key={link.id}
              onClick={() => navigate(`/${link.id === 'breathe' ? 'breathe' : link.id === 'journal' ? 'journal' : 'coping'}`)}
              className="glass-card"
              style={{
                ...styles.shortcutCard,
                background: link.gradient,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <Icon size={18} color={link.color} />
              <h4 className="title-small" style={{ color: 'var(--text-primary)', marginTop: '8px' }}>{link.label}</h4>
              <span style={styles.shortcutSub}>{link.sub}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  welcomeCard: {
    background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.08) 0%, rgba(var(--accent-sage-rgb), 0.03) 100%)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
  },
  welcomeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  welcomeBadge: {
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--font-title)',
    letterSpacing: '0.08em',
    color: 'var(--accent-gold)',
  },
  savedContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
  },
  sliderDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '10px 0',
  },
  moodHugeGlow: {
    width: '84px',
    height: '84px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    backgroundBlendMode: 'screen',
  },
  moodHugeEmoji: {
    fontSize: '38px',
  },
  sliderCaptions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    width: '100%',
  },
  sliderTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 12px',
    marginTop: '6px',
    opacity: 0.6,
    fontSize: '14px',
    pointerEvents: 'none',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  weekGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    padding: '4px 0',
  },
  weekDayColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  weekDot: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.5s ease',
  },
  weekDotEmoji: {
    fontSize: '15px',
  },
  weekDayLabel: {
    fontSize: '11px',
    fontFamily: 'var(--font-title)',
  },
  shortcutsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '16px',
    width: '100%',
  },
  shortcutCard: {
    flex: 1,
    padding: '16px',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  shortcutSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
};
