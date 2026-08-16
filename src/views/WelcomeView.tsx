import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, User as UserIcon, Mail, Star } from 'lucide-react';
import { register, login, setToken, SafeUser } from '../utils/auth';
import { CountryPhoneInput, isPhoneComplete } from '../components/CountryPhoneInput';
import logoVertical from '../assets/logo-vertical.png';

interface WelcomeViewProps {
  onAuthenticated: (user: SafeUser) => void;
}

type Mode = 'login' | 'register';

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
    setError('');
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setShowPassword(false);
    setTermsAccepted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register' && !termsAccepted) {
      setError('Debes aceptar los términos para continuar');
      return;
    }
    setLoading(true);
    setError('');

    try {
      let token: string;
      let user: SafeUser;

      if (mode === 'register') {
        const res = await register({
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          phone: isPhoneComplete(form.phone) ? form.phone.trim() : '',
          password: form.password,
        });
        token = res.token;
        user = res.user;
      } else {
        const res = await login(form.email.trim(), form.password);
        token = res.token;
        user = res.user;
      }

      setToken(token);
      window.location.hash = '#/';
      onAuthenticated(user);
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error, intenta de nuevo');
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <div className="app-shell auth-shell">
      <div className="bg-blobs" aria-hidden="true">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      <div className="auth-centered" style={styles.centered}>
        <div className="glass-card auth-card fade-in" style={styles.card}>
          <div style={styles.logoWrap}>
            <img src={logoVertical} alt="ALIVIA" style={styles.logoImg} />
            <p style={styles.tagline}>Tu espacio seguro para sentirte mejor</p>
          </div>

          <div style={styles.header}>
            <h3 style={styles.title}>
              {isLogin ? 'Bienvenido de nuevo' : '¡Hola! Es hora de brillar'}
            </h3>
            <p style={styles.subtitle}>
              {isLogin
                ? 'Nos alegra verte otra vez. Entra con tu usuario o correo.'
                : 'Crea tu cuenta y empieza tu camino hacia el bienestar.'}
            </p>
          </div>

          {error && (
            <div style={styles.alertError}>
              <Star size={13} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div style={styles.field}>
                  <label htmlFor="name" style={styles.label}>
                    <UserIcon size={13} color="var(--accent-gold)" /> Tu nombre
                  </label>
                  <input
                    id="name"
                    className="input-apple"
                    style={styles.input}
                    placeholder="¿Cómo te llamas?"
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="name"
                    required
                  />
                </div>

                <div style={styles.field}>
                  <label htmlFor="username" style={styles.label}>
                    <Star size={13} color="var(--accent-gold)" /> Nombre de usuario
                  </label>
                  <input
                    id="username"
                    className="input-apple"
                    style={styles.input}
                    placeholder="Ej: ana_bienestar"
                    value={form.username}
                    onChange={handleChange}
                    autoComplete="username"
                    required
                  />
                </div>
              </>
            )}

            <div style={styles.field}>
              <label htmlFor="email" style={styles.label}>
                <Mail size={13} color="var(--accent-gold)" /> {isLogin ? 'Usuario o correo' : 'Correo electrónico'}
              </label>
              <input
                id="email"
                className="input-apple"
                style={styles.input}
                placeholder={isLogin ? 'Tu usuario o correo' : 'tucorreo@ejemplo.com'}
                value={form.email}
                onChange={handleChange}
                autoComplete={isLogin ? 'username' : 'email'}
                required
              />
            </div>

            {!isLogin && (
              <div style={styles.field}>
                <label htmlFor="phone" style={styles.label}>
                  <Star size={13} color="var(--accent-gold)" /> Teléfono (opcional)
                </label>
                <CountryPhoneInput
                  id="phone"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  autoComplete="tel"
                />
                <p style={styles.phoneHint}>Solo países de Centroamérica · por defecto Nicaragua (+505)</p>
              </div>
            )}

            <div style={styles.field}>
              <label htmlFor="password" style={styles.label}>
                <Lock size={13} color="var(--accent-gold)" /> Contraseña
              </label>
              <div style={styles.passwordWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-apple"
                  style={styles.input}
                  placeholder={isLogin ? 'Tu contraseña' : 'Mínimo 6 caracteres'}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff size={18} color="var(--text-muted)" /> : <Eye size={18} color="var(--text-muted)" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div style={styles.termsWrap}>
                <input
                  type="checkbox"
                  id="termsAccepted"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={styles.termsCheckbox}
                />
                <label htmlFor="termsAccepted" style={styles.termsText}>
                  Acepto que ALIVIA es una herramienta de apoyo emocional y <b>no sustituye</b> atención profesional. Mis datos se guardan de forma privada y segura.
                </label>
              </div>
            )}

            <button type="submit" className="btn-primary" style={styles.submit} disabled={loading}>
              {loading ? <Loader2 size={20} className="spin" /> : isLogin ? 'Entrar' : 'Crear mi cuenta'}
            </button>
          </form>

          {!isLogin && (
            <p style={styles.disclaimer}>
              Al crear tu cuenta aceptas que ALIVIA te acompaña en tus luchas (depresión, ansiedad, adicciones y más) con herramientas de autoapoyo. En emergencia siempre usa las líneas de crisis del menú SOS.
            </p>
          )}

          <div style={styles.switchWrap}>
            <p style={styles.switchText}>
              {isLogin ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                onClick={() => switchMode(isLogin ? 'register' : 'login')}
                style={styles.switchLink}
              >
                {isLogin ? 'Crear una cuenta' : 'Inicia sesión'}
              </button>
            </p>
          </div>

          <p style={styles.footer}>Tu información está segura y en privado. Alivia te acompaña.</p>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  centered: {
    padding: '28px 20px',
    position: 'relative',
    zIndex: 1,
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: 'clamp(18px, 5vw, 28px) clamp(14px, 4vw, 26px)',
    borderRadius: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  logoImg: {
    height: '96px',
    width: 'auto',
    objectFit: 'contain',
    filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.35))',
  },
  tagline: {
    margin: 0,
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  header: {
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-title)',
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  alertError: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'var(--accent-rose)',
    background: 'rgba(var(--accent-rose-rgb), 0.08)',
    border: '1px solid rgba(var(--accent-rose-rgb), 0.2)',
  },
  field: {
    marginBottom: '14px',
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
    fontSize: '16px',
  },
  passwordWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },
  submit: {
    width: '100%',
    padding: '14px',
    borderRadius: '999px',
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  termsWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '14px',
    padding: '10px 12px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
  },
  termsCheckbox: {
    width: '17px',
    height: '17px',
    minWidth: '17px',
    marginTop: '2px',
    accentColor: 'var(--accent-gold)',
    cursor: 'pointer',
  },
  termsText: {
    fontSize: '11.5px',
    lineHeight: 1.5,
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  disclaimer: {
    margin: 0,
    textAlign: 'center',
    fontSize: '10.5px',
    lineHeight: 1.5,
    color: 'var(--text-muted)',
    opacity: 0.75,
  },
  switchWrap: {
    borderTop: '1px solid var(--border-color)',
    paddingTop: '14px',
    textAlign: 'center',
  },
  switchText: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  switchLink: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--accent-gold)',
    fontWeight: 700,
    fontSize: '13px',
    padding: 0,
  },
  footer: {
    margin: 0,
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--text-muted)',
    opacity: 0.7,
  },
  phoneHint: {
    margin: '6px 0 0',
    fontSize: '11px',
    color: 'var(--text-muted)',
    paddingLeft: '4px',
  },
};