import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Target, ListChecks, X, Lightbulb } from 'lucide-react';
import { getPlans, createPlan, deletePlan, addPlanGoal, togglePlanGoal, deletePlanGoal, type Plan } from '../utils/localDb';
import { LUCHAS, getLucha, GENERAL } from '../utils/luchas';

const ALL_LUCHAS = [...LUCHAS, GENERAL];

export const PlansView: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('todas');
  const [showNew, setShowNew] = useState(false);
  const [newLuchaId, setNewLuchaId] = useState(LUCHAS[0].id);
  const [newTitle, setNewTitle] = useState('');
  const [goalInputs, setGoalInputs] = useState<{ [planId: number]: string }>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const load = async () => {
    setLoading(true);
    try {
      setPlans(await getPlans());
    } finally {
      setLoading(false);
    }
  };

  const newLucha = getLucha(newLuchaId);

  const handleCreate = async (title?: string, luchaId?: string) => {
    const t = (title ?? newTitle).trim();
    if (!t) return;
    try {
      const plan = await createPlan(t, luchaId ?? newLuchaId);
      setPlans(prev => [plan, ...prev]);
      setNewTitle('');
      setShowNew(false);
      setToast('Plan creado para tu lucha 💪');
    } catch {
      setToast('No se pudo crear. Intenta de nuevo.');
    }
  };

  const handleDelete = async (id: number) => {
    await deletePlan(id);
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleAddGoal = async (planId: number, titleOverride?: string) => {
    const text = (titleOverride ?? goalInputs[planId] ?? '').trim();
    if (!text) return;
    try {
      const goal = await addPlanGoal(planId, text);
      setPlans(prev => prev.map(p => p.id === planId ? { ...p, goals: [...p.goals, goal] } : p));
      setGoalInputs(prev => ({ ...prev, [planId]: '' }));
    } catch {
      setToast('No se pudo agregar la meta.');
    }
  };

  const handleToggleGoal = async (planId: number, goalId: number) => {
    await togglePlanGoal(planId, goalId);
    setPlans(prev => prev.map(p => p.id === planId
      ? { ...p, goals: p.goals.map(g => g.id === goalId ? { ...g, done: !g.done } : g) }
      : p));
  };

  const handleDeleteGoal = async (planId: number, goalId: number) => {
    await deletePlanGoal(planId, goalId);
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, goals: p.goals.filter(g => g.id !== goalId) } : p));
  };

  const filtered = filter === 'todas' ? plans : plans.filter(p => p.area === filter);
  const progress = (plan: Plan) => {
    if (!plan.goals.length) return 0;
    return Math.round((plan.goals.filter(g => g.done).length / plan.goals.length) * 100);
  };

  const plansInLucha = (id: string) => plans.filter(p => p.area === id).length;

  return (
    <div className="fade-in flex flex-col gap-4">
      {toast && (
        <div className="fade-in" style={styles.toast}>
          {toast}
        </div>
      )}

      <div className="glass-card flex flex-col gap-3" style={styles.heroCard}>
        <div style={styles.heroHeader}>
          <Target size={16} color="var(--accent-sage)" />
          <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>PLANES PARA TUS LUCHAS</h3>
        </div>
        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.75 }}>
          Cada lucha se enfrenta con pasos pequeños. Elige tu lucha, haz un plan y conviértela en 3-5 metas alcanzables.
        </p>
        <button onClick={() => setShowNew(v => !v)} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 16px', borderRadius: '14px', fontSize: '12.5px' }}>
          <Plus size={14} />
          Nuevo plan
        </button>

        {showNew && (
          <div className="fade-in flex flex-col gap-3" style={styles.newPlanBox}>
            <p style={styles.newPlanLabel}>1. ¿Contra qué lucha vas?</p>
            <div style={styles.luchasGrid}>
              {LUCHAS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setNewLuchaId(l.id)}
                  style={{
                    ...styles.luchaCard,
                    background: newLuchaId === l.id ? `rgba(${l.rgb}, 0.16)` : 'rgba(255,255,255,0.03)',
                    borderColor: newLuchaId === l.id ? `rgba(${l.rgb}, 0.45)` : 'var(--border-color)',
                    color: newLuchaId === l.id ? l.color : 'var(--text-muted)',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{l.emoji}</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 600, lineHeight: 1.2 }}>{l.label}</span>
                </button>
              ))}
            </div>

            <p style={styles.newPlanLabel}>2. ¿Cuál es tu meta?</p>
            <input
              type="text"
              placeholder="ej: Manejarme mejor con la ansiedad"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="input-apple"
            />

            <div style={styles.ideasBox}>
              <p style={styles.ideasTitle}>
                <Lightbulb size={12} color="var(--accent-gold)" /> Ideas para empezar ({newLucha.emoji} {newLucha.label}):
              </p>
              <div style={styles.ideasRow}>
                {newLucha.ideas.map(idea => (
                  <button key={idea} onClick={() => setNewTitle(idea)} style={styles.ideaChip}>
                    {idea}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2" style={{ marginTop: '4px' }}>
              <button onClick={() => handleCreate()} className="btn-primary" style={{ flex: 2, padding: '10px', borderRadius: '12px', fontSize: '12.5px' }} disabled={!newTitle.trim()}>
                Crear plan
              </button>
              <button onClick={() => setShowNew(false)} className="btn-secondary" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '12.5px' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filtros por lucha */}
      <div style={styles.filtersRow}>
        <button
          onClick={() => setFilter('todas')}
          style={{
            ...styles.filterChip,
            background: filter === 'todas' ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'var(--bg-surface)',
            borderColor: filter === 'todas' ? 'rgba(var(--accent-gold-rgb), 0.3)' : 'var(--border-color)',
            color: filter === 'todas' ? 'var(--accent-gold)' : 'var(--text-muted)',
          }}
        >
          📋 Todas ({plans.length})
        </button>
        {ALL_LUCHAS.map(l => (
          <button
            key={l.id}
            onClick={() => setFilter(l.id)}
            style={{
              ...styles.filterChip,
              background: filter === l.id ? `rgba(${l.rgb}, 0.15)` : 'var(--bg-surface)',
              borderColor: filter === l.id ? `rgba(${l.rgb}, 0.35)` : 'var(--border-color)',
              color: filter === l.id ? l.color : 'var(--text-muted)',
            }}
          >
            {l.emoji} {l.label} ({plansInLucha(l.id)})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.6, textAlign: 'center' }}>Cargando planes…</p>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2" style={{ padding: '28px', textAlign: 'center' }}>
          <ListChecks size={30} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          <p className="body-standard" style={{ fontSize: '12px', opacity: 0.65 }}>
            {filter === 'todas'
              ? 'Aún no tienes planes. Empieza con una lucha → conviértela en 3-5 pasos pequeños.'
              : `Aún no tienes planes para "${getLucha(filter).label}". Crea uno con el botón de arriba.`}
          </p>
        </div>
      ) : (
        filtered.map(plan => {
          const lucha = getLucha(plan.area);
          const pct = progress(plan);
          return (
            <div key={plan.id} className="glass-card flex flex-col gap-3" style={{ ...styles.planCard, borderLeft: `3px solid ${lucha.color}` }}>
              <div style={styles.planHeader}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={styles.planEmoji}>{lucha.emoji}</span>
                    <span style={{ ...styles.areaChip, color: lucha.color, background: `rgba(${lucha.rgb}, 0.1)`, borderColor: `rgba(${lucha.rgb}, 0.2)` }}>
                      {lucha.label}
                    </span>
                  </div>
                  <h4 className="title-medium" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{plan.title}</h4>
                </div>
                <button onClick={() => handleDelete(plan.id)} style={styles.iconBtn} title="Eliminar plan">
                  <Trash2 size={14} color="var(--text-muted)" />
                </button>
              </div>

              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${pct}%`, background: `linear-gradient(90deg, ${lucha.color}, var(--accent-gold))` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={styles.progressLabel}>{pct}% de tu meta cumplida</span>
                <span style={{ ...styles.progressLabel, color: lucha.color } as React.CSSProperties}>{plan.goals.filter(g => g.done).length}/{plan.goals.length} metas</span>
              </div>

              <div style={styles.goalList}>
                {plan.goals.map(goal => (
                  <div key={goal.id} style={styles.goalRow}>
                    <button onClick={() => handleToggleGoal(plan.id, goal.id)} style={styles.goalToggle}>
                      {goal.done
                        ? <CheckCircle2 size={17} color="var(--accent-sage)" />
                        : <Circle size={17} color="var(--text-muted)" style={{ opacity: 0.5 }} />}
                    </button>
                    <span style={{
                      ...styles.goalTitle,
                      ...(goal.done ? { textDecoration: 'line-through', opacity: 0.6 } : {}),
                    }}>
                      {goal.title}
                    </span>
                    <button onClick={() => handleDeleteGoal(plan.id, goal.id)} style={styles.iconBtn} title="Quitar meta">
                      <X size={13} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ ...styles.ideasBox, padding: '10px 12px' }}>
                <p style={{ ...styles.ideasTitle, margin: 0 }}>💡 Ideas para esta lucha:</p>
                <div style={styles.ideasRow}>
                  {lucha.ideas.map(idea => (
                    <button key={idea} onClick={() => handleAddGoal(plan.id, idea)} style={styles.ideaChip}>
                      + {idea}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.goalInputRow}>
                <input
                  type="text"
                  placeholder="Agregar meta pequeña…"
                  value={goalInputs[plan.id] ?? ''}
                  onChange={(e) => setGoalInputs(prev => ({ ...prev, [plan.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddGoal(plan.id); }}
                  className="input-apple"
                  style={{ flex: 1, padding: '10px 12px', fontSize: '12.5px' }}
                />
                <button onClick={() => handleAddGoal(plan.id)} disabled={!(goalInputs[plan.id] ?? '').trim()} style={styles.addGoalBtn}>
                  <Plus size={15} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  toast: {
    position: 'fixed',
    top: '76px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 60,
    background: 'var(--bg-nav)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
    color: 'var(--text-primary)',
    fontSize: '12.5px',
    fontWeight: 600,
    padding: '10px 18px',
    borderRadius: '999px',
    boxShadow: 'var(--shadow-main)',
    maxWidth: '86vw',
    textAlign: 'center',
  },
  heroCard: {
    background: 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.07) 0%, rgba(var(--accent-gold-rgb), 0.03) 100%)',
    border: '1px solid rgba(var(--accent-sage-rgb), 0.12)',
    padding: '16px',
  },
  heroHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  newPlanBox: {
    padding: '14px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
  },
  newPlanLabel: {
    margin: '6px 0 0',
    fontSize: '11.5px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-title)',
  },
  luchasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '8px',
  },
  luchaCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    padding: '10px 6px',
    borderRadius: '14px',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
    fontFamily: 'var(--font-title)',
  },
  ideasBox: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  ideasTitle: {
    margin: 0,
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-title)',
    fontWeight: 600,
  },
  ideasRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  ideaChip: {
    border: '1px dashed var(--border-color)',
    background: 'rgba(0,0,0,0.12)',
    color: 'var(--text-secondary)',
    fontSize: '10.5px',
    padding: '6px 10px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  filtersRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterChip: {
    padding: '7px 12px',
    borderRadius: '999px',
    border: '1px solid var(--border-color)',
    fontFamily: 'var(--font-title)',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  planCard: {
    padding: '16px',
    animation: 'fadeIn 0.4s ease',
  },
  planHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '10px',
  },
  planEmoji: {
    fontSize: '15px',
  },
  areaChip: {
    display: 'inline-block',
    fontSize: '10px',
    fontFamily: 'var(--font-title)',
    letterSpacing: '0.05em',
    padding: '3px 8px',
    borderRadius: '10px',
    border: '1px solid',
  },
  progressTrack: {
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  progressLabel: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-title)',
  },
  goalList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  goalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
  },
  goalToggle: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    padding: 0,
  },
  goalTitle: {
    flex: 1,
    fontSize: '13px',
    color: 'var(--text-primary)',
    lineHeight: 1.45,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    padding: '4px',
  },
  goalInputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  addGoalBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, var(--accent-sage) 0%, var(--accent-gold) 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(var(--accent-sage-rgb), 0.3)',
  },
};