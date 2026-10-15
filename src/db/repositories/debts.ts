/** Debt repository — CRUD plus the list queries the screens need. */

import { getAllAsync, getFirstAsync, runAsync, transaction } from '../index';
import { nowISO } from '../../utils/date';
import { newDebtId } from '../../utils/id';
import { remaining } from '../../domain/money';
import type { Debt, DebtCategory, DebtDirection, DebtStatus, ID, Person } from '../../types';

const SELECT_DEBT = `
  SELECT d.id, d.person_id AS personId, d.direction, d.principal, d.paid,
         d.currency, d.interest_rate AS interestRate, d.category, d.status,
         d.note, d.issued_at AS issuedAt, d.due_at AS dueAt, d.settled_at AS settledAt,
         d.created_at AS createdAt, d.updated_at AS updatedAt,
         p.id AS _pId, p.name AS _pName, p.initials AS _pInitials, p.phone AS _pPhone,
         p.email AS _pEmail, p.location AS _pLocation, p.note AS _pNote, p.archived AS _pArchived,
         p.created_at AS _pCreatedAt, p.updated_at AS _pUpdatedAt
    FROM debts d
    JOIN people p ON p.id = d.person_id`;

interface DebtRow extends Omit<Debt, 'interestRate'> {
  interestRate: number | null;
  [k: string]: unknown;
}

function mapDebt(row: DebtRow): Debt & { person: Person } {
  const {
    _pId, _pName, _pInitials, _pPhone, _pEmail, _pLocation, _pNote, _pArchived,
    _pCreatedAt, _pUpdatedAt,
    ...debt
  } = row as DebtRow & Record<string, unknown>;
  const person: Person = {
    id: _pId as string,
    name: _pName as string,
    initials: _pInitials as string | null,
    phone: _pPhone as string | null,
    email: _pEmail as string | null,
    location: _pLocation as string | null,
    note: _pNote as string | null,
    archived: _pArchived as 0 | 1,
    createdAt: _pCreatedAt as string,
    updatedAt: _pUpdatedAt as string,
  };
  return { ...(debt as unknown as Debt), person };
}

export async function listDebts(options: {
  direction?: DebtDirection | 'all';
  status?: DebtStatus | 'all';
  personId?: ID;
} = {}): Promise<Array<Debt & { person: Person }>> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (options.direction && options.direction !== 'all') {
    where.push(`d.direction = ?`);
    params.push(options.direction);
  }
  if (options.status && options.status !== 'all') {
    where.push(`d.status = ?`);
    params.push(options.status);
  }
  if (options.personId) {
    where.push(`d.person_id = ?`);
    params.push(options.personId);
  }
  const sql = `${SELECT_DEBT}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}
               ORDER BY d.updated_at DESC;`;
  return (await getAllAsync<DebtRow>(sql, params)).map(mapDebt);
}

export async function getDebt(id: ID): Promise<(Debt & { person: Person }) | null> {
  const row = await getFirstAsync<DebtRow>(`${SELECT_DEBT} WHERE d.id = ? LIMIT 1;`, [id]);
  return row ? mapDebt(row) : null;
}

export interface DebtInput {
  personId: ID;
  direction: DebtDirection;
  principal: number;
  currency: string;
  category?: DebtCategory;
  interestRate?: number | null;
  note?: string | null;
  issuedAt: string;
  dueAt?: string | null;
  /** Set true to immediately settle the debt on creation. */
  settled?: boolean;
}

