/**
 * Backup restore — the only part of the backup story that touches the database.
 *
 * Two things make this safe:
 *
 *  1. **Validate before writing.** `parseBackup` (in `backup.ts`) runs first,
 *     so a malformed or foreign file is rejected before anything is inserted.
 *     The whole restore then runs in one transaction.
 *
 *  2. **Rebuild derived values.** `paid` and `status` are denormalised columns.
 *     Rather than trusting whatever the file claims, they are recomputed from
 *     the payments that were actually restored — so a hand-edited or
 *     inconsistent file cannot leave a debt whose total disagrees with its
 *     history (invariant FR-DAT-09).
 */

import { getAllAsync, runAsync, transaction } from './index.ts';
import { EXPORT_VERSION, parseBackup, type ImportPreview } from './backup.ts';
import {
  asCategory,
  asDate,
  asDirection,
  asBoolInt,
  asInteger,
  asMethod,
  asNullableDate,
  asOptionalText,
  asString,
  isRecord,
} from './coerce.ts';
import { nowISO } from '../utils/date.ts';
import type { Debt, ID, Payment, Person } from '../types/index.ts';

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  peopleAdded: number;
  peopleUpdated: number;
  debtsAdded: number;
  debtsUpdated: number;
  paymentsAdded: number;
  removed: number;
  mode: ImportMode;
}

export type { ImportPreview };

interface ParsedBackup {
  people: Person[];
  debts: Debt[];
  payments: Array<Payment & { debtId: ID }>;
}

/**
 * Second pass: coerce already-validated rows into domain objects.
 *
 * Rows that reference something missing from the same file are dropped rather
 * than imported broken — a debt whose person was not exported cannot be shown.
 */
function coerce(raw: Record<string, unknown>, timestamp: string): ParsedBackup {
  const preview = parseBackup(JSON.stringify(raw));
  if (!preview.ok) throw new Error(preview.error ?? 'That file could not be read.');

  const body = raw;
  const today = timestamp.slice(0, 10);
  let personIndex = 0;
  let debtIndex = 0;
  let paymentIndex = 0;

  const people: Person[] = (body.people as unknown[])
    .filter((p): p is Record<string, unknown> => isRecord(p) && asString(p.name).trim().length > 0)
    .map((p) => ({
      id: asString(p.id) || `per_imported_${personIndex++}_${timestamp}`,
      name: asString(p.name).trim(),
      initials: asOptionalText(p.initials),
      phone: asOptionalText(p.phone),
      email: asOptionalText(p.email),
      location: asOptionalText(p.location),
      note: asOptionalText(p.note),
      archived: asBoolInt(p.archived),
      createdAt: asString(p.createdAt) || timestamp,
      updatedAt: asString(p.updatedAt) || timestamp,
    }));

  const knownPeople = new Set(people.map((p) => p.id));

  const debts: Debt[] = (body.debts as unknown[])
    .filter((d): d is Record<string, unknown> => isRecord(d) && knownPeople.has(asString(d.personId)))
    .map((d) => {
      const principal = Math.max(1, asInteger(d.principal, 1));
      return {
        id: asString(d.id) || `dbt_imported_${debtIndex++}_${timestamp}`,
        personId: asString(d.personId),
        direction: asDirection(d.direction),
        principal,
        // Recomputed from the restored payments; seeded only so the column is
        // never left null before that happens.
        paid: Math.min(Math.max(0, asInteger(d.paid)), principal),
        currency: asString(d.currency, 'LKR') || 'LKR',
        interestRate: typeof d.interestRate === 'number' ? d.interestRate : null,
        category: asCategory(d.category),
        status: asString(d.status) === 'settled' ? 'settled' : 'open',
        note: asOptionalText(d.note),
        issuedAt: asDate(d.issuedAt, today),
        dueAt: asNullableDate(d.dueAt),
        settledAt: asOptionalText(d.settledAt),
        createdAt: asString(d.createdAt) || timestamp,
        updatedAt: asString(d.updatedAt) || timestamp,
      };
    });

  const knownDebts = new Set(debts.map((d) => d.id));

  const payments: Array<Payment & { debtId: ID }> = (
    Array.isArray(body.payments) ? (body.payments as unknown[]) : []
  )
    .filter((p): p is Record<string, unknown> => isRecord(p) && knownDebts.has(asString(p.debtId)))
    .map((p) => ({
      id: asString(p.id) || `pay_imported_${paymentIndex++}_${timestamp}`,
      debtId: asString(p.debtId),
      amount: Math.max(1, asInteger(p.amount, 1)),
      currency: asString(p.currency, 'LKR') || 'LKR',
      method: asMethod(p.method),
      note: asOptionalText(p.note),
      paidAt: asDate(p.paidAt, today),
      createdAt: asString(p.createdAt) || timestamp,
    }));

  return { people, debts, payments };
}

/**
 * Restore a backup.
 *
 * `merge` keeps what is already on the device and adds anything new. People,
 * debts and payments are matched by their stable id, so importing the same
 * file twice is a no-op rather than a pile of duplicates.
 *
 * `replace` wipes the ledger first, which is what "restore my backup" means to
 * someone who has lost the phone.
 */
