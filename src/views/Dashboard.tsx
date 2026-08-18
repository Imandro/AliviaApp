import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Shield,
  ChevronRight,
  ChevronDown,
  Trophy,
  ArrowRight,
  CheckCircle2,
  Sun,
  Compass,
  Users,
  Target,
  Bot,
} from 'lucide-react';
import {
  saveTodayMood,
  getMoodHistory,
  getLastWeekMoods,
  getTodayString,
  getCompletedActivities,
  getPlans,
} from '../utils/localDb';
import { LUCHAS, getLucha, problemsToLucha, dayOfYear } from '../utils/luchas';
import type { SafeUser } from '../utils/auth';

interface MoodInfo {
  score: number;
  emoji: string;
  label: string;
  color: string;
}

const moodDetails: { [key: number]: MoodInfo } = {
  1: { score: 1, emoji: '▁', label: 'Muy abrumado(a)', color: 'var(--accent-rose)' },
  2: { score: 2, emoji: '▂', label: 'Algo inestable', color: 'var(--accent-warm)' },
  3: { score: 3, emoji: '▄', label: 'Estable / Neutral', color: 'var(--accent-sage)' },
  4: { score: 4, emoji: '▆', label: 'Tranquilo(a) y bien', color: 'var(--accent-gold)' },
  5: { score: 5, emoji: '█', label: 'En paz y excelente', color: 'var(--accent-lavender)' },
};

