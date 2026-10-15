/**
 * Backup format tests.
 *
 * The backup file is the only copy of a user's ledger, so the format is
 * effectively a public API: these tests pin what version 1/2 files contain,
 * and prove the validator refuses anything that is not one of ours — *before*
 * anything reaches the database.
 *
 * `parseBackup` is pure, so all of this is testable without SQLite.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { buildExport, exportToCsv, parseBackup, EXPORT_FORMAT, EXPORT_VERSION } from '../src/db/backup.ts';
import type { Debt, Payment, Person } from '../src/types/index.ts';

function person(name: string, id = `per_${name}`): Person {
  return {
    id,
    name,
    initials: null,
    phone: null,
    email: null,
    location: null,
    note: null,
    archived: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function debt(overrides: Partial<Debt> = {}): Debt & { person: Person } {
  return {
    id: 'dbt_1',
    personId: 'per_Nuwan',
    direction: 'lent',
    principal: 100_00,
    paid: 40_00,
    currency: 'LKR',
    interestRate: null,
    category: 'general',
    status: 'open',
    note: null,
    issuedAt: '2026-06-01',
    dueAt: '2026-07-01',
    settledAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    person: person('Nuwan', 'per_Nuwan'),
    ...overrides,
  } as Debt & { person: Person };
}

function payment(id: string, amount: number, debtId = 'dbt_1'): Payment & { debtId: string } {
  return {
    id,
    debtId,
    amount,
    currency: 'LKR',
    method: 'cash',
    note: null,
    paidAt: '2026-06-15',
    createdAt: '2026-06-15T00:00:00.000Z',
  };
}

const SAMPLE = buildExport(
  [person('Nuwan', 'per_Nuwan'), person('Amara', 'per_Amara')],
  [debt(), debt({ id: 'dbt_2', personId: 'per_Amara', principal: 500_00, paid: 500_00, status: 'settled' })],
  [payment('pay_1', 40_00)],
);

describe('buildExport', () => {
  it('carries the format marker and version', () => {
    const parsed = JSON.parse(SAMPLE);
    assert.equal(parsed.format, EXPORT_FORMAT);
    assert.equal(parsed.version, EXPORT_VERSION);
    assert.ok(parsed.app.length > 0);
    assert.ok(parsed.exportedAt.length > 0);
  });

  it('includes payment history — a backup without it is not a backup', () => {
    const parsed = JSON.parse(SAMPLE);
    assert.equal(parsed.payments.length, 1);
    assert.equal(parsed.payments[0].debtId, 'dbt_1');
    assert.equal(parsed.payments[0].amount, 40_00);
  });

  it('stores raw integer minor units, not formatted strings', () => {
    const parsed = JSON.parse(SAMPLE);
    assert.equal(parsed.debts[0].principal, 100_00);
    assert.equal(typeof parsed.debts[0].principal, 'number');
  });

  it('records the outstanding balance for readability', () => {
    const parsed = JSON.parse(SAMPLE);
    assert.equal(parsed.debts[0].outstanding, 60_00);
  });

  it('does not nest the person object inside each debt', () => {
    const parsed = JSON.parse(SAMPLE);
    assert.equal(parsed.debts[0].person, undefined);
    assert.equal(parsed.debts[0].personId, 'per_Nuwan');
  });
});

describe('parseBackup — accepts a valid file', () => {
  it('reports what the file contains', () => {
    const preview = parseBackup(SAMPLE);
    assert.equal(preview.ok, true);
    assert.equal(preview.people, 2);
    assert.equal(preview.debts, 2);
    assert.equal(preview.payments, 1);
    assert.equal(preview.version, EXPORT_VERSION);
    assert.ok(preview.exportedAt);
  });

  it('accepts a version 1 file, which predates payment export', () => {
    const legacy = JSON.stringify({
      app: 'Siyana Debt Tracker',
      format: EXPORT_FORMAT,
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      people: [person('Nuwan')],
      debts: [debt()],
    });
    const preview = parseBackup(legacy);
    assert.equal(preview.ok, true);
    assert.equal(preview.payments, 0, 'a v1 file legitimately has no payments');
  });
});

describe('parseBackup — rejects bad input', () => {
  it('rejects text that is not JSON', () => {
    const preview = parseBackup('this is not json');
    assert.equal(preview.ok, false);
    assert.match(preview.error!, /not valid JSON/i);
  });

  it('rejects JSON that is not an object', () => {
    for (const bad of ['[1,2,3]', '"hello"', '42', 'null']) {
      assert.equal(parseBackup(bad).ok, false, `${bad} should be rejected`);
    }
  });

  it('rejects a file from a different app', () => {
    const preview = parseBackup(JSON.stringify({ format: 'some-other-app', version: 1 }));
    assert.equal(preview.ok, false);
    assert.match(preview.error!, /not exported by/i);
  });

  it('rejects a future format version rather than guessing', () => {
    const preview = parseBackup(
      JSON.stringify({ format: EXPORT_FORMAT, version: EXPORT_VERSION + 5, people: [{}] }),
    );
    assert.equal(preview.ok, false);
    assert.match(preview.error!, /version/i);
    assert.match(preview.error!, /update/i, 'should tell the user what to do');
  });

  it('rejects a missing or empty people list', () => {
    assert.equal(parseBackup(JSON.stringify({ format: EXPORT_FORMAT, version: 1 })).ok, false);
    assert.equal(
      parseBackup(JSON.stringify({ format: EXPORT_FORMAT, version: 1, people: [], debts: [] })).ok,
      false,
    );
  });

  it('ignores person rows with no name', () => {
    const preview = parseBackup(
      JSON.stringify({
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        people: [{ name: '   ' }, { name: 'Real' }, 'nonsense'],
        debts: [],
      }),
    );
    assert.equal(preview.ok, true);
    assert.equal(preview.people, 1, 'only the usable row counts');
  });
});

describe('exportToCsv', () => {
  const csv = exportToCsv([debt(), debt({ id: 'dbt_2', note: 'Has, a comma\nand a "quote"' })]);
  const lines = csv.split('\n');

  it('writes a header row', () => {
    assert.equal(lines[0].startsWith('Person,Direction,Category,Principal,Paid'), true);
  });

  it('writes one row per debt', () => {
    assert.equal(lines.length, 3);
  });

  it('formats amounts for humans rather than exposing minor units', () => {
    // 100_00 minor units is 100.00, not 100000. The CSV must show the former.
    assert.match(lines[1], /100\.00/);
    assert.equal(lines[1].includes('10000'), false, 'must not leak raw minor units');
  });

  it('groups thousands in large amounts', () => {
    const big = exportToCsv([debt({ principal: 1_250_000, paid: 0 })]).split('\n')[1];
    assert.match(big, /12,500\.00/);
  });

  it('labels direction in words, not enum values', () => {
    assert.match(lines[1], /Lent/);
    assert.equal(csv.includes('"borrowed"'), false);
  });

  it('quotes fields containing commas, quotes or newlines per RFC 4180', () => {
    assert.ok(csv.includes('"Has, a comma'), 'comma must be quoted');
    assert.ok(csv.includes('""quote""'), 'inner quotes must be doubled');
  });

  it('leaves an absent due date blank rather than writing a placeholder', () => {
    const noDue = exportToCsv([debt({ dueAt: null })]).split('\n')[1];
    assert.equal(noDue.includes('No due date'), false);
  });
});