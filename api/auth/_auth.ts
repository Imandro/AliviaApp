import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'crypto';
import { VercelRequest } from '@vercel/node';
import { getPool } from '../_db.js';

const SESSION_DAYS = 30;

export interface SafeUser {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  name: string;
  problems: string[];
  situations: string[];
  strategies: string[];
  trusted_person: string | null;
  trusted_phone: string | null;
  wants_contact: boolean;
  changes: string[];
  goals_text: string | null;
  onboarding_done: boolean;
  created_at: string;
}

export function toSafeUser(row: any): SafeUser {
  return {
    id: String(row.id),
    username: row.username,
    email: row.email,
    phone: row.phone ?? null,
    name: row.name,
    problems: row.problems ?? [],
    situations: row.situations ?? [],
    strategies: row.strategies ?? [],
    trusted_person: row.trusted_person ?? null,
    trusted_phone: row.trusted_phone ?? null,
    wants_contact: Boolean(row.wants_contact),
    changes: row.changes ?? [],
    goals_text: row.goals_text ?? null,
    onboarding_done: Boolean(row.onboarding_done),
    created_at: String(row.created_at ?? ''),
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

export async function createSession(userId: string): Promise<string> {
  const pool = getPool();
  await pool.query('DELETE FROM sessions WHERE expires_at < now()');
  const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  await pool.query(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [token, userId, SESSION_DAYS]
  );
  return token;
}

export async function deleteSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await getPool().query('DELETE FROM sessions WHERE token = $1', [token]);
}

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  email: string;
}

export async function getUserFromRequest(req: VercelRequest): Promise<SessionUser | null> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const { rows } = await getPool().query(
    `SELECT u.id, u.name, u.username, u.email
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  return rows[0] ?? null;
}

export function extractToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;