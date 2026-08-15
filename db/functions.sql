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
RETURNS TABLE(id TEXT, title TEXT, date TEXT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO completed_activities (id, title, date)
  VALUES (p_id, p_title, CURRENT_DATE)
  ON CONFLICT (id, date) DO NOTHING
  RETURNING completed_activities.id, completed_activities.title, to_char(completed_activities.date, 'YYYY-MM-DD');
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