import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Shield,
  ChevronRight,
  Trophy,
  ArrowRight,
  CheckCircle2,
  Sun,
  Compass,
  Users,
  Target,
} from 'lucide-react';
import {
  saveTodayMood,
  getMoodHistory,
  getLastWeekMoods,
  getTodayString,
  getCompletedActivities,
  getPlans,
} from '../utils/localDb';
import type { SafeUser } from '../utils/auth';

interface MoodInfo {
  score: number;
  emoji: string;
  label: string;
  color: string;
}

const moodDetails: { [key: number]: MoodInfo } = {
  1: { score: 1, emoji: '🌧️', label: 'Muy abrumado(a)', color: 'var(--accent-rose)' },
  2: { score: 2, emoji: '🌫️', label: 'Algo inestable', color: 'var(--accent-warm)' },
  3: { score: 3, emoji: '🍃', label: 'Estable / Neutral', color: 'var(--accent-sage)' },
  4: { score: 4, emoji: '☀️', label: 'Tranquilo(a) y bien', color: 'var(--accent-gold)' },
  5: { score: 5, emoji: '🌸', label: 'En paz y excelente', color: 'var(--accent-lavender)' },
};

const ALIENTO_DIA = [
  { text: 'Respira profundo: cada exhalación es un permiso para soltar lo que no te sirve.', ref: 'Calma' },
  { text: 'No tienes que cargar todo hoy. Un paso a la vez también es avanzar.', ref: 'Paso a paso' },
  { text: 'Tus emociones son información, no definen quién eres.', ref: 'Emociones' },
  { text: 'Descansar no es rendirse: es reabastecer tu energía para seguir.', ref: 'Descanso' },
  { text: 'Eres más fuerte de lo que crees, y no tienes que demostrarlo a nadie.', ref: 'Fuerza' },
  { text: 'Hoy elige ser amable contigo: tus mismos ojos, otras palabras.', ref: 'Amabilidad' },
  { text: 'El silencio también sana. Date un momento sin ruido.', ref: 'Silencio' },
  { text: 'Lo que sientes ahora no durará para siempre. Nada es permanente.', ref: 'Esperanza' },
  { text: 'Pide ayuda sin culpa: apoyarte en otros también es fortaleza.', ref: 'Apoyo' },
  { text: 'Un clima interior tranquilo se construye con pequeños cuidados diarios.', ref: 'Cuidado' },
  { text: 'No compares tu camino con el de nadie: tu ritmo es válido.', ref: 'Ritmo propio' },
  { text: 'Cierra los ojos, inhala por 4, sostén por 4, exhala por 8. Estás a salvo.', ref: 'Respira' },
];

const ALIENTO_BG = [
  'linear-gradient(135deg, #2C533D 0%, #1a2a20 100%)',
  'linear-gradient(135deg, #4F46E5 0%, #312E81 100%)',
  'linear-gradient(135deg, #B45309 0%, #78350F 100%)',
  'linear-gradient(135deg, #0F766E 0%, #134E4A 100%)',
  'linear-gradient(135deg, #9D174D 0%, #701A4B 100%)',
  'linear-gradient(135deg, #1E40AF 0%, #172554 100%)',
];

const SABIAS_QUE = [
  'La respiración abdominal activa el sistema nervioso parasimpático: el "modo calma" del cuerpo, en menos de 60 segundos.',
  'Escribir lo que sientes por 2 minutos reduce la intensidad de la emoción: al nombrarla, tu cerebro la procesa mejor.',
  'El cerebro humano tiene un sesgo natural a lo negativo. Buscar 3 cosas buenas al día entrena un equilibrio real.',
  'Caminar 10 minutos al aire libre equivale a una pausa mental: baja el cortisol y aclara los pensamientos.',
  'La gratitud no es fingir que todo está bien: es confirmar que, incluso en la tormenta, hay algo que sostiene.',
  'Los músculos tensos le dicen al cerebro "hay peligro". Soltar los hombros y la mandíbula también calma la mente.',
];

const TIPS_CRECIMIENTO = [
  'Tómate 5 minutos de pausa consciente hoy: sin pantallas, solo respirando.',
  'Nombra una emoción fuerte que sientas: "esto es ansiedad" le quita poder.',
  'Antes de dormir, recuerda una cosa que lograste, por pequeña que sea.',
];

const PRACTICA_META = 3;

