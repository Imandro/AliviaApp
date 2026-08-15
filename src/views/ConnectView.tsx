import React, { useState } from 'react';
import { Handshake, User, MessageSquare, ArrowRight, ArrowLeft, Phone, Check, PartyPopper, Heart } from 'lucide-react';

type Stage = 1 | 2 | 3 | 4 | 5;

interface TrustedPerson {
  name: string;
  phone?: string;
}

const MESSAGE_TEMPLATES = [
  { label: 'Mensaje simple', text: 'Hola {name}, no estoy pasando un buen momento y necesitaba hablar con alguien de confianza. ¿Tienes un rato hoy o mañana?' },
  { label: 'Mensaje directo', text: 'Hola {name}, te escribo porque confío en ti y quiero pedirte apoyo. ¿Podemos hablar un momento?' },
  { label: 'Mensaje casual', text: 'Oye {name}, ¿qué tal? No sé si tienes tiempo, pero me vendría bien charlar un rato. Avisas cuando puedas.' },
  { label: 'Mensaje por escrito', text: '{name}, esto es difícil de decir en persona, pero necesito apoyo y pensé en ti. ¿Podemos vernos o hablar por teléfono?' },
];

export const ConnectView: React.FC = () => {
  const [stage, setStage] = useState<Stage>(1);
  const [person, setPerson] = useState<TrustedPerson | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0);

  const canUseTemplate = stage >= 3 && person?.name;

  const selectTemplate = (idx: number) => {
    setSelectedTemplate(idx);
    setShowTemplateForm(false);
  };

  const useSms = () => {
    if (!person?.phone || !person?.name) return;
    const text = MESSAGE_TEMPLATES[selectedTemplate].text.replace(/\{name\}/g, person.name);
    window.location.href = `sms:${person.phone}?body=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="glass-card flex flex-col gap-3" style={styles.heroCard}>
        <div style={styles.heroHeader}>
          <Handshake size={16} color="var(--accent-sage)" />
          <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>CONECTA CON ALGUIEN</h3>
        </div>
        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.75 }}>
          Pedir apoyo es un acto de valentía. Este guión te ayuda a identificar a alguien de confianza y dar el primer paso.
        </p>
      </div>

      {/* Paso 1: Elegir persona */}
      {stage === 1 && (
        <div className="glass-card fade-in flex flex-col gap-3" style={styles.stepCard}>
          <div style={styles.stepHeader}>
            <span style={styles.stepBadge}>PASO 1</span>
            <h4 className="title-medium" style={{ fontSize: '14px' }}>¿Quién es esa persona de confianza?</h4>
          </div>
          <p className="body-standard" style={{ fontSize: '12px', opacity: 0.7 }}>
            Piense en alguien que: te escuche sin juzgar, esté disponible con frecuencia, vibre en positivo y te conozca bien. Suele ser un amigo, familiar, sponsor o terapeuta.
          </p>
          <div style={styles.suggestions}>
            {[
              { icon: '👨‍👩‍👧', label: 'Familia cercana' },
              { icon: '🤝', label: 'Amigos de confianza' },
              { icon: '🧑‍⚕️', label: 'Sponsor / terapeuta' },
              { icon: '💼', label: 'Compañeros de trabajo o estudio' },
            ].map(s => (
              <div key={s.label} style={styles.suggestionChip}>
                <span>{s.icon}</span> {s.label}
              </div>
            ))}
          </div>
          <button onClick={() => setStage(2)} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: '14px', fontSize: '12.5px' }}>
            <User size={14} /> Tengo a alguien en mente
          </button>
        </div>
      )}

      {/* Paso 2: Datos */}
      {stage === 2 && (
        <div className="glass-card fade-in flex flex-col gap-3" style={styles.stepCard}>
          <div style={styles.stepHeader}>
            <span style={styles.stepBadge}>PASO 2</span>
            <h4 className="title-medium" style={{ fontSize: '14px' }}>Guarda los datos (opcional)</h4>
          </div>
          <input
            type="text"
            placeholder="Nombre de la persona (ej: Mamá, Juan, Sponsor)"
            value={person?.name ?? ''}
            onChange={(e) => setPerson(prev => ({ ...prev, name: e.target.value }))}
            className="input-apple"
          />
          <input
            type="tel"
            placeholder="Número telefónico (para enviar el mensaje por SMS)"
            value={person?.phone ?? ''}
            onChange={(e) => setPerson(prev => ({ ...prev, phone: e.target.value }))}
            className="input-apple"
          />
          <div className="flex gap-2">
            <button onClick={() => setStage(3)} disabled={!person?.name} className="btn-primary" style={{ flex: 2, padding: '10px', borderRadius: '12px', fontSize: '12.5px' }}>
              Continuar <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Elegir mensaje */}
      {(stage === 3 || stage === 4) && (
        <div className="glass-card fade-in flex flex-col gap-3" style={styles.stepCard}>
          <div style={styles.stepHeader}>
            <span style={styles.stepBadge}>PASO {stage === 3 ? '3' : '4'}</span>
            <h4 className="title-medium" style={{ fontSize: '14px' }}>
              {stage === 3 ? 'Elige cómo dar el primer paso' : 'Práctica del mensaje'}
            </h4>
          </div>

          {stage === 3 && (
            <>
              <p className="body-standard" style={{ fontSize: '12px', opacity: 0.7 }}>
                No necesitas el "discurso perfecto". Verás mensajes de ejemplo que puedes personalizar:
              </p>
              <div style={styles.templateList}>
                {MESSAGE_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => selectTemplate(i)} style={styles.templateBtn}>
                    <MessageSquare size={14} color="var(--accent-sage)" />
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.label}</span>
                      <p style={{ fontSize: '11.5px', opacity: 0.7, marginTop: '3px', lineHeight: 1.4 }}>
                        {t.text.replace(/\{name\}/g, person?.name ?? '...')}
                      </p>
                    </div>
                    {selectedTemplate === i && <Check size={15} color="var(--accent-sage)" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {stage === 4 && person && (
            <div className="flex flex-col gap-3">
              <div style={styles.messagePreview}>
                <Phone size={13} color="var(--accent-sage)" />
                <p style={{ fontSize: '13px', lineHeight: 1.6 }}>{MESSAGE_TEMPLATES[selectedTemplate].text.replace(/\{name\}/g, person.name)}</p>
              </div>
              <button onClick={useSms} disabled={!person.phone} className="btn-primary" style={{ padding: '10px', borderRadius: '12px', fontSize: '12.5px', width: '100%' }}>
                <MessageSquare size={14} color="#fff" />
                {person.phone ? 'Enviar por SMS ahora' : 'Guarda el número para poder enviarlo'}
              </button>
              {!person.phone && (
                <p className="body-standard" style={{ fontSize: '11px', opacity: 0.6, textAlign: 'center' }}>
                  O simplemente copia el mensaje y envíalo por la app que prefieras.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {stage === 4 ? (
              <>
                <button onClick={() => setStage(3)} className="btn-secondary" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '12.5px' }}>
                  <ArrowLeft size={13} /> Volver
                </button>
                <button onClick={() => setStage(5)} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '12.5px' }}>
                  Lo envié <Check size={13} />
                </button>
              </>
            ) : (
              <button onClick={() => setStage(4)} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '12.5px' }}>
                Ver y enviar <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Paso 5: Celebración */}
      {stage === 5 && (
        <div className="glass-card fade-in flex flex-col items-center gap-3" style={{ padding: '28px', textAlign: 'center' }}>
          <div style={styles.celebrateGlow}>
            <PartyPopper size={28} color="var(--accent-gold)" />
          </div>
          <h4 className="title-medium" style={{ fontSize: '15px' }}>Lo lograste. 🎉</h4>
          <p className="body-standard" style={{ fontSize: '12px', opacity: 0.7, maxWidth: '280px' }}>
            Pedir apoyo fue tu primer paso real. La persona a quien le escribiste valora tu confianza más de lo que imaginas.
          </p>
          <p className="body-standard" style={{ fontSize: '11.5px', opacity: 0.8 }}>
            💛 Alivia estará aquí cada vez que lo necesites.
          </p>
          <button onClick={() => { setStage(1); setPerson(null); setSelectedTemplate(0); }} className="btn-secondary" style={{ padding: '10px 16px', borderRadius: '12px', fontSize: '12px' }}>
            Volver al inicio de conexión
          </button>
        </div>
      )}

      {/* Barra de progreso */}
      <div style={styles.progressWrap}>
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} style={{
            ...styles.progressDot,
            ...(n <= stage ? { background: 'var(--accent-sage)', boxShadow: '0 0 8px rgba(var(--accent-sage-rgb), 0.4)' } : {}),
          }} />
        ))}
      </div>
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
  stepCard: {
    padding: '16px',
  },
  stepHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginBottom: '4px',
  },
  stepBadge: {
    fontSize: '10px',
    fontFamily: 'var(--font-title)',
    letterSpacing: '0.1em',
    color: 'var(--accent-sage)',
    marginBottom: '4px',
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  suggestionChip: {
    fontSize: '11.5px',
    color: 'var(--text-secondary)',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    padding: '8px 12px',
    borderRadius: '12px',
    display: 'flex',
    gap: '6px',
  },
  templateList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  templateBtn: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  messagePreview: {
    display: 'flex',
    gap: '8px',
    background: 'rgba(var(--accent-sage-rgb), 0.07)',
    border: '1px solid rgba(var(--accent-sage-rgb), 0.15)',
    borderRadius: '14px',
    padding: '14px',
  },
  celebrateGlow: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'rgba(var(--accent-gold-rgb), 0.15)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 24px rgba(var(--accent-gold-rgb), 0.3)',
  },
  progressWrap: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    padding: '6px',
  },
  progressDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    transition: 'all 0.3s',
  },
};