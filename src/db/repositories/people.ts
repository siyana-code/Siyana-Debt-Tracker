/** Person repository — the counterparty behind every debt. */

import { getAllAsync, getFirstAsync, runAsync, transaction } from '../index';
import { nowISO } from '../../utils/date';
import { newPersonId } from '../../utils/id';
import type { ID, Person } from '../../types';

const SELECT = `SELECT id, name, initials, phone, email, location, note, archived,
                       created_at AS createdAt, updated_at AS updatedAt
                FROM people`;

interface Row {
  id: string;
  name: string;
  initials: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  note: string | null;
  archived: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

function map(row: Row): Person {
  return row as unknown as Person;
}

export async function listPeople(includeArchived = false): Promise<Person[]> {
  const sql = includeArchived
    ? `${SELECT} ORDER BY archived ASC, name COLLATE NOCASE ASC;`
    : `${SELECT} WHERE archived = 0 ORDER BY name COLLATE NOCASE ASC;`;
  return (await getAllAsync<Row>(sql)).map(map);
}

export async function getPerson(id: ID): Promise<Person | null> {
  const row = await getFirstAsync<Row>(`${SELECT} WHERE id = ? LIMIT 1;`, [id]);
  return row ? map(row) : null;
}

export interface PersonInput {
  name: string;
  initials?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  note?: string | null;
}

export async function createPerson(input: PersonInput): Promise<Person> {
  const id = newPersonId();
  const ts = nowISO();
  await runAsync(
    `INSERT INTO people (id, name, initials, phone, email, location, note, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
    [
      id,
      input.name.trim(),
      input.initials ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.location ?? null,
      input.note ?? null,
      ts,
      ts,
    ],
  );
  return (await getPerson(id))!;
}

export async function updatePerson(id: ID, input: Partial<PersonInput>): Promise<void> {
  await runAsync(
    `UPDATE people
        SET name = COALESCE(?, name),
            initials = ?,
            phone = ?,
            email = ?,
            location = ?,
            note = ?,
            updated_at = ?
      WHERE id = ?;`,
    [
      input.name?.trim() ?? null,
      input.initials ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.location ?? null,
      input.note ?? null,
      nowISO(),
      id,
    ],
  );
}

export async function setArchived(id: ID, archived: boolean): Promise<void> {
  await runAsync(`UPDATE people SET archived = ?, updated_at = ? WHERE id = ?;`, [
    archived ? 1 : 0,
    nowISO(),
    id,
  ]);
}

/**
 * Delete a person. Cascades to their debts and those debts' payments.
 * Refuses while the person still has open debts so a mis-tap cannot silently
 * destroy a large ledger.
 */
export async function deletePerson(
  id: ID,
  options: { force?: boolean } = {},
): Promise<{ deleted: boolean; openDebts: number }> {
  const row = await getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM debts WHERE person_id = ? AND status = 'open';`,
    [id],
  );
  const openDebts = row?.n ?? 0;
  if (openDebts > 0 && !options.force) {
    return { deleted: false, openDebts };
  }
  await transaction(async () => {
    await runAsync(`DELETE FROM people WHERE id = ?;`, [id]);
  });
  return { deleted: true, openDebts };
}

/** People ranked by outstanding balance. Feeds the People tab ordering. */
export async function peopleWithBalances(): Promise<
  Array<Person & { openDebts: number; outstanding: number }>
> {
  const rows = await getAllAsync<Row & { openDebts: number; outstanding: number }>(
    `SELECT p.id, p.name, p.initials, p.phone, p.email, p.location, p.note, p.archived,
            p.created_at AS createdAt, p.updated_at AS updatedAt,
            COUNT(d.id) AS openDebts,
            COALESCE(SUM(MAX(d.principal - d.paid, 0)), 0) AS outstanding
       FROM people p
       LEFT JOIN debts d ON d.person_id = p.id AND d.status = 'open'
      WHERE p.archived = 0
      GROUP BY p.id
      ORDER BY outstanding DESC, p.name COLLATE NOCASE ASC;`,
  );
  return rows as unknown as Array<Person & { openDebts: number; outstanding: number }>;
}