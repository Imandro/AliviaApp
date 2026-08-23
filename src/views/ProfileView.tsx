import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { LogOut, Pencil, Mail, Phone as PhoneIcon, AtSign, HeartPulse, ChevronRight, ShieldCheck, Download, Fingerprint, Bell } from 'lucide-react';
import { SafeUser, logout, setToken } from '../utils/auth';
import { getMyAssessments, DIMENSION_INFO, LEVEL_INFO, type AssessmentRecord } from '../utils/assessment';
import {
  applyPrivacyScreen,
  authenticateWithBiometry,
  biometryInfo,
  getPrivacyPrefs,
  setPrivacyPrefs,
  type PrivacyPrefs,
} from '../utils/appLock';
import { downloadHtmlReport, downloadJsonExport } from '../utils/exportData';
import { applyDailyReminder, getReminderPrefs, saveReminderPrefs, syncCheckInReminder } from '../utils/reminders';
import { getLang, setLang, t } from '../i18n';
import logoVertical from '../assets/logo-vertical.png';

interface ProfileViewProps {
  user: SafeUser;
  onEdit: () => void;
  onLogout: () => void;
}

const Chip = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={styles.block}>
    <p style={styles.label}>{label}</p>
    {children}
  </div>
);

const RenderList = ({ items }: { items: string[] }) => {
  if (!items.length) {
    return <p style={styles.empty}>Prefirió no compartir esto</p>;
  }
  return (
    <div style={styles.chipRow}>
      {items.map((i) => (
        <span key={i} style={styles.chip}>{i}</span>
      ))}
    </div>
  );
};

