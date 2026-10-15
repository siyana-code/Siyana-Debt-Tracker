/**
 * Export serialisation.
 *
 * Amounts leave the app as *display strings*, never as raw integers, so a
 * spreadsheet shows "Rs 1,250.00" rather than "125000". The JSON export keeps
 * the raw minor units too, which is what makes it a true backup.
 */

import type { Debt, Person } from '../types';
import { formatMoney, remaining } from '../domain/money';
import { CATEGORY_LABEL, debtState, DEBT_STATE_META } from '../domain/debt';
import { formatDate } from '../utils/date';

export const EXPORT_VERSION = 1;

export function buildExport(people: Person[], debts: Array<Debt & { person: Person }>): string {
  const payload = {
    app: 'Siyana Debt Tracker',
    format: 'siyana-debts-export',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    people,
    debts: debts.map((debt) => ({
      ...debt,
      person: undefined,
      personId: debt.personId,
      outstanding: remaining(debt.principal, debt.paid),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

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