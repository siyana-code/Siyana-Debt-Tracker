/**
 * SQLite schema definition.
 *
 * The app is offline-only: this database on the device is the single source of
 * truth. There is no sync server and no account.
 *
 * Schema changes must be additive and must ship as a new entry in
 * `migrations.ts` — never edit `SCHEMA_SQL` after it has shipped.
 */

/**
 * Current schema version.
 *
 * Must equal the highest entry in `MIGRATIONS`. Nothing has been released yet,
 * so the migration list and `SCHEMA_SQL` are still in step — once v1 ships,
 * `SCHEMA_SQL` is frozen and every future change appends a migration.
 */
export const SCHEMA_VERSION = 2;

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS people (
  id         TEXT PRIMARY KEY NOT NULL,
  name       TEXT NOT NULL,
  initials   TEXT,
  phone      TEXT,
  email      TEXT,
  location   TEXT,
  note       TEXT,
  archived   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS debts (
  id            TEXT PRIMARY KEY NOT NULL,
  person_id     TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  direction     TEXT NOT NULL CHECK (direction IN ('lent','borrowed')),
  principal     INTEGER NOT NULL CHECK (principal > 0),
  paid          INTEGER NOT NULL DEFAULT 0 CHECK (paid >= 0),
  currency      TEXT NOT NULL,
  interest_rate REAL,
  category      TEXT NOT NULL DEFAULT 'general',
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','settled')),
  note          TEXT,
  issued_at     TEXT NOT NULL,
  due_at        TEXT,
  settled_at    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id         TEXT PRIMARY KEY NOT NULL,
  debt_id    TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL CHECK (amount > 0),
  currency   TEXT NOT NULL,
  method     TEXT NOT NULL DEFAULT 'cash',
  note       TEXT,
  paid_at    TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_debts_person     ON debts(person_id);
CREATE INDEX IF NOT EXISTS idx_debts_status     ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_direction  ON debts(direction);
CREATE INDEX IF NOT EXISTS idx_debts_due_at     ON debts(due_at);
CREATE INDEX IF NOT EXISTS idx_debts_updated_at ON debts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_debt    ON payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_archived  ON people(archived);
CREATE INDEX IF NOT EXISTS idx_people_name      ON people(name COLLATE NOCASE);
`;

/**
 * Settings seeded on first run.
 *
 * Deliberately does NOT include `schemaVersion` — the applied migration
 * version lives in the `schema_meta` table, which is owned by `migrate()`.
 * Duplicating it here is how the two drift apart.
 */
export const DEFAULT_SETTINGS: ReadonlyArray<[string, string]> = [
  ['currency', 'LKR'],
  ['themeMode', 'system'],
  ['remindersEnabled', 'true'],
  ['dueSoonDays', '3'],
  ['defaultMethod', 'cash'],
  ['autoBackupEnabled', 'false'],
];