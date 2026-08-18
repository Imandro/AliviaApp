import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldAlert,
  Phone,
  Bot,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  History,
  ArrowRight,
  HeartPulse,
  CalendarClock,
} from 'lucide-react';
import {
  getMyAssessments,
  saveAssessment,
  logCrisisContact,
  overallLevel,
  isCrisisLevel,
  levelOf,
  LEVEL_INFO,
  DIMENSION_INFO,
  type AssessmentRecord,
  type DimensionKey,
  type LevelKey,
} from '../utils/assessment';
import {
  TEST_QUESTIONS,
  ANSWER_OPTIONS,
  DIMENSION_LABELS,
  buildRecommendations,
  planAreasFor,
  toolLinksFor,
  composeAiPrompt,
} from '../utils/assessmentTest';
import { getAiReplyHybrid } from '../utils/aiProvider';
import {
  CRISIS_COUNTRIES,
  CRISIS_COUNTRY_LABELS,
  CRISIS_LINES,
  crisisHref,
  type CrisisCountry,
} from '../utils/crisisLines';

type Screen = 'intro' | 'questions' | 'results' | 'history';
type Scores = Record<DimensionKey, number>;

const SUMMARY_KEY = 'alivia-assessment-context';

const emptyScores = (): Scores => ({ stress: 0, anxiety: 0, depression: 0 });

