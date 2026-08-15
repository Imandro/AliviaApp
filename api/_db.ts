import { Pool } from 'pg';

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
`;

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
