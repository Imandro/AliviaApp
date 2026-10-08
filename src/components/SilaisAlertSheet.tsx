/* ----------------------------------------------------
   ALIVIA - HOJA DE ALERTA AL SILAIS (SilaisAlertSheet)
   Modal de confirmación antes de enviar la alerta por
   WhatsApp al SILAIS de Nicaragua (+505 8413 2841).
   Prellena nombre/teléfono del perfil y ubica por GPS +
   geocodificación inversa; todo editable y con respaldo
   wa.me si la API de la app falla.
   ---------------------------------------------------- */

import React, { useEffect, useState } from 'react';
import { MapPin, Send, X, Check, ShieldAlert, MessageSquare, Loader2, Phone } from 'lucide-react';
import { getCachedUser } from '../utils/auth';
import { logCrisisContact } from '../utils/assessment';
import {
  ALERT_TIPOS,
  DEPARTAMENTOS_NI,
  SILAIS_DISPLAY,
  requestCoords,
  reverseGeocode,
  sendSilaisAlert,
  silaisWaLink,
  type SilaisAlertData,
} from '../utils/silaisAlert';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Preselección de tipo (ej. "Ideación suicida" desde el chat). */
  alertType?: string;
  /** Contexto extra (última frase de la persona en crisis). */
  note?: string;
}

type GeoState = 'idle' | 'locating' | 'done' | 'manual';