const ALIENTO_BG = [
  'linear-gradient(135deg, #2C533D 0%, #1a2a20 100%)',
  'linear-gradient(135deg, #4F46E5 0%, #312E81 100%)',
  'linear-gradient(135deg, #B45309 0%, #78350F 100%)',
  'linear-gradient(135deg, #0F766E 0%, #134E4A 100%)',
  'linear-gradient(135deg, #9D174D 0%, #701A4B 100%)',
  'linear-gradient(135deg, #1E40AF 0%, #172554 100%)',
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
  const [savingMood, setSavingMood] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [luchaId, setLuchaId] = useState(() => problemsToLucha(user?.problems));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewLucha, setPreviewLucha] = useState<string | null>(null);
  const [alientoBg, setAlientoBg] = useState(ALIENTO_BG[0]);

  const lucha = getLucha(luchaId);
  const day = dayOfYear();
  const aliento = lucha.frases[day % lucha.frases.length];
  const retoHoy = lucha.retos[day % lucha.retos.length];
  const sabias = lucha.saber[day % lucha.saber.length];

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }));
    setAlientoBg(ALIENTO_BG[day % ALIENTO_BG.length]);
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      const [history, week, activities] = await Promise.all([
        getMoodHistory(),
        getLastWeekMoods(),
        getCompletedActivities(),
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
  const lastMoodEmoji = todayScore ? moodDetails[todayScore].emoji : '▄';
  const level = 1 + Math.floor(streak / 5);
  const practiceCompleted = practiceDone >= PRACTICA_META;
  const practicePct = Math.min(100, Math.round((practiceDone / PRACTICA_META) * 100));

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
        </div>
      </div>

      {/* Banner VIA — chat IA siempre a la vista */}
      <div
        className="cm-card cm-press"
        style={styles.viaBanner}
        onClick={() => navigate('/chat')}
        role="button"
        aria-label="Abrir VIA, chat de orientación emocional"
      >
        <div style={styles.viaGlowTop} />
        <div style={styles.viaGlowBot} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={styles.viaIconWrap}>
            <div style={styles.viaIcon} className="cm-float">
              <Bot size={26} color="#0c1810" />
            </div>
            <span style={styles.viaPing} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.viaLabel}>
              <Sparkles size={11} color="rgba(12, 24, 16, 0.75)" />
              <span>VIA · IA DE ORIENTACIÓN</span>
            </div>
            <h3 style={styles.viaTitle}>¿Cómo te sientes hoy?</h3>
            <p style={styles.viaSub}>Conversa con Alivia: te escucha y te acompaña sin juicios.</p>
          </div>
          <div style={styles.viaArrow}>
            <ArrowRight size={18} color="#0c1810" />
          </div>
        </div>
      </div>

      {/* Selector de luchas */}
      <button
        type="button"
        onClick={() => { setPreviewLucha(luchaId); setPickerOpen(true); }}
        style={{
          ...styles.luchaPicker,
          borderColor: `rgba(${lucha.rgb}, 0.45)`,
          background: `rgba(${lucha.rgb}, 0.1)`,
        }}
      >
        <span style={{ fontSize: 16 }}>{lucha.emoji}</span>
        <span style={styles.luchaPickerText}>
          <small style={styles.luchaPickerLabel}>MI LUCHA PRINCIPAL</small>
          {lucha.label}
        </span>
        <ChevronDown size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </button>

      {pickerOpen && (() => {
        const preview = getLucha(previewLucha ?? luchaId);
        return (
          <>
            <div style={styles.pickerOverlay} onClick={() => setPickerOpen(false)} />
            <div style={styles.pickerModalWrap} role="dialog" aria-modal="true">
              <div style={styles.pickerModal}>
                <div style={styles.pickerHandle} />
              <div style={styles.modalPreview}>
                <div style={{ fontSize: '40px', lineHeight: 1, animation: 'softFloat 3s ease-in-out infinite' }}>{preview.emoji}</div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: '9.5px', letterSpacing: '0.22em', color: 'var(--text-muted)', marginTop: '10px' }}>
                  MI LUCHA PRINCIPAL
                </div>
                <h5 style={styles.modalTitle}>{preview.label}</h5>
              </div>
              <p style={styles.pickerSub}>¿Qué quieres acompañar hoy?</p>
              <div style={styles.pickerOptions}>
                {LUCHAS.map((l) => {
                  const active = l.id === (previewLucha ?? luchaId);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setPreviewLucha(l.id)}
                      style={{
                        ...styles.pickerOption,
                        background: active ? `rgba(${l.rgb}, 0.14)` : 'rgba(0,0,0,0.12)',
                        borderColor: active ? `rgba(${l.rgb}, 0.55)` : 'var(--border-color)',
                      }}
                    >
                      <span style={styles.pickerOptionEmoji}>{l.emoji}</span>
                      <span style={styles.pickerOptionLabel}>
                        {l.label}
                        {l.id === 'general' && <small style={styles.pickerOptionSub}>Bienestar y calma general</small>}
                      </span>
                      {active && <CheckCircle2 size={18} color={l.color} style={{ flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setPickerOpen(false)} style={styles.modalCancel}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { setLuchaId(preview.id); setPickerOpen(false); }}
                  style={{ ...styles.modalConfirm, background: preview.color }}
                >
                  <CheckCircle2 size={16} color="#0c1810" />
                  ¡Listo!
                </button>
              </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Aliento para hoy */}
      <div
        className="cm-card cm-press"
        style={{ ...styles.alientoCard, backgroundImage: alientoBg, minHeight: 165 }}
        onClick={() => navigate('/breathe')}
      >
        <div style={styles.alientoCircle} />
        <div style={styles.alientoCircle2} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '22px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 165 }}>
          <h6 style={styles.alientoLabel}>
            ALIENTO PARA MIS LUCHAS · {lucha.label.toUpperCase()}
          </h6>
          <figure style={{ margin: 0 }}>
            <blockquote style={{ margin: '14px 0 0' }}>
              <p style={styles.alientoQuote}>"{aliento.text}"</p>
            </blockquote>
            <figcaption style={styles.alientoRef}>{aliento.ref}</figcaption>
          </figure>
        </div>
        <span style={styles.alientoBrand}>ALIVIA</span>
      </div>

      {/* Reto de hoy */}
      <div
        className="cm-card cm-press"
        style={{ ...styles.challengeCard, background: practiceCompleted ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, #7C6FE8 0%, #5B4FD0 100%)' }}
        onClick={() => navigate('/coping')}
      >
        <div style={styles.challengeTop}>
          <div style={styles.challengeTitleRow}>
            <Trophy size={18} color={practiceCompleted ? '#ffffff' : 'var(--accent-gold)'} />
            <span style={styles.challengeTitle}>RETO DE HOY</span>
          </div>
          <span style={styles.challengeBadge}>{practiceDone}/{PRACTICA_META}</span>
        </div>

        <h4 style={styles.challengeHeadline}>
          {practiceCompleted ? 'Reto completado ' : retoHoy}
        </h4>

        {!practiceCompleted && (
          <div style={styles.challengeTrack}>
            <div style={{ ...styles.challengeFill, width: `${practicePct}%` }} />
          </div>
        )}

        <div style={styles.challengeBottom}>          
          <span style={styles.challengeCircle}>
            {practiceCompleted ? <CheckCircle2 size={18} color="#10B981" /> : <ArrowRight size={18} color="#5B4FD0" />}
          </span>
          <span style={styles.challengeText}>
            {practiceCompleted ? 'Vuelve mañana por más' : `Lucha: ${lucha.label} · 2-5 min`}
          </span>
        </div>
      </div>

      {/* Estado y SOS */}
      <div style={styles.statusRow}>
        <div className="cm-card" style={styles.streakCard}>
          <div style={styles.streakHead}>
            <p style={styles.streakLabel}>TU RACHA</p>
            <span style={styles.levelBadge}>Nivel {level}</span>
          </div>

          <div style={styles.streakMain}>
            <div style={styles.streakMainLeft}>
              <div style={styles.streakMainRow}>
                <div style={styles.sunCircle}>
                  <Sun size={20} color="#10B981" />
                </div>
                <div style={styles.streakNumBlock}>
                  <span style={styles.streakNumber}>{streak}</span>
                  <span style={styles.streakDays}>DÍAS</span>
                </div>
              </div>
            </div>

            <div style={styles.mascotCol}>
              <div className="cm-mascot" style={styles.mascotCircle}>
                <span className="cm-mascot-emoji" style={styles.mascotEmoji}>{lastMoodEmoji}</span>
              </div>
            </div>
          </div>

          <div style={styles.weekRow}>
            {weekHistory.map((item, idx) => {
              const detail = item.score ? moodDetails[item.score] : null;
              const isToday = idx === weekHistory.length - 1;
              return (
                <div
                  key={item.date}
                  title={item.dayName}
                  style={styles.weekCol}
                >
                  <div
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
                  <span style={styles.weekDay}>{item.dayName.charAt(0).toUpperCase()}</span>
                </div>
              );
            })}
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
          <small style={styles.actionSub}>Luchas paso a paso</small>
        </div>
      </div>

      {/* Consejo para hoy */}
      <div className="cm-card cm-press" style={styles.wisdomCard} onClick={() => navigate('/library')}>
        <div className="cm-float" style={{ ...styles.wisdomIcon, background: `rgba(${lucha.rgb}, 0.14)` }}>
          <Sun size={22} color={lucha.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.wisdomTitle}>Consejo para hoy</p>
          <p style={styles.wisdomFact}>
            <strong>¿Sabías que?</strong> {sabias.length > 90 ? `${sabias.slice(0, 90)}…` : sabias}
          </p>
        </div>
        <ChevronRight size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
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
  },
  viaBanner: {
    overflow: 'hidden',
    cursor: 'pointer',
    position: 'relative',
    padding: '18px 16px',
    background: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-sage) 130%)',
    color: '#0c1810',
    boxShadow: '0 14px 34px rgba(205, 173, 63, 0.28)',
  },
  viaGlowTop: {
    position: 'absolute',
    top: '-60px',
    left: '-30px',
    width: '160px',
    height: '160px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.25)',
  },
  viaGlowBot: {
    position: 'absolute',
    bottom: '-70px',
    right: '-40px',
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.18)',
  },
  viaIconWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  viaIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '18px',
    background: 'rgba(255, 255, 255, 0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.18)',
  },
  viaPing: {
    position: 'absolute',
    top: '-3px',
    right: '-3px',
    width: '13px',
    height: '13px',
    borderRadius: '50%',
    background: '#22c55e',
    border: '2.5px solid var(--accent-gold)',
  },
  viaLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '9.5px',
    fontWeight: 800,
    letterSpacing: '0.18em',
    opacity: 0.85,
  },
  viaTitle: {
    margin: '4px 0 2px',
    fontSize: '21px',
    lineHeight: 1.15,
    fontWeight: 800,
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.3px',
    color: '#0c1810',
  },
  viaSub: {
    margin: 0,
    fontSize: '11.5px',
    lineHeight: 1.4,
    fontWeight: 600,
    color: 'rgba(12, 24, 16, 0.75)',
  },
  viaArrow: {
    flexShrink: 0,
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },

  luchaPicker: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    borderRadius: '16px',
    border: '1px solid',
    cursor: 'pointer',
    fontFamily: 'var(--font-title)',
    transition: 'all 0.2s ease',
    textAlign: 'left',
  },
  luchaPickerText: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  luchaPickerLabel: {
    fontSize: '9.5px',
    fontWeight: 600,
    letterSpacing: '0.16em',
    color: 'var(--text-muted)',
  },
  pickerOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 999,
    animation: 'fadeInFast 0.25s ease forwards',
  },
  pickerModalWrap: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pickerModal: {
    pointerEvents: 'auto',
    width: 'min(380px, calc(100% - 40px))',
    maxHeight: '86vh',
    overflowY: 'auto',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color-glow)',
    borderRadius: '28px',
    padding: '14px 20px 20px',
    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    animation: 'modalPop 0.4s cubic-bezier(0.34, 1.4, 0.5, 1) forwards',
  },
  pickerHandle: {
    width: '44px',
    height: '5px',
    borderRadius: '3px',
    background: 'var(--border-color)',
    margin: '0 auto 12px',
  },
  modalPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 0 10px',
    textAlign: 'center',
  },
  modalTitle: {
    margin: '4px 0 0',
    fontSize: '24px',
    fontWeight: 800,
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  pickerSub: {
    margin: '0 0 14px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  pickerOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pickerOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '16px',
    border: '1px solid',
    cursor: 'pointer',
    fontFamily: 'var(--font-title)',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    width: '100%',
  },
  pickerOptionEmoji: {
    fontSize: '22px',
    flexShrink: 0,
  },
  pickerOptionLabel: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  pickerOptionSub: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-muted)',
  },
  modalFooter: {
    display: 'flex',
    gap: '10px',
    marginTop: '16px',
  },
  modalCancel: {
    flex: 1,
    padding: '13px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    background: 'rgba(0, 0, 0, 0.2)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-title)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  modalConfirm: {
    flex: 1.4,
    padding: '13px',
    borderRadius: '16px',
    border: 'none',
    color: '#0c1810',
    fontFamily: 'var(--font-title)',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.2s ease',
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
  alientoCircle2: {
    position: 'absolute',
    bottom: '-40px',
    right: '-30px',
    width: '130px',
    height: '130px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
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
    fontSize: '18px',
    lineHeight: 1.45,
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
    padding: '16px 18px',
    cursor: 'pointer',
    color: '#ffffff',
  },
  challengeTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
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
    margin: '0 0 12px',
    fontSize: '19px',
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'var(--font-display)',
    lineHeight: 1.3,
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
    alignItems: 'center',
    gap: '10px',
  },
  challengeText: {
    margin: 0,
    fontSize: '12.5px',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  challengeCircle: {
    background: '#ffffff',
    borderRadius: '50%',
    padding: '5px',
    display: 'flex',
    flexShrink: 0,
  },

  statusRow: {
    display: 'grid',
    gridTemplateColumns: '7fr 5fr',
    gap: '12px',
    alignItems: 'stretch',
  },
  streakCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    background: 'linear-gradient(180deg, rgba(var(--accent-gold-rgb), 0.07) 0%, rgba(0, 0, 0, 0) 45%)',
  },
  streakHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakLabel: {
    margin: 0,
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    color: 'var(--text-muted)',
  },
  streakMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  streakMainLeft: {
    flex: 1,
    minWidth: 0,
  },
  streakMainRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sunCircle: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'rgba(16, 185, 129, 0.13)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  streakNumBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  streakNumber: {
    fontSize: '38px',
    lineHeight: 1,
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
  },
  streakDays: {
    fontSize: '11px',
    lineHeight: 1,
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: 'var(--text-secondary)',
  },
  weekRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '4px',
    paddingTop: '14px',
    borderTop: '1px dashed var(--border-color)',
  },
  weekCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
  },
  weekDay: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
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

  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
  },
  actionCard: {
    padding: '14px 10px',
    minHeight: '116px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
  },
  actionIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
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

  wisdomIcon: {
    background: 'rgba(var(--accent-gold-rgb), 0.14)',
    borderRadius: '12px',
    padding: '11px',
    display: 'flex',
    flexShrink: 0,
  },
  wisdomTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  wisdomCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    cursor: 'pointer',
  },
  wisdomFact: {
    margin: '3px 0 0',
    fontSize: '12.5px',
    lineHeight: 1.45,
    color: 'var(--text-secondary)',
  },
};