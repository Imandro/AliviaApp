/* ----------------------------------------------------
   ALIVIA - GUÍA INTERACTIVA (GuideView)
   Lectura inmersiva juvenil: progreso de lectura, pasos,
   checklist de retos, mini-quiz con retroalimentación y
   celebración al completar. Progreso guardado localmente.
   ---------------------------------------------------- */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Clock, Flame, Heart, PartyPopper, RotateCcw, Sparkles } from 'lucide-react';
import { GUIDES, type GuideBlock } from '../utils/libraryContent';
import {
  getLibraryItem,
  getGuideMinutes,
  guidePrimaryCategory,
  CATEGORY_BIG_EMOJI,
  CATEGORY_RGB,
  CATEGORY_META,
} from '../utils/libraryItems';

interface Progress {
  checks: number[];
  quiz: number | null;
}

const ProgKey = (id: string) => `alivia-guide-prog-${id}`;
const DoneKey = 'alivia-guides-done';

const loadProg = (id: string): Progress => {
  try {
    const raw = localStorage.getItem(ProgKey(id));
    if (raw) {
      const p = JSON.parse(raw);
      return { checks: Array.isArray(p.checks) ? p.checks : [], quiz: typeof p.quiz === 'number' ? p.quiz : null };
    }
  } catch { /* sin progreso previo */ }
  return { checks: [], quiz: null };
};

const loadDone = (): string[] => {
  try {
    const raw = localStorage.getItem(DoneKey);
    if (raw) return JSON.parse(raw);
  } catch { /* vacío */ }
  return [];
};

const toIndex = (b: number, i: number) => b * 100 + i;

