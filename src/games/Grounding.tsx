import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Hand, Ear, Wind, CircleDot, ArrowRight, CheckCircle2 } from 'lucide-react';
import { chimeSound, goodSound, tapSound } from '../utils/sounds';

const STEPS = [
  { icon: Eye, label: 'VER', count: 5, hint: 'Busca 5 cosas que puedas VER a tu alrededor. Nómbralas en silencio.' },
  { icon: Hand, label: 'TOCAR', count: 4, hint: 'Ahora 4 cosas que puedas TOCAR: la tela, la mesa, tu piel…' },
  { icon: Ear, label: 'OÍR', count: 3, hint: 'Encuentra 3 sonidos que puedas OÍR, aunque sean suaves.' },
  { icon: Wind, label: 'OLER', count: 2, hint: 'Busca 2 olores que puedas OLER cerca de ti.' },
  { icon: CircleDot, label: 'SABOR', count: 1, hint: 'Por último, 1 sabor que puedas NOTAR en tu boca.' },
];

const FINAL_TEXT =
  'Listo. Tu cuerpo ya sabe que estás aquí, en este lugar seguro, y no en la tormenta de tu mente. Toma un respiro largo: inflas por la nariz contando 4, sueltas por la boca contando 6. Eso es todo: ya estás más aquí que hace un minuto.';

export const Grounding: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [confettiIndex, setConfettiIndex] = useState<number | null>(null);

  const current = STEPS[step];
  const done = step >= STEPS.length;

  const advance = () => {
    tapSound();
    if (step === STEPS.length - 1) {
      goodSound();
      setStep(step + 1);
      setTimeout(() => setConfettiIndex(0), 200);
      return;
    }
    chimeSound();
    setStep(step + 1);
    setTimeout(() => setConfettiIndex(step + 1), 180);
  };

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="glass-card" style={{ padding: '26px 20px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }} className="cm-float">🧘</div>
          <h4 className="title-small" style={{ fontSize: '19px' }}>Anclado de nuevo</h4>
          <p className="body-standard" style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{FINAL_TEXT}</p>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            <button
              className="cm-press"
              style={{ padding: '14px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sage))', color: '#0c1810', fontFamily: 'var(--font-title)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => navigate('/breathe')}
            >
              Seguir con una respiración guiada <ArrowRight size={16} />
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="cm-press" style={{ flex: 1, padding: '13px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', fontWeight: 700, cursor: 'pointer' }} onClick={onExit}>Volver</button>
              <button className="cm-press" style={{ flex: 1, padding: '13px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setStep(0)}>Repetir</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              height: '7px',
              borderRadius: '4px',
              background: i < step ? 'var(--accent-gold)' : i === step ? 'rgba(var(--accent-gold-rgb), 0.45)' : 'var(--border-color)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      <div
        key={step}
        className="glass-card fade-in"
        style={{
          padding: '30px 22px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          textAlign: 'center',
          minHeight: '300px',
          justifyContent: 'center',
        }}
      >
        <div
          className="cm-float"
          style={{
            width: '86px',
            height: '86px',
            borderRadius: '50%',
            background: 'rgba(var(--accent-lavender-rgb), 0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}
        >
          <current.icon size={42} color="var(--accent-lavender)" />
        </div>

        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.24em', color: 'var(--text-muted)' }}>
          PASO {step + 1} DE {STEPS.length} · TÉCNICA 5-4-3-2-1
        </div>

        <div style={{ fontSize: '34px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          {current.count} <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>{current.label.toLowerCase()}</span>
        </div>

        <p className="body-standard" style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text-secondary)', maxWidth: '280px' }}>
          {current.hint}
        </p>

        <button
          className="cm-press"
          style={{
            marginTop: '10px',
            padding: '14px 26px',
            borderRadius: '999px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sage))',
            color: '#0c1810',
            fontFamily: 'var(--font-title)',
            fontWeight: 800,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 10px 26px rgba(var(--accent-gold-rgb), 0.3)',
          }}
          onClick={advance}
        >
          <CheckCircle2 size={17} />
          Ya las encontré ✓
        </button>

        {confettiIndex === step && (
          <div className="fade-in" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-sage)' }}>
            ¡Bien! Respira y continúa.
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
        Úsala cuando sientas ansiedad, pánico o la mente acelerada.
      </div>
    </div>
  );
};