export const SilaisAlertSheet: React.FC<Props> = ({ open, onClose, alertType, note }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [tipo, setTipo] = useState(alertType || ALERT_TIPOS[0]);
  const [nota, setNota] = useState(note || '');
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [error, setError] = useState('');

  // Al abrir: perfil en caché, tipo/nota precargados y GPS en marcha.
  useEffect(() => {
    if (!open) return;
    const user = getCachedUser();
    if (user) {
      if (!name) setName(user.name || '');
      if (!phone) setPhone(user.phone || '');
    }
    setTipo(alertType || ALERT_TIPOS[0]);
    if (note) setNota(note);
    setSent(false);
    setError('');
    setSending(false);
    setConfirmed(false);
    setDuplicate(false);

    let cancelled = false;
    setGeoState('locating');
    requestCoords().then((c) => {
      if (cancelled) return;
      if (!c) {
        setGeoState('manual');
        return;
      }
      setCoords(c);
      reverseGeocode(c.lat, c.lng).then((geo) => {
        if (cancelled) return;
        if (geo?.department) setDepartment(geo.department);
        if (geo?.municipality) setMunicipality(geo.municipality);
        if (geo?.address) setAddress(geo.address);
        setGeoState('done');
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const payload = (): SilaisAlertData => ({
    name: name.trim(),
    phone: phone.trim() || undefined,
    department: department.trim() || undefined,
    municipality: municipality.trim() || undefined,
    address: address.trim() || undefined,
    lat: coords?.lat,
    lng: coords?.lng,
    alertType: tipo,
    note: nota.trim() || undefined,
  });

  const canSend = name.trim().length >= 2 && confirmed && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    const data = payload();
    const result = await sendSilaisAlert(data);
    setSending(false);
    if (result.ok) {
      setDuplicate(result.duplicate === true);
      setSent(true);
      // Registro de auditoría (best-effort, igual que las líneas de crisis).
      void logCrisisContact(null, 'silais', `${tipo} · ${data.department || 'ubicación sin confirmar'}`);
    } else {
      setError(result.error);
    }
  };

  if (!open) return null;

  const waLink = silaisWaLink(payload());

  return (
    <div style={styles.overlay} onClick={!sending ? onClose : undefined}>
      <div
        className="fade-in"
        style={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Alerta al SILAIS"
      >
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <ShieldAlert size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>ALERTAR AL SILAIS</h3>
            <p className="body-standard" style={{ fontSize: '10.5px', opacity: 0.7, marginTop: '2px' }}>
              Se enviará por WhatsApp al {SILAIS_DISPLAY}
            </p>
          </div>
          <button onClick={onClose} disabled={sending} style={styles.closeBtn} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <div style={styles.body}>
            <div style={styles.successBox}>
              <div style={styles.successIcon}><Check size={26} color="#fff" /></div>
              <p className="title-medium" style={{ color: 'var(--accent-sage)', textAlign: 'center' }}>
                {duplicate ? 'Ya se envió' : 'Alerta enviada'}
              </p>
              <p className="body-standard" style={{ fontSize: '12px', textAlign: 'center', opacity: 0.85 }}>
                {duplicate
                  ? `Ya se envió una alerta idéntica por ${name.trim()} hace pocos minutos y no se reenvió, para no generar alarmas repetidas. Si esto es una emergencia nueva, cambia un dato o espera unos minutos.`
                  : `El SILAIS recibió los datos de ${name.trim()}. Si la situación es inmediata, llama también al 911 o permanece con alguien de confianza.`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="tel:911" className="btn-secondary" style={styles.actionBtn}>
                <Phone size={14} /> Llamar al 911
              </a>
              <button onClick={onClose} className="btn-primary" style={styles.actionBtn}>
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.body}>
            <div style={styles.privacyNote}>
              <ShieldAlert size={13} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                Tus datos (nombre, ubicación y situación) se envían únicamente al SILAIS para gestionar la
                emergencia. Se usan solo para esta alerta.
              </span>
            </div>

            <label style={styles.fieldLabel} htmlFor="silais-tipo">Tipo de alerta</label>
            <select
              id="silais-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={styles.input}
            >
              {ALERT_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <label style={styles.fieldLabel} htmlFor="silais-nombre">Nombre de la persona *</label>
            <input
              id="silais-nombre"
              className="input-apple"
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              autoComplete="name"
            />

            <label style={styles.fieldLabel} htmlFor="silais-tel">Teléfono de contacto</label>
            <input
              id="silais-tel"
              className="input-apple"
              style={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="8XXX XXXX"
              inputMode="tel"
              autoComplete="tel"
            />

            <div style={styles.geoRow}>
              <MapPin size={14} color={geoState === 'locating' ? 'var(--accent-gold)' : geoState === 'done' ? 'var(--accent-sage)' : 'var(--text-muted)'} />
              <span className="body-standard" style={{ fontSize: '10.5px', opacity: 0.75 }}>
                {geoState === 'locating'
                  ? 'Ubicando por GPS…'
                  : geoState === 'done'
                    ? 'Ubicación obtenida por GPS (editable)'
                    : coords
                      ? 'Coordenadas guardadas; completa la dirección'
                      : 'Sin ubicación: escribe la dirección'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel} htmlFor="silais-depto">Departamento</label>
                <select
                  id="silais-depto"
                  value={DEPARTAMENTOS_NI.includes(department as never) ? department : ''}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={styles.input}
                >
                  <option value="">Por confirmar</option>
                  {DEPARTAMENTOS_NI.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel} htmlFor="silais-muni">Municipio</label>
                <input
                  id="silais-muni"
                  className="input-apple"
                  style={styles.input}
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  placeholder="Municipio"
                />
              </div>
            </div>

            <label style={styles.fieldLabel} htmlFor="silais-dir">Dirección</label>
            <input
              id="silais-dir"
              className="input-apple"
              style={styles.input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Barrio, calle, referencia"
            />

            <label style={styles.fieldLabel} htmlFor="silais-nota">Nota (opcional)</label>
            <textarea
              id="silais-nota"
              className="input-apple"
              style={{ ...styles.input, minHeight: '64px', resize: 'vertical' }}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Contexto breve para el equipo del SILAIS"
              maxLength={300}
            />

            {error && (
              <div style={styles.errorBox}>
                <span>{error}. Puedes reintentar o abrir WhatsApp directamente:</span>
                <a href={waLink} target="_blank" rel="noopener noreferrer" style={styles.waFallback}>
                  <MessageSquare size={14} /> Enviar por WhatsApp
                </a>
              </div>
            )}

            <label style={styles.confirmRow} htmlFor="silais-confirm">
              <input
                id="silais-confirm"
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={sending}
                style={{ width: '16px', height: '16px', accentColor: '#e53935', flexShrink: 0 }}
              />
              <span style={{ fontSize: '11.5px', lineHeight: 1.45 }}>
                Confirmo que esto es una emergencia real y quiero avisar al SILAIS.
              </span>
            </label>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={styles.actionBtn}
                disabled={sending}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="btn-primary"
                style={{ ...styles.actionBtn, opacity: canSend ? 1 : 0.55 }}
                disabled={!canSend}
              >
                {sending ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                {sending ? 'Enviando…' : 'Enviar alerta'}
              </button>
            </div>

            {error && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ ...styles.actionBtn, justifyContent: 'center' }}>
                <MessageSquare size={14} /> Abrir WhatsApp de respaldo
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1300,
    background: 'rgba(0, 0, 0, 0.62)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '0',
  },
  sheet: {
    width: '100%',
    maxWidth: '480px',
    maxHeight: '92dvh',
    overflowY: 'auto',
    background: 'var(--bg-elevated, #141a17)',
    border: '1px solid var(--border-color)',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    boxShadow: '0 -12px 40px rgba(0,0,0,0.4)',
    padding: '18px 18px calc(18px + env(safe-area-inset-bottom))',
    boxSizing: 'border-box',
    scrollbarWidth: 'thin',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
  },
  headerIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #e53935 0%, #b71c1c 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 16px rgba(229, 57, 53, 0.35)',
    flexShrink: 0,
  },
  closeBtn: {
    background: 'none',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '7px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  privacyNote: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    background: 'rgba(var(--accent-gold-rgb), 0.08)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.22)',
    borderRadius: '12px',
    padding: '9px 11px',
    fontSize: '11px',
    lineHeight: 1.45,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
  },
  fieldLabel: {
    fontFamily: 'var(--font-title)',
    fontSize: '10.5px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 13px',
    fontSize: '13.5px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
  },
  geoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    marginTop: '4px',
  },
  actionBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: '12px 14px',
    borderRadius: '14px',
    fontSize: '13px',
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '18px 14px',
    border: '1px solid rgba(var(--accent-sage-rgb), 0.3)',
    borderRadius: '18px',
    background: 'rgba(var(--accent-sage-rgb), 0.08)',
  },
  successIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 18px rgba(46, 125, 50, 0.4)',
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    background: 'rgba(229, 57, 53, 0.08)',
    border: '1px solid rgba(229, 57, 53, 0.22)',
    borderRadius: '12px',
    padding: '9px 11px',
    fontSize: '11px',
    lineHeight: 1.45,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'rgba(211, 47, 47, 0.12)',
    border: '1px solid rgba(211, 47, 47, 0.35)',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '11.5px',
    color: '#ffcdd2',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.45,
  },
  waFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    color: '#81c784',
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    fontSize: '12px',
    textDecoration: 'none',
    padding: '9px 12px',
    borderRadius: '12px',
    border: '1px solid rgba(76, 175, 80, 0.35)',
    background: 'rgba(76, 175, 80, 0.1)',
  },
};
