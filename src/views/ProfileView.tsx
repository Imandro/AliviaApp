import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
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
import {
  applyReminderSettings,
  getNotificationPermission,
  getReminderPrefs,
  loadRemoteReminderPrefs,
  saveReminderPrefs,
} from '../utils/reminders';
import { REMINDER_CATALOG, type ReminderId, type ReminderPrefs, type ReminderSchedule } from '../utils/reminderCatalog';
import { isNativeShell } from '../utils/nativeShell';
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

const localDateString = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  const [reminderError, setReminderError] = useState('');
  const [savingReminders, setSavingReminders] = useState(false);
  const [remoteRemindersLoaded, setRemoteRemindersLoaded] = useState(false);
  const native = isNativeShell;
  const nativeReminderHorizon = Capacitor.getPlatform() === 'ios' || (native && !Capacitor.isNativePlatform()) ? 20 : 90;
  const todayReminderDate = new Date();
  const todayReminderDateString = `${todayReminderDate.getFullYear()}-${String(todayReminderDate.getMonth() + 1).padStart(2, '0')}-${String(todayReminderDate.getDate()).padStart(2, '0')}`;
  const maxReminderDate = new Date();
  maxReminderDate.setDate(maxReminderDate.getDate() + nativeReminderHorizon - 1);
  const maxReminderDateString = `${maxReminderDate.getFullYear()}-${String(maxReminderDate.getMonth() + 1).padStart(2, '0')}-${String(maxReminderDate.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    getMyAssessments().then(setAssessments);
    if (native) {
      biometryInfo().then((info) => {
        setBioAvailable(info.available);
        setBioLabel(info.label);
      });
    }
  }, [native]);

  useEffect(() => {
    if (native) {
      setRemoteRemindersLoaded(true);
      return;
    }
    let active = true;
    loadRemoteReminderPrefs()
      .then(async (remote) => {
        if (active) setRemoteRemindersLoaded(true);
        if (!active || !remote) return;
        const saved = saveReminderPrefs(remote);
        setReminders(saved);
        if (REMINDER_CATALOG.some(({ id }) => saved.categories[id].enabled)) {
          await applyReminderSettings(saved);
        }
      })
      .catch(() => {
        if (active) {
          setRemoteRemindersLoaded(true);
          setReminderError('No se pudieron sincronizar los recordatorios guardados.');
        }
      });
    return () => { active = false; };
  }, [native]);

  useEffect(() => {
    if (!remoteRemindersLoaded) return;
    const latest = assessments[0]?.created_at;
    if (!latest) return;
    const startDate = localDateString(latest);
    const schedule = reminders.categories['wellbeing-checkin'];
    if (!startDate || schedule.startDate === startDate) return;
    const next = {
      ...reminders,
      categories: {
        ...reminders.categories,
        'wellbeing-checkin': { ...schedule, startDate },
      },
    };
    setReminders(next);
    void import('../utils/reminders').then(({ syncCheckInReminder }) =>
      syncCheckInReminder(next, latest)
    ).catch((err) => {
      setReminderError(err instanceof Error ? err.message : 'No se pudo actualizar el siguiente chequeo.');
    });
  }, [assessments, reminders, remoteRemindersLoaded]);

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

  const updateReminders = async (nextPrefs: ReminderPrefs, requestPermission = true) => {
    const next = saveReminderPrefs(nextPrefs);
    setReminders(next);
    setReminderError('');
    setSavingReminders(true);
    try {
      const applied = await applyReminderSettings(next, requestPermission);
      if (!applied) {
        setReminderError('Permite las notificaciones para activar tus recordatorios.');
      }
    } catch (err) {
      setReminderError(err instanceof Error ? err.message : 'No se pudieron guardar los recordatorios.');
    } finally {
      setSavingReminders(false);
    }
  };

  const updateReminderSchedule = (id: ReminderId, patch: Partial<ReminderSchedule>) => {
    const current = reminders.categories[id];
    if (patch.enabled === true && current.frequency === 'once' && !current.date) {
      setReminderError('Elige una fecha futura para este recordatorio.');
      return;
    }
    const next = {
      ...reminders,
      categories: {
        ...reminders.categories,
        [id]: { ...reminders.categories[id], ...patch },
      },
    };
    void updateReminders(next, patch.enabled === true);
  };

  const remindersEnabled = REMINDER_CATALOG.some(({ id }) => reminders.categories[id].enabled);

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
        <p style={{ ...styles.privDesc, marginTop: 0 }}>
          {native
            ? 'Se programan en este dispositivo y pueden llegar sin conexión.'
            : 'La PWA usa notificaciones push para avisarte aunque esté cerrada.'}
        </p>
        <div style={styles.reminderGlobal}>
          <label style={styles.privDesc}>
            <input
              type="checkbox"
              checked={reminders.quietHours.enabled}
              onChange={(event) => void updateReminders({
                ...reminders,
                quietHours: { ...reminders.quietHours, enabled: event.target.checked },
              })}
            />
            {' '}Horario silencioso
          </label>
          <div style={styles.reminderTimes}>
            <input
              aria-label="Inicio de horario silencioso"
              type="time"
              value={reminders.quietHours.start}
              onChange={(event) => void updateReminders({
                ...reminders,
                quietHours: { ...reminders.quietHours, start: event.target.value },
              })}
              style={styles.timeInput}
              disabled={!reminders.quietHours.enabled}
            />
            <span style={styles.privDesc}>a</span>
            <input
              aria-label="Fin de horario silencioso"
              type="time"
              value={reminders.quietHours.end}
              onChange={(event) => void updateReminders({
                ...reminders,
                quietHours: { ...reminders.quietHours, end: event.target.value },
              })}
              style={styles.timeInput}
              disabled={!reminders.quietHours.enabled}
            />
          </div>
          <label style={styles.privDesc}>
            Máximo de avisos al día
            <select
              value={reminders.maxPerDay}
              onChange={(event) => void updateReminders({ ...reminders, maxPerDay: Number(event.target.value) })}
              style={styles.reminderSelect}
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((limit) => <option key={limit} value={limit}>{limit}</option>)}
            </select>
          </label>
        </div>
        {REMINDER_CATALOG.map((definition) => {
          const schedule = reminders.categories[definition.id];
          return (
            <details key={definition.id} style={styles.reminderItem}>
              <summary style={styles.reminderSummary}>
                <span>
                  <b style={styles.privTitle}>{definition.title}</b>
                  <small style={styles.reminderGroup}>{definition.group}</small>
                </span>
                <input
                  type="checkbox"
                  aria-label={`Activar ${definition.title}`}
                  checked={schedule.enabled}
                  disabled={savingReminders}
                  onChange={(event) => updateReminderSchedule(definition.id, { enabled: event.target.checked })}
                  onClick={(event) => event.stopPropagation()}
                />
              </summary>
              <p style={styles.privDesc}>{definition.body}</p>
              <div style={styles.reminderFields}>
                <label style={styles.privDesc}>
                  Hora
                  <input
                    aria-label={`Hora de ${definition.title}`}
                    type="time"
                    value={schedule.time}
                    onChange={(event) => updateReminderSchedule(definition.id, { time: event.target.value })}
                    style={styles.timeInput}
                  />
                </label>
                <label style={styles.privDesc}>
                  Frecuencia
                  <select
                    value={schedule.frequency}
                    onChange={(event) => updateReminderSchedule(definition.id, {
                      frequency: event.target.value as ReminderSchedule['frequency'],
                    })}
                    style={styles.reminderSelect}
                  >
                    <option value="daily">Diaria</option>
                    <option value="weekly">Días de la semana</option>
                    <option value="interval">Cada cierto número de días</option>
                    <option value="once">Una sola vez</option>
                  </select>
                </label>
                {schedule.frequency === 'weekly' && (
                  <div style={styles.weekdayRow} aria-label={`Días de ${definition.title}`}>
                    {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((label, day) => (
                      <label key={day} style={styles.weekday}>
                        <input
                          type="checkbox"
                          checked={schedule.daysOfWeek.includes(day)}
                          disabled={schedule.daysOfWeek.length === 1 && schedule.daysOfWeek.includes(day)}
                          onChange={(event) => updateReminderSchedule(definition.id, {
                            daysOfWeek: event.target.checked
                              ? [...new Set([...schedule.daysOfWeek, day])]
                              : schedule.daysOfWeek.filter((item) => item !== day),
                          })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
                {schedule.frequency === 'interval' && (
                  <label style={styles.privDesc}>
                    Repetir cada
                    <select
                      value={schedule.intervalDays}
                      onChange={(event) => updateReminderSchedule(definition.id, { intervalDays: Number(event.target.value) })}
                      style={styles.reminderSelect}
                    >
                      {[2, 3, 5, 7, 10, 14, 21, 30].map((days) => <option key={days} value={days}>{days} días</option>)}
                    </select>
                  </label>
                )}
                {schedule.frequency === 'once' && (
                  <>
                    <label style={styles.privDesc}>
                      Fecha
                      <input
                        type="date"
                        min={todayReminderDateString}
                        max={maxReminderDateString}
                        value={schedule.date}
                        onChange={(event) => updateReminderSchedule(definition.id, { date: event.target.value })}
                        style={styles.timeInput}
                      />
                    </label>
                    {(!schedule.date || new Date(`${schedule.date}T${schedule.time}:00`).getTime() <= Date.now()) && (
                      <p style={styles.reminderError}>Selecciona una fecha y hora futuras para programarlo.</p>
                    )}
                  </>
                )}
              </div>
            </details>
          );
        })}
        {reminderError && <p role="alert" style={styles.reminderError}>{reminderError}</p>}
        {!native && remindersEnabled && getNotificationPermission() === 'default' && (
          <button
            type="button"
            className="btn-primary"
            style={{ alignSelf: 'flex-start', marginTop: 10 }}
            disabled={savingReminders}
            onClick={() => void updateReminders(reminders, true)}
          >
            Permitir notificaciones
          </button>
        )}
        {native && remindersEnabled && (
          <button
            type="button"
            className="btn-primary"
            style={{ alignSelf: 'flex-start', marginTop: 10 }}
            disabled={savingReminders}
            onClick={() => void updateReminders(reminders, true)}
          >
            Activar o actualizar permisos y horarios
          </button>
        )}
        {!native && getNotificationPermission() === 'denied' && (
          <p style={styles.reminderError}>
            Las notificaciones están bloqueadas en el navegador. Actívalas en los ajustes del sitio para recibir avisos.
          </p>
        )}
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
  reminderGlobal: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '12px 0',
    borderTop: '1px solid var(--border-color)',
    borderBottom: '1px solid var(--border-color)',
  },
  reminderTimes: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  reminderSelect: {
    display: 'block',
    marginTop: 4,
    maxWidth: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    padding: '7px 9px',
  },
  reminderItem: {
    padding: '11px 0',
    borderBottom: '1px solid var(--border-color)',
  },
  reminderSummary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    cursor: 'pointer',
  },
  reminderGroup: {
    display: 'block',
    marginTop: 2,
    color: 'var(--text-muted)',
    fontSize: 10,
  },
  reminderFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 10,
  },
  weekdayRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  weekday: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: 'var(--text-secondary)',
    fontSize: 12,
  },
  reminderError: {
    margin: '10px 0 0',
    color: 'var(--accent-rose)',
    fontSize: 12,
    lineHeight: 1.5,
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