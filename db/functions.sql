-- ALIVIA - FUNCIONES DE BASE DE DATOS (PostgreSQL)
-- Todas las operaciones de datos como stored functions.
-- Se crean automáticamente desde api/_db.ts al primer uso.

-- Drops idempotentes: permiten recrear funciones aunque su firma cambie
DROP FUNCTION IF EXISTS fn_upsert_mood(DATE, INTEGER, TEXT);
DROP FUNCTION IF EXISTS fn_get_moods();
DROP FUNCTION IF EXISTS fn_upsert_contact(TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_get_contact();
DROP FUNCTION IF EXISTS fn_delete_contact();
DROP FUNCTION IF EXISTS fn_insert_activity(TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_get_activities();
DROP FUNCTION IF EXISTS fn_create_post(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_get_posts(TEXT, INTEGER);
DROP FUNCTION IF EXISTS fn_like_post(INTEGER);
DROP FUNCTION IF EXISTS fn_create_plan(TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_get_plans();
DROP FUNCTION IF EXISTS fn_add_goal(INTEGER, TEXT);
DROP FUNCTION IF EXISTS fn_toggle_goal(INTEGER);
DROP FUNCTION IF EXISTS fn_delete_goal(INTEGER);
DROP FUNCTION IF EXISTS fn_delete_plan(INTEGER);
DROP FUNCTION IF EXISTS fn_get_crisis_help();
DROP FUNCTION IF EXISTS fn_save_assessment(UUID, TEXT, INTEGER, INTEGER, INTEGER, TEXT, BOOLEAN, TEXT[], TEXT);
DROP FUNCTION IF EXISTS fn_get_user_assessments(UUID);
DROP FUNCTION IF EXISTS fn_log_crisis_contact(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_set_assessment_advice(INTEGER, TEXT);

-- ---------- ÁNIMO (mood_entries) ----------

CREATE OR REPLACE FUNCTION fn_upsert_mood(
  p_date DATE,
  p_score INTEGER,
  p_note TEXT DEFAULT NULL
) RETURNS TABLE(o_date TEXT, o_score INTEGER, o_note TEXT) LANGUAGE plpgsql AS $$
DECLARE
  v_date DATE;
  v_score INTEGER;
  v_note TEXT;
BEGIN
  INSERT INTO mood_entries (date, score, note)
  VALUES (p_date, p_score, p_note)
  ON CONFLICT (date)
  DO UPDATE SET score = EXCLUDED.score, note = EXCLUDED.note
  RETURNING date, score, note INTO v_date, v_score, v_note;
  o_date := to_char(v_date, 'YYYY-MM-DD');
  o_score := v_score;
  o_note := v_note;
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION fn_get_moods()
RETURNS TABLE(date TEXT, score INTEGER, note TEXT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT to_char(m.date, 'YYYY-MM-DD'), m.score, m.note
  FROM mood_entries m
  ORDER BY m.date ASC;
END $$;

-- ---------- CONTACTO DE EMERGENCIA (emergency_contact) ----------

CREATE OR REPLACE FUNCTION fn_upsert_contact(p_name TEXT, p_phone TEXT)
RETURNS TABLE(name TEXT, phone TEXT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO emergency_contact (id, name, phone)
  VALUES (1, p_name, p_phone)
  ON CONFLICT (id)
  DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
  RETURNING emergency_contact.name, emergency_contact.phone;
END $$;

CREATE OR REPLACE FUNCTION fn_get_contact()
RETURNS TABLE(name TEXT, phone TEXT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.name, c.phone FROM emergency_contact c WHERE c.id = 1;
END $$;

CREATE OR REPLACE FUNCTION fn_delete_contact()
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM emergency_contact WHERE id = 1;
  RETURN TRUE;
END $$;

-- ---------- ACTIVIDADES (completed_activities) ----------

CREATE OR REPLACE FUNCTION fn_insert_activity(p_id TEXT, p_title TEXT)
RETURNS TABLE(o_id TEXT, o_title TEXT, o_date TEXT) LANGUAGE plpgsql AS $$
DECLARE
  v_id TEXT;
  v_title TEXT;
  v_date DATE;
BEGIN
  INSERT INTO completed_activities (id, title, date)
  VALUES (p_id, p_title, CURRENT_DATE)
  ON CONFLICT (id, date) DO NOTHING
  RETURNING id, title, date INTO v_id, v_title, v_date;
  IF v_id IS NULL THEN
    RETURN;
  END IF;
  o_id := v_id;
  o_title := v_title;
  o_date := to_char(v_date, 'YYYY-MM-DD');
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION fn_get_activities()
RETURNS TABLE(id TEXT, title TEXT, date TEXT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.title, to_char(a.date, 'YYYY-MM-DD')
  FROM completed_activities a
  ORDER BY a.completed_at ASC;
END $$;

-- ---------- COMUNIDAD (community_posts) ----------

CREATE OR REPLACE FUNCTION fn_create_post(p_author TEXT, p_content TEXT, p_topic TEXT)
RETURNS TABLE(id INTEGER, author TEXT, content TEXT, topic TEXT, likes INTEGER, created_at TEXT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO community_posts (author, content, topic)
  VALUES (p_author, p_content, p_topic)
  RETURNING community_posts.id, community_posts.author, community_posts.content,
            community_posts.topic, community_posts.likes,
            to_char(community_posts.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
END $$;

CREATE OR REPLACE FUNCTION fn_get_posts(p_topic TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 50)
RETURNS TABLE(id INTEGER, author TEXT, content TEXT, topic TEXT, likes INTEGER, created_at TEXT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.author, p.content, p.topic, p.likes,
         to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  FROM community_posts p
  WHERE p_topic IS NULL OR p.topic = p_topic
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END $$;

CREATE OR REPLACE FUNCTION fn_like_post(p_post_id INTEGER)
RETURNS TABLE(id INTEGER, likes INTEGER) LANGUAGE plpgsql AS $$
DECLARE
  v_likes INTEGER;
BEGIN
  UPDATE community_posts SET likes = likes + 1 WHERE id = p_post_id RETURNING likes INTO v_likes;
  IF v_likes IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT p_post_id, v_likes;
END $$;

-- ---------- PLANES (plans + plan_goals) ----------

CREATE OR REPLACE FUNCTION fn_create_plan(p_title TEXT, p_area TEXT DEFAULT 'general')
RETURNS TABLE(id INTEGER, title TEXT, area TEXT, created_at TEXT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO plans (title, area)
  VALUES (p_title, p_area)
  RETURNING plans.id, plans.title, plans.area,
            to_char(plans.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
END $$;

CREATE OR REPLACE FUNCTION fn_get_plans()
RETURNS TABLE(plan_id INTEGER, plan_title TEXT, plan_area TEXT, plan_created_at TEXT, goals JSONB)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id,
         p.title,
         p.area,
         to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         COALESCE(jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title, 'done', g.done)
                   ORDER BY g.id) FILTER (WHERE g.id IS NOT NULL), '[]'::jsonb)
  FROM plans p
  LEFT JOIN plan_goals g ON g.plan_id = p.id
  GROUP BY p.id
  ORDER BY p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION fn_add_goal(p_plan_id INTEGER, p_title TEXT)
RETURNS TABLE(o_id INTEGER, o_title TEXT, o_done BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE
  v_id INTEGER;
  v_title TEXT;
  v_done BOOLEAN;
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM plans WHERE id = p_plan_id) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'El plan no existe';
  END IF;
  INSERT INTO plan_goals (plan_id, title)
  VALUES (p_plan_id, p_title)
  RETURNING id, title, done INTO v_id, v_title, v_done;
  o_id := v_id;
  o_title := v_title;
  o_done := v_done;
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION fn_toggle_goal(p_goal_id INTEGER)
RETURNS TABLE(o_id INTEGER, o_title TEXT, o_done BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE
  v_id INTEGER;
  v_title TEXT;
  v_done BOOLEAN;
BEGIN
  UPDATE plan_goals SET done = NOT done WHERE id = p_goal_id
  RETURNING id, title, done INTO v_id, v_title, v_done;
  IF v_id IS NULL THEN
    RETURN;
  END IF;
  o_id := v_id;
  o_title := v_title;
  o_done := v_done;
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION fn_delete_goal(p_goal_id INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM plan_goals WHERE id = p_goal_id;
  RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION fn_delete_plan(p_plan_id INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM plans WHERE id = p_plan_id;
  RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION fn_get_crisis_help()
RETURNS TABLE(post_count BIGINT, total_likes BIGINT, completions BIGINT, avg_mood NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM community_posts),
    COALESCE((SELECT SUM(likes) FROM community_posts), 0),
    (SELECT COUNT(*) FROM completed_activities),
    COALESCE((SELECT AVG(score) FROM mood_entries), 0);
END $$;
-- ---------- CHEQUEOS DE BIENESTAR (assessments) ----------

CREATE OR REPLACE FUNCTION fn_save_assessment(
  p_user_id UUID,
  p_type TEXT DEFAULT 'bienestar',
  p_stress INTEGER DEFAULT 0,
  p_anxiety INTEGER DEFAULT 0,
  p_depression INTEGER DEFAULT 0,
  p_level TEXT DEFAULT 'baja',
  p_crisis BOOLEAN DEFAULT FALSE,
  p_recommendations TEXT[] DEFAULT '{}',
  p_ai_advice TEXT DEFAULT NULL
) RETURNS TABLE(
  id INTEGER, user_id UUID, type TEXT, stress INTEGER, anxiety INTEGER,
  depression INTEGER, level TEXT, crisis BOOLEAN, recommendations TEXT[],
  ai_advice TEXT, created_at TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO assessments (user_id, type, stress, anxiety, depression, level, crisis, recommendations, ai_advice)
  VALUES (p_user_id, p_type, p_stress, p_anxiety, p_depression, p_level, p_crisis, p_recommendations, p_ai_advice)
  RETURNING assessments.id, assessments.user_id, assessments.type,
            assessments.stress, assessments.anxiety, assessments.depression,
            assessments.level, assessments.crisis, assessments.recommendations,
            assessments.ai_advice,
            to_char(assessments.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
END $$;

CREATE OR REPLACE FUNCTION fn_get_user_assessments(p_user_id UUID)
RETURNS TABLE(
  id INTEGER, user_id UUID, type TEXT, stress INTEGER, anxiety INTEGER,
  depression INTEGER, level TEXT, crisis BOOLEAN, recommendations TEXT[],
  ai_advice TEXT, created_at TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.user_id, a.type, a.stress, a.anxiety, a.depression,
         a.level, a.crisis, a.recommendations, a.ai_advice,
         to_char(a.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  FROM assessments a
  WHERE a.user_id = p_user_id
  ORDER BY a.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION fn_set_assessment_advice(p_id INTEGER, p_advice TEXT)
RETURNS TABLE(id INTEGER, ai_advice TEXT) LANGUAGE plpgsql AS $$
DECLARE
  v_id INTEGER;
BEGIN
  UPDATE assessments SET ai_advice = p_advice
  WHERE id = p_id
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT v_id, p_advice;
END $$;

CREATE OR REPLACE FUNCTION fn_log_crisis_contact(
  p_user_id UUID,
  p_assessment_id INTEGER DEFAULT NULL,
  p_channel TEXT DEFAULT 'helpline',
  p_detail TEXT DEFAULT NULL
) RETURNS TABLE(id INTEGER, user_id UUID, assessment_id INTEGER, channel TEXT, detail TEXT, created_at TEXT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO crisis_contact_log (user_id, assessment_id, channel, detail)
  VALUES (p_user_id, p_assessment_id, p_channel, p_detail)
  RETURNING crisis_contact_log.id, crisis_contact_log.user_id,
            crisis_contact_log.assessment_id, crisis_contact_log.channel,
            crisis_contact_log.detail,
            to_char(crisis_contact_log.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
END $$;

-- ---------- CUENTAS Y SESIONES (users / sessions) ----------

DROP FUNCTION IF EXISTS fn_create_user(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_get_user_by_identifier(TEXT);
DROP FUNCTION IF EXISTS fn_get_user_by_id(UUID);
DROP FUNCTION IF EXISTS fn_update_user_profile(UUID, TEXT[], TEXT[], TEXT[], TEXT, TEXT, BOOLEAN, TEXT[], TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS fn_update_user_profile(UUID, TEXT[], TEXT[], TEXT[], TEXT, TEXT, BOOLEAN, TEXT[], TEXT, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION fn_create_user(
  p_username TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_name TEXT,
  p_password_hash TEXT
) RETURNS users LANGUAGE plpgsql AS $$
DECLARE
  v_user users;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE username = LOWER(p_username)) THEN
    RAISE EXCEPTION 'El usuario ya está en uso';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE email = LOWER(p_email)) THEN
    RAISE EXCEPTION 'El correo ya está registrado';
  END IF;
  IF p_phone IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE phone = p_phone) THEN
    RAISE EXCEPTION 'El teléfono ya está registrado';
  END IF;

  INSERT INTO users (username, email, phone, name, password_hash)
  VALUES (LOWER(p_username), LOWER(p_email), p_phone, p_name, p_password_hash)
  RETURNING * INTO v_user;

  RETURN v_user;
END $$;

CREATE OR REPLACE FUNCTION fn_get_user_by_identifier(p_identifier TEXT)
RETURNS users LANGUAGE plpgsql AS $$
DECLARE
  v_user users;
BEGIN
  SELECT * INTO v_user
  FROM users
  WHERE LOWER(username) = LOWER(p_identifier) OR LOWER(email) = LOWER(p_identifier)
  LIMIT 1;
  RETURN v_user;
END $$;

CREATE OR REPLACE FUNCTION fn_get_user_by_id(p_id UUID)
RETURNS users LANGUAGE plpgsql AS $$
DECLARE
  v_user users;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_id LIMIT 1;
  RETURN v_user;
END $$;

CREATE OR REPLACE FUNCTION fn_update_user_profile(
  p_id UUID,
  p_problems TEXT[] DEFAULT '{}',
  p_situations TEXT[] DEFAULT '{}',
  p_strategies TEXT[] DEFAULT '{}',
  p_trusted_person TEXT DEFAULT NULL,
  p_trusted_phone TEXT DEFAULT NULL,
  p_wants_contact BOOLEAN DEFAULT FALSE,
  p_changes TEXT[] DEFAULT '{}',
  p_goals_text TEXT DEFAULT NULL,
  p_onboarding_done BOOLEAN DEFAULT FALSE,
  p_phone TEXT DEFAULT NULL
) RETURNS users LANGUAGE plpgsql AS $$
DECLARE
  v_user users;
BEGIN
  UPDATE users SET
    phone = COALESCE(p_phone, phone),
    problems = p_problems,
    situations = p_situations,
    strategies = p_strategies,
    trusted_person = p_trusted_person,
    trusted_phone = p_trusted_phone,
    wants_contact = p_wants_contact,
    changes = p_changes,
    goals_text = p_goals_text,
    onboarding_done = p_onboarding_done,
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_user;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  RETURN v_user;
END $$;
