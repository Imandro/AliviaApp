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
