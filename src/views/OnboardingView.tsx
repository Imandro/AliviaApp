import React, { useState } from 'react';
import {
  Heart,
  Check,
  ArrowRight,
  ArrowLeft,
  Shield,
  HandHeart,
  Phone,
  RefreshCcw,
  Sparkles,
  Loader2,
  Users,
} from 'lucide-react';
import { SafeUser, updateProfile } from '../utils/auth';
import { saveEmergencyContact } from '../utils/localDb';
import { CountryPhoneInput, isPhoneComplete } from '../components/CountryPhoneInput';

interface OnboardingViewProps {
  initial?: SafeUser | null;
  onSaved: (user: SafeUser) => void;
  onClose?: () => void;
}

const PROBLEMS = [
  'Ansiedad y preocupaciÃ³n constante',
  'EstrÃ©s y agobio',
  'Tristeza o desÃ¡nimo',
  'Soledad o aislamiento',
  'Baja autoestima',
  'Dificultad para dormir',
  'Irritabilidad o enojo',
  'Falta de concentraciÃ³n',
  'Pensamientos negativos recurrentes',
];

const SITUATIONS = [
  'Ataques de ansiedad o pÃ¡nico',
  'No poder dormir o descansar',
  'Falta de motivaciÃ³n',
  'Agobio por trabajo o estudios',
  'Conflictos en casa o familia',
  'Rupturas o pÃ©rdidas',
  'Cambios de vida importantes',
  'Cansancio extremo',
  'Miedo o incertidumbre por el futuro',
];

const STRATEGIES = [
  'Hablar con alguien de confianza',
  'Ejercicio fÃ­sico',
  'MeditaciÃ³n y respiraciÃ³n',
  'Escribir mis pensamientos',
  'Terapia profesional',
  'Establecer rutinas saludables',
  'Usar las herramientas de Alivia',
  'Apoyo de la comunidad',
  'OraciÃ³n o espiritualidad',
  'TodavÃ­a no lo sÃ©',
];

const CHANGES = [
  'Mi forma de dormir',
  'Mis pensamientos',
  'Mi autoestima',
  'Mi relaciÃ³n con los demÃ¡s',
  'Mi manejo del estrÃ©s',
  'Mi estado de Ã¡nimo',
  'Mi vida laboral o de estudios',
  'Mi rutina diaria',
];

const TOTAL_STEPS = 8;

