/**
 * Ordered, forward-only migrations.
 *
 * Rules:
 *  1. Never edit a shipped migration. Append a new one and bump SCHEMA_VERSION.
 *  2. Every migration runs inside a transaction.
 *  3. A migration must be safe to run against a database created by any
 *     earlier version, including a fresh install, where steps 1..N run in turn.
 *  4. **A migration must never re-add something `SCHEMA_SQL` already declares.**
 *     `CREATE TABLE IF NOT EXISTS` is idempotent; `ALTER TABLE … ADD COLUMN`
 *     is not — re-running it fails with "duplicate column name". Because
 *     nothing has been released yet, the base schema and the migration list
 *     are still in step. The moment v1 ships, `SCHEMA_SQL` freezes and every
 *     later change must arrive as a new `ALTER` in a new migration.
 *
 * The invariant is covered by tests/migrations.test.ts.
 */

import { SCHEMA_SQL, SCHEMA_VERSION, DEFAULT_SETTINGS } from './schema.ts';

export interface Migration {
  version: number;
  name: string;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: SCHEMA_SQL,
  },
  {
    version: 2,
    name: 'settings_defaults',
    up: `
      INSERT OR IGNORE INTO settings (key, value) VALUES ('remindersEnabled', 'true');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('dueSoonDays', '3');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('defaultMethod', 'cash');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('autoBackupEnabled', 'false');
    `,
  },
];

export function pendingMigrations(current: number): Migration[] {
  return MIGRATIONS.filter((m) => m.version > current);
}

export async function seedSettings(
  exec: (sql: string) => Promise<void>,
): Promise<void> {
  for (const [key, value] of DEFAULT_SETTINGS) {
    await exec(`INSERT OR IGNORE INTO settings (key, value) VALUES ('${key}', '${value}');`);
  }
}

export { SCHEMA_VERSION };