import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardList,
  Compass,
  Eye,
  Hand,
  HelpCircle,
  RefreshCw,
  Shield,
  Snowflake,
  Sparkles,
  Timer,
  Volume1,
  Waves,
  BarChart3,
} from 'lucide-react';
import { getCompletedActivities, saveCompletedActivity, getCompletionStreak, getActivityStats } from '../utils/localDb';
import { haptic, hapticSuccess } from '../utils/haptics';

interface GroundingStep {
  step: number;
  icon: React.ComponentType<any>;
  color: string;
  title: string;
  desc: string;
  placeholder: string;
}

interface Activity {
  id: string;
  title: string;
  duration: string;
  icon: React.ComponentType<any>;
  color: string;
  summary: string;
  steps: string[];
}

type TabMode = 'grounding' | 'activities' | 'cards' | 'progress';

const TAB_ORDER: TabMode[] = ['activities', 'grounding', 'cards', 'progress'];

const TAB_LABELS: Record<TabMode, string> = {
  activities: 'Actividades',
  grounding: '5-4-3-2-1',
  cards: 'Tarjetas',
  progress: 'Progreso',
};

export const Coping: React.FC = () => {
  const [activeMode, setActiveMode] = useState<TabMode>('activities');
  const tabRef = useRef<HTMLDivElement>(null);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const [groundingStep, setGroundingStep] = useState<number>(0);
  const [groundingInputs, setGroundingInputs] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState<string>('');
  const [activeActivityId, setActiveActivityId] = useState<string>('reset90');
  const [activityStep, setActivityStep] = useState<number>(0);
  const [completedActivities, setCompletedActivities] = useState<string[]>([]);
  const [activityStats, setActivityStats] = useState<{ [id: string]: number }>({});
  const [streak, setStreak] = useState<number>(0);
  const [recentActivities, setRecentActivities] = useState<{ id: string; title: string; date: string }[]>([]);

  const activities: Activity[] = [
    {
      id: 'reset90',
      title: 'Pausa somatica',
      duration: '90 s',
      icon: Waves,
      color: 'var(--accent-gold)',
      summary: 'Baja la intensidad del cuerpo antes de pensar o decidir.',
      steps: [
        'Suelta los hombros y apoya ambos pies en el suelo.',
        'Inhala por la nariz contando 4. Exhala contando 6.',
        'Pon una mano en el pecho y otra en el abdomen.',
        'Nombra en voz baja: "Esto es una sensacion, no una orden".',
      ],
    },
    {
      id: 'cold',
      title: 'Reset frio',
      duration: '2 min',
      icon: Snowflake,
      color: 'var(--accent-sage)',
      summary: 'Un cambio fisico rapido para cortar ansiedad intensa.',
      steps: [
        'Busca agua fria, hielo envuelto o una bebida fria.',
        'Toca tus mejillas o tus munecas durante 20 segundos.',
        'Respira lento mientras notas la temperatura exacta.',
        'Al terminar, mira tres objetos quietos frente a ti.',
      ],
    },
    {
      id: 'urge',
      title: 'Surfear la urgencia',
      duration: '5 min',
      icon: Brain,
      color: 'var(--accent-gold)',
      summary: 'Para ganas de consumir, escribir, llamar o reaccionar impulsivamente.',
      steps: [
        'Califica la urgencia del 1 al 10 sin discutir con ella.',
        'Imagina la urgencia como una ola que sube, rompe y baja.',
        'Haz una accion neutra por 60 segundos: agua, ducha, caminar.',
        'Vuelve a calificarla. Si sigue alta, repite una ronda.',
      ],
    },
    {
      id: 'plan',
      title: 'Plan de 10 minutos',
      duration: '10 min',
      icon: ClipboardList,
      color: 'var(--accent-lavender)',
      summary: 'Convierte el momento dificil en una secuencia pequena y manejable.',
      steps: [
        'Elige una sola tarea: beber agua, tender cama o responder un mensaje.',
        'Pon un temporizador mental de 10 minutos.',
        'Haz la tarea al 50%, sin buscar perfeccion.',
        'Cuando termine, decide el siguiente paso con mas calma.',
      ],
    },
  ];

  const copingCards = [
    {
      id: 'panic',
      title: 'Ataque de panico',
      subtitle: 'Esto va a pasar',
      color: 'var(--accent-gold)',
      text: 'Tu ritmo cardiaco acelerado es una respuesta natural de proteccion. No significa que algo catastrofico vaya a ocurrir. Vuelve a tus pies, al suelo y a una exhalacion lenta.',
      action: 'Ve a Respirar y usa 4-7-8 por tres ciclos.',
    },
    {
      id: 'addiction',
      title: 'Ganas de consumir',
      subtitle: 'La ola se rompe',
      color: 'var(--accent-gold)',
      text: 'Una urgencia puede sentirse enorme, pero cambia minuto a minuto. No tienes que resolver toda tu vida ahora; solo atravesar los proximos diez minutos sin actuar contra ti.',
      action: 'Haz Reset frio o llama a tu contacto seguro.',
    },
    {
      id: 'family',
      title: 'Conflicto familiar',
      subtitle: 'Tu paz tambien cuenta',
      color: 'var(--accent-sage)',
      text: 'Las palabras hirientes de otras personas no definen tu valor. Puedes pausar, retirarte y proteger tu sistema nervioso sin justificar cada limite.',
      action: 'Ponte audifonos, cambia de habitacion y respira.',
    },
    {
      id: 'selfharm',
      title: 'Autolesion o suicidio',
      subtitle: 'No lo cargues a solas',
      color: 'var(--accent-rose)',
      text: 'El impulso de lastimarte es una senal de que necesitas alivio inmediato, no de que tu vida deba terminar. Esta ola merece compania humana real ahora.',
      action: 'Entra a SOS y llama a una linea de crisis o al 911 si hay peligro inmediato.',
    },
  ];

  const groundingSteps: GroundingStep[] = [
    {
      step: 5,
      icon: Eye,
      color: 'var(--accent-sage)',
      title: '5 cosas que puedes ver',
      desc: 'Mira alrededor y escribe cinco objetos concretos, sin analizarlos.',
      placeholder: 'Ej: una lampara encendida...',
    },
    {
      step: 4,
      icon: Hand,
      color: 'var(--accent-gold)',
      title: '4 cosas que puedes tocar',
      desc: 'Presta atencion a texturas, temperatura y peso.',
      placeholder: 'Ej: la tela de mi camisa...',
    },
    {
      step: 3,
      icon: Volume1,
      color: 'var(--accent-lavender)',
      title: '3 cosas que puedes oir',
      desc: 'Escucha sonidos cercanos, lejanos o tu propia respiracion.',
      placeholder: 'Ej: el aire acondicionado...',
    },
    {
      step: 2,
      icon: HelpCircle,
      color: 'var(--accent-gold)',
      title: '2 cosas que puedes oler',
      desc: 'Inhala despacio. Si no hay aroma, nombra dos olores que recuerdes.',
      placeholder: 'Ej: cafe, jabon...',
    },
    {
      step: 1,
      icon: Shield,
      color: 'var(--accent-rose)',
      title: '1 cosa que puedes saborear',
      desc: 'Nota un sabor presente o uno que te resulte seguro.',
      placeholder: 'Ej: menta, agua fria...',
    },
  ];

  const activeActivity = activities.find((activity) => activity.id === activeActivityId) || activities[0];
  const currentGStep = groundingStep > 0 && groundingStep <= 5 ? groundingSteps[groundingStep - 1] : null;
  const GIcon = currentGStep ? currentGStep.icon : null;
  const ActivityIcon = activeActivity.icon;

  useEffect(() => {
    const loadStats = async () => {
      const [stats, s] = await Promise.all([getActivityStats(), getCompletionStreak()]);
      setActivityStats(stats);
      setStreak(s);
      const recent = [...(await getCompletedActivities())].slice(-7).reverse();
      setRecentActivities(recent);
    };
    loadStats();
  }, []);

  useEffect(() => {
    if (!tabRef.current) return;
    const activeIndex = TAB_ORDER.indexOf(activeMode);
    const buttons = tabRef.current.querySelectorAll<HTMLButtonElement>('button');
    const activeBtn = buttons[activeIndex];
    if (activeBtn) {
      const containerRect = tabRef.current.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setTabIndicator({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      });
    }
  }, [activeMode]);

  const handleNextGrounding = () => {
    if (!inputVal.trim()) return;
    const updated = [...groundingInputs];
    updated[groundingStep - 1] = inputVal.trim();
    setGroundingInputs(updated);
    setInputVal('');
    setGroundingStep(prev => prev + 1);
  };

  const handleResetGrounding = () => {
    setGroundingStep(0);
    setGroundingInputs([]);
    setInputVal('');
  };

  const handleSelectActivity = (id: string) => {
    setActiveActivityId(id);
    setActivityStep(0);
  };

  const handleNextActivity = async () => {
    if (activityStep < activeActivity.steps.length - 1) {
      haptic();
      setActivityStep(prev => prev + 1);
      return;
    }
    await saveCompletedActivity(activeActivity.id, activeActivity.title);
    hapticSuccess();
    setCompletedActivities(prev => prev.includes(activeActivity.id) ? prev : [...prev, activeActivity.id]);
    const [stats, s, recent] = await Promise.all([
      getActivityStats(),
      getCompletionStreak(),
      getCompletedActivities(),
    ]);
    setActivityStats(stats);
    setStreak(s);
    setRecentActivities([...recent].slice(-7).reverse());
    setActivityStep(0);
  };

  return (
    <div className="fade-in flex flex-col gap-4">
      <div style={styles.tabContainer} ref={tabRef}>
        <div style={{ ...styles.tabIndicator, left: tabIndicator.left, width: tabIndicator.width }} />
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveMode(tab)}
            style={{
              ...styles.tabBtn,
              color: activeMode === tab ? 'var(--accent-gold)' : 'var(--text-muted)',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeMode === 'activities' && (
        <div className="fade-in flex flex-col gap-4">
          <div className="glass-card flex flex-col gap-4" style={styles.heroActivity}>
            <div style={styles.activityHeader}>
              <div style={{ ...styles.activityOrb, color: activeActivity.color }}>
                <ActivityIcon size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="title-small" style={{ fontSize: '10px' }}>{activeActivity.duration}</span>
                <h3 className="title-medium" style={{ color: activeActivity.color }}>{activeActivity.title}</h3>
              </div>
              {completedActivities.includes(activeActivity.id) && (
                <CheckCircle2 size={20} color="var(--accent-gold)" />
              )}
            </div>

            <p className="body-standard" style={{ lineHeight: 1.6 }}>{activeActivity.summary}</p>

            <div style={styles.stepPanel}>
              <div style={styles.stepProgress}>
                {activeActivity.steps.map((_, idx) => (
                  <span
                    key={idx}
                    style={{
                      ...styles.progressDot,
                      background: idx <= activityStep ? activeActivity.color : 'var(--border-color)',
                    }}
                  />
                ))}
              </div>
              <p style={styles.activityStepText}>{activeActivity.steps[activityStep]}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActivityStep(prev => Math.max(0, prev - 1))}
                className="btn-secondary"
                style={{ width: '52px', padding: '12px', borderRadius: '16px' }}
                title="Paso anterior"
                disabled={activityStep === 0}
              >
                <ArrowLeft size={16} />
              </button>
              <button onClick={handleNextActivity} className="btn-primary" style={{ flex: 1, padding: '12px', borderRadius: '16px' }}>
                {activityStep === activeActivity.steps.length - 1 ? 'Completar' : 'Siguiente'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div style={styles.activityGrid}>
            {activities.map((activity) => {
              const Icon = activity.icon;
              const selected = activity.id === activeActivity.id;
              return (
                <button
                  key={activity.id}
                  onClick={() => handleSelectActivity(activity.id)}
                  style={{
                    ...styles.activityChip,
                    borderColor: selected ? activity.color : 'var(--border-color)',
                    background: selected ? 'rgba(var(--accent-gold-rgb), 0.08)' : 'var(--bg-surface)',
                  }}
                >
                  <Icon size={17} color={activity.color} />
                  <span>{activity.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeMode === 'grounding' && (
        <div className="glass-card flex flex-col gap-4" style={{ minHeight: '340px', justifyContent: 'center' }}>
          {groundingStep === 0 && (
            <div className="fade-in flex flex-col items-center text-center gap-4" style={{ padding: '10px' }}>
              <div style={styles.gLogoGlow}>
                <Compass size={32} color="var(--accent-gold)" />
              </div>
              <h3 className="title-medium">Conexion a tierra</h3>
              <p className="body-standard" style={{ maxWidth: '300px' }}>
                Usa tus cinco sentidos para volver al momento presente cuando la mente se acelera.
              </p>
              <button onClick={() => setGroundingStep(1)} className="btn-primary" style={{ width: '80%', maxWidth: '200px', borderRadius: '24px', marginTop: '12px' }}>
                Comenzar
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {currentGStep && GIcon && (
            <div className="fade-in flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div style={{ ...styles.stepNumBadge, backgroundColor: currentGStep.color }}>{currentGStep.step}</div>
                <div>
                  <h3 className="title-medium" style={{ color: currentGStep.color }}>{currentGStep.title}</h3>
                  <span className="title-small" style={{ fontSize: '11px' }}>Paso {groundingStep} de 5</span>
                </div>
              </div>

              <div style={styles.stepBox}>
                <div style={{ ...styles.stepIconContainer, background: `${currentGStep.color}15` }}>
                  <GIcon size={24} color={currentGStep.color} />
                </div>
                <p className="body-standard" style={{ flex: 1, fontSize: '13px' }}>{currentGStep.desc}</p>
              </div>

              <div className="flex flex-col gap-3" style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={currentGStep.placeholder}
                  className="input-apple"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNextGrounding(); }}
                  autoFocus
                />

                <div className="flex gap-4">
                  {groundingStep > 1 && (
                    <button onClick={() => setGroundingStep(prev => prev - 1)} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '16px' }}>
                      <ArrowLeft size={16} />
                      Atras
                    </button>
                  )}
                  <button
                    onClick={handleNextGrounding}
                    disabled={!inputVal.trim()}
                    className="btn-primary"
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '16px',
                      background: inputVal.trim() ? 'rgba(var(--accent-gold-rgb), 0.12)' : 'rgba(255,255,255,0.02)',
                      color: inputVal.trim() ? 'var(--accent-gold)' : 'var(--text-muted)',
                      cursor: inputVal.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Siguiente
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {groundingStep > 5 && (
            <div className="fade-in flex flex-col items-center text-center gap-4" style={{ padding: '10px' }}>
              <div style={{ ...styles.gLogoGlow, background: 'rgba(var(--accent-gold-rgb), 0.1)', boxShadow: '0 0 35px rgba(var(--accent-gold-rgb), 0.18)' }}>
                <Shield size={32} color="var(--accent-gold)" />
              </div>
              <h3 className="title-medium" style={{ color: 'var(--accent-gold)' }}>Estas de vuelta en el presente</h3>
              <p className="body-standard" style={{ maxWidth: '320px', fontSize: '13px' }}>
                Buen trabajo. Tu mente acaba de procesar informacion real del entorno, no solo alarma interna.
              </p>
              <div style={styles.groundingSummary}>
                <h4 className="title-small" style={{ fontSize: '10px', textAlign: 'left', marginBottom: '8px' }}>MI ANCLAJE DE HOY</h4>
                <ul style={styles.summaryList}>
                  {groundingInputs.map((item, idx) => <li key={`${item}-${idx}`}>{idx + 1}. {item}</li>)}
                </ul>
              </div>
              <button onClick={handleResetGrounding} className="btn-secondary" style={{ width: '80%', maxWidth: '200px', borderRadius: '24px', marginTop: '8px' }}>
                <RefreshCw size={14} />
                Hacer otra vez
              </button>
            </div>
          )}
        </div>
      )}

      {activeMode === 'cards' && (
        <div className="fade-in flex flex-col gap-4">
          {copingCards.map((card) => (
            <div key={card.id} className="glass-card flex flex-col gap-3" style={{ ...styles.copingCard, borderLeft: `4px solid ${card.color}` }}>
              <div>
                <span style={styles.cardSubtitle}>{card.subtitle.toUpperCase()}</span>
                <h3 className="title-medium" style={{ color: card.color, marginTop: '2px' }}>{card.title}</h3>
              </div>
              <p className="body-standard" style={styles.cardText}>{card.text}</p>
              <div style={styles.cardActionBox}>
                <AlertCircle size={14} color={card.color} style={{ minWidth: '14px', marginTop: '2px' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>{card.action}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeMode === 'progress' && (
        <div className="fade-in flex flex-col gap-4">
          <div className="glass-card flex flex-col gap-4">
            <div style={styles.progressHeader}>
              <BarChart3 size={18} color="var(--accent-gold)" />
              <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>Tu Progreso</h3>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>{streak}</span>
                <span style={styles.statLabel}>DÍAS SEGUIDOS</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>{Object.values(activityStats).reduce((a, b) => a + b, 0)}</span>
                <span style={styles.statLabel}>ACTIVIDADES</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>{Object.keys(activityStats).length}</span>
                <span style={styles.statLabel}>TIPOS DISTINTOS</span>
              </div>
            </div>
          </div>

          <div className="glass-card flex flex-col gap-3">
            <h4 className="title-small" style={{ color: 'var(--text-primary)', fontSize: '12px' }}>Actividades por tipo</h4>
            {activities.map((activity) => {
              const Icon = activity.icon;
              const count = activityStats[activity.id] || 0;
              const total = Object.values(activityStats).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;

              return (
                <div key={activity.id} style={styles.activityRow}>
                  <div style={styles.activityRowLeft}>
                    <Icon size={16} color={activity.color} />
                    <span style={styles.activityRowLabel}>{activity.title}</span>
                  </div>
                  <div style={styles.activityRowRight}>
                    <div style={styles.activityBarContainer}>
                      <div
                        style={{
                          ...styles.activityBar,
                          width: `${Math.min(100, percentage * 2)}%`,
                          background: activity.color,
                        }}
                      />
                    </div>
                    <span style={styles.activityCount}>{count}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-card flex flex-col gap-3">
            <h4 className="title-small" style={{ color: 'var(--text-primary)', fontSize: '12px' }}>Últimas 7 actividades</h4>
            {(() => {
              const recent = recentActivities;
              return recent.map((item) => {
                const activity = activities.find(a => a.id === item.id);
                if (!activity) return null;
                const Icon = activity.icon;
                const d = new Date(item.date + 'T00:00:00');
                const dateStr = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

                return (
                  <div key={`${item.id}-${item.date}`} style={styles.historyRow}>
                    <Icon size={16} color={activity.color} />
                    <span style={styles.historyActivity}>{activity.title}</span>
                    <span style={styles.historyDate}>{dateStr}</span>
                  </div>
                );
              });
            })()}
            {recentActivities.length === 0 && (
              <p className="body-standard" style={{ fontSize: '12px', opacity: 0.6, textAlign: 'center' }}>
                Completa una actividad para ver tu historial aquí
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  tabContainer: {
    position: 'relative',
    display: 'flex',
    background: 'rgba(0, 0, 0, 0.12)',
    border: '1px solid var(--border-color)',
    borderRadius: '18px',
    padding: '3px',
    width: '100%',
  },
  tabIndicator: {
    position: 'absolute',
    top: '3px',
    bottom: '3px',
    borderRadius: '15px',
    background: 'rgba(var(--accent-gold-rgb), 0.08)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.12)',
    transition: 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    zIndex: 0,
  },
  tabBtn: {
    flex: 1,
    padding: '10px 8px',
    border: 'none',
    borderRadius: '15px',
    fontSize: '12px',
    fontFamily: 'var(--font-title)',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    background: 'transparent',
    position: 'relative',
    zIndex: 1,
  },
  heroActivity: {
    background: 'linear-gradient(180deg, rgba(var(--accent-gold-rgb), 0.07), rgba(var(--accent-sage-rgb), 0.025))',
  },
  activityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  activityOrb: {
    width: '58px',
    height: '58px',
    borderRadius: '50%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 12px 30px rgba(0,0,0,0.16)',
    animation: 'softFloat 4s ease-in-out infinite',
  },
  stepPanel: {
    border: '1px solid var(--border-color)',
    borderRadius: '22px',
    padding: '16px',
    background: 'rgba(255,255,255,0.025)',
  },
  stepProgress: {
    display: 'flex',
    gap: '6px',
    marginBottom: '12px',
  },
  progressDot: {
    height: '5px',
    flex: 1,
    borderRadius: '999px',
    transition: 'background 0.3s ease',
  },
  activityStepText: {
    minHeight: '52px',
    color: 'var(--text-primary)',
    fontSize: '15px',
    lineHeight: 1.55,
    fontWeight: 400,
  },
  activityGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  activityChip: {
    minHeight: '58px',
    border: '1px solid var(--border-color)',
    borderRadius: '18px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-title)',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '10px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  gLogoGlow: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    background: 'rgba(var(--accent-gold-rgb), 0.05)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 25px rgba(var(--accent-gold-rgb), 0.12)',
    animation: 'softFloat 4.5s ease-in-out infinite',
  },
  stepNumBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'var(--font-title)',
    color: '#fff',
  },
  stepBox: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.025)',
    padding: '14px',
    borderRadius: '18px',
    border: '1px solid var(--border-color)',
  },
  stepIconContainer: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groundingSummary: {
    width: '100%',
    background: 'rgba(0,0,0,0.12)',
    padding: '16px',
    borderRadius: '20px',
    border: '1px solid var(--border-color)',
  },
  summaryList: {
    listStyle: 'none',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  copingCard: {
    background: 'rgba(0, 0, 0, 0.09)',
    padding: '20px',
    gap: '12px',
  },
  cardSubtitle: {
    fontSize: '10px',
    fontFamily: 'var(--font-title)',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
  },
  cardText: {
    fontSize: '13px',
    lineHeight: '1.6',
    fontWeight: 300,
  },
  cardActionBox: {
    display: 'flex',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.025)',
    padding: '10px 14px',
    borderRadius: '14px',
    border: '1px solid var(--border-color)',
    alignItems: 'flex-start',
  },
  progressHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.08)',
    borderRadius: '16px',
    gap: '4px',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 700,
    fontFamily: 'var(--font-title)',
    color: 'var(--accent-gold)',
  },
  statLabel: {
    fontSize: '10px',
    fontFamily: 'var(--font-title)',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
  },
  activityRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 4px',
  },
  activityRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },
  activityRowLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  activityRowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  activityBarContainer: {
    width: '50px',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  activityBar: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  activityCount: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    minWidth: '20px',
    textAlign: 'right',
  },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 4px',
    borderBottom: '1px solid var(--border-color)',
  },
  historyActivity: {
    flex: 1,
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  historyDate: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
};
