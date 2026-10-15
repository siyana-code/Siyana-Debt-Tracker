/**
 * Database access layer.
 *
 * One lazily-opened `expo-sqlite` handle per app instance. Opening is guarded
 * by a single in-flight promise so concurrent screens (dashboard + list + tab
 * bar) never open two connections during startup.
 *
 * All app state lives here and nowhere else. There is no network client.
 */

import * as SQLite from 'expo-sqlite';

import { MIGRATIONS, pendingMigrations, seedSettings } from './migrations';
import { SCHEMA_VERSION } from './schema';
import type { Settings, SettlementMethod } from '../types';

export const DATABASE_NAME = 'siyana-debts.db';

let db: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (opening) return opening;

  opening = (async () => {
    const handle = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await handle.execAsync('PRAGMA journal_mode = WAL;');
    await handle.execAsync('PRAGMA foreign_keys = ON;');
    await migrate(handle);
    await seedSettings((sql) => handle.execAsync(sql));
    db = handle;
    return handle;
  })();

  try {
    return await opening;
  } finally {
    opening = null;
  }
}

async function migrate(handle: SQLite.SQLiteDatabase): Promise<void> {
  await handle.execAsync(
    `CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
  );

  const rows = await handle.getAllAsync<{ value: string }>(
    `SELECT value FROM schema_meta WHERE key = 'schemaVersion' LIMIT 1;`,
  );

  const current = rows.length ? Number(rows[0].value) || 0 : 0;
  const pending = pendingMigrations(current);

  for (const migration of pending) {
    await handle.withTransactionAsync(async () => {
      await handle.execAsync(migration.up);
      await handle.runAsync(
        `INSERT INTO schema_meta (key, value) VALUES ('schemaVersion', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        String(migration.version),
      );
    });
    // eslint-disable-next-line no-console
    console.log(`[db] applied migration ${migration.version} (${migration.name})`);
  }

  if (current === 0 && pending.length === 0) {
    await handle.runAsync(
      `INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schemaVersion', ?)`,
      String(SCHEMA_VERSION),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Query helpers                                                       */
/* ------------------------------------------------------------------ */

export async function getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const handle = await getDatabase();
  return handle.getAllAsync<T>(sql, params as never);
}

export async function getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const handle = await getDatabase();
  return handle.getFirstAsync<T>(sql, params as never);
}

export async function runAsync(
  sql: string,
  params: unknown[] = [],
): Promise<{ changes: number; lastInsertRowId: number }> {
  const handle = await getDatabase();
  const result = await handle.runAsync(sql, params as never);
  return {
    changes: result.changes,
    lastInsertRowId: result.lastInsertRowId,
  };
}

/**
 * Run `fn` inside a transaction; rolls back on any throw.
 *
 * `withTransactionAsync` is typed as void-returning, so the result is captured
 * in a local rather than returned from the callback.
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const handle = await getDatabase();
  let result: T;
  await handle.withTransactionAsync(async () => {
    result = await fn();
  });
  return result!;
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

const SETTINGS_DEFAULTS: Settings = {
  currency: 'LKR',
  themeMode: 'system',
  remindersEnabled: true,
  dueSoonDays: 3,
  defaultMethod: 'cash',
  autoBackupEnabled: false,
  hapticsEnabled: true,
};

export async function loadSettings(): Promise<Settings> {
  const rows = await getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM settings;`,
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    currency: map.get('currency') ?? SETTINGS_DEFAULTS.currency,
    themeMode: (map.get('themeMode') as Settings['themeMode']) ?? SETTINGS_DEFAULTS.themeMode,
    remindersEnabled: toBool(map.get('remindersEnabled'), SETTINGS_DEFAULTS.remindersEnabled),
    dueSoonDays: toInt(map.get('dueSoonDays'), SETTINGS_DEFAULTS.dueSoonDays),
    defaultMethod:
      (map.get('defaultMethod') as SettlementMethod) ?? SETTINGS_DEFAULTS.defaultMethod,
    autoBackupEnabled: toBool(
      map.get('autoBackupEnabled'),
      SETTINGS_DEFAULTS.autoBackupEnabled,
    ),
    hapticsEnabled: toBool(map.get('hapticsEnabled'), SETTINGS_DEFAULTS.hapticsEnabled),
  };
}

export async function saveSetting(key: keyof Settings, value: string | number | boolean): Promise<void> {
  await runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, String(value)],
  );
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function toInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/* ------------------------------------------------------------------ */
/* Maintenance                                                         */
/* ------------------------------------------------------------------ */

/** Wipe all user data but keep the schema. Used by Settings > Erase data. */
export async function eraseAllData(): Promise<void> {
  await transaction(async () => {
    await runAsync(`DELETE FROM payments;`);
    await runAsync(`DELETE FROM debts;`);
    await runAsync(`DELETE FROM people;`);
    await runAsync(`DELETE FROM settings;`);
  });
  await seedSettings(async (sql) => {
    await runAsync(sql);
  });
}

/** Row counts, shown on the Settings screen and in bug reports. */
export async function databaseStats(): Promise<{
  people: number;
  debts: number;
  payments: number;
  schemaVersion: number;
}> {
  const [people, debts, payments] = await Promise.all([
    getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM people;`),
    getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM debts;`),
    getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM payments;`),
  ]);
  return {
    people: people?.n ?? 0,
    debts: debts?.n ?? 0,
    payments: payments?.n ?? 0,
    schemaVersion: SCHEMA_VERSION,
  };
}