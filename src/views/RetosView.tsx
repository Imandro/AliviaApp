/* ----------------------------------------------------
   ALIVIA - RETOS DIARIOS (RetosView)
   Misión del día con pasos accionables, registro de
   completados, racha, semana, próximos e historial.
   ---------------------------------------------------- */

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  CheckCircle2,
  PartyPopper,
  Flame,
  CalendarDays,
  History,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { LUCHAS, getLucha, problemsToLucha, dayOfYear } from '../utils/luchas';
import {
  getChallengeLog,
  addChallengeRecord,
  isDoneOn,
  getRecordOn,
  getChallengeStreak,
  getWeekChallenges,
  type ChallengeRecord,
} from '../utils/retosDb';
import { getTodayString } from '../utils/localDb';
import type { SafeUser } from '../utils/auth';

const GRADIENT = 'linear-gradient(135deg, #7C6FE8 0%, #5B4FD0 100%)';
const GRADIENT_DONE = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';

export const RetosView: React.FC<{ user?: SafeUser | null }> = ({ user }) => {
  const [luchaId, setLuchaId] = useState<string>(() => problemsToLucha(user?.problems));
  const [log, setLog] = useState<ChallengeRecord[]>([]);
  const [stepsDone, setStepsDone] = useState<boolean[]>([]);
  const [celebrating, setCelebrating] = useState(false);

  const lucha = getLucha(luchaId);
  const day = dayOfYear();
  const todayStr = getTodayString();
  const retoHoy = lucha.retos[day % lucha.retos.length];

  useEffect(() => {
    setLog(getChallengeLog());
  }, []);

  const doneToday = isDoneOn(log, todayStr);
  const todayRecord = getRecordOn(log, todayStr);
  const streak = getChallengeStreak(log, todayStr);
  const week = getWeekChallenges(log);
  const stepsCount = retoHoy.steps.length;
  const stepsPct = Math.min(
    100,
    Math.round((stepsDone.filter(Boolean).length / stepsCount) * 100),
  );
  const allSteps = stepsDone.length === stepsCount && stepsDone.every(Boolean);
  const finishedToday = celebrating || doneToday;

  const handleLuchaChange = (id: string) => {
    setLuchaId(id);
    setStepsDone([]);
    setCelebrating(false);
  };

  const toggleStep = (i: number) => {
    if (finishedToday) return;
    setStepsDone((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const completeMission = () => {
    if (!allSteps || finishedToday) return;
    const newLog = addChallengeRecord({
      date: todayStr,
      luchaId,
      retoId: retoHoy.id,
      title: retoHoy.title,
      completedAt: new Date().toISOString(),
    });
    setLog(newLog);
    setCelebrating(true);
  };

  const upcoming = [1, 2, 3].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const reto = lucha.retos[(day + offset) % lucha.retos.length];
    return {
      date: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }),
      reto,
    };
  });

  const history = [...log].reverse().slice(0, 8);
  const monthDay = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fade-in flex flex-col gap-4" style={{ paddingBottom: '8px' }}>
      {/* Cabecera de racha */}
      <div className="cm-card cm-glass" style={{ ...styles.streakCard, backgroundImage: finishedToday ? GRADIENT_DONE : GRADIENT }}>
        <div style={styles.streakGlow} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={styles.streakTop}>
            <div style={styles.streakTitleRow}>
              <Trophy size={17} color="#ffffff" />
              <span style={styles.streakLabel}>RETOS DIARIOS</span>
            </div>
            <span style={styles.streakLucha}>{lucha.emoji} {lucha.label.toUpperCase()}</span>
          </div>
          <div style={styles.streakMain}>
            <div style={styles.streakNumRow}>
              <Flame size={26} color="#FBBF24" fill="#FBBF24" fillOpacity={0.3} />
              <span style={styles.streakNumber}>{streak}</span>
              <span style={styles.streakDays}>DÍAS<br />SEGUIDOS</span>
            </div>
            <div style={styles.streakTotal}>
              <span style={styles.streakTotalNum}>{log.length}</span>
              <span style={styles.streakTotalLabel}>RETOS<br />CUMPLIDOS</span>
            </div>
          </div>
          <p style={styles.streakSub}>
            {finishedToday
              ? 'Misión de hoy cumplida. Vuelve mañana por más.'
              : 'Una misión pequeña al día. Tú puedes con esto.'}
          </p>
        </div>
      </div>

      {/* Selector de lucha */}
      <div style={styles.luchaRow}>
        {LUCHAS.map((l) => {
          const active = l.id === luchaId;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => handleLuchaChange(l.id)}
              style={{
                ...styles.luchaChip,
                background: active ? `rgba(${l.rgb}, 0.18)` : 'transparent',
                borderColor: active ? `rgba(${l.rgb}, 0.55)` : 'var(--border-color)',
              }}
              title={l.label}
            >
              <span>{l.emoji}</span>
              {active && <span style={{ fontSize: 10, fontWeight: 700, color: l.color === 'var(--text-secondary)' ? 'var(--text-secondary)' : l.color }}>{l.label.split(' ')[0]}</span>}
            </button>
          );
        })}
      </div>

      {/* Misión de hoy */}
      {finishedToday ? (
        <div className="cm-card cm-press fade-in" style={{ ...styles.missionCard, background: GRADIENT_DONE }}>
          <div style={styles.celebrateEmoji} className="cm-float">
            <PartyPopper size={34} color="#0c1810" />
          </div>
          <div style={styles.celebrateIcon} className="cm-float">
            <CheckCircle2 size={26} color="#10B981" />
          </div>
          <h3 style={styles.missionDoneTitle}>¡Misión completada!</h3>
          <p style={styles.missionDoneSub}>
            {todayRecord ? `"${todayRecord.title}"` : `"${retoHoy.title}"`} — ya quedó
            registrado. Tu racha es de {streak} día{streak === 1 ? '' : 's'}.
          </p>
          <div style={styles.weekStrip}>
            {week.map((w, idx) => (
              <div key={w.date} style={styles.weekCol}>
                <div
                  title={w.done ? w.title : w.date}
                  style={{
                    ...styles.weekDot,
                    background: w.done ? '#10B981' : 'rgba(255, 255, 255, 0.22)',
                    border: idx === 6 ? '2px dashed #ffffff' : 'none',
                    boxShadow: w.done ? '0 0 10px rgba(255, 255, 255, 0.45)' : 'none',
                  }}
                >
                  {w.done && <CheckCircle2 size={12} color="#0c1810" />}
                </div>
                <span style={styles.weekDay}>{w.dayName.charAt(0)}</span>
              </div>
            ))}
          </div>
          <p style={styles.missionDoneHint}>
            <Sparkles size={12} color="#0c1810" style={{ flexShrink: 0 }} />
            Mañana te espera una misión nueva.
          </p>
        </div>
      ) : (
        <div className="cm-card" style={{ ...styles.missionCard, background: GRADIENT }}>
          <div style={styles.missionGlow} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={styles.missionTop}>
              <div style={styles.missionTitleRow}>
                <Trophy size={16} color="#FBBF24" />
                <span style={styles.missionLabel}>MISIÓN DE HOY</span>
              </div>
              <span style={styles.missionBadge}>{stepsDone.filter(Boolean).length}/{stepsCount}</span>
            </div>

            <div style={styles.missionHead}>
              <div style={styles.missionEmoji} className="cm-float">{retoHoy.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={styles.missionTitle}>{retoHoy.title}</h4>
                <p style={styles.missionSub}>{retoHoy.sub}</p>
              </div>
            </div>

            <p style={styles.missionDate} className="capitalize">
              {lucha.emoji} {monthDay}
            </p>

            <div style={styles.stepsList}>
              {retoHoy.steps.map((step, i) => {
                const done = Boolean(stepsDone[i]);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleStep(i)}
                    style={styles.stepRow}
                    disabled={finishedToday}
                  >
                    <span
                      style={{
                        ...styles.stepCircle,
                        background: done ? '#0c1810' : 'rgba(255, 255, 255, 0.16)',
                        border: done ? 'none' : '2px solid rgba(255, 255, 255, 0.65)',
                      }}
                    >
                      {done && <CheckCircle2 size={15} color="#10B981" />}
                    </span>
                    <span style={{ ...styles.stepText, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.65 : 1 }}>
                      {step}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={styles.missionTrack}>
              <div style={{ ...styles.missionFill, width: `${stepsPct}%` }} />
            </div>

            <button
              type="button"
              onClick={completeMission}
              disabled={!allSteps}
              style={{
                ...styles.completeBtn,
                background: allSteps ? '#FBBF24' : 'rgba(255, 255, 255, 0.14)',
                color: allSteps ? '#0c1810' : 'rgba(255, 255, 255, 0.5)',
                cursor: allSteps ? 'pointer' : 'not-allowed',
              }}
            >
              <CheckCircle2 size={17} />
              {allSteps ? 'Completar misión' : `Marca los ${stepsCount} pasos para completar`}
            </button>
          </div>
        </div>
      )}

      {/* Próximos retos */}
      <div className="cm-card cm-glass" style={styles.nextCard}>
        <div style={styles.sectionHead}>
          <CalendarDays size={16} color="var(--accent-gold)" />
          <span style={styles.sectionTitle}>PRÓXIMOS RETOS</span>
        </div>
        {upcoming.map((u) => (
          <div key={u.date} style={styles.nextRow}>
            <span style={styles.nextEmoji}>{u.reto.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.nextTitle}>{u.reto.title}</p>
              <p style={styles.nextDate} className="capitalize">{u.date}</p>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          </div>
        ))}
      </div>

      {/* Historial */}
      <div className="cm-card cm-glass" style={styles.nextCard}>
        <div style={styles.sectionHead}>
          <History size={16} color="var(--accent-gold)" />
          <span style={styles.sectionTitle}>HISTORIAL</span>
        </div>
        {history.length === 0 && (
          <p style={styles.emptyText}>
            Completa tu primera misión y aparecerá aquí. ¡Un paso al día es suficiente!
          </p>
        )}
        {history.map((r) => {
          const l = getLucha(r.luchaId);
          const reto = l.retos.find((x) => x.id === r.retoId);
          const d = new Date(r.date + 'T00:00:00');
          return (
            <div key={`${r.date}-${r.retoId}`} style={styles.nextRow}>
              <span style={styles.nextEmoji}>{reto?.emoji ?? l.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.nextTitle}>{r.title}</p>
                <p style={styles.nextDate}>
                  {l.emoji} {l.label} · {d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
              </div>
              <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  streakCard: {
    overflow: 'hidden',
    padding: '20px',
    position: 'relative',
  },
  streakGlow: {
    position: 'absolute',
    top: '-70px',
    right: '-40px',
    width: '190px',
    height: '190px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
  },
  streakTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  streakTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  streakLabel: {
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.14em',
    color: '#ffffff',
  },
  streakLucha: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  streakMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '14px',
  },
  streakNumRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  streakNumber: {
    fontSize: '46px',
    lineHeight: 1,
    fontWeight: 800,
    fontFamily: 'var(--font-display)',
    color: '#ffffff',
  },
  streakDays: {
    fontSize: '10px',
    lineHeight: 1.3,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  streakTotal: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    background: 'rgba(255, 255, 255, 0.14)',
    borderRadius: '18px',
    padding: '10px 16px',
  },
  streakTotalNum: {
    fontSize: '22px',
    lineHeight: 1,
    fontWeight: 800,
    fontFamily: 'var(--font-display)',
    color: '#ffffff',
  },
  streakTotalLabel: {
    fontSize: '8.5px',
    lineHeight: 1.3,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  streakSub: {
    margin: '14px 0 0',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.85)',
  },

  luchaRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    padding: '2px',
    scrollbarWidth: 'none',
  },
  luchaChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '999px',
    border: '1px solid',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '15px',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },

  missionCard: {
    overflow: 'hidden',
    padding: '20px',
    color: '#ffffff',
    boxShadow: '0 16px 44px rgba(91, 79, 208, 0.35)',
  },
  missionGlow: {
    position: 'absolute',
    top: '-60px',
    left: '-50px',
    width: '170px',
    height: '170px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.09)',
  },
  missionTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  missionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
  },
  missionLabel: {
    fontSize: '11.5px',
    fontWeight: 800,
    letterSpacing: '0.14em',
    color: '#ffffff',
  },
  missionBadge: {
    background: 'rgba(255, 255, 255, 0.22)',
    borderRadius: '999px',
    padding: '4px 13px',
    fontSize: '12.5px',
    fontWeight: 800,
    color: '#ffffff',
  },
  missionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '13px',
  },
  missionEmoji: {
    fontSize: '38px',
    lineHeight: 1,
    flexShrink: 0,
    filter: 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.25))',
  },
  missionTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 800,
    fontFamily: 'var(--font-display)',
    lineHeight: 1.2,
    color: '#ffffff',
  },
  missionSub: {
    margin: '4px 0 0',
    fontSize: '12px',
    lineHeight: 1.45,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  missionDate: {
    margin: '14px 0 4px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  stepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '16px',
    padding: '12px 14px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.2s ease',
    fontFamily: 'var(--font-title)',
  },
  stepCircle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: {
    fontSize: '13px',
    lineHeight: 1.4,
    color: '#ffffff',
    transition: 'all 0.2s ease',
  },
  missionTrack: {
    height: '10px',
    borderRadius: '5px',
    background: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    margin: '14px 0 12px',
  },
  missionFill: {
    height: '100%',
    borderRadius: '5px',
    background: '#FBBF24',
    transition: 'width 0.45s ease',
  },
  completeBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    borderRadius: '18px',
    border: 'none',
    fontFamily: 'var(--font-title)',
    fontSize: '14px',
    fontWeight: 800,
    transition: 'all 0.25s ease',
  },

  celebrateEmoji: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
  },
  celebrateIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 10px',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
  },
  missionDoneTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 800,
    fontFamily: 'var(--font-display)',
    color: '#ffffff',
    textAlign: 'center',
  },
  missionDoneSub: {
    margin: '6px 0 0',
    fontSize: '13px',
    lineHeight: 1.5,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  weekStrip: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '4px',
    margin: '18px 0 4px',
  },
  weekCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
  },
  weekDot: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDay: {
    fontSize: '9.5px',
    fontWeight: 700,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  missionDoneHint: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    margin: '10px 0 0',
    fontSize: '12px',
    fontWeight: 700,
    color: '#0c1810',
    background: 'rgba(255, 255, 255, 0.85)',
    borderRadius: '14px',
    padding: '9px 14px',
  },

  nextCard: {
    padding: '18px',
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '11.5px',
    fontWeight: 800,
    letterSpacing: '0.14em',
    color: 'var(--text-secondary)',
  },
  nextRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 4px',
    borderBottom: '1px dashed var(--border-color)',
  },
  nextEmoji: {
    fontSize: '22px',
    flexShrink: 0,
  },
  nextTitle: {
    margin: 0,
    fontSize: '13.5px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.35,
  },
  nextDate: {
    margin: '2px 0 0',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  emptyText: {
    margin: 0,
    fontSize: '12.5px',
    lineHeight: 1.5,
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '10px 4px',
  },
};