/**
 * Migration-list invariants.
 *
 * These are cheap, pure checks, but they catch a failure mode that is otherwise
 * discovered by users: a migration that cannot run. `ALTER TABLE … ADD COLUMN`
 * is not idempotent, so a migration that re-adds a column the base schema
 * already creates fails on *every* launch — the app survives, but the schema
 * version never advances and the error repeats silently.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { MIGRATIONS, pendingMigrations } from '../src/db/migrations.ts';
import { DEFAULT_SETTINGS, SCHEMA_SQL, SCHEMA_VERSION } from '../src/db/schema.ts';

describe('migration list shape', () => {
  it('starts at version 1 and is strictly increasing', () => {
    assert.ok(MIGRATIONS.length > 0, 'there must be at least one migration');
    assert.equal(MIGRATIONS[0].version, 1);
    for (let i = 1; i < MIGRATIONS.length; i++) {
      assert.equal(
        MIGRATIONS[i].version,
        MIGRATIONS[i - 1].version + 1,
        `versions must be contiguous — gap before ${MIGRATIONS[i].name}`,
      );
    }
  });

  it('has unique names', () => {
    const names = new Set(MIGRATIONS.map((m) => m.name));
    assert.equal(names.size, MIGRATIONS.length, 'migration names must be unique');
  });

  it('has non-empty SQL for every step', () => {
    for (const migration of MIGRATIONS) {
      assert.ok(migration.up.trim().length > 0, `${migration.name} has no SQL`);
    }
  });

  it('declares SCHEMA_VERSION as the highest version', () => {
    const highest = MIGRATIONS[MIGRATIONS.length - 1].version;
    assert.equal(
      SCHEMA_VERSION,
      highest,
      'SCHEMA_VERSION must match the last migration or fresh installs never converge',
    );
  });
});

describe('no migration re-adds what the base schema already creates', () => {
  it('never ALTERs a table that v1 creates from scratch', () => {
    // v1 builds the whole schema. Before v1 is released the two must stay in
    // step; afterwards SCHEMA_SQL is frozen and ALTERs become correct again.
    const alters = MIGRATIONS.filter((m) => /ALTER\s+TABLE/i.test(m.up));
    assert.deepEqual(
      alters.map((m) => m.name),
      [],
      'a fresh install runs every migration in order, so an ALTER that duplicates '
        + 'a SCHEMA_SQL column will fail on a clean database',
    );
  });

  it('keeps every CREATE TABLE in the schema idempotent', () => {
    const creates = SCHEMA_SQL.match(/CREATE\s+TABLE(?!.*IF\s+NOT\s+EXISTS)/gi) ?? [];
    assert.deepEqual(creates, [], 'all CREATE TABLE statements need IF NOT EXISTS');
  });

  it('keeps every CREATE INDEX in the schema idempotent', () => {
    const creates = SCHEMA_SQL.match(/CREATE\s+(UNIQUE\s+)?INDEX(?!.*IF\s+NOT\s+EXISTS)/gi) ?? [];
    assert.deepEqual(creates, [], 'all CREATE INDEX statements need IF NOT EXISTS');
  });
});

describe('pendingMigrations', () => {
  it('returns nothing for an up-to-date database', () => {
    assert.deepEqual(pendingMigrations(SCHEMA_VERSION), []);
  });

  it('returns nothing for a database ahead of the code', () => {
    assert.deepEqual(pendingMigrations(SCHEMA_VERSION + 5), []);
  });

  it('returns everything for a fresh install', () => {
    assert.equal(pendingMigrations(0).length, MIGRATIONS.length);
  });

  it('returns only the steps above the current version', () => {
    const half = Math.floor(MIGRATIONS.length / 2);
    const pending = pendingMigrations(half);
    assert.ok(pending.every((m) => m.version > half));
    assert.equal(pending.length, MIGRATIONS.length - half);
  });
});

describe('settings seed', () => {
  it('does not seed schemaVersion, which belongs to schema_meta', () => {
    // Seeding it in two places is how they drift apart.
    assert.equal(
      DEFAULT_SETTINGS.some(([key]) => key === 'schemaVersion'),
      false,
    );
  });

  it('seeds the keys the app reads', () => {
    const keys = new Set(DEFAULT_SETTINGS.map(([key]) => key));
    for (const expected of [
      'currency',
      'themeMode',
      'remindersEnabled',
      'dueSoonDays',
      'defaultMethod',
      'autoBackupEnabled',
      'hapticsEnabled',
    ]) {
      assert.ok(keys.has(expected), `missing default: ${expected}`);
    }
  });

  it('defaults haptics on, since they are part of the feel of the app', () => {
    const haptics = DEFAULT_SETTINGS.find(([key]) => key === 'hapticsEnabled');
    assert.equal(haptics?.[1], 'true');
  });

  it('seeds each key only once', () => {
    const keys = DEFAULT_SETTINGS.map(([key]) => key);
    assert.equal(new Set(keys).size, keys.length, 'duplicate default keys');
  });
});

describe('base schema', () => {
  const tables = [
    'people',
    'debts',
    'payments',
    'settings',
    'schema_meta',
  ];

  for (const table of tables) {
    it(`creates ${table}`, () => {
      assert.match(SCHEMA_SQL, new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\b`, 'i'));
    });
  }

  it('declares the columns the repositories rely on', () => {
    const required: Array<[string, string]> = [
      ['people', 'archived'],
      ['people', 'initials'],
      ['debts', 'interest_rate'],
      ['debts', 'settled_at'],
      ['debts', 'due_at'],
      ['payments', 'method'],
    ];
    for (const [table, column] of required) {
      const block = SCHEMA_SQL.match(
        new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'),
      );
      assert.ok(block, `could not find the ${table} definition`);
      assert.match(block![1], new RegExp(`\\b${column}\\b`), `${table}.${column} is missing`);
    }
  });

  it('enforces the money invariants as CHECK constraints', () => {
    // These are the guarantees the application layer also relies on.
    assert.match(SCHEMA_SQL, /CHECK\s*\(\s*principal\s*>\s*0\s*\)/i);
    assert.match(SCHEMA_SQL, /CHECK\s*\(\s*paid\s*>=\s*0\s*\)/i);
    assert.match(SCHEMA_SQL, /CHECK\s*\(\s*amount\s*>\s*0\s*\)/i);
    assert.match(SCHEMA_SQL, /CHECK\s*\(\s*direction\s+IN\s*\(\s*'lent'\s*,\s*'borrowed'\s*\)\s*\)/i);
    assert.match(SCHEMA_SQL, /CHECK\s*\(\s*status\s+IN\s*\(\s*'open'\s*,\s*'settled'\s*\)\s*\)/i);
  });

  it('cascades deletes through the foreign keys', () => {
    // SQLite accepts either a column-level REFERENCES clause or a table-level
    // FOREIGN KEY clause. What matters is that both children cascade, and
    // that foreign key enforcement is switched on.
    const peopleRef = SCHEMA_SQL.match(
      /person_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+people\s*\(\s*id\s*\)\s*ON DELETE CASCADE/i,
    );
    assert.ok(peopleRef, 'debts.person_id must cascade on delete');

    const debtRef = SCHEMA_SQL.match(
      /debt_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+debts\s*\(\s*id\s*\)\s*ON DELETE CASCADE/i,
    );
    assert.ok(debtRef, 'payments.debt_id must cascade on delete');
  });

  it('enables WAL and foreign keys in the schema itself', () => {
    // Belt and braces: `getDatabase` sets these again on every open.
    assert.match(SCHEMA_SQL, /PRAGMA\s+journal_mode\s*=\s*WAL/i);
    assert.match(SCHEMA_SQL, /PRAGMA\s+foreign_keys\s*=\s*ON/i);
  });
});