export const AssessmentView: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('intro');
  const [answers, setAnswers] = useState<number[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<(AssessmentRecord & { ai_source?: string }) | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [contactCountry, setContactCountry] = useState<CrisisCountry>('NI');
  const [toast, setToast] = useState('');

  useEffect(() => {
    getMyAssessments().then((a) => {
      setRecords(a);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((text: string) => setToast(text), []);

  const scores = (): Scores => {
    const s = emptyScores();
    TEST_QUESTIONS.forEach((q, i) => {
      s[q.dimension] += (answers[i] ?? 0);
    });
    return s;
  };

  const q = TEST_QUESTIONS[qIndex];
  const progress = (answers.length / TEST_QUESTIONS.length) * 100;

  const handleSelect = (value: number) => {
    const next = [...answers];
    next[qIndex] = value;
    setAnswers(next);
    if (qIndex < TEST_QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      finish(next);
    }
  };

  const finish = async (finalAnswers: number[]) => {
    const counts = emptyScores();
    TEST_QUESTIONS.forEach((qq, i) => {
      counts[qq.dimension] += (finalAnswers[i] ?? 0);
    });

    const level: LevelKey = overallLevel(counts);
    const crisis = isCrisisLevel(counts);
    const recommendations = buildRecommendations(counts);
    const saved = await saveAssessment({
      stress: counts.stress,
      anxiety: counts.anxiety,
      depression: counts.depression,
      level,
      crisis,
      recommendations,
    });

    setLastResult(saved);
    setScreen('results');

    if (crisis) {
      try {
        sessionStorage.setItem(
          SUMMARY_KEY,
          `Resultado del último chequeo en nivel elevado (estrés ${counts.stress}/15, ansiedad ${counts.anxiety}/15, depresión ${counts.depression}/15).`
        );
      } catch {
        /* noop */
      }
    }

    setAiLoading(true);
    const reply = await getAiReplyHybrid(composeAiPrompt(counts), []);
    if (saved && saved.id && reply) {
      setLastResult((prev) => (prev ? { ...prev, ai_advice: reply.text, ai_source: reply.source } : prev));
      setRecords((prev) =>
        prev.map((r) => (r.id === saved.id ? { ...r, ai_advice: reply.text } : r))
      );
      await saveAssessment({
        id: saved.id,
        stress: counts.stress,
        anxiety: counts.anxiety,
        depression: counts.depression,
        level,
        crisis,
        recommendations,
        ai_advice: reply.text,
      });
    } else if (saved) {
      setRecords((prev) => [saved, ...prev]);
    }
    setAiLoading(false);
  };

  const handleHelpline = (phone: string, name: string) => {
    logCrisisContact(lastResult?.id ?? null, 'helpline', `${name} · ${phone}`);
    showToast('Contacto registrado. Estás haciendo lo correcto ');
  };

  const handleVia = () => {
    logCrisisContact(lastResult?.id ?? null, 'via', 'Abrir chat VIA desde resultados del chequeo');
    navigate('/chat');
  };

  const goToPlans = (area?: string) => {
    navigate(area ? `/plans?area=${encodeURIComponent(area)}` : '/plans');
  };

  const resetTest = () => {
    setAnswers([]);
    setQIndex(0);
    setScreen('intro');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spin" style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(var(--accent-gold-rgb), 0.2)', borderTopColor: 'var(--accent-gold)' }} />
      </div>
    );
  }

  /* ---------------- INTRO ---------------- */
  if (screen === 'intro') {
    const last = records[0] ?? null;
    const due = !last || Math.floor((Date.now() - new Date(last.created_at).getTime()) / 86400000) >= 5;
    return (
      <div className="fade-in flex flex-col gap-4" style={{ paddingBottom: '90px' }}>
        <div className="glass-card flex flex-col gap-3" style={styles.heroCard}>
          <div style={styles.heroHeader}>
            <div style={styles.heroIcon}>
              <HeartPulse size={18} color="var(--accent-gold)" />
            </div>
            <div>
              <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>CHEQUEO DE BIENESTAR</h3>
              <p className="body-standard" style={{ fontSize: '11px', opacity: 0.7 }}>Estrés · Ansiedad · Depresión</p>
            </div>
          </div>
          <p className="body-standard" style={{ fontSize: '12.5px', lineHeight: 1.55, opacity: 0.85 }}>
            Un test corto e interactivo para observar cómo van tus emociones en los últimos días.
            El resultado se guarda en tu perfil y, según tu nivel, te recomendamos planes y herramientas.
          </p>
          <div style={styles.infoChipRow}>
            <span style={styles.infoChip}><CalendarClock size={12} /> Cada 5 días · 15 preguntas</span>
            <span style={styles.infoChip}><ShieldAlert size={12} /> Confidencial y sin juicios</span>
          </div>

          {last && (
            <div style={styles.lastRow}>
              <span>Último chequeo: <b>{formatDate(last.created_at)}</b></span>
              {!due && (
                <span style={{ color: 'var(--accent-sage)' }}>
                  Próximo en {5 - Math.floor((Date.now() - new Date(last.created_at).getTime()) / 86400000)} día(s)
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => setScreen('questions')}
            className="btn-primary"
            style={{ padding: '13px', borderRadius: '15px', fontSize: '13.5px', marginTop: '6px' }}
            disabled={saving}
          >
            <Sparkles size={15} />
            {last && !due ? 'Repetir chequeo' : 'Empezar chequeo'}
          </button>

          <button onClick={() => setScreen('history')} style={styles.linkBtn}>
            <History size={13} /> Ver historial de chequeos
          </button>
        </div>

        <div className="glass-card flex flex-col gap-2" style={{ padding: '16px' }}>
          <p style={styles.sectionLabel}>QUÉ MIDO EN ESTE CHEQUEO</p>
          <DimRow dim="stress" />
          <DimRow dim="anxiety" />
          <DimRow dim="depression" />
          <p className="body-standard" style={{ fontSize: '10.5px', opacity: 0.6, marginTop: '6px' }}>
            Esto es una autoobservación para orientarte, no sustituye la evaluación de un profesional.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------- PREGUNTAS ---------------- */
  if (screen === 'questions') {
    const dimInfo = DIMENSION_INFO[q.dimension];
    return (
      <div className="fade-in flex flex-col gap-4" style={{ paddingBottom: '90px' }}>
        <div className="glass-card" style={styles.quizCard}>
          <div style={styles.quizTop}>
            <button onClick={() => (qIndex === 0 ? setScreen('intro') : setQIndex(qIndex - 1))} style={styles.backBtn} title="Atrás">
              <ChevronLeft size={18} />
            </button>
            <div style={styles.quizCount}>
              Pregunta {qIndex + 1} de {TEST_QUESTIONS.length}
            </div>
            <span style={{ ...styles.dimChip, color: dimInfo.label === 'Estrés' ? 'var(--accent-warm)' : dimInfo.label === 'Ansiedad' ? 'var(--accent-gold)' : 'var(--accent-lavender)' }}>
              {dimInfo.emoji} {DIMENSION_LABELS[q.dimension]}
            </span>
          </div>

          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>

          <div style={styles.questionBlock}>
            <p style={styles.questionText}>{q.text}</p>
            <p style={styles.questionHint}>Durante la última semana…</p>
          </div>

          <div style={styles.optionsColumn}>
            {ANSWER_OPTIONS.map((opt) => {
              const active = answers[qIndex] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    ...styles.optionBtn,
                    background: active ? 'rgba(var(--accent-gold-rgb), 0.14)' : 'rgba(255,255,255,0.03)',
                    borderColor: active ? 'rgba(var(--accent-gold-rgb), 0.4)' : 'var(--border-color)',
                  }}
                >
                  <span style={styles.optionDot}>
                    {active ? <CheckCircle2 size={16} color="var(--accent-gold)" /> : <span style={styles.optionDotEmpty} />}
                  </span>
                  <span style={{ ...styles.optionLabel, color: active ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- RESULTADOS ---------------- */
  if (screen === 'results') {
    const res = lastResult;
    if (!res) {
      return (
        <div className="glass-card flex flex-col items-center gap-3" style={{ padding: '28px', textAlign: 'center' }}>
          <p className="body-standard" style={{ fontSize: '12.5px' }}>No se pudo guardar el resultado. Intenta de nuevo.</p>
          <button onClick={resetTest} className="btn-primary">Volver</button>
        </div>
      );
    }
    const s: Scores = { stress: res.stress, anxiety: res.anxiety, depression: res.depression };
    const level = res.level;
    const levelInfo = LEVEL_INFO[level];
    const links = toolLinksFor(s);
    const areas = planAreasFor(s);
    const crisis = res.crisis;
    const helplines = CRISIS_LINES[contactCountry];

    return (
      <div className="fade-in flex flex-col gap-4" style={{ paddingBottom: '90px' }}>
        {toast && (
          <div style={styles.toast}>
            <CheckCircle2 size={14} color="var(--accent-sage)" /> {toast}
          </div>
        )}

        <div className="glass-card flex flex-col items-center gap-2" style={{ ...styles.resultHero, borderColor: `rgba(${levelInfo.rgb}, 0.35)`, background: `linear-gradient(135deg, rgba(${levelInfo.rgb}, 0.12) 0%, rgba(0,0,0,0) 100%)` }}>
          <div style={{ fontSize: '38px', lineHeight: 1 }}>{crisis ? '⚠' : level === 'baja' ? '✾' : level === 'moderada' ? '◐' : '⚠'}</div>
          <h3 className="title-medium" style={{ fontSize: '20px', color: 'var(--text-primary)', margin: '6px 0 0' }}>
            Índice general: <span style={{ color: levelInfo.color }}>{levelInfo.label}</span>
          </h3>
          <p className="body-standard" style={{ fontSize: '11.5px', opacity: 0.7, textAlign: 'center', maxWidth: '300px' }}>
            Chequeo guardado en tu perfil · {formatDate(res.created_at)}
          </p>
        </div>

        <div style={styles.dimsColumn}>
          {(['stress', 'anxiety', 'depression'] as DimensionKey[]).map((dim) => {
            const dInfo = DIMENSION_INFO[dim];
            const dLevel = levelOf(res[dim]);
            const dInfoL = LEVEL_INFO[dLevel];
            return (
              <div key={dim} className="glass-card" style={styles.dimCard}>
                <div style={styles.dimCardTop}>
                  <span style={styles.dimEmoji}>{dInfo.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={styles.dimLabel}>{dInfo.label}</p>
                    <p style={styles.dimScore}>{res[dim]} / 15</p>
                  </div>
                  <span style={{ ...styles.levelChip, color: dInfoL.color, borderColor: `rgba(${dInfoL.rgb}, 0.4)`, background: `rgba(${dInfoL.rgb}, 0.12)` }}>
                    {dInfoL.label}
                  </span>
                </div>
                <div style={styles.dimBar}>
                  <div style={{ width: `${(res[dim] / 15) * 100}%`, background: dInfoL.color }} />
                </div>
              </div>
            );
          })}
        </div>

        {crisis && (
          <div className="glass-card flex flex-col gap-3" style={styles.crisisCard}>
            <div style={styles.crisisTitle}>
              <ShieldAlert size={16} color="#ff8a80" />
              <h4 className="title-medium" style={{ fontSize: '14px', color: '#ff8a80', margin: 0 }}>
                TU ÍNDICE ESTÁ MUY ALTO HOY
              </h4>
            </div>
            <p className="body-standard" style={{ fontSize: '12px', lineHeight: 1.5, opacity: 0.85 }}>
              Cuando una señal sube así, el apoyo humano real es lo que más ayuda. No estás exagerando:
              es un buen momento para hablar con alguien. Elige tu país y llama a una línea gratuita, o conversa con VIA ahora.
            </p>

            <div style={styles.countryRow}>
              <span style={styles.countryLabel}>PAÍS</span>
              <select
                value={contactCountry}
                onChange={(e) => setContactCountry(e.target.value as CrisisCountry)}
                style={styles.countrySelect}
              >
                {CRISIS_COUNTRIES.map((c) => (
                  <option key={c} value={c}>{CRISIS_COUNTRY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <div style={styles.helplineList}>
              {helplines.map((line, i) => (
                <a
                  key={i}
                  href={crisisHref(line)}
                  target={line.type === 'call' ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  onClick={() => handleHelpline(line.phone, line.name)}
                  style={styles.helplineBtn}
                >
                  <Phone size={14} color="#ff8a80" />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={styles.helplineName}>{line.name}</span>
                    <span style={styles.helplineDesc}>{line.phone} · Línea gratuita</span>
                  </span>
                  <ChevronRight size={14} color="#ff8a80" />
                </a>
              ))}
            </div>

            <a href="tel:911" onClick={() => handleHelpline('911', 'Emergencias 911')} style={styles.nineOneOne}>
              <ShieldAlert size={15} color="#ffcdd2" />
              <span style={{ fontSize: '11.5px' }}>Si hay peligro inmediato, llama ahora al <b>911</b></span>
            </a>

            <button onClick={handleVia} className="btn-primary" style={styles.viaBtn}>
              <Bot size={15} /> Hablar ahora con VIA
            </button>
          </div>
        )}

        <div className="glass-card flex flex-col gap-3" style={{ padding: '16px' }}>
          <p style={styles.sectionLabel}>RECOMENDACIONES PARA TI</p>

          {res.recommendations.length === 0 ? (
            <div style={styles.recRow}><span style={styles.recEmoji}>✦</span><span style={styles.recText}>Sigue con tus rutinas y cuídate con los pequeños hábitos que ya tienes.</span></div>
          ) : (
            res.recommendations.slice(0, 4).map((r, i) => (
              <div key={i} style={styles.recRow}><span style={styles.recEmoji}>✦</span><span style={styles.recText}>{r}</span></div>
            ))
          )}
        </div>

        <div className="glass-card flex flex-col gap-3" style={{ padding: '16px' }}>
          <p style={styles.sectionLabel}>PLANES RECOMENDADOS SEGÚN TU RESULTADO</p>
          {areas.length === 0 ? (
            <p className="body-standard" style={{ fontSize: '12px', opacity: 0.7 }}>
              Tus niveles están estables: un plan de bienestar general te ayuda a mantenerlo.
            </p>
          ) : (
            <div style={styles.planChipRow}>
              {areas.map((a) => (
                <button key={a} onClick={() => goToPlans(a)} style={styles.planChip}>
                  <CheckCircle2 size={13} color="var(--accent-gold)" />
                  Plan: {a}
                  <ArrowRight size={11} />
                </button>
              ))}
            </div>
          )}
          <button onClick={() => goToPlans()} className="btn-secondary" style={{ padding: '11px', borderRadius: '13px', fontSize: '12.5px' }}>
            Ver todos mis planes
          </button>
        </div>

        {links.length > 0 && (
          <div className="glass-card flex flex-col gap-2" style={{ padding: '16px' }}>
            <p style={styles.sectionLabel}>HERRAMIENTAS QUE TE AYUDAN HOY</p>
            <div style={styles.toolsRow}>
              {links.filter((l) => l.path !== '/plans').map((l, i) => (
                <button key={i} onClick={() => navigate(l.path)} style={styles.toolChip}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {res.ai_advice && (
          <div className="glass-card flex flex-col gap-2" style={styles.aiCard}>
            <div style={styles.aiHeader}>
              <span style={styles.aiIcon}><Bot size={13} color="#0c1810" /></span>
              <span style={styles.aiLabel}>VIA TE ACOMPAÑA</span>
              {aiLoading && <span style={{ fontSize: '10px', opacity: 0.5 }}>…</span>}
            </div>
            <p className="body-standard" style={{ fontSize: '12.5px', lineHeight: 1.55, opacity: 0.9 }}>{res.ai_advice}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={resetTest} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '14px', fontSize: '12.5px' }}>
            Repetir chequeo
          </button>
          <button onClick={() => setScreen('history')} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '14px', fontSize: '12.5px' }}>
            <History size={14} /> Historial
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- HISTORIAL ---------------- */
  return (
    <div className="fade-in flex flex-col gap-4" style={{ paddingBottom: '90px' }}>
      <div className="glass-card flex flex-col gap-2" style={{ padding: '16px' }}>
        <div style={styles.heroHeader}>
          <div style={styles.heroIcon}><History size={16} color="var(--accent-gold)" /></div>
          <div>
            <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>HISTORIAL DE CHEQUEOS</h3>
            <p className="body-standard" style={{ fontSize: '11px', opacity: 0.7 }}>Tu evolución emocional, cada 5 días</p>
          </div>
        </div>
        <button onClick={() => setScreen('intro')} className="btn-primary" style={{ marginTop: '8px', padding: '12px', borderRadius: '13px', fontSize: '12.5px' }}>
          <Sparkles size={14} /> Nuevo chequeo
        </button>
      </div>

      {records.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2" style={{ padding: '28px', textAlign: 'center' }}>
          <HeartPulse size={26} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          <p className="body-standard" style={{ fontSize: '12px', opacity: 0.65 }}>
            Aún no tienes chequeos. El primero es tu punto de partida.
          </p>
        </div>
      ) : (
        records.map((r) => {
          const lv = LEVEL_INFO[r.level];
          const crisis = r.crisis;
          return (
            <div key={r.id} className="glass-card" style={{ ...styles.histCard, borderLeft: `3px solid ${crisis ? '#ef4444' : lv.color}` }}>
              <div style={styles.histTop}>
                <span style={styles.histDate}>{formatDate(r.created_at)}</span>
                <span style={{ ...styles.levelChip, color: lv.color, borderColor: `rgba(${lv.rgb}, 0.4)`, background: `rgba(${lv.rgb}, 0.12)` }}>
                  {crisis ? 'Elevado' : lv.label}
                </span>
              </div>
              <div style={styles.histScores}>
                {(['stress', 'anxiety', 'depression'] as DimensionKey[]).map((dim) => (
                  <span key={dim} style={styles.histScore}>
                    {DIMENSION_INFO[dim].emoji} {DIMENSION_INFO[dim].short}: <b>{r[dim]}/15</b>
                  </span>
                ))}
              </div>
              {r.recommendations.length > 0 && (
                <p style={styles.histRec}>{r.recommendations[0].split('·')[0].trim()}</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DimRow = ({ dim }: { dim: DimensionKey }) => {
  const info = DIMENSION_INFO[dim];
  const color =
    dim === 'stress' ? 'var(--accent-warm)' : dim === 'anxiety' ? 'var(--accent-gold)' : 'var(--accent-lavender)';
  return (
    <div style={styles.dimRow}>
      <span style={{ ...styles.dimRowEmoji, background: `rgba(var(--accent-gold-rgb), 0.08)` }}>{info.emoji}</span>
      <span style={styles.dimRowLabel}>{info.label}</span>
      <span style={{ fontSize: '10px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        15 preguntas · escala 0-15
      </span>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  heroCard: {
    padding: '18px',
    background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.08) 0%, rgba(var(--accent-warm-rgb), 0.04) 100%)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
  },
  heroHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  heroIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '14px',
    background: 'rgba(var(--accent-gold-rgb), 0.13)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoChipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  infoChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '10.5px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-color)',
    borderRadius: '999px',
    padding: '5px 11px',
  },
  lastRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.03)',
    border: '1px dashed var(--border-color)',
    borderRadius: '12px',
    padding: '9px 12px',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px',
    textDecoration: 'underline',
  },
  sectionLabel: {
    margin: 0,
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    color: 'var(--accent-gold)',
    textTransform: 'uppercase',
  },
  dimRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
  },
  dimRowEmoji: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    flexShrink: 0,
  },
  dimRowLabel: {
    flex: 1,
    fontSize: '13.5px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },

  quizCard: {
    padding: '18px 16px',
    minHeight: '380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  quizTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: '11px',
    width: '34px',
    height: '34px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  quizCount: {
    flex: 1,
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
  },
  dimChip: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    padding: '4px 9px',
    borderRadius: '999px',
  },
  progressTrack: {
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, var(--accent-sage), var(--accent-gold))',
    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  questionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  questionText: {
    margin: 0,
    fontSize: '17px',
    lineHeight: 1.4,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.2px',
  },
  questionHint: {
    margin: 0,
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  optionsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '13px 14px',
    borderRadius: '15px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'var(--font-title)',
    textAlign: 'left',
    width: '100%',
  },
  optionDot: {
    width: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionDotEmpty: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid var(--border-color)',
  },
  optionLabel: {
    fontSize: '13.5px',
    fontWeight: 700,
  },

  resultHero: {
    padding: '22px 16px',
    textAlign: 'center',
  },
  dimsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  dimCard: {
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  dimCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  dimEmoji: {
    fontSize: '22px',
    flexShrink: 0,
  },
  dimLabel: {
    margin: 0,
    fontSize: '12.5px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },
  dimScore: {
    margin: '1px 0 0',
    fontSize: '10.5px',
    color: 'var(--text-muted)',
  },
  levelChip: {
    fontSize: '10.5px',
    fontWeight: 800,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid',
  },
  dimBar: {
    height: '7px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },

  crisisCard: {
    background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.12) 0%, rgba(198, 40, 40, 0.05) 100%)',
    border: '1px solid rgba(211, 47, 47, 0.3)',
    padding: '16px',
  },
  crisisTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
  },
  countryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  countryLabel: {
    fontSize: '9.5px',
    fontWeight: 800,
    letterSpacing: '0.14em',
    color: 'var(--text-muted)',
  },
  countrySelect: {
    flex: 1,
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(211,47,47,0.3)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
    fontSize: '12px',
    padding: '7px 10px',
    outline: 'none',
    cursor: 'pointer',
  },
  helplineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  helplineBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '13px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(211,47,47,0.25)',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
  helplineName: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },
  helplineDesc: {
    display: 'block',
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  nineOneOne: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    fontSize: '12px',
    color: '#ffcdd2',
    textDecoration: 'none',
    padding: '8px',
    borderRadius: '12px',
    background: 'rgba(211,47,47,0.15)',
    border: '1px solid rgba(211,47,47,0.3)',
  },
  viaBtn: {
    width: '100%',
  },

  recRow: {
    display: 'flex',
    gap: '9px',
    alignItems: 'flex-start',
  },
  recEmoji: {
    fontSize: '13px',
    flexShrink: 0,
    marginTop: '1px',
  },
  recText: {
    fontSize: '12.5px',
    lineHeight: 1.5,
    color: 'var(--text-secondary)',
  },
  planChipRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  planChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 13px',
    borderRadius: '13px',
    background: 'rgba(var(--accent-gold-rgb), 0.08)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
    color: 'var(--accent-gold)',
    fontSize: '12.5px',
    fontWeight: 700,
    fontFamily: 'var(--font-title)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  toolsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  toolChip: {
    padding: '8px 13px',
    borderRadius: '999px',
    border: '1px solid rgba(var(--accent-sage-rgb), 0.3)',
    background: 'rgba(var(--accent-sage-rgb), 0.1)',
    color: 'var(--accent-sage)',
    fontSize: '11.5px',
    fontWeight: 700,
    fontFamily: 'var(--font-title)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  aiCard: {
    padding: '14px 16px',
    background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.1) 0%, rgba(var(--accent-sage-rgb), 0.06) 100%)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.2)',
  },
  aiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  aiIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '8px',
    background: 'var(--accent-gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLabel: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.14em',
    color: 'var(--accent-gold)',
  },

  histCard: {
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  histTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  histDate: {
    fontSize: '12.5px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },
  histScores: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  histScore: {
    fontSize: '10.5px',
    color: 'var(--text-secondary)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-color)',
    borderRadius: '999px',
    padding: '4px 9px',
  },
  histRec: {
    margin: 0,
    fontSize: '11px',
    lineHeight: 1.4,
    color: 'var(--text-muted)',
  },
  toast: {
    position: 'fixed',
    top: '76px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 60,
    background: 'var(--bg-nav)',
    border: '1px solid rgba(var(--accent-sage-rgb), 0.3)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: 600,
    padding: '10px 18px',
    borderRadius: '999px',
    boxShadow: 'var(--shadow-main)',
    maxWidth: '86vw',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
  },
};