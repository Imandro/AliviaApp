import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Pencil, Mail, Phone as PhoneIcon, AtSign, HeartPulse, ChevronRight } from 'lucide-react';
import { SafeUser, logout, setToken } from '../utils/auth';
import { getMyAssessments, DIMENSION_INFO, LEVEL_INFO, type AssessmentRecord } from '../utils/assessment';
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

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onEdit, onLogout }) => {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    getMyAssessments().then(setAssessments);
  }, []);

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
  logoutBtn: {
    marginTop: '4px',
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