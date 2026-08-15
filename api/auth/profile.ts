import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from '../_db.js';
import { getUserFromRequest, toSafeUser, PHONE_RE } from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();

    const sessionUser = await getUserFromRequest(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Sesión no válida' });
    }

    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM fn_get_user_by_id($1)`, [sessionUser.id]);
    const current = rows[0];
    if (!current) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

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
      `SELECT * FROM fn_update_user_profile($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [sessionUser.id, problems, situations, strategies, trustedPerson, trustedPhone, wantsContact, changes, goalsText, onboardingDone, phone]
    );

    return res.status(200).json(toSafeUser(updated.rows[0]));
  } catch (err) {
    console.error('Error en /api/auth/profile:', err);
    return res.status(500).json({ error: 'No se pudo guardar tu perfil' });
  }
}