export const GuideView: React.FC = () => {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const item = getLibraryItem(id);
  const guide = GUIDES[id];

  const [prog, setProg] = useState<Progress>(() => loadProg(id));
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [celebrate, setCelebrate] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProg(loadProg(id));
    setPicks({});
    setCelebrate(false);
    setJustDone(false);
    setScrollPct(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [id]);

  const blocks: GuideBlock[] = guide?.blocks ?? [];
  const totalChecks = useMemo(
    () => blocks.reduce((n, b) => n + (b.kind === 'check' ? (b.items?.length ?? 0) : 0), 0),
    [blocks],
  );

  useEffect(() => {
    localStorage.setItem(ProgKey(id), JSON.stringify(prog));
  }, [prog, id]);

  const total = totalChecks + 1;
  const doneCount = prog.checks.length + (prog.quiz !== null ? 1 : 0);
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isComplete = total > 0 && doneCount >= total;
  const alreadyDone = useMemo(() => loadDone().includes(id), [id]);
  const stateFinished = isComplete || justDone || alreadyDone;

  const toggleCheck = useCallback((bi: number, ci: number) => {
    const idx = toIndex(bi, ci);
    setProg(p => ({
      checks: p.checks.includes(idx) ? p.checks.filter(c => c !== idx) : [...p.checks, idx],
      quiz: p.quiz,
    }));
  }, []);

  const handleQuizPick = useCallback((bi: number, answer: number) => {
    setPicks(p => ({ ...p, [bi]: answer }));
    const q = blocks[bi]?.quiz;
    if (q && answer === q.answer) {
      setProg(p => (p.quiz === bi ? p : { checks: p.checks, quiz: bi }));
    }
  }, [blocks]);

  const handleOnScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setScrollPct(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0);
  }, []);

  const finishGuide = useCallback(() => {
    if (!item) return;
    try {
      const done = new Set(loadDone());
      done.add(item.id);
      localStorage.setItem(DoneKey, JSON.stringify([...done]));
    } catch { /* noop */ }
    setJustDone(true);
    setCelebrate(true);
  }, [item]);

  if (!item || !guide) {
    return (
      <div className="fade-in glass-card flex flex-col items-center gap-4 text-center" style={{ padding: '32px 20px' }}>
        <p className="body-standard" style={{ fontSize: '13px' }}>No encontramos esa guía 🤷</p>
        <button onClick={() => navigate('/library')} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
          Volver a la biblioteca
        </button>
      </div>
    );
  }

  const cat = guidePrimaryCategory(item);
  const rgb = CATEGORY_RGB[cat];
  const bigEmoji = CATEGORY_BIG_EMOJI[cat];
  const minutes = getGuideMinutes(id);
  const catMeta = CATEGORY_META[cat];
  const catLabel = catMeta ? `${catMeta.emoji} ${cat}` : cat;
  const progBarColor = cat === 'suicidio' || cat === 'depresion'
    ? '#e57373'
    : cat === 'bienestar' || cat === 'amistades'
      ? 'var(--accent-sage)'
      : 'var(--accent-gold)';

  return (
    <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Barra superior: volver + título + tiempo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          style={{
            width: '36px', height: '36px', borderRadius: '12px', border: '1px solid var(--border-color)',
            background: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={17} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', fontFamily: 'var(--font-title)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {catLabel} · {item.type}
          </div>
          <div style={{ fontSize: '13.5px', fontFamily: 'var(--font-title)', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.title}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: 'var(--text-muted)',
          fontFamily: 'var(--font-title)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)',
          padding: '5px 9px', borderRadius: '10px', flexShrink: 0,
        }}>
          <Clock size={11} /> {minutes} min
        </div>
      </div>

      {/* Progreso de lectura */}
      <div style={{ position: 'relative', height: '3px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{
          height: '100%', borderRadius: '3px', background: `linear-gradient(90deg, var(--accent-gold), ${progBarColor})`,
          transition: 'width 0.2s ease', width: `${scrollPct}%`,
        }} />
      </div>

      {/* Contenido scrolleable */}
      <div
        ref={scrollRef}
        onScroll={handleOnScroll}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '14px 0 24px', overscrollBehavior: 'contain' }}
      >
        {/* HERO */}
        <div
          style={{
            borderRadius: '28px', padding: '22px 20px', marginBottom: '18px', position: 'relative', overflow: 'hidden',
            background: `linear-gradient(150deg, rgba(${rgb}, 0.22) 0%, rgba(${rgb}, 0.05) 45%, rgba(0,0,0,0.25) 100%)`,
            border: `1px solid rgba(${rgb}, 0.28)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: '10px', display: 'inline-block', animation: 'softFloat 4s ease-in-out infinite' }}>
                {bigEmoji}
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '21px', lineHeight: 1.2,
                color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0,
              }}>
                {item.title}
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-title)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                MI AVANCE
              </div>
              <div style={{ fontSize: '30px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1.15 }}>
                {pct}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {doneCount}/{total} retos
              </div>
            </div>
          </div>

          {stateFinished && (
            <div style={{
              marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px',
              borderRadius: '14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              fontSize: '12px', fontFamily: 'var(--font-title)', color: 'var(--text-primary)', fontWeight: 500,
            }}>
              <PartyPopper size={15} color="var(--accent-gold)" />
              ¡Guía completada! Vuelve a ella cuando lo necesites.
            </div>
          )}
        </div>

        {/* BLOQUES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {blocks.map((block, bi) => {
            switch (block.kind) {
              case 'intro':
                return (
                  <p key={bi} style={{
                    fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '14.5px', lineHeight: 1.65,
                    color: 'var(--text-primary)', opacity: 0.92, margin: 0,
                  }}>
                    {block.text}
                  </p>
                );

              case 'steps':
                return (
                  <div key={bi} className="glass-card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '13px', flexShrink: 0, display: 'flex',
                        justifyContent: 'center', alignItems: 'center', fontSize: '19px',
                        background: `rgba(${rgb}, 0.14)`, border: `1px solid rgba(${rgb}, 0.25)`,
                      }}>
                        {block.emoji ?? '✦'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)', margin: 0, marginBottom: '3px' }}>
                          {block.title}
                        </h4>
                        <p className="body-standard" style={{ fontSize: '12.5px', lineHeight: 1.6, opacity: 0.78, margin: 0 }}>
                          {block.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );

              case 'check':
                return (
                  <div key={bi} className="glass-card" style={{ padding: '16px' }}>
                    <div className="flex gap-2 items-center" style={{ marginBottom: '10px' }}>
                      <Flame size={14} color="var(--accent-gold)" />
                      <span style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '12px', letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Tu reto de hoy
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(block.items ?? []).map((text, ci) => {
                        const idx = toIndex(bi, ci);
                        const checked = prog.checks.includes(idx);
                        return (
                          <button
                            key={ci}
                            onClick={() => toggleCheck(bi, ci)}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: '10px', textAlign: 'left', cursor: 'pointer',
                              padding: '11px 12px', borderRadius: '14px', width: '100%',
                              background: checked ? `rgba(${rgb}, 0.1)` : 'rgba(0,0,0,0.15)',
                              border: checked ? `1px solid rgba(${rgb}, 0.3)` : '1px solid var(--border-color)',
                              transition: 'all 0.25s ease',
                            }}
                          >
                            <span style={{
                              width: '20px', height: '20px', borderRadius: '7px', flexShrink: 0, marginTop: '1px',
                              display: 'flex', justifyContent: 'center', alignItems: 'center',
                              background: checked ? 'var(--accent-sage)' : 'rgba(0,0,0,0.25)',
                              border: checked ? 'none' : '1px solid var(--border-color)',
                              color: checked ? '#0c1810' : 'transparent',
                              transition: 'all 0.25s ease',
                            }}>
                              <Check size={13} strokeWidth={3.5} />
                            </span>
                            <span style={{
                              fontSize: '12.5px', lineHeight: 1.5, color: checked ? 'var(--text-secondary)' : 'var(--text-primary)',
                              textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.65 : 1,
                            }}>
                              {text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );

              case 'quiz': {
                const q = block.quiz!;
                const answered = prog.quiz === bi;
                const pick = picks[bi];
                const wrongPick = !answered && pick !== undefined && pick !== q.answer;

                return (
                  <div key={bi} className="glass-card" style={{ padding: '16px' }}>
                    <div className="flex gap-2 items-center" style={{ marginBottom: '10px' }}>
                      <Sparkles size={14} color="var(--accent-gold)" />
                      <span style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '12px', letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Mini-test mental
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-title)', fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0, marginBottom: '10px' }}>
                      {q.q}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {q.options.map((opt, oi) => {
                        const isCorrect = answered && oi === q.answer;
                        const isWrongPick = wrongPick && oi === pick;
                        const dimmed = answered && oi !== q.answer;
                        return (
                          <button
                            key={oi}
                            disabled={answered}
                            onClick={() => handleQuizPick(bi, oi)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '9px', textAlign: 'left', cursor: answered ? 'default' : 'pointer',
                              padding: '11px 12px', borderRadius: '14px', width: '100%',
                              background: isCorrect ? 'rgba(140, 176, 141, 0.16)' : isWrongPick ? 'rgba(232, 196, 201, 0.14)' : 'rgba(0,0,0,0.15)',
                              border: isCorrect ? '1px solid rgba(140, 176, 141, 0.4)' : isWrongPick ? '1px solid rgba(232, 196, 201, 0.35)' : '1px solid var(--border-color)',
                              opacity: dimmed ? 0.45 : 1,
                              transition: 'all 0.25s ease',
                              fontFamily: 'var(--font-body)', fontSize: '12.5px', lineHeight: 1.45, color: 'var(--text-primary)',
                            }}
                          >
                            <span style={{
                              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, display: 'flex',
                              justifyContent: 'center', alignItems: 'center', fontSize: '11px', fontFamily: 'var(--font-title)',
                              background: isCorrect ? 'var(--accent-sage)' : isWrongPick ? 'var(--accent-rose)' : 'rgba(255,255,255,0.08)',
                              color: isCorrect || isWrongPick ? '#0c1810' : 'var(--text-muted)',
                            }}>
                              {isCorrect ? <Check size={12} strokeWidth={3.5} /> : isWrongPick ? '✕' : String.fromCharCode(65 + oi)}
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {answered && (
                      <div className="fade-in" style={{
                        marginTop: '10px', padding: '11px 13px', borderRadius: '14px',
                        background: 'rgba(140, 176, 141, 0.1)', border: '1px solid rgba(140, 176, 141, 0.25)',
                        fontSize: '12px', lineHeight: 1.55, color: 'var(--text-secondary)',
                      }}>
                        <strong style={{ color: 'var(--accent-sage)', marginRight: '4px' }}>Por qué:</strong>
                        {q.why}
                      </div>
                    )}
                    {wrongPick && (
                      <div className="fade-in" style={{
                        marginTop: '10px', fontSize: '11.5px', color: 'var(--accent-rose)', fontFamily: 'var(--font-title)',
                      }}>
                        Casi... inténtalo de nuevo, escoje otra 💪
                      </div>
                    )}
                  </div>
                );
              }

              case 'tip':
                return (
                  <div key={bi} style={{
                    padding: '14px 16px', borderRadius: '18px',
                    background: 'rgba(140, 176, 141, 0.07)', border: '1px solid rgba(140, 176, 141, 0.22)',
                    fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-secondary)',
                  }}>
                    💡 {block.text}
                  </div>
                );

              case 'quote':
                return (
                  <div key={bi} style={{
                    padding: '22px 20px', borderRadius: '24px', textAlign: 'center',
                    background: 'linear-gradient(150deg, rgba(242, 227, 160, 0.09) 0%, rgba(0,0,0,0.2) 100%)',
                    border: '1px solid rgba(242, 227, 160, 0.2)',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '17px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                      “{block.text}”
                    </div>
                    {block.title && (
                      <div style={{ marginTop: '8px', fontFamily: 'var(--font-title)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        — {block.title}
                      </div>
                    )}
                  </div>
                );

              case 'action':
                return (
                  <button
                    key={bi}
                    onClick={() => navigate(block.action!.to)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', cursor: 'pointer',
                      padding: '15px 20px', borderRadius: '18px', width: '100%',
                      background: `linear-gradient(135deg, rgba(${rgb}, 0.25) 0%, rgba(${rgb}, 0.1) 100%)`,
                      border: `1px solid rgba(${rgb}, 0.35)`,
                      color: 'var(--text-primary)', fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '14px',
                      boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <Heart size={16} />
                    {block.action?.label}
                  </button>
                );

              case 'close':
                return (
                  <div key={bi} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '34px', marginBottom: '8px' }}>
                      {bigEmoji}
                    </div>
                    <p className="body-standard" style={{ fontSize: '13.5px', lineHeight: 1.6, opacity: 0.9 }}>
                      {block.text}
                    </p>
                    <button
                      onClick={finishGuide}
                      style={{
                        marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                        padding: '13px 26px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, var(--accent-gold), #c9b56a)',
                        color: '#0c1810', fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '14px',
                        border: 'none', boxShadow: '0 6px 20px rgba(242, 227, 160, 0.25)',
                      }}
                    >
                      {stateFinished ? <RotateCcw size={15} /> : <PartyPopper size={15} />}
                      {stateFinished ? 'Seguir repasando' : 'Terminar guía'}
                    </button>
                  </div>
                );

              default:
                return null;
            }
          })}
        </div>

        <p className="body-standard" style={{ fontSize: '10.5px', opacity: 0.55, textAlign: 'center', marginTop: '20px' }}>
          Contenido orientativo: no sustituye atención profesional.
        </p>
      </div>

      {/* CELEBRACIÓN */}
      {celebrate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center',
          background: 'rgba(10, 18, 12, 0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.25s ease',
        }}>
          <div className="fade-in" style={{
            width: 'min(360px, calc(100% - 48px))', borderRadius: '32px', background: 'var(--bg-base)',
            border: '1px solid var(--border-color-glow)', boxShadow: 'var(--shadow-main)', padding: '30px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', animation: 'softFloat 2.5s ease-in-out infinite', lineHeight: 1 }}>
              🎉
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '24px', color: 'var(--text-primary)', margin: '14px 0 6px' }}>
              ¡Guía completada!
            </h3>
            <p className="body-standard" style={{ fontSize: '13px', lineHeight: 1.6, opacity: 0.85, margin: '0 0 18px' }}>
              {item.title}, <strong style={{ color: 'var(--accent-gold)' }}>100%</strong>. Cada paso que marcas le enseña a tu cerebro a cuidarse solo. 🌱
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => navigate('/library')} className="btn-primary" style={{ padding: '13px', fontSize: '14px', borderRadius: '16px' }}>
                <Check size={15} /> Volver a la biblioteca
              </button>
              <button onClick={() => setCelebrate(false)} className="btn-secondary" style={{ padding: '13px', fontSize: '14px', borderRadius: '16px' }}>
                Repasar la guía
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};