interface ToggleRowProps {
  title: string;
  desc: string;
  icon?: React.ReactNode;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void | Promise<void>;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ title, desc, icon, on, disabled, onToggle }) => (
  <div style={{ ...styles.privRow, opacity: disabled ? 0.45 : 1 }}>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      {icon ? <span style={{ color: 'var(--accent-gold)', marginTop: 2 }}>{icon}</span> : null}
      <div>
        <b style={styles.privTitle}>{title}</b>
        <p style={styles.privDesc}>{desc}</p>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={title}
      disabled={disabled}
      onClick={() => void onToggle()}
      style={{
        ...styles.switchTrack,
        background: on ? 'linear-gradient(135deg, #8CB08D, #3E7157)' : 'rgba(255,255,255,0.14)',
      }}
    >
      <span
        style={{
          ...styles.switchKnob,
          transform: on ? 'translateX(22px)' : 'translateX(0)',
        }}
      />
    </button>
  </div>
);

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onEdit, onLogout }) => {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyPrefs>(() => getPrivacyPrefs());
  const [bioLabel, setBioLabel] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [exporting, setExporting] = useState<'json' | 'reporte' | null>(null);
  const [reminders, setReminders] = useState(() => getReminderPrefs());
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    getMyAssessments().then(setAssessments);
    if (native) {
      biometryInfo().then((info) => {
        setBioAvailable(info.available);
        setBioLabel(info.label);
      });
    }
  }, [native]);

  const togglePrivacyScreen = () => {
    const next = setPrivacyPrefs({ privacyScreen: !privacy.privacyScreen });
    setPrivacy(next);
    applyPrivacyScreen();
  };

  const toggleBiometricLock = async () => {
    if (!privacy.biometricLock) {
      // Al activar: verificar identidad una vez para confirmar que funciona
      const ok = await authenticateWithBiometry();
      if (!ok) return;
    }
    const next = setPrivacyPrefs({ biometricLock: !privacy.biometricLock });
    setPrivacy(next);
  };

  const handleExport = async (kind: 'json' | 'reporte') => {
    try {
      setExporting(kind);
      if (kind === 'json') await downloadJsonExport();
      else await downloadHtmlReport();
    } finally {
      setExporting(null);
    }
  };

  const updateReminders = (patch: Partial<typeof reminders>) => {
    const next = saveReminderPrefs(patch);
    setReminders(next);
    void applyDailyReminder(next);
    if ('checkinEnabled' in patch) {
      const last = assessments[0]?.created_at ?? null;
      void syncCheckInReminder(next, last);
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // Aunque falle en la API, cerramos sesión localmente
    }
    setToken(null);
    onLogout();
  };

  return (
    <div className="fade-in flex flex-col gap-4" style={{ paddingBottom: '90px' }}>
      <div className="glass-card" style={styles.hero}>
        <div style={styles.avatar}>
          <img src={logoVertical} alt="ALIVIA" style={styles.avatarImg} />
        </div>
        <h3 style={styles.name}>{user.name}</h3>
        <p style={styles.username}>@{user.username}</p>

        <div style={styles.contactRow}>
          <span style={styles.contactChip}><AtSign size={12} /> {user.email}</span>
          {user.phone && (
            <span style={styles.contactChip}><PhoneIcon size={12} /> {user.phone}</span>
          )}
        </div>

        <button className="btn-primary" style={styles.editBtn} onClick={onEdit}>
          <Pencil size={16} /> Editar mi perfil
        </button>
      </div>

      <div className="glass-card" style={styles.card}>
        <Chip label="Problemas con los que luchas">
          <RenderList items={user.problems} />
        </Chip>
        <div style={styles.divider} />
        <Chip label="Cosas que estoy pasando">
          <RenderList items={user.situations} />
        </Chip>
        <div style={styles.divider} />
        <Chip label="Cómo quiero luchar contra eso">
          <RenderList items={user.strategies} />
        </Chip>
        <div style={styles.divider} />
        <Chip label="Persona de mayor confianza">
          {user.trusted_person ? (
            <p style={styles.text}>
              {user.trusted_person}
              {user.trusted_phone ? ` · ${user.trusted_phone}` : ''}
            </p>
          ) : (
            <p style={styles.empty}>Prefirió no compartir esto</p>
          )}
        </Chip>
        <div style={styles.divider} />
        <Chip label="Contacto para acompañamiento">
          <p style={styles.text}>
            {user.wants_contact ? `Sí · ${user.phone || 'Sin número'}` : 'No por ahora'}
          </p>
        </Chip>
        <div style={styles.divider} />
        <Chip label="Cosas que quiero cambiar">
          <RenderList items={user.changes} />
        </Chip>
        {user.goals_text && (
          <>
            <div style={styles.divider} />
            <Chip label="Algo más">
              <p style={styles.text}>{user.goals_text}</p>
            </Chip>
          </>
        )}
      </div>

      {/* Chequeo de bienestar */}
      <div className="glass-card" style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <HeartPulse size={15} color="var(--accent-gold)" />
          <p style={styles.label} className="m-0">{t('perfil_chequeo')}</p>
        </div>
        {assessments.length === 0 ? (
          <p style={styles.empty}>Aún no has hecho tu chequeo de estrés, ansiedad y depresión.</p>
        ) : (
          <>
            <p style={styles.text}>
              Último chequeo: <b>{new Date(assessments[0].created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</b>
            </p>
            <div style={styles.assessmentChips}>
              {(['stress', 'anxiety', 'depression'] as const).map((dim) => {
                const info = DIMENSION_INFO[dim];
                const lv = LEVEL_INFO[
                  assessments[0][dim] <= 4 ? 'baja' : assessments[0][dim] <= 9 ? 'moderada' : 'alta'
                ];
                return (
                  <span key={dim} style={{ ...styles.assessmentChip, color: lv.color, borderColor: `rgba(${lv.rgb}, 0.4)`, background: `rgba(${lv.rgb}, 0.1)` }}>
                    {info.emoji} {info.short}: {assessments[0][dim]}/15 · {lv.label}
                  </span>
                );
              })}
            </div>
            <p style={{ ...styles.text, fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {assessments.length} chequeo{assessments.length === 1 ? '' : 's'} registrado{assessments.length === 1 ? '' : 's'}
            </p>
          </>
        )}
        <button
          onClick={() => navigate('/assessment')}
          style={styles.assessmentLink}
        >
          Ver mis chequeos y hacer uno nuevo <ChevronRight size={13} />
        </button>
      </div>

      {/* Idioma */}
      <div className="glass-card" style={styles.card}>
        <p style={styles.label} className="m-0">IDIOMA · LANGUAGE</p>
        <div style={styles.langRow}>
          {(['es', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                if (getLang() === l) return;
                setLang(l);
                window.location.reload();
              }}
              style={{
                ...styles.langBtn,
                ...(getLang() === l ? styles.langBtnOn : {}),
              }}
            >
              {l === 'es' ? 'Español' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {/* Privacidad */}
      <div className="glass-card" style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <ShieldCheck size={15} color="var(--accent-gold)" />
          <p style={styles.label} className="m-0">{t('perfil_privacidad')}</p>
        </div>

        <ToggleRow
          title="Ocultar en multitasking"
          desc="El contenido se difumina cuando cambias de app. Solo en la app instalada."
          on={privacy.privacyScreen}
          disabled={!native}
          onToggle={togglePrivacyScreen}
        />
        <ToggleRow
          title={bioLabel ? `Bloqueo con ${bioLabel.toLowerCase()}` : 'Bloqueo biométrico'}
          desc={
            !native
              ? 'Disponible en la app instalada.'
              : bioAvailable
                ? 'Se pedirá tu huella, rostro o PIN al abrir ALIVIA.'
                : 'Tu dispositivo no tiene biometría registrada.'
          }
          icon={<Fingerprint size={15} />}
          on={privacy.biometricLock}
          disabled={!native || !bioAvailable}
          onToggle={toggleBiometricLock}
        />
      </div>

      {/* Mis datos */}
      <div className="glass-card" style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Download size={15} color="var(--accent-gold)" />
          <p style={styles.label} className="m-0">{t('perfil_datos')}</p>
        </div>
        <p style={{ ...styles.text, fontSize: '12px', marginTop: 0 }}>
          Tu información es tuya: descárgala cuando quieras. El reporte es imprimible a PDF.
        </p>
        <div style={styles.exportRow}>
          <button style={styles.exportBtn} onClick={() => handleExport('json')} disabled={exporting !== null}>
            {exporting === 'json' ? 'Preparando…' : 'Descargar JSON'}
          </button>
          <button style={styles.exportBtn} onClick={() => handleExport('reporte')} disabled={exporting !== null}>
            {exporting === 'reporte' ? 'Generando…' : 'Reporte imprimible'}
          </button>
        </div>
      </div>

      {/* Recordatorios */}
      <div className="glass-card" style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Bell size={15} color="var(--accent-gold)" />
          <p style={styles.label} className="m-0">{t('perfil_recordatorios')}</p>
        </div>

        <ToggleRow
          title="Respiración diaria"
          desc="Un aviso suave a la hora que elijas. Solo en la app instalada."
          on={reminders.dailyEnabled}
          disabled={!native}
          onToggle={() => updateReminders({ dailyEnabled: !reminders.dailyEnabled })}
        />
        {reminders.dailyEnabled && native && (
          <div style={styles.timeRow}>
            <span style={styles.privDesc}>Hora</span>
            <input
              type="time"
              value={`${String(reminders.dailyHour).padStart(2, '0')}:${String(reminders.dailyMinute).padStart(2, '0')}`}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number);
                updateReminders({ dailyHour: h || 20, dailyMinute: m || 0 });
              }}
              style={styles.timeInput}
            />
          </div>
        )}

        <ToggleRow
          title="Chequeo cada 5 días"
          desc="Te avisamos cuando toque tu siguiente chequeo de bienestar."
          icon={<HeartPulse size={15} />}
          on={reminders.checkinEnabled}
          disabled={!native}
          onToggle={() => updateReminders({ checkinEnabled: !reminders.checkinEnabled })}
        />
      </div>

      <button className="btn-danger" style={styles.logoutBtn} onClick={handleLogout} disabled={signingOut}>
        <LogOut size={16} /> {signingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>

      <button style={styles.linkBtn} onClick={() => navigate('/explore')}>
        Volver a Explorar
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  hero: {
    padding: '22px 18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.08) 0%, rgba(var(--accent-lavender-rgb), 0.04) 100%)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.12)',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  name: {
    marginTop: '8px',
    fontSize: '22px',
    fontWeight: 800,
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    color: 'var(--text-primary)',
    textTransform: 'none',
  },
  username: {
    margin: 0,
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  contactRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '8px',
  },
  contactChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11.5px',
    padding: '5px 10px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
  },
  editBtn: {
    marginTop: '12px',
    width: 'auto',
    padding: '10px 18px',
    borderRadius: '14px',
    fontSize: '13px',
  },
  card: {
    padding: '16px 18px',
  },
  block: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    margin: 0,
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'var(--accent-gold)',
    textTransform: 'uppercase',
  },
  text: {
    margin: 0,
    fontSize: '13.5px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  empty: {
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
  divider: {
    height: '1px',
    margin: '14px 0',
    background: 'var(--border-color)',
  },
  assessmentChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px',
  },
  assessmentChip: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    padding: '5px 10px',
    borderRadius: '999px',
    border: '1px solid',
  },
  assessmentLink: {
    marginTop: '12px',
    background: 'rgba(var(--accent-gold-rgb), 0.08)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
    borderRadius: '12px',
    padding: '10px 12px',
    color: 'var(--accent-gold)',
    fontFamily: 'var(--font-title)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    transition: 'all 0.2s',
  },
  logoutBtn: {
    marginTop: '4px',
  },
  privRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 0',
  },
  langRow: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },
  langBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 12,
    border: '1px solid var(--border-color)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  langBtnOn: {
    background: 'rgba(var(--accent-gold-rgb), 0.14)',
    borderColor: 'rgba(var(--accent-gold-rgb), 0.45)',
    color: 'var(--accent-gold)',
  },
  privTitle: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  privDesc: {
    margin: '2px 0 0',
    fontSize: '11.5px',
    lineHeight: 1.5,
    color: 'var(--text-muted)',
  },
  switchTrack: {
    flexShrink: 0,
    width: 48,
    height: 28,
    borderRadius: 999,
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    position: 'relative',
    transition: 'background .25s ease',
  },
  switchKnob: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 22,
    height: 22,
    borderRadius: 999,
    background: '#fff',
    boxShadow: '0 2px 6px rgba(0,0,0,.35)',
    transition: 'transform .25s cubic-bezier(.34,1.4,.64,1)',
  },
  exportRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  exportBtn: {
    flex: 1,
    minWidth: 130,
    padding: '11px 14px',
    borderRadius: 13,
    border: '1px solid var(--border-color-glow)',
    background: 'rgba(var(--accent-gold-rgb), 0.08)',
    color: 'var(--accent-gold)',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '12.5px',
    cursor: 'pointer',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '2px 0 10px',
  },
  timeInput: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid var(--border-color)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    padding: '6px 10px',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '12.5px',
    textDecoration: 'underline',
    padding: '8px',
  },
};