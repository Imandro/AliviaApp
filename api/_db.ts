import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

let pool: Pool | null = null;

const SCHEMA_SQL = `
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

CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  author TEXT NOT NULL DEFAULT 'Anónimo',
  content TEXT NOT NULL,
  topic TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  problems TEXT[] NOT NULL DEFAULT '{}',
  situations TEXT[] NOT NULL DEFAULT '{}',
  strategies TEXT[] NOT NULL DEFAULT '{}',
  trusted_person TEXT,
  trusted_phone TEXT,
  wants_contact BOOLEAN NOT NULL DEFAULT FALSE,
  changes TEXT[] NOT NULL DEFAULT '{}',
  goals_text TEXT,
  onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`;

const FUNCTIONS_SQL = (() => {
  try {
    return readFileSync(join(process.cwd(), 'db', 'functions.sql'), 'utf8');
  } catch {
    return '';
  }
})();

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL no configurada');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(SCHEMA_SQL)
      .then(() => {})
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

let functionsReady: Promise<void> | null = null;

export function ensureFunctions(): Promise<void> {
  if (!functionsReady) {
    functionsReady = getPool()
      .query(FUNCTIONS_SQL)
      .then(() => {})
      .catch((err) => {
        functionsReady = null;
        throw err;
      });
  }
  return functionsReady;
}