export const OnboardingView: React.FC<OnboardingViewProps> = ({ initial, onSaved, onClose }) => {
  const isEdit = Boolean(initial);
  const user = initial;

  const [step, setStep] = useState(0);
  const [problems, setProblems] = useState<string[]>(user?.problems ?? []);
  const [situations, setSituations] = useState<string[]>(user?.situations ?? []);
  const [strategies, setStrategies] = useState<string[]>(user?.strategies ?? []);
  const [changes, setChanges] = useState<string[]>(user?.changes ?? []);
  const [trustedPerson, setTrustedPerson] = useState(user?.trusted_person ?? '');
  const [trustedPhone, setTrustedPhone] = useState(user?.trusted_phone ?? '');
  const [wantsContact, setWantsContact] = useState(Boolean(user?.wants_contact));
  const [ownPhone, setOwnPhone] = useState(user?.phone ?? '');
  const [goalsText, setGoalsText] = useState(user?.goals_text ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (item: string, list: string[], setter: (v: string[]) => void) => {
    setError('');
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const next = () => {
    setError('');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const back = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await updateProfile({
        phone: isPhoneComplete(ownPhone) ? ownPhone : null,
        problems,
        situations,
        strategies,
        changes,
        trusted_person: trustedPerson.trim() || null,
        trusted_phone: isPhoneComplete(trustedPhone) ? trustedPhone : null,
        wants_contact: wantsContact,
        goals_text: goalsText.trim() || null,
        onboarding_done: true,
      });

      if (trustedPerson.trim() && isPhoneComplete(trustedPhone)) {
        try {
          await saveEmergencyContact(trustedPerson.trim(), trustedPhone.trim());
        } catch {
          // El contacto seguro tambiÃ©n puede guardarse mÃ¡s tarde desde SOS
        }
      }

      onSaved(saved);
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar tu perfil');
      setSaving(false);
    }
  };

  const renderSummaryChips = (items: string[]) =>
    items.length === 0 ? (
      <p style={styles.emptyNote}>PrefiriÃ³ no responder</p>
    ) : (
      <div style={styles.chipRow}>
        {items.map((i) => (
          <span key={i} style={styles.chip}>
            {i}
          </span>
        ))}
      </div>
    );

  const sectionTitle = (title: string, subtitle: string) => (
    <div style={styles.sectionHead}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <p style={styles.sectionSubtitle}>{subtitle}</p>
    </div>
  );

  const optionList = (options: string[], list: string[], setter: (v: string[]) => void) => (
    <div style={styles.optionList}>
      {options.map((opt) => {
        const selected = list.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt, list, setter)}
            style={{
              ...styles.option,
              borderColor: selected ? 'rgba(var(--accent-gold-rgb), 0.55)' : 'var(--border-color)',
              background: selected ? 'rgba(var(--accent-gold-rgb), 0.10)' : 'var(--bg-elevated)',
            }}
          >
            <span style={styles.checkbox}>
              {selected && <Check size={13} color="var(--accent-gold)" strokeWidth={3} />}
            </span>
            <span style={styles.optionText}>{opt}</span>
          </button>
        );
      })}
    </div>
  );

  const continueBtn = (
    <button type="button" className="btn-primary" style={styles.continueBtn} onClick={next}>
      Continuar <ArrowRight size={20} />
    </button>
  );

  return (
    <div className="app-shell auth-shell">
      <div className="bg-blobs" aria-hidden="true">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      <div className="auth-centered" style={styles.centered}>
        <div className="glass-card auth-card fade-in" style={styles.card}>
          <div style={styles.topBar}>
            {step > 0 ? (
              <button type="button" onClick={back} style={styles.backBtn} title="AtrÃ¡s">
                <ArrowLeft size={18} />
              </button>
            ) : (
              <span style={styles.backBtnSpacer} />
            )}
            <span style={styles.stepLabel}>
              {isEdit ? 'EDITAR PERFIL' : 'TU PRIMERA VEZ EN ALIVIA'} Â· {step + 1}/{TOTAL_STEPS}
            </span>
            {onClose ? (
              <button type="button" onClick={onClose} style={styles.backBtn} title="Cerrar">
                âœ•
              </button>
            ) : (
              <span style={styles.backBtnSpacer} />
            )}
          </div>

          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
          </div>

          {error && (
            <div style={styles.alertError}>
              <span>{error}</span>
            </div>
          )}

          {step === 0 && (
            <div style={styles.stepWrap}>
              <div style={styles.iconCircle}>
                <Heart size={34} color="var(--accent-gold)" fill="rgba(var(--accent-gold-rgb), 0.25)" />
              </div>
              <h1 style={styles.welcomeTitle}>
                {isEdit
                  ? `Hola, ${user?.name?.split(' ')[0] || 'amigo'}`
                  : `Â¡Hola, ${user?.name?.split(' ')[0] || 'amigo'}!`}
              </h1>
              <p style={styles.welcomeText}>
                Antes de comenzar, queremos conocerte un poquito para acompaÃ±arte mejor.
                TÃ³mate tu tiempo: no hay respuestas correctas o incorrectas.
              </p>
              <div style={styles.privacyCard}>
                <Shield size={18} color="var(--accent-sage)" />
                <p style={styles.privacyText}>
                  Todo lo que compartas aquÃ­ es privado y solo tÃº puedes verlo. Alivia lo usa
                  para darte herramientas a tu medida.
                </p>
              </div>
              {continueBtn}
            </div>
          )}

          {step === 1 && (
            <div style={styles.stepWrap}>
              {sectionTitle('Â¿Con cuÃ¡les problemas luchas?', 'Marca todos los que quieras, sin prisa.')}
              {optionList(PROBLEMS, problems, setProblems)}
              {continueBtn}
            </div>
          )}

          {step === 2 && (
            <div style={styles.stepWrap}>
              {sectionTitle('Â¿QuÃ© cosas estÃ¡s pasando?', 'CuÃ©ntanos quÃ© estÃ¡s atravesando Ãºltimamente.')}
              {optionList(SITUATIONS, situations, setSituations)}
              {continueBtn}
            </div>
          )}

          {step === 3 && (
            <div style={styles.stepWrap}>
              {sectionTitle('Â¿CÃ³mo te gustarÃ­a luchar contra eso?', 'Elige las formas en las que quieres cuidarte.')}
              {optionList(STRATEGIES, strategies, setStrategies)}
              {continueBtn}
            </div>
          )}

          {step === 4 && (
            <div style={styles.stepWrap}>
              <div style={styles.iconCircle}>
                <HandHeart size={30} color="var(--accent-warm)" />
              </div>
              {sectionTitle('Tu persona de mayor confianza', 'Tener a alguien cerca puede hacer la diferencia.')}
              <div style={styles.field}>
                <label htmlFor="trustedPerson" style={styles.label}>
                  <Users size={13} color="var(--accent-gold)" /> Nombre de esa persona
                </label>
                <input
                  id="trustedPerson"
                  className="input-apple"
                  style={styles.input}
                  placeholder="Ej: Mi mamÃ¡, mi mejor amiga..."
                  value={trustedPerson}
                  onChange={(e) => setTrustedPerson(e.target.value)}
                />
              </div>
              <div style={styles.field}>
                <label htmlFor="trustedPhone" style={styles.label}>
                  <Phone size={13} color="var(--accent-gold)" /> Su telÃ©fono (opcional)
                </label>
                <CountryPhoneInput
                  id="trustedPhone"
                  value={trustedPhone}
                  onChange={setTrustedPhone}
                  autoComplete="tel"
                />
              </div>
              <button type="button" className="btn-primary" style={styles.continueBtn} onClick={next}>
                Continuar <ArrowRight size={20} />
              </button>
            </div>
          )}

          {step === 5 && (
            <div style={styles.stepWrap}>
              <div style={styles.iconCircle}>
                <Phone size={30} color="var(--accent-sage)" />
              </div>
              {sectionTitle('Â¿Te gustarÃ­a que te contacten?', 'Para acompaÃ±arte cuando lo necesites.')}
              <div style={styles.toggleRow}>
                <div>
                  <p style={styles.toggleTitle}>{wantsContact ? 'Â¡Claro que sÃ­!' : 'TodavÃ­a no'}</p>
                  <p style={styles.toggleDesc}>
                    {wantsContact
                      ? 'Pueden escribirte para darte Ã¡nimo y apoyo.'
                      : 'Solo tÃº decides. Puedes cambiarlo cuando quieras.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWantsContact(!wantsContact)}
                  style={{
                    ...styles.switch,
                    background: wantsContact
                      ? 'rgba(var(--accent-gold-rgb), 0.25)'
                      : 'rgba(255, 255, 255, 0.08)',
                    borderColor: wantsContact
                      ? 'rgba(var(--accent-gold-rgb), 0.5)'
                      : 'var(--border-color)',
                  }}
                >
                  <span
                    style={{
                      ...styles.switchKnob,
                      transform: wantsContact ? 'translateX(20px)' : 'translateX(0)',
                      background: wantsContact ? 'var(--accent-gold)' : 'var(--text-muted)',
                    }}
                  />
                </button>
              </div>
              {wantsContact && (
                <div style={styles.field}>
                  <label htmlFor="ownPhone" style={styles.label}>
                    <Phone size={13} color="var(--accent-gold)" /> Tu nÃºmero de telÃ©fono
                  </label>
                  <CountryPhoneInput
                    id="ownPhone"
                    value={ownPhone}
                    onChange={setOwnPhone}
                    autoComplete="tel"
                  />
                  <p style={styles.hint}>Solo se usarÃ¡ para contactarte si hay algo importante.</p>
                </div>
              )}
              <button type="button" className="btn-primary" style={styles.continueBtn} onClick={next}>
                Continuar <ArrowRight size={20} />
              </button>
            </div>
          )}

          {step === 6 && (
            <div style={styles.stepWrap}>
              <div style={styles.iconCircle}>
                <RefreshCcw size={30} color="var(--accent-lavender)" />
              </div>
              {sectionTitle('Â¿QuÃ© cosas deseas cambiar?', 'SueÃ±a un poco: Â¿quÃ© te gustarÃ­a mejorar en tu vida?')}
              {optionList(CHANGES, changes, setChanges)}
              <div style={styles.field}>
                <label htmlFor="goalsText" style={styles.label}>
                  <Sparkles size={13} color="var(--accent-gold)" /> CuÃ©ntanos algo mÃ¡s (opcional)
                </label>
                <textarea
                  id="goalsText"
                  className="input-apple"
                  style={{ ...styles.input, minHeight: '90px', resize: 'vertical' }}
                  placeholder="Â¿QuÃ© mÃ¡s te gustarÃ­a lograr o cambiar?"
                  value={goalsText}
                  onChange={(e) => setGoalsText(e.target.value)}
                />
              </div>
              {continueBtn}
            </div>
          )}

          {step === 7 && (
            <div style={styles.stepWrap}>
              <div style={styles.iconCircle}>
                <Sparkles size={32} color="var(--accent-gold)" />
              </div>
              <h2 style={styles.sectionTitle}>Resumen de tu perfil</h2>
              <p style={styles.sectionSubtitle}>
                Esto es lo que Alivia recordarÃ¡ de ti. Si algo no te convence, vuelve atrÃ¡s.
              </p>

              <div style={styles.summaryBlock}>
                <p style={styles.summaryLabel}>Problemas con los que luchas</p>
                {renderSummaryChips(problems)}
              </div>
              <div style={styles.summaryBlock}>
                <p style={styles.summaryLabel}>Cosas que estÃ¡s pasando</p>
                {renderSummaryChips(situations)}
              </div>
              <div style={styles.summaryBlock}>
                <p style={styles.summaryLabel}>CÃ³mo quieres luchar contra eso</p>
                {renderSummaryChips(strategies)}
              </div>
              <div style={styles.summaryBlock}>
                <p style={styles.summaryLabel}>Lo que deseas cambiar</p>
                {renderSummaryChips(changes)}
              </div>
              <div style={styles.summaryBlock}>
                <p style={styles.summaryLabel}>Persona de confianza</p>
                {trustedPerson.trim() ? (
                  <p style={styles.summaryText}>
                    {trustedPerson.trim()}
                    {trustedPhone.trim() ? ` Â· ${trustedPhone.trim()}` : ''}
                  </p>
                ) : (
                  <p style={styles.emptyNote}>PrefiriÃ³ no compartirlo</p>
                )}
              </div>
              <div style={styles.summaryBlock}>
                <p style={styles.summaryLabel}>Ser contactado para acompaÃ±amiento</p>
                <p style={styles.summaryText}>
                  {wantsContact ? `SÃ­ Â· ${ownPhone.trim() || 'Sin nÃºmero registrado'}` : 'No por ahora'}
                </p>
              </div>

              {goalsText.trim() && (
                <div style={styles.summaryBlock}>
                  <p style={styles.summaryLabel}>Algo mÃ¡s que quieres cambiar</p>
                  <p style={styles.summaryText}>{goalsText.trim()}</p>
                </div>
              )}

              <div style={styles.quoteCard}>
                <p style={styles.quoteText}>
                  "Cada pequeÃ±o paso que das hoy te acerca a la persona que quieres ser."
                </p>
              </div>

              <button
                type="button"
                className="btn-primary"
                style={styles.continueBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <><Loader2 size={20} className="spin" /> Guardando...</>
                ) : isEdit ? (
                  <>Guardar cambios <Check size={20} /></>
                ) : (
                  <>Comenzar mi viaje <ArrowRight size={20} /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  centered: {
    padding: '24px 16px 40px',
    position: 'relative',
    zIndex: 1,
  },
  card: {
    width: '100%',
    maxWidth: '560px',
    padding: 'clamp(14px, 4.5vw, 24px) clamp(12px, 4vw, 22px)',
    borderRadius: '28px',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  backBtn: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  backBtnSpacer: {
    width: '34px',
    height: '34px',
  },
  stepLabel: {
    fontSize: '10px',
    letterSpacing: '0.18em',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  progressTrack: {
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    marginBottom: '18px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-sage))',
    transition: 'width 0.4s cubic-bezier(0.34, 1.4, 0.64, 1)',
  },
  alertError: {
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'var(--accent-rose)',
    background: 'rgba(var(--accent-rose-rgb), 0.08)',
    border: '1px solid rgba(var(--accent-rose-rgb), 0.2)',
    marginBottom: '12px',
  },
  stepWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  iconCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(var(--accent-gold-rgb), 0.08)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
    boxShadow: '0 8px 30px rgba(var(--accent-gold-rgb), 0.10)',
    margin: '0 auto',
  },
  welcomeTitle: {
    textAlign: 'center',
    margin: 0,
    fontFamily: 'var(--font-title)',
    fontSize: '26px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  welcomeText: {
    textAlign: 'center',
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--text-secondary)',
  },
  privacyCard: {
    display: 'flex',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'rgba(var(--accent-sage-rgb), 0.06)',
    border: '1px solid rgba(var(--accent-sage-rgb), 0.18)',
    alignItems: 'flex-start',
  },
  privacyText: {
    margin: 0,
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  sectionHead: {
    textAlign: 'center',
  },
  sectionTitle: {
    margin: 0,
    fontFamily: 'var(--font-title)',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  sectionSubtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '46vh',
    overflowY: 'auto',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    textAlign: 'left',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '13.5px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    minWidth: '20px',
    borderRadius: '6px',
    border: '1.5px solid rgba(255, 255, 255, 0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-elevated)',
  },
  optionText: {
    lineHeight: 1.4,
  },
  continueBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '16px',
    fontSize: '15px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '6px',
  },
  field: {
    marginBottom: '4px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '6px',
    paddingLeft: '4px',
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '14px',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
  },
  hint: {
    margin: '6px 0 0',
    fontSize: '11px',
    color: 'var(--text-muted)',
    paddingLeft: '4px',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    borderRadius: '16px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
  },
  toggleTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  toggleDesc: {
    margin: '4px 0 0',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  switch: {
    width: '48px',
    height: '28px',
    minWidth: '48px',
    borderRadius: '14px',
    border: '1px solid',
    cursor: 'pointer',
    padding: 0,
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  switchKnob: {
    position: 'absolute',
    top: '3px',
    left: '3px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    transition: 'all 0.3s cubic-bezier(0.34, 1.4, 0.64, 1)',
  },
  summaryBlock: {
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
  },
  summaryLabel: {
    margin: '0 0 8px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'var(--accent-gold)',
    textTransform: 'uppercase',
  },
  summaryText: {
    margin: 0,
    fontSize: '13.5px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  emptyNote: {
    margin: 0,
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  chip: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    background: 'rgba(var(--accent-gold-rgb), 0.10)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
    color: 'var(--text-primary)',
  },
  quoteCard: {
    padding: '14px 16px',
    borderRadius: '14px',
    textAlign: 'center',
    background: 'rgba(var(--accent-lavender-rgb), 0.06)',
    border: '1px solid rgba(var(--accent-lavender-rgb), 0.18)',
  },
  quoteText: {
    margin: 0,
    fontSize: '13px',
    fontStyle: 'italic',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
};