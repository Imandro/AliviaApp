-- ALIVIA - Esquema de base de datos (Neon PostgreSQL)
-- Se crea automáticamente al primer uso desde la API.

CREATE TABLE IF NOT EXISTS mood_entries (
  date DATE PRIMARY KEY,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  note TEXT
);

CREATE TABLE IF NOT EXISTS emergency_contact (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  phone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS completed_activities (
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date DATE NOT NULL,
  PRIMARY KEY (id, date)
);

-- Comunidad Global
CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  author TEXT NOT NULL DEFAULT 'Anónimo',
  content TEXT NOT NULL,
  topic TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Planes de Progreso Personal
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_goals (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_activities (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration TEXT,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);