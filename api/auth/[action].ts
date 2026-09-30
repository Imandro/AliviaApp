import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_cors.js';
import { ensureFunctions, ensureSchema, getPool } from '../_db.js';
import {
  createSession,
  deleteSession,
  EMAIL_RE,
  extractToken,
  getUserFromRequest,
  hashPassword,
  PHONE_RE,
  toSafeUser,
  verifyPassword,
} from './_auth.js';

type AuthAction = 'login' | 'logout' | 'me' | 'profile' | 'register';

const getAction = (req: VercelRequest): string | undefined => {
  const action = req.query.action;
  return Array.isArray(action) ? action[0] : action;
};

const handleLogin = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();

    const { identifier, password } = req.body ?? {};
    const cleanIdentifier = String(identifier || '').trim();
    const cleanPassword = String(password || '');

    if (!cleanIdentifier || !cleanPassword) {
      return res.status(400).json({ error: 'Ingresa tu usuario o correo y tu contraseña' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM fn_get_user_by_identifier($1)',
      [cleanIdentifier],
    );
    const user = rows[0];
    if (!user || !verifyPassword(cleanPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = await createSession(String(user.id));
    return res.status(200).json({ token, user: toSafeUser(user) });
  } catch (err) {
    console.error('Error en /api/auth/login:', err);
    return res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
};

const handleLogout = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await deleteSession(extractToken(req));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/auth/logout:', err);
    return res.status(500).json({ error: 'No se pudo cerrar la sesión' });
  }
};

const handleMe = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();
    const sessionUser = await getUserFromRequest(req);
    if (!sessionUser) return res.status(401).json({ error: 'Sesión no válida' });

    const { rows } = await getPool().query(
      'SELECT * FROM fn_get_user_by_id($1)',
      [sessionUser.id],
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    return res.status(200).json(toSafeUser(user));
  } catch (err) {
    console.error('Error en /api/auth/me:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};

const handleProfile = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();
    const sessionUser = await getUserFromRequest(req);
    if (!sessionUser) return res.status(401).json({ error: 'Sesión no válida' });

    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM fn_get_user_by_id($1)',
      [sessionUser.id],
    );
    const current = rows[0];
    if (!current) return res.status(404).json({ error: 'Usuario no encontrado' });

    const body = req.body ?? {};
    const problems = Array.isArray(body.problems) ? body.problems.filter((x: unknown) => typeof x === 'string') : current.problems;
    const situations = Array.isArray(body.situations) ? body.situations.filter((x: unknown) => typeof x === 'string') : current.situations;
    const strategies = Array.isArray(body.strategies) ? body.strategies.filter((x: unknown) => typeof x === 'string') : current.strategies;
    const changes = Array.isArray(body.changes) ? body.changes.filter((x: unknown) => typeof x === 'string') : current.changes;

    const trustedPerson = body.trusted_person !== undefined ? String(body.trusted_person).trim() || null : current.trusted_person;
    const trustedPhone = body.trusted_phone !== undefined ? String(body.trusted_phone).trim() || null : current.trusted_phone;
    const wantsContact = body.wants_contact !== undefined ? Boolean(body.wants_contact) : Boolean(current.wants_contact);
    const goalsText = body.goals_text !== undefined ? String(body.goals_text).trim() || null : current.goals_text;
    const onboardingDone = body.onboarding_done !== undefined ? Boolean(body.onboarding_done) : Boolean(current.onboarding_done);
    const phone = body.phone !== undefined ? String(body.phone).trim() || null : current.phone;
    if (phone && !PHONE_RE.test(phone)) {
      return res.status(400).json({ error: 'Ingresa un teléfono válido' });
    }

    const updated = await pool.query(
      'SELECT * FROM fn_update_user_profile($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [sessionUser.id, problems, situations, strategies, trustedPerson, trustedPhone, wantsContact, changes, goalsText, onboardingDone, phone],
    );
    return res.status(200).json(toSafeUser(updated.rows[0]));
  } catch (err) {
    console.error('Error en /api/auth/profile:', err);
    return res.status(500).json({ error: 'No se pudo guardar tu perfil' });
  }
};

const handleRegister = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();
    const { username, email, phone, name, password } = req.body ?? {};

    const cleanUsername = String(username || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim() || null;
    const cleanName = String(name || '').trim();
    const cleanPassword = String(password || '');

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' });
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'El usuario solo puede contener letras, números, puntos, guiones y guiones bajos' });
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({ error: 'Ingresa un correo válido' });
    }
    if (cleanPhone && !PHONE_RE.test(cleanPhone)) {
      return res.status(400).json({ error: 'Ingresa un teléfono válido' });
    }
    if (!cleanName) return res.status(400).json({ error: 'Ingresa tu nombre' });
    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM fn_create_user($1, $2, $3, $4, $5)',
      [cleanUsername, cleanEmail, cleanPhone, cleanName, hashPassword(cleanPassword)],
    );
    const user = toSafeUser(rows[0]);
    const token = await createSession(user.id);
    return res.status(201).json({ token, user });
  } catch (err) {
    const message = String((err as { message?: unknown })?.message ?? '');
    const knownErrors = [
      'El usuario ya está en uso',
      'El correo ya está registrado',
      'El teléfono ya está registrado',
    ];
    if (knownErrors.some((known) => message.includes(known))) {
      return res.status(409).json({ error: message });
    }
    console.error('Error en /api/auth/register:', err);
    return res.status(500).json({ error: 'No se pudo crear la cuenta' });
  }
};

const handlers: Record<AuthAction, (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse>> = {
  login: handleLogin,
  logout: handleLogout,
  me: handleMe,
  profile: handleProfile,
  register: handleRegister,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const action = getAction(req);
  if (action !== 'login' && action !== 'logout' && action !== 'me' &&
      action !== 'profile' && action !== 'register') {
    return res.status(404).json({ error: 'Ruta de autenticación no encontrada' });
  }
  return handlers[action](req, res);
}