export async function createDebt(input: DebtInput): Promise<Debt & { person: Person }> {
  const id = newDebtId();
  const ts = nowISO();
  const settled = input.settled ? 1 : 0;
  await runAsync(
    `INSERT INTO debts (id, person_id, direction, principal, paid, currency, interest_rate,
                        category, status, note, issued_at, due_at, settled_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.personId,
      input.direction,
      Math.round(input.principal),
      settled ? Math.round(input.principal) : 0,
      input.currency,
      input.interestRate ?? null,
      input.category ?? 'general',
      settled ? 'settled' : 'open',
      input.note ?? null,
      input.issuedAt,
      input.dueAt ?? null,
      settled ? ts : null,
      ts,
      ts,
    ],
  );
  return (await getDebt(id))!;
}

export async function updateDebt(id: ID, patch: Partial<DebtInput>): Promise<void> {
  await runAsync(
    `UPDATE debts
        SET person_id  = COALESCE(?, person_id),
            direction  = COALESCE(?, direction),
            principal  = COALESCE(?, principal),
            currency   = COALESCE(?, currency),
            category   = COALESCE(?, category),
            interest_rate = ?,
            note       = ?,
            issued_at  = COALESCE(?, issued_at),
            due_at     = ?,
            updated_at = ?
      WHERE id = ?;`,
    [
      patch.personId ?? null,
      patch.direction ?? null,
      patch.principal != null ? Math.round(patch.principal) : null,
      patch.currency ?? null,
      patch.category ?? null,
      patch.interestRate ?? null,
      patch.note ?? null,
      patch.issuedAt ?? null,
      patch.dueAt ?? null,
      nowISO(),
      id,
    ],
  );
}

export async function deleteDebt(id: ID): Promise<void> {
  await transaction(async () => {
    await runAsync(`DELETE FROM debts WHERE id = ?;`, [id]);
  });
}

/**
 * Manual settlement toggle. Settling marks the debt closed and stamps
 * settled_at; reopening reverses it. Payment rows are untouched so the
 * history survives an accidental toggle.
 */
export async function setDebtStatus(id: ID, status: DebtStatus): Promise<void> {
  const ts = nowISO();
  await runAsync(`UPDATE debts SET status = ?, settled_at = ?, updated_at = ? WHERE id = ?;`, [
    status,
    status === 'settled' ? ts : null,
    ts,
    id,
  ]);
}

/** Headline figures for the dashboard, computed in SQL. */
export async function summarise(
  currency: string,
  today: string,
): Promise<{
  lentTotal: number;
  borrowedTotal: number;
  openCount: number;
  overdueCount: number;
  settledCount: number;
  overdueTotal: number;
}> {
  const row = await getFirstAsync<{
    lentTotal: number;
    borrowedTotal: number;
    openCount: number;
    overdueCount: number;
    settledCount: number;
    overdueTotal: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN direction = 'lent'     THEN MAX(principal - paid, 0) ELSE 0 END), 0) AS lentTotal,
       COALESCE(SUM(CASE WHEN direction = 'borrowed' THEN MAX(principal - paid, 0) ELSE 0 END), 0) AS borrowedTotal,
       COALESCE(SUM(CASE WHEN status = 'open' AND principal > paid THEN 1 ELSE 0 END), 0)       AS openCount,
       COALESCE(SUM(CASE WHEN status = 'open' AND principal > paid
                          AND due_at IS NOT NULL AND due_at < ? THEN 1 ELSE 0 END), 0)          AS overdueCount,
       COALESCE(SUM(CASE WHEN status = 'settled' THEN 1 ELSE 0 END), 0)                          AS settledCount,
       COALESCE(SUM(CASE WHEN status = 'open' AND principal > paid
                          AND due_at IS NOT NULL AND due_at < ? THEN MAX(principal - paid, 0) ELSE 0 END), 0) AS overdueTotal
       FROM debts
      WHERE currency = ?;`,
    [today, today, currency],
  );

  return {
    lentTotal: row?.lentTotal ?? 0,
    borrowedTotal: row?.borrowedTotal ?? 0,
    openCount: row?.openCount ?? 0,
    overdueCount: row?.overdueCount ?? 0,
    settledCount: row?.settledCount ?? 0,
    overdueTotal: row?.overdueTotal ?? 0,
  };
}

/** Outstanding per month, for the dashboard sparkline. */
export async function monthlyTrend(
  currency: string,
  months = 6,
  endDate = new Date(),
): Promise<Array<{ key: string; lent: number; borrowed: number }>> {
  const buckets: Array<{ key: string; lent: number; borrowed: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      lent: 0,
      borrowed: 0,
    });
  }
  const fromKey = buckets[0].key;
  const rows = await getAllAsync<{ bucket: string; direction: string; total: number }>(
    `SELECT substr(issued_at, 1, 7) AS bucket, direction,
            COALESCE(SUM(principal), 0) AS total
       FROM debts
      WHERE currency = ? AND substr(issued_at, 1, 7) >= ?
      GROUP BY bucket, direction;`,
    [currency, fromKey],
  );
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const row of rows) {
    const at = index.get(row.bucket);
    if (at === undefined) continue;
    if (row.direction === 'lent') buckets[at].lent = row.total;
    else buckets[at].borrowed = row.total;
  }
  return buckets;
}

export { remaining };