export const Dashboard: React.FC<{ user?: SafeUser | null }> = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [weekHistory, setWeekHistory] = useState<{ date: string; dayName: string; score: number | null }[]>([]);
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [todayLabel, setTodayLabel] = useState<string>('');
  const [practiceDone, setPracticeDone] = useState(0);
  const [plansCount, setPlansCount] = useState(0);
  const [goalsDone, setGoalsDone] = useState(0);
  const [goalsTotal, setGoalsTotal] = useState(0);
  const [savingMood, setSavingMood] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [aliento, setAliento] = useState(ALIENTO_DIA[0]);
  const [alientoBg, setAlientoBg] = useState(ALIENTO_BG[0]);
  const [sabias, setSabias] = useState(SABIAS_QUE[0]);

  useEffect(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    setCurrentDate(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }));
    setAliento(ALIENTO_DIA[dayOfYear % ALIENTO_DIA.length]);
    setAlientoBg(ALIENTO_BG[dayOfYear % ALIENTO_BG.length]);
    setSabias(SABIAS_QUE[dayOfYear % SABIAS_QUE.length]);
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      const [history, week, activities, plans] = await Promise.all([
        getMoodHistory(),
        getLastWeekMoods(),
        getCompletedActivities(),
        getPlans(),
      ]);

      setWeekHistory(week);

      const dates = [...new Set(history.map((h) => h.date))].sort().reverse();
      const today = getTodayString();
      let s = 0;
      for (let i = 0; i < dates.length; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dates[i] === expected) s++;
        else break;
      }
      setStreak(s);

      const last = history[history.length - 1];
      if (last && last.date === today && last.score) {
        setTodayScore(last.score);
        setTodayLabel(moodDetails[last.score].label);
      } else {
        setTodayScore(null);
        setTodayLabel('');
      }

      setPracticeDone(activities.filter((a) => a.date === today).length);

      setPlansCount(plans.length);
      let done = 0;
      let total = 0;
      plans.forEach((p) => {
        p.goals.forEach((g) => {
          total++;
          if (g.done) done++;
        });
      });
      setGoalsDone(done);
      setGoalsTotal(total);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMood = async (score: number) => {
    if (savingMood) return;
    setSavingMood(true);
    try {
      await saveTodayMood(score);
      setTodayScore(score);
      setTodayLabel(moodDetails[score].label);
      await refreshData();
    } finally {
      setSavingMood(false);
    }
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'amigo(a)';
  const lastMoodEmoji = todayScore ? moodDetails[todayScore].emoji : '🍃';
  const level = 1 + Math.floor(streak / 5);
  const practiceCompleted = practiceDone >= PRACTICA_META;
  const practicePct = Math.min(100, Math.round((practiceDone / PRACTICA_META) * 100));
  const avatarInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spin" style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(var(--accent-gold-rgb), 0.2)', borderTopColor: 'var(--accent-gold)' }} />
      </div>
    );
  }

  return (
    <div className="fade-in flex flex-col gap-4" style={{ paddingBottom: '8px' }}>
      {/* Header — estilo Conecta+ */}
      <div className="cm-card cm-glass cm-press" style={styles.header}>
        <div>
          <div style={styles.headerDate}>
            <Sparkles size={13} color="var(--accent-gold)" />
            <span className="capitalize" style={styles.headerDateText}>{currentDate}</span>
          </div>
          <h2 style={styles.headerGreeting}>Hola, {firstName}</h2>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => navigate('/sos')} title="Emergencias" style={styles.sosCircleBtn}>
            <Shield size={22} color="#ffffff" fill="#ffffff" fillOpacity={0.25} />
          </button>
          <button onClick={() => navigate('/profile')} title="Mi perfil" style={styles.avatarCircle}>
            {avatarInitial}
          </button>
        </div>
      </div>

      {/* Aliento para hoy */}
      <div
        className="cm-card cm-press"
        style={{ ...styles.alientoCard, backgroundImage: alientoBg, minHeight: 190 }}
        onClick={() => navigate('/breathe')}
      >
        <div style={styles.alientoCircle} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '26px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 190 }}>
          <h6 style={styles.alientoLabel}>ALIENTO PARA HOY</h6>
          <figure style={{ margin: 0 }}>
            <blockquote style={{ margin: '14px 0 0' }}>
              <p style={styles.alientoQuote}>"{aliento.text}"</p>
            </blockquote>
            <figcaption style={styles.alientoRef}>{aliento.ref}</figcaption>
          </figure>
        </div>
        <span style={styles.alientoBrand}>ALIVIA</span>
      </div>

      {/* Práctica de hoy */}
      <div
        className="cm-card cm-press"
        style={{ ...styles.challengeCard, background: practiceCompleted ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, #7C6FE8 0%, #5B4FD0 100%)' }}
        onClick={() => navigate('/coping')}
      >
        <div style={styles.challengeTop}>
          <div style={styles.challengeTitleRow}>
            <Trophy size={20} color={practiceCompleted ? '#ffffff' : 'var(--accent-gold)'} />
            <span style={styles.challengeTitle}>PRÁCTICA DE HOY</span>
          </div>
          <span style={styles.challengeBadge}>{practiceDone}/{PRACTICA_META}</span>
        </div>

        <h4 style={styles.challengeHeadline}>
          {practiceCompleted ? 'Práctica completada 🎉' : 'Nutre tu calma interior'}
        </h4>

        {!practiceCompleted && (
          <div style={styles.challengeTrack}>
            <div style={{ ...styles.challengeFill, width: `${practicePct}%` }} />
          </div>
        )}

        <div style={styles.challengeBottom}>
          <p style={styles.challengeText}>
            {practiceCompleted ? 'Vuelve mañana por más' : 'Respira, desahógate o libera tensiones. 2-5 min'}
          </p>
          <div style={styles.challengeCircle}>
            {practiceCompleted ? <CheckCircle2 size={19} color="#10B981" /> : <ArrowRight size={19} color="#5B4FD0" />}
          </div>
        </div>
      </div>

      {/* Estado y SOS */}
      <div style={styles.statusRow}>
        <div className="cm-card" style={styles.streakCard}>
          <p style={styles.streakLabel}>TU RACHA</p>

          <div style={styles.streakMain}>
            <div style={styles.streakMainLeft}>
              <div style={styles.streakMainRow}>
                <div style={styles.sunCircle}>
                  <Sun size={20} color="#10B981" />
                </div>
                <span style={styles.streakNumber}>{streak}</span>
              </div>
              <h3 style={styles.streakDays}>DÍAS</h3>
              <div style={styles.weekDots}>
                {weekHistory.map((item, idx) => {
                  const detail = item.score ? moodDetails[item.score] : null;
                  const isToday = idx === weekHistory.length - 1;
                  return (
                    <div
                      key={item.date}
                      title={item.dayName}
                      className="cm-dot"
                      style={{
                        ...styles.weekDot,
                        background: detail ? detail.color : 'var(--bg-base)',
                        border: isToday
                          ? '1px dashed var(--accent-gold)'
                          : detail
                            ? '1px solid var(--border-color)'
                            : '1px dashed var(--border-color)',
                        boxShadow: detail ? `0 0 8px ${detail.color}80` : 'none',
                      }}
                    >
                      {detail && <span style={styles.weekDotEmoji}>{detail.emoji}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.mascotCol}>
              <div className="cm-mascot" style={styles.mascotCircle}>
                <span className="cm-mascot-emoji" style={styles.mascotEmoji}>{lastMoodEmoji}</span>
              </div>
              <span style={styles.levelBadge}>Nivel {level}</span>
            </div>
          </div>

          <div style={styles.checkinBlock}>
            <p style={styles.checkinLabel}>
              {todayScore ? <>Hoy te sientes: <b style={{ color: moodDetails[todayScore].color }}>{todayLabel} ✓</b></> : '¿Cómo te sientes en este instante?'}
            </p>
            <div style={styles.moodRow}>
              {Object.values(moodDetails).map((m) => (
                <button
                  key={m.score}
                  onClick={() => handleQuickMood(m.score)}
                  disabled={savingMood}
                  title={m.label}
                  className="cm-mood-btn"
                  style={{
                    ...styles.moodBtn,
                    background: todayScore === m.score ? m.color : 'var(--bg-base)',
                    boxShadow: todayScore === m.score ? `0 0 10px ${m.color}80` : 'none',
                    border: todayScore === m.score ? `2px solid ${m.color}` : '1px solid var(--border-color)',
                  }}
                >
                  <span style={{ fontSize: 17 }}>{m.emoji}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cm-card cm-press" style={styles.sosCard} onClick={() => navigate('/sos')}>
          <div style={styles.sosGlow} />
          <div style={styles.sosInner}>
            <Shield size={72} color="#ffffff" fill="#ffffff" fillOpacity={0.22} />
            <h1 style={styles.sosTitle}>SOS</h1>
          </div>
        </div>
      </div>

      {/* Mi progreso */}
      <div className="cm-card cm-press" style={{ overflow: 'hidden' }} onClick={() => navigate('/plans')}>
        <div style={{ padding: '18px' }}>
          <div style={styles.progressHead}>
            <div style={styles.progressIcon}>
              <Shield size={26} color="var(--accent-sage)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h5 style={styles.progressTitle}>Mi Progreso</h5>
              <p style={styles.progressDesc}>Tu camino hacia la calma, paso a paso</p>
            </div>
            <div style={styles.progressChevron}>
              <ChevronRight size={22} color="var(--accent-sage)" />
            </div>
          </div>
          <div style={styles.progressGrid}>
            <div style={styles.progressBox}>
              <span style={{ ...styles.progressNum, color: 'var(--accent-gold)' }}>{plansCount}</span>
              <small style={styles.progressSmall}>PLANES</small>
            </div>
            <div style={styles.progressBox}>
              <span style={{ ...styles.progressNum, color: 'var(--accent-sage)' }}>
                {goalsTotal > 0 ? `${goalsDone}/${goalsTotal}` : '0'}
              </span>
              <small style={styles.progressSmall}>METAS CUMPLIDAS</small>
            </div>
          </div>
        </div>
        <div style={{ height: 4, background: 'var(--accent-gold)', width: '100%' }} />
      </div>

      {/* Grilla de acciones */}
      <div style={styles.actionsGrid}>
        <div className="cm-card cm-press" style={styles.actionCard} onClick={() => navigate('/explore')}>
          <div style={{ ...styles.actionIcon, background: 'rgba(var(--accent-sage-rgb), 0.12)' }}>
            <Compass size={30} color="var(--accent-sage)" />
          </div>
          <h5 style={styles.actionTitle}>Explorar</h5>
          <small style={styles.actionSub}>Más herramientas</small>
        </div>
        <div className="cm-card cm-press" style={styles.actionCard} onClick={() => navigate('/community')}>
          <div style={{ ...styles.actionIcon, background: 'rgba(var(--accent-warm-rgb), 0.12)' }}>
            <Users size={30} color="var(--accent-warm)" />
          </div>
          <h5 style={styles.actionTitle}>Comunidad</h5>
          <small style={styles.actionSub}>Apoyo entre pares</small>
        </div>
        <div className="cm-card cm-press" style={styles.actionCard} onClick={() => navigate('/plans')}>
          <div style={{ ...styles.actionIcon, background: 'rgba(var(--accent-lavender-rgb), 0.12)' }}>
            <Target size={30} color="var(--accent-lavender)" />
          </div>
          <h5 style={styles.actionTitle}>Planes</h5>
          <small style={styles.actionSub}>Metas a tu ritmo</small>
        </div>
      </div>

      {/* Consejo para hoy */}
      <div className="cm-card" style={{ padding: '18px' }}>
        <div style={styles.wisdomHead}>
          <div className="cm-float" style={styles.wisdomIcon}>
            <Sun size={22} color="var(--accent-gold)" />
          </div>
          <h5 style={styles.wisdomTitle}>Sabiduría para hoy</h5>
        </div>

        <div style={styles.wisdomBox}>
          <div className="cm-shimmer" style={styles.wisdomShimmer} />
          <p style={styles.wisdomFact}>
            <strong>¿Sabías que?</strong> {sabias}
          </p>
        </div>

        <div style={{ marginTop: '14px' }}>
          <h6 style={styles.tipsHead}>TIPS DE BIENESTAR</h6>
          <ul style={styles.tipsList}>
            {TIPS_CRECIMIENTO.map((tip, i) => (
              <li key={i} style={styles.tipItem}>
                <span style={styles.tipBullet}>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
  },
  headerDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    marginBottom: '4px',
  },
  headerDateText: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
  },
  headerGreeting: {
    margin: 0,
    fontSize: '34px',
    lineHeight: 1.1,
    fontWeight: 800,
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.5px',
    color: 'var(--accent-gold)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid var(--border-color)',
    borderRadius: '999px',
    padding: '5px',
  },
  sosCircleBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
  },
  avatarCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    background: 'var(--accent-gold)',
    color: 'var(--bg-base)',
    fontWeight: 800,
    fontSize: '19px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    boxShadow: 'var(--shadow-card)',
  },

  alientoCard: {
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overflow: 'hidden',
    cursor: 'pointer',
    color: '#ffffff',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
    position: 'relative',
  },
  alientoCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.07)',
    transform: 'translate(-30%, -30%)',
  },
  alientoLabel: {
    margin: 0,
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.22em',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  alientoQuote: {
    margin: 0,
    fontSize: '20px',
    lineHeight: 1.5,
    fontWeight: 700,
    fontStyle: 'italic',
    color: '#ffffff',
  },
  alientoRef: {
    marginTop: '10px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  alientoBrand: {
    position: 'absolute',
    bottom: '10px',
    right: '14px',
    fontSize: '11px',
    letterSpacing: '0.2em',
    fontWeight: 700,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  challengeCard: {
    overflow: 'hidden',
    padding: '18px',
    cursor: 'pointer',
    color: '#ffffff',
  },
  challengeTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  challengeTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  challengeTitle: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.12em',
  },
  challengeBadge: {
    background: 'rgba(255, 255, 255, 0.22)',
    borderRadius: '999px',
    padding: '4px 14px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#ffffff',
  },
  challengeHeadline: {
    margin: '0 0 14px',
    fontSize: '21px',
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'var(--font-display)',
  },
  challengeTrack: {
    height: '12px',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  challengeFill: {
    height: '100%',
    borderRadius: '6px',
    background: 'var(--accent-gold)',
    transition: 'width 0.5s ease',
  },
  challengeBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeText: {
    margin: 0,
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.82)',
  },
  challengeCircle: {
    background: '#ffffff',
    borderRadius: '50%',
    padding: '6px',
    display: 'flex',
  },

  statusRow: {
    display: 'grid',
    gridTemplateColumns: '7fr 5fr',
    gap: '12px',
    alignItems: 'stretch',
  },
  streakCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  streakLabel: {
    margin: '0 0 10px',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-muted)',
  },
  streakMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  streakMainLeft: {
    flex: 1,
    minWidth: 0,
  },
  streakMainRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sunCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(16, 185, 129, 0.13)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    fontSize: '40px',
    lineHeight: 1,
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
  },
  streakDays: {
    margin: '2px 0 0 40px',
    fontSize: '22px',
    lineHeight: 1.1,
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
  },
  weekDots: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '3px',
    marginTop: '10px',
    maxWidth: '180px',
  },
  weekDot: {
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  weekDotEmoji: {
    fontSize: '11px',
  },
  mascotCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  mascotCircle: {
    borderRadius: '50%',
    background: 'rgba(var(--accent-gold-rgb), 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  },
  mascotEmoji: {
    fontSize: '40px',
    lineHeight: 1,
  },
  levelBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: '999px',
    padding: '3px 12px',
  },
  checkinBlock: {
    marginTop: 'auto',
    paddingTop: '14px',
    borderTop: '1px dashed var(--border-color)',
  },
  checkinLabel: {
    margin: '0 0 8px',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  moodRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '6px',
  },
  moodBtn: {
    borderRadius: '50%',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-base)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    padding: 0,
    flexShrink: 0,
  },
  sosCard: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    overflow: 'hidden',
    cursor: 'pointer',
    position: 'relative',
    minHeight: '100%',
    display: 'flex',
  },
  sosGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
  },
  sosInner: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '14px',
    textAlign: 'center',
  },
  sosTitle: {
    margin: '6px 0 0',
    fontSize: '38px',
    lineHeight: 1,
    letterSpacing: '-1px',
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'var(--font-display)',
  },

  progressHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
  },
  progressIcon: {
    background: 'rgba(var(--accent-sage-rgb), 0.12)',
    borderRadius: '16px',
    padding: '13px',
    display: 'flex',
  },
  progressTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  progressDesc: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  progressChevron: {
    background: 'var(--bg-base)',
    borderRadius: '50%',
    padding: '8px',
    display: 'flex',
  },
  progressGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  progressBox: {
    background: 'var(--bg-base)',
    borderRadius: '14px',
    padding: '14px',
    textAlign: 'center',
  },
  progressNum: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 800,
    lineHeight: 1.1,
    fontFamily: 'var(--font-display)',
  },
  progressSmall: {
    display: 'block',
    marginTop: '3px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
  },

  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
  },
  actionCard: {
    padding: '16px 10px',
    minHeight: '132px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
  },
  actionIcon: {
    width: '58px',
    height: '58px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  actionTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  actionSub: {
    marginTop: '3px',
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
  },

  wisdomHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  wisdomIcon: {
    background: 'rgba(var(--accent-gold-rgb), 0.14)',
    borderRadius: '12px',
    padding: '11px',
    display: 'flex',
  },
  wisdomTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  wisdomBox: {
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--bg-base)',
    borderRadius: '16px',
    padding: '14px',
    borderLeft: '4px solid var(--accent-gold)',
  },
  wisdomShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  wisdomFact: {
    position: 'relative',
    margin: 0,
    fontSize: '13px',
    lineHeight: 1.5,
    color: 'var(--text-secondary)',
  },
  tipsHead: {
    margin: '0 0 8px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    color: 'var(--text-muted)',
  },
  tipsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  tipItem: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    lineHeight: 1.45,
    color: 'var(--text-secondary)',
  },
  tipBullet: {
    color: 'var(--accent-gold)',
    fontWeight: 800,
  },
};