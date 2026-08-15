import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Target, ListChecks, X } from 'lucide-react';
import { getPlans, createPlan, deletePlan, addPlanGoal, togglePlanGoal, deletePlanGoal, type Plan } from '../utils/localDb';

const AREAS = ['general', 'educación', 'ansiedad', 'hábitos', 'relaciones'];

export const PlansView: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArea, setNewArea] = useState('general');
  const [goalInputs, setGoalInputs] = useState<{ [planId: number]: string }>({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      setPlans(await getPlans());
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const plan = await createPlan(newTitle.trim(), newArea);
    setPlans(prev => [plan, ...prev]);
    setNewTitle('');
    setNewArea('general');
    setShowNew(false);
  };

  const handleDelete = async (id: number) => {
    await deletePlan(id);
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleAddGoal = async (planId: number) => {
    const text = (goalInputs[planId] ?? '').trim();
    if (!text) return;
    const goal = await addPlanGoal(planId, text);
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, goals: [...p.goals, goal] } : p));
    setGoalInputs(prev => ({ ...prev, [planId]: '' }));
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

  const progress = (plan: Plan) => {
    if (!plan.goals.length) return 0;
    return Math.round((plan.goals.filter(g => g.done).length / plan.goals.length) * 100);
  };

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="glass-card flex flex-col gap-3" style={styles.heroCard}>
        <div style={styles.heroHeader}>
          <Target size={16} color="var(--accent-sage)" />
          <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>PLANES DE PROGRESO PERSONAL</h3>
        </div>
        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.75 }}>
          Convierte los grandes problemas en objetivos pequeños y alcanzables. Un paso a la vez.
        </p>
        <button onClick={() => setShowNew(v => !v)} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 16px', borderRadius: '14px', fontSize: '12.5px' }}>
          <Plus size={14} />
          Nuevo plan
        </button>
        {showNew && (
          <div className="fade-in flex flex-col gap-3" style={styles.newPlanBox}>
            <input
              type="text"
              placeholder="¿Qué quieres mejorar? (ej: Manejarme con la ansiedad)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="input-apple"
            />
            <select value={newArea} onChange={(e) => setNewArea(e.target.value)} style={styles.select}>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="btn-primary" style={{ flex: 2, padding: '10px', borderRadius: '12px', fontSize: '12.5px' }} disabled={!newTitle.trim()}>
                Crear plan
              </button>
              <button onClick={() => setShowNew(false)} className="btn-secondary" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '12.5px' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.6, textAlign: 'center' }}>Cargando planes…</p>
      ) : plans.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2" style={{ padding: '28px', textAlign: 'center' }}>
          <ListChecks size={30} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          <p className="body-standard" style={{ fontSize: '12px', opacity: 0.65 }}>
            Aún no tienes planes. Empieza con un problema grande → conviértelo en 3-5 pasos pequeños.
          </p>
        </div>
      ) : (
        plans.map(plan => {
          const pct = progress(plan);
          return (
            <div key={plan.id} className="glass-card flex flex-col gap-3" style={styles.planCard}>
              <div style={styles.planHeader}>
                <div style={{ flex: 1 }}>
                  <h4 className="title-medium" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{plan.title}</h4>
                  <span style={styles.areaChip}>{plan.area}</span>
                </div>
                <button onClick={() => handleDelete(plan.id)} style={styles.iconBtn} title="Eliminar plan">
                  <Trash2 size={14} color="var(--text-muted)" />
                </button>
              </div>

              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${pct}%` }} />
              </div>
              <span style={styles.progressLabel}>{pct}% completado</span>

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
                    <button onClick={() => handleDeleteGoal(plan.id, goal.id)} style={styles.iconBtn} title="Quitar objetivo">
                      <X size={13} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={styles.goalInputRow}>
                <input
                  type="text"
                  placeholder="Agregar objetivo pequeño…"
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
  select: {
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
    fontSize: '12px',
    padding: '10px 12px',
    outline: 'none',
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
  areaChip: {
    display: 'inline-block',
    fontSize: '10px',
    fontFamily: 'var(--font-title)',
    letterSpacing: '0.05em',
    color: 'var(--accent-gold)',
    background: 'rgba(var(--accent-gold-rgb), 0.1)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
    padding: '3px 8px',
    borderRadius: '10px',
    marginTop: '4px',
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
    background: 'linear-gradient(90deg, var(--accent-sage), var(--accent-gold))',
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