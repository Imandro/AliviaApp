import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Radar,
  Target,
  LifeBuoy,
  Users,
  BookOpen,
  Handshake,
  CircleUser,
  ChevronRight,
  Gamepad2,
} from 'lucide-react';
import type { SafeUser } from '../utils/auth';

interface FeatureCard {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<any>;
  path: string;
  gradient: string;
  color: string;
}

const FEATURES: FeatureCard[] = [
  {
    id: 'ai',
    title: 'IA de Orientación',
    desc: 'Conversa y recibe una primera orientación emocional, sin juicios y a tu ritmo.',
    icon: Sparkles,
    path: '/chat',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.10) 0%, rgba(var(--accent-warm-rgb), 0.05) 100%)',
    color: 'var(--accent-gold)',
  },
  {
    id: 'radar',
    title: 'Radar de Bienestar',
    desc: 'Registra cómo te sientes y observa el cambio de tu estado emocional con el tiempo.',
    icon: Radar,
    path: '/radar',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.10) 0%, rgba(var(--accent-sage-rgb), 0.05) 100%)',
    color: 'var(--accent-lavender)',
  },
  {
    id: 'plans',
    title: 'Planes de Progreso',
    desc: 'Convierte grandes problemas en pequeños objetivos, hábitos y actividades paso a paso.',
    icon: Target,
    path: '/plans',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.10) 0%, rgba(var(--accent-gold-rgb), 0.05) 100%)',
    color: 'var(--accent-sage)',
  },
  {
    id: 'sos',
    title: 'Apoyo Inmediato',
    desc: 'Líneas de ayuda, recursos de emergencia y tu contacto seguro en un solo toque.',
    icon: LifeBuoy,
    path: '/sos',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-rose-rgb), 0.12) 0%, rgba(211, 47, 47, 0.06) 100%)',
    color: 'var(--accent-rose)',
  },
  {
    id: 'community',
    title: 'Comunidad Global',
    desc: 'Comparte experiencias, consejos y mensajes de apoyo en un espacio moderado y seguro.',
    icon: Users,
    path: '/community',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-warm-rgb), 0.10) 0%, rgba(var(--accent-rose-rgb), 0.05) 100%)',
    color: 'var(--accent-warm)',
  },
  {
    id: 'library',
    title: 'Biblioteca Inteligente',
    desc: 'Libros, artículos y contenidos recomendados según tus necesidades de cada momento.',
    icon: BookOpen,
    path: '/library',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.10) 0%, rgba(var(--accent-lavender-rgb), 0.05) 100%)',
    color: 'var(--accent-gold)',
  },
  {
    id: 'games',
    title: 'Juegos Mente-Activos',
    desc: 'Mini-juegos para momentos difíciles: burbujas, memoria, grounding y secuencias para calmar la mente.',
    icon: Gamepad2,
    path: '/games',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-rose-rgb), 0.10) 0%, rgba(var(--accent-lavender-rgb), 0.05) 100%)',
    color: 'var(--accent-rose)',
  },
  {
    id: 'connect',
    title: 'Conecta con Alguien',
    desc: 'Identifica a una persona de confianza y da el primer paso para pedir apoyo.',
    icon: Handshake,
    path: '/connect',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.10) 0%, rgba(var(--accent-gold-rgb), 0.05) 100%)',
    color: 'var(--accent-sage)',
  },
  {
    id: 'profile',
    title: 'Mi Perfil',
    desc: 'Revisa tus datos, tu persona de confianza y lo que quieres cambiar. Edítalo cuando quieras.',
    icon: CircleUser,
    path: '/profile',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.10) 0%, rgba(var(--accent-warm-rgb), 0.05) 100%)',
    color: 'var(--accent-lavender)',
  },
];

export const ExploreView: React.FC<{ user?: SafeUser }> = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="glass-card flex flex-col gap-3" style={styles.heroCard}>
        <div style={styles.heroHeader}>
          <Sparkles size={16} color="var(--accent-gold)" />
          <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>EXPLORAR</h3>
        </div>
        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.75 }}>
          {user
            ? `Hola, ${user.name.split(' ')[0]}. Todas las herramientas de Alivia en un solo lugar, listas para cuando las necesites.`
            : 'Todas las herramientas de Alivia en un solo lugar. Disponibles para ti cuando las necesites.'}
        </p>
      </div>

      <div style={styles.grid}>
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.id}
              onClick={() => navigate(f.path)}
              className="glass-card"
              style={{
                ...styles.card,
                background: f.gradient,
                animationDelay: `${i * 0.06}s`,
              }}
            >
              <div style={styles.cardTop}>
                <div style={{ ...styles.iconGlow, color: f.color, border: `1px solid ${f.color}30` }}>
                  <Icon size={19} color={f.color} />
                </div>
                <ChevronRight size={16} color="var(--text-muted)" style={{ opacity: 0.5 }} />
              </div>
              <h4 className="title-small" style={{ color: 'var(--text-primary)', marginTop: '10px', fontSize: '13px' }}>
                {f.title}
              </h4>
              <p className="body-standard" style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px', lineHeight: 1.5 }}>
                {f.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  heroCard: {
    padding: '16px',
    background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.07) 0%, rgba(var(--accent-sage-rgb), 0.03) 100%)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.12)',
  },
  heroHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
    width: '100%',
  },
  card: {
    padding: '16px',
    borderRadius: '20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--border-color)',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    minHeight: '150px',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconGlow: {
    width: '40px',
    height: '40px',
    borderRadius: '14px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
  },
};