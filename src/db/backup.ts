/**
 * Backup format — pure, no database and no React.
 *
 * The backup file is the only copy of a user's ledger, so the format is
 * effectively a public API: it carries a `format` marker and a `version`, and
 * a future release must keep reading version 1 files.
 *
 * Amounts leave the app twice, deliberately:
 *   - `principal` / `paid` / `amount` are raw **integer minor units**, which is
 *     what makes this a true backup.
 *   - CSV adds *formatted* columns, which is what makes it a spreadsheet.
 *
 * Everything here is testable without a database or a device. The part that
 * writes to SQLite lives in `src/db/import.ts`.
 */

import type { Debt, Payment, Person } from '../types/index.ts';
import { formatMoney, remaining } from '../domain/money.ts';
import { CATEGORY_LABEL, debtState, DEBT_STATE_META } from '../domain/debt.ts';
import { formatDate } from '../utils/date.ts';
import {
  asBoolInt,
  asCategory,
  asDate,
  asDirection,
  asInteger,
  asMethod,
  asNullableDate,
  asString,
  isRecord,
} from './coerce.ts';

/** Bump only with a matching reader change. */
export const EXPORT_FORMAT = 'siyana-debts-export';
export const EXPORT_VERSION = 2;

export interface ExportPayload {
  app: string;
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  people: Person[];
  debts: Array<Debt & { outstanding: number }>;
  payments: Array<Payment & { debtId: string }>;
}

export function buildExport(
  people: Person[],
  debts: Array<Debt & { person: Person }>,
  payments: Array<Payment & { debtId: string }>,
): string {
  const payload: ExportPayload = {
    app: 'Siyana Debt Tracker',
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    people,
    debts: debts.map((debt) => {
      const { person, ...rest } = debt;
      void person;
      return { ...rest, outstanding: remaining(debt.principal, debt.paid) };
    }),
    payments,
  };
  return JSON.stringify(payload, null, 2);
}

/* ------------------------------------------------------------------ */
/* CSV — a view of the same data, for spreadsheets                     */
/* ------------------------------------------------------------------ */

const CSV_COLUMNS = [
  'Person',
  'Direction',
  'Category',
  'Principal',
  'Paid',
  'Outstanding',
  'Currency',
  'Issued',
  'Due',
  'State',
  'Note',
] as const;

export function exportToCsv(debts: Array<Debt & { person: Person }>): string {
  const rows = debts.map((debt) => {
    const state = debtState(debt);
    return [
      debt.person.name,
      debt.direction === 'lent' ? 'Lent' : 'Borrowed',
      CATEGORY_LABEL[debt.category],
      formatMoney(debt.principal, debt.currency, { showSymbol: false }),
      formatMoney(debt.paid, debt.currency, { showSymbol: false }),
      formatMoney(remaining(debt.principal, debt.paid), debt.currency, { showSymbol: false }),
      debt.currency,
      formatDate(debt.issuedAt),
      debt.dueAt ? formatDate(debt.dueAt) : '',
      DEBT_STATE_META[state].label,
      (debt.note ?? '').replace(/\s+/g, ' ').trim(),
    ].map(csvCell);
  });

  return [CSV_COLUMNS.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/** Quote a CSV cell if it contains a comma, quote, newline or leading space. */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value) || value !== value.trim()) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export interface ImportPreview {
  ok: boolean;
  /** User-facing reason the file was rejected. */
  error?: string;
  exportedAt?: string;
  version?: number;
  people: number;
  debts: number;
  payments: number;
}

/**
 * Parse and check a backup file.
 *
 * Pure and side-effect free, so the UI can show a preview — how many records,
 * from when — and refuse an unusable file *before* the user commits to
 * restoring anything. Nothing here touches the database.
 */
export function parseBackup(json: string): ImportPreview {
  const empty: ImportPreview = { ok: false, people: 0, debts: 0, payments: 0 };

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ...empty, error: 'That file is not valid JSON.' };
  }

  if (!isRecord(raw)) {
    return { ...empty, error: 'That file does not look like a backup.' };
  }

  if (raw.format !== EXPORT_FORMAT) {
    return { ...empty, error: 'That file was not exported by Siyana Debt Tracker.' };
  }

  const version = asInteger(raw.version, 0);
  if (version < 1 || version > EXPORT_VERSION) {
    return {
      ...empty,
      version,
      error:
        version > EXPORT_VERSION
          ? `That backup is from a newer version of the app. Update Siyana Debt Tracker and try again.`
          : 'That backup does not say which version it came from.',
    };
  }

  if (!Array.isArray(raw.people) || !Array.isArray(raw.debts)) {
    return { ...empty, version, error: 'That backup is missing its people or debts.' };
  }

  const people = raw.people.filter(
    (p) => isRecord(p) && asString(p.name).trim().length > 0,
  );
  if (people.length === 0) {
    return {
      ...empty,
      version,
      error: 'That backup contains no people, so there is nothing to restore.',
    };
  }

  // Payments were added in version 2; a v1 file legitimately carries none.
  const payments = Array.isArray(raw.payments) ? raw.payments.filter(isRecord) : [];

  return {
    ok: true,
    version,
    exportedAt: asString(raw.exportedAt) || undefined,
    people: people.length,
    debts: raw.debts.filter(isRecord).length,
    payments: payments.length,
  };
}