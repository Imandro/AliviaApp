/* ----------------------------------------------------
   ALIVIA - PANTALLA DE AYUDA DE EMERGENCIA (SosScreen)
   Directorio de líneas de crisis + Contacto seguro local
   ---------------------------------------------------- */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, MessageSquare, ShieldAlert, Heart, UserPlus, Trash2, Check, Shield, ChevronRight, Siren } from 'lucide-react';
import { getEmergencyContact, saveEmergencyContact, deleteEmergencyContact } from '../utils/localDb';
import { CountryPhoneInput } from '../components/CountryPhoneInput';
import { CRISIS_LINES, crisisHref } from '../utils/crisisLines';
import { CrisisModeBanner } from './CrisisModeBanner';
import { OfficialResourcesView } from './OfficialResourcesView';
import { getEmergencyNumber } from '../utils/officialResources';
import { SilaisAlertSheet } from '../components/SilaisAlertSheet';

export const SosScreen: React.FC = () => {
  // Contacto Seguro local
  const [safeContact, setSafeContact] = useState<{ name: string; phone: string } | null>(null);
  const [isConfiguring, setIsConfiguring] = useState<boolean>(false);
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');

  const navigate = useNavigate();
  // ?alerta=1 (viene del chat o de un SOS previo): abrir el formulario de alerta.
  const [searchParams, setSearchParams] = useSearchParams();
  const [silaisOpen, setSilaisOpen] = useState<boolean>(() => searchParams.get('alerta') === '1');

  useEffect(() => {
    if (searchParams.get('alerta') === '1') {
      setSilaisOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('alerta');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Modo crisis aguda: solo botones de llamada gigantes (UI simplificada)
  const [crisisMode, setCrisisMode] = useState(false);
  const emergency = getEmergencyNumber('NI');

  const [activeTab, setActiveTab] = useState<'lines' | 'services'>('lines');

  useEffect(() => {
    // Cargar contacto al inicializar
    const loadContact = async () => {
      const saved = await getEmergencyContact();
      if (saved) {
        setSafeContact(saved);
      }
    };
    loadContact();
  }, []);

  const isValidPhone = (phone: string): boolean => {
    return /^[\d\s\+\-\(\)]{7,20}$/.test(phone.trim());
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !isValidPhone(contactPhone)) return;

    await saveEmergencyContact(contactName.trim(), contactPhone.trim());
    setSafeContact({ name: contactName.trim(), phone: contactPhone.trim() });
    setIsConfiguring(false);
    setContactName('');
    setContactPhone('');
  };

  const handleDeleteContact = async () => {
    await deleteEmergencyContact();
    setSafeContact(null);
  };

  const activeHelplines = CRISIS_LINES['NI'];

  return (
    <div className="fade-in flex flex-col gap-4">
      <CrisisModeBanner variant="compact" countryEmergency={emergency} />

      {/* ALERTA AL SILAIS: envío de datos esenciales al SILAIS por WhatsApp */}
      <button
        onClick={() => setSilaisOpen(true)}
        className="glass-card"
        style={styles.silaisCard}
      >
        <div style={styles.silaisIcon}>
          <Siren size={24} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '15px', color: '#fff', margin: 0 }}>
            Alertar al SILAIS
          </h4>
          <p className="body-standard" style={{ fontSize: '11.5px', color: '#ffcdd2', marginTop: '3px' }}>
            Envía tu nombre, ubicación y situación al equipo de emergencia del SILAIS por WhatsApp
            (+505 8413 2841). Tú revisas los datos antes de enviar.
          </p>
        </div>
        <ChevronRight size={18} color="#fff" style={{ flexShrink: 0 }} />
      </button>

      {/* Pestañas: Líneas de crisis | Servicios Oficiales */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('lines')}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: '12px',
            background: activeTab === 'lines' ? 'var(--accent-sage)' : 'var(--bg-surface)',
            color: activeTab === 'lines' ? '#0c1810' : 'var(--text-primary)',
            border: '1px solid var(--border-color)', fontFamily: 'var(--font-title)',
            fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Líneas de Crisis
        </button>
        <button
          onClick={() => setActiveTab('services')}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: '12px',
            background: activeTab === 'services' ? 'var(--accent-sage)' : 'var(--bg-surface)',
            color: activeTab === 'services' ? '#0c1810' : 'var(--text-primary)',
            border: '1px solid var(--border-color)', fontFamily: 'var(--font-title)',
            fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Servicios Oficiales
        </button>
      </div>

      {activeTab === 'services' ? (
        <OfficialResourcesView />
      ) : (
        <>
          {/* 1. SECCIÓN A: CONTACTO SEGURO LOCAL */}
      <div className="glass-card flex flex-col gap-4" style={styles.emergencyCard}>
        <div style={styles.cardHeader}>
          <Heart size={16} color="var(--accent-rose)" />
          <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>MI CONTACTO SEGURO</h3>
        </div>

        {safeContact ? (
          // Contacto Seguro Configurado
          <div style={styles.activeContactContainer}>
            <p className="body-standard" style={{ fontSize: '12px', opacity: 0.8 }}>
              Llama rápidamente a tu persona de confianza cuando sientas que te estás abrumando.
            </p>
            <a 
              href={`tel:${safeContact.phone}`} 
              style={{
                ...styles.safeCallBtn,
                background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.3) 0%, rgba(var(--accent-sage-rgb), 0.2) 100%)',
                border: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
              }}
            >
              <div style={styles.callIconGlow}>
                <Phone size={24} color="var(--accent-gold)" />
              </div>
              <div style={styles.contactDetails}>
                <span style={styles.contactName}>{safeContact.name}</span>
                <span style={styles.contactPhone}>{safeContact.phone}</span>
              </div>
              <span style={styles.callBadge}>LLAMAR AHORA</span>
            </a>
            
            <button onClick={handleDeleteContact} style={styles.deleteBtn}>
              <Trash2 size={13} />
              Eliminar este contacto
            </button>
          </div>
        ) : isConfiguring ? (
          // Formulario para Agregar Contacto Seguro
          <form onSubmit={handleSaveContact} className="fade-in flex flex-col gap-3">
            <p className="body-standard" style={{ fontSize: '12px', opacity: 0.8 }}>
              Guarda el teléfono de tu mejor amigo(a), terapeuta, sponsor o familiar que sepa cómo apoyarte en momentos duros.
            </p>
            <input
              type="text"
              placeholder="Nombre del contacto (ej: Mamá, Sponsor...)"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="input-apple"
              required
            />
            <CountryPhoneInput
              value={contactPhone}
              onChange={setContactPhone}
              placeholder="8XXX XXXX"
              autoComplete="tel"
            />
            <div className="flex gap-3" style={{ marginTop: '4px' }}>
              <button 
                type="button" 
                onClick={() => setIsConfiguring(false)} 
                className="btn-secondary"
                style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                style={{ flex: 2, padding: '10px', borderRadius: '12px', fontSize: '13px' }}
                disabled={!contactName.trim() || !isValidPhone(contactPhone)}
              >
                <Check size={14} />
                Guardar contacto
              </button>
            </div>
          </form>
        ) : (
          // Sin Contacto - Botón Agregar
          <div className="flex flex-col items-center text-center gap-3" style={{ padding: '10px 0' }}>
            <p className="body-standard" style={{ fontSize: '12px', opacity: 0.8 }}>
              ¿Tienes un patrocinador, amigo o terapeuta al que puedas recurrir? Configúralo aquí para llamarle en un solo toque en una crisis.
            </p>
            <button onClick={() => setIsConfiguring(true)} className="btn-secondary" style={{ width: '80%', maxWidth: '240px', borderRadius: '16px' }}>
              <UserPlus size={14} />
              Agregar contacto seguro
            </button>
          </div>
        )}
      </div>

      {/* 2. SECCIÓN B: DIRECTORIO DE AYUDA DE CRISIS */}
      <div className="glass-card flex flex-col gap-4">
        <div style={styles.cardHeader}>
          <ShieldAlert size={16} color="var(--accent-rose)" />
          <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>LÍNEAS DE CRISIS GRATUITAS</h3>
        </div>

        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.7 }}>
          Si sientes que ya no puedes soportar el dolor o tienes pensamientos de autolesión, por favor haz clic en uno de estos botones. Te atenderán profesionales de forma confidencial.
        </p>

        {/* Directorio de Botones */}
        <div style={styles.helplineList}>
          {activeHelplines.map((line, idx) => {
            return (
              <div key={idx} style={styles.helplineRow}>
                <div style={styles.lineMeta}>
                  <h4 className="title-small" style={{ color: 'var(--text-primary)', fontSize: '13px', textTransform: 'none', letterSpacing: '0' }}>
                    {line.name}
                  </h4>
                  <p className="body-standard" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {line.desc}
                  </p>
                </div>
                
                <a 
                  href={crisisHref(line)}
                  target={line.type === 'call' ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  style={{
                    ...styles.lineActionBtn,
                    background: line.type === 'chat' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(var(--accent-gold-rgb), 0.12)',
                    color: line.type === 'chat' ? '#81c784' : 'var(--accent-gold)',
                    borderColor: line.type === 'chat' ? 'rgba(76, 175, 80, 0.2)' : 'var(--border-color)'
                  }}
                >
                  {line.type === 'chat' ? (
                    <MessageSquare size={16} />
                  ) : (
                    <Phone size={16} />
                  )}
                  <span style={styles.lineBtnText}>{line.phone}</span>
                </a>
              </div>
            );
          })}
        </div>

        {/* CTA a Recursos Oficiales completos */}
        <button
          onClick={() => navigate('/resources')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '16px',
            padding: '14px 20px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.18) 0%, rgba(var(--accent-gold-rgb), 0.1) 100%)',
            border: '1px solid rgba(var(--accent-sage-rgb), 0.25)',
            color: 'var(--accent-sage)',
            fontFamily: 'var(--font-title)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(var(--accent-sage-rgb), 0.15)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.25) 0%, rgba(var(--accent-gold-rgb), 0.15) 100%)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(var(--accent-sage-rgb), 0.25)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.18) 0%, rgba(var(--accent-gold-rgb), 0.1) 100%)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(var(--accent-sage-rgb), 0.15)';
          }}
        >
          <Shield size={16} />
          Ver todos los recursos oficiales (hospitales, ONGs, centros)
          <ChevronRight size={14} />
        </button>

      </div>

      {/* 3. LÍNEA GENERAL DE EMERGENCIAS (911) */}
      <a href="tel:911" className="glass-card" style={styles.generalSosCard}>
        <ShieldAlert size={22} color="#ff8a80" style={{ minWidth: '22px' }} />
        <div style={{ flex: 1 }}>
          <h4 className="title-medium" style={{ color: '#ff8a80', fontSize: '15px' }}>EMERGENCIAS EXTREMAS: Llamar al 911</h4>
          <p className="body-standard" style={{ fontSize: '11px', color: '#ffcdd2', marginTop: '2px' }}>
            Si estás sufriendo una sobredosis médica, autolesión crítica o agresión activa, llama de inmediato.
          </p>
        </div>
        <div style={styles.arrowGlow}>
          <Phone size={16} color="#fff" />
        </div>
      </a>
  </>
      )}

      <SilaisAlertSheet open={silaisOpen} onClose={() => setSilaisOpen(false)} />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  emergencyCard: {
    background: 'linear-gradient(135deg, rgba(var(--accent-rose-rgb), 0.05) 0%, rgba(var(--accent-gold-rgb), 0.02) 100%)',
    border: '1px solid rgba(var(--accent-rose-rgb), 0.12)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  silaisCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    borderRadius: '24px',
    cursor: 'pointer',
    textAlign: 'left',
    background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.22) 0%, rgba(183, 28, 28, 0.3) 100%)',
    border: '1px solid rgba(211, 47, 47, 0.45)',
    boxShadow: '0 8px 24px rgba(211, 47, 47, 0.2)',
    transition: 'all 0.2s ease',
    width: '100%',
    fontFamily: 'var(--font-body)',
  },
  silaisIcon: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #e53935 0%, #b71c1c 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 6px 16px rgba(229, 57, 53, 0.4)',
  },
  activeContactContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  safeCallBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '20px',
    textDecoration: 'none',
    gap: '14px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  callIconGlow: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    background: 'var(--bg-elevated)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 15px rgba(var(--accent-gold-rgb), 0.15)',
  },
  contactDetails: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: '2px',
  },
  contactName: {
    fontFamily: 'var(--font-title)',
    fontWeight: 600,
    fontSize: '16px',
    color: 'var(--text-primary)',
  },
  contactPhone: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
  },
  callBadge: {
    fontSize: '10px',
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: '#fff',
    background: 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)',
    padding: '6px 10px',
    borderRadius: '10px',
    boxShadow: '0 3px 8px rgba(67, 160, 71, 0.3)',
  },
  deleteBtn: {
    alignSelf: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '11px',
    fontFamily: 'var(--font-title)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '8px',
    transition: 'color 0.2s',
  },
  helplineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '4px',
  },
  helplineRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  lineMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  lineActionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    height: '36px',
    padding: '0 12px',
    borderRadius: '12px',
    border: '1px solid transparent',
    textDecoration: 'none',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  lineBtnText: {
    fontSize: '12px',
    fontFamily: 'var(--font-title)',
    fontWeight: 600,
  },
  generalSosCard: {
    background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.15) 0%, rgba(198, 40, 40, 0.2) 100%)',
    border: '1px solid rgba(211, 47, 47, 0.25)',
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '24px',
    textDecoration: 'none',
    gap: '12px',
  },
  arrowGlow: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ef5350 0%, #c62828 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 10px rgba(198, 40, 40, 0.3)',
  }
};
