import type { ApiRequest, ApiResponse } from '../_types.js';
import { ensureSchema, ensureFunctions, getPool } from '../_db.js';
import { getUserFromRequest, toSafeUser, PHONE_RE } from './_auth.js';

import { applyCors } from '../_cors.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'MÃƒÂ©todo no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();

    const sessionUser = await getUserFromRequest(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'SesiÃƒÂ³n no vÃƒÂ¡lida' });
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
      return res.status(400).json({ error: 'Ingresa un telÃƒÂ©fono vÃƒÂ¡lido' });
    }

    const updated = await pool.query(
      `SELECT * FROM fn_update_user_profile($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [sessionUser.id, problems, situations, strategies, trustedPerson, trustedPhone, wantsContact, changes, goalsText, onboardingDone, phone]
    );

    // landing_seen NO entra por fn_update_user_profile: esa funcion tiene la
    // firma fija de 11 parametros y corresponde al formulario de perfil. Aqui
    // se marca con un UPDATE aparte, que ademas solo escribe si el valor cambia.
    if (body.landing_seen !== undefined) {
      await pool.query(
        `UPDATE users SET landing_seen = $2, updated_at = now() WHERE id = $1 AND landing_seen IS DISTINCT FROM $2`,
        [sessionUser.id, Boolean(body.landing_seen)],
      );
      updated.rows[0].landing_seen = Boolean(body.landing_seen);
    }

    return res.status(200).json(toSafeUser(updated.rows[0]));
  } catch (err) {
    console.error('Error en /api/auth/profile:', err);
    return res.status(500).json({ error: 'No se pudo guardar tu perfil' });
  }
}