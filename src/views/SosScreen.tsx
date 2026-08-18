/* ----------------------------------------------------
   ALIVIA - PANTALLA DE AYUDA DE EMERGENCIA (SosScreen)
   Directorio de líneas de crisis + Contacto seguro local
   ---------------------------------------------------- */

import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, ShieldAlert, Heart, UserPlus, Trash2, Check } from 'lucide-react';
import { getEmergencyContact, saveEmergencyContact, deleteEmergencyContact } from '../utils/localDb';
import { CountryPhoneInput } from '../components/CountryPhoneInput';

export const SosScreen: React.FC = () => {
  // Contacto Seguro local
  const [safeContact, setSafeContact] = useState<{ name: string; phone: string } | null>(null);
  const [isConfiguring, setIsConfiguring] = useState<boolean>(false);
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  
  // Selección de país para líneas de ayuda
  const [country, setCountry] = useState<'NI' | 'SV' | 'GT' | 'HN' | 'CR' | 'PA'>('NI');

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

  // Base de datos de líneas de crisis reales gratuitas (Centroamérica)
  const helplineDirectory = {
    NI: [
      {
        name: 'Cruz Blanca Nicaragüense (Línea Nacional)',
        phone: '128',
        desc: 'Atención de emergencias gratuita y confidencial, disponible las 24 horas en todo el país.',
        type: 'call'
      }
    ],
    SV: [
      {
        name: 'Sistema de Emergencias Médicas (SEM)',
        phone: '132',
        desc: 'Atención 24/7 con psicólogas y psicólogos de guardia; atiende también emergencias de salud mental.',
        type: 'call'
      }
    ],
    GT: [
      {
        name: 'MSPAS — Orientación en Salud Mental',
        phone: '123',
        desc: 'Línea del Ministerio de Salud Pública para orientación y acompañamiento en salud mental.',
        type: 'call'
      }
    ],
    HN: [
      {
        name: '911 — Sistema Nacional de Emergencias',
        phone: '911',
        desc: 'Coordina atención psicosocial gratuita en alianza con la Secretaría de Salud y la OPS.',
        type: 'call'
      },
      {
        name: 'Línea 114 (Mujer Vivir Sin Miedo)',
        phone: '114',
        desc: 'Policía Nacional: apoyo y atención psicológica para mujeres en situación de violencia.',
        type: 'call'
      }
    ],
    CR: [
      {
        name: 'Colegio de Psicólogos — Línea 1322',
        phone: '1322',
        desc: 'Atención psicológica gratuita las 24 horas para personas en crisis.',
        type: 'call'
      },
      {
        name: 'Línea Aquí Estoy',
        phone: '800 273 7869',
        desc: 'Apoyo emocional del Ministerio de Salud en horario limitado; en crisis usa el 1322 o el 911.',
        type: 'call'
      }
    ],
    PA: [
      {
        name: 'MIDES — Línea 147',
        phone: '147',
        desc: 'Atención 24/7 gratuita del Ministerio de Desarrollo Social para crisis y salud mental.',
        type: 'call'
      },
      {
        name: 'MIDES — WhatsApp',
        phone: '+507 6694 2747',
        desc: 'Chat directo de apoyo emocional; el número también responde por WhatsApp.',
        type: 'call'
      }
    ]
  };

  const activeHelplines = helplineDirectory[country];

  return (
    <div className="fade-in flex flex-col gap-4">
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
        <div className="flex justify-between items-center">
          <div style={styles.cardHeader}>
            <ShieldAlert size={16} color="var(--accent-rose)" />
            <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>LÍNEAS DE CRISIS GRATUITAS</h3>
          </div>

          {/* Selector de País */}
          <select 
            value={country} 
            onChange={(e) => setCountry(e.target.value as any)} 
            style={styles.countrySelector}
          >
            <option value="NI">Nicaragua</option>
            <option value="SV">El Salvador</option>
            <option value="GT">Guatemala</option>
            <option value="HN">Honduras</option>
            <option value="CR">Costa Rica</option>
            <option value="PA">Panamá</option>
          </select>
        </div>

        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.7 }}>
          Si sientes que ya no puedes soportar el dolor o tienes pensamientos de autolesión, por favor haz clic en uno de estos botones. Te atenderán profesionales de forma confidencial.
        </p>

        {/* Directorio de Botones */}
        <div style={styles.helplineList}>
          {activeHelplines.map((line, idx) => {
            const isCall = line.type === 'call';
            const isSms = line.type === 'sms';
            
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
                  href={isCall ? `tel:${line.phone.replace(/\s+/g, '')}` : isSms ? `sms:${line.phone}?body=APOYO` : `https://wa.me/${line.phone.replace(/\s+/g, '')}`}
                  target={!isCall && !isSms ? '_blank' : undefined}
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
  countrySelector: {
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
    fontSize: '11px',
    fontWeight: 500,
    padding: '4px 8px',
    outline: 'none',
    cursor: 'pointer',
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