export async function importBackup(json: string, mode: ImportMode): Promise<ImportResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!isRecord(raw)) throw new Error('That file does not look like a backup.');

  const preview = parseBackup(json);
  if (!preview.ok) throw new Error(preview.error ?? 'That file could not be read.');

  const timestamp = nowISO();
  const { people, debts, payments } = coerce(raw, timestamp);

  return transaction(async () => {
    let removed = 0;

    if (mode === 'replace') {
      const before = await getAllAsync<{ n: number }>(
        `SELECT (SELECT COUNT(*) FROM people) + (SELECT COUNT(*) FROM debts) AS n;`,
      );
      removed = before[0]?.n ?? 0;
      await runAsync(`DELETE FROM payments;`);
      await runAsync(`DELETE FROM debts;`);
      await runAsync(`DELETE FROM people;`);
    }

    const [existingPeople, existingDebts, existingPayments] = await Promise.all([
      getAllAsync<{ id: ID }>(`SELECT id FROM people;`),
      getAllAsync<{ id: ID }>(`SELECT id FROM debts;`),
      getAllAsync<{ id: ID }>(`SELECT id FROM payments;`),
    ]);
    const personIds = new Set(existingPeople.map((r) => r.id));
    const debtIds = new Set(existingDebts.map((r) => r.id));
    const paymentIds = new Set(existingPayments.map((r) => r.id));

    let peopleAdded = 0;
    let peopleUpdated = 0;
    for (const person of people) {
      if (personIds.has(person.id)) {
        await runAsync(
          `UPDATE people
              SET name = ?, initials = ?, phone = ?, email = ?, location = ?,
                  note = ?, archived = ?, updated_at = ?
            WHERE id = ?;`,
          [
            person.name, person.initials, person.phone, person.email,
            person.location, person.note, person.archived, timestamp, person.id,
          ],
        );
        peopleUpdated += 1;
      } else {
        await runAsync(
          `INSERT INTO people
             (id, name, initials, phone, email, location, note, archived, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            person.id, person.name, person.initials, person.phone, person.email,
            person.location, person.note, person.archived, person.createdAt, person.updatedAt,
          ],
        );
        peopleAdded += 1;
      }
    }

    let debtsAdded = 0;
    let debtsUpdated = 0;
    for (const debt of debts) {
      if (debtIds.has(debt.id)) {
        await runAsync(
          `UPDATE debts
              SET person_id = ?, direction = ?, principal = ?, currency = ?,
                  interest_rate = ?, category = ?, note = ?, issued_at = ?,
                  due_at = ?, updated_at = ?
            WHERE id = ?;`,
          [
            debt.personId, debt.direction, debt.principal, debt.currency,
            debt.interestRate, debt.category, debt.note, debt.issuedAt,
            debt.dueAt, timestamp, debt.id,
          ],
        );
        debtsUpdated += 1;
      } else {
        await runAsync(
          `INSERT INTO debts
             (id, person_id, direction, principal, paid, currency, interest_rate, category,
              status, note, issued_at, due_at, settled_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            debt.id, debt.personId, debt.direction, debt.principal, debt.currency,
            debt.interestRate, debt.category, debt.status, debt.note, debt.issuedAt,
            debt.dueAt, debt.settledAt, debt.createdAt, debt.updatedAt,
          ],
        );
        debtsAdded += 1;
      }
    }

    let paymentsAdded = 0;
    for (const payment of payments) {
      if (paymentIds.has(payment.id)) continue; // already here; re-import is a no-op
      await runAsync(
        `INSERT INTO payments (id, debt_id, amount, currency, method, note, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          payment.id, payment.debtId, payment.amount, payment.currency,
          payment.method, payment.note, payment.paidAt, payment.createdAt,
        ],
      );
      paymentsAdded += 1;
    }

    // Rebuild `paid` and `status` from the payments that now exist, so the
    // denormalised total can never disagree with its own history.
    await runAsync(
      `UPDATE debts
          SET paid = COALESCE(
                (SELECT SUM(p.amount) FROM payments p WHERE p.debt_id = debts.id), 0),
              status = CASE
                WHEN COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.debt_id = debts.id), 0)
                     >= principal
                THEN 'settled' ELSE 'open' END,
              settled_at = CASE
                WHEN COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.debt_id = debts.id), 0)
                     >= principal
                THEN COALESCE(settled_at, ?)
                ELSE NULL END,
              updated_at = ?;`,
      [timestamp, timestamp],
    );

    return { peopleAdded, peopleUpdated, debtsAdded, debtsUpdated, paymentsAdded, removed, mode };
  });
}

/** Current row counts, shown on the backup screen. */
export async function currentCounts(): Promise<{
  people: number;
  debts: number;
  payments: number;
}> {
  const rows = await getAllAsync<{ people: number; debts: number; payments: number }>(
    `SELECT (SELECT COUNT(*) FROM people)   AS people,
            (SELECT COUNT(*) FROM debts)    AS debts,
            (SELECT COUNT(*) FROM payments) AS payments;`,
  );
  return rows[0] ?? { people: 0, debts: 0, payments: 0 };
}

export { EXPORT_VERSION };