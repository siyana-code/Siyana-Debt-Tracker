/**
 * Tests for date handling.
 *
 * The recurring trap here is UTC versus local time. `toISOString()` returns the
 * UTC date, so a user in Colombo at 22:00 would get *tomorrow's* date — which
 * would make debts appear overdue a day early.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  addDays,
  addMonths,
  calendarDays,
  daysBetween,
  formatDate,
  formatFriendlyDate,
  formatRelativeDue,
  fromDateOnly,
  isOverdue,
  toDateOnly,
  todayISO,
} from '../src/utils/date.ts';

describe('toDateOnly', () => {
  it('uses local calendar fields, not UTC', () => {
    // 31 December at 23:30 local. toISOString() would roll this to the next year.
    const late = new Date(2025, 11, 31, 23, 30, 0);
    assert.equal(toDateOnly(late), '2025-12-31');
  });

  it('pads single-digit months and days', () => {
    assert.equal(toDateOnly(new Date(2026, 0, 5)), '2026-01-05');
    assert.equal(toDateOnly(new Date(2026, 8, 9)), '2026-09-09');
  });

  it('round-trips through fromDateOnly', () => {
    for (const value of ['2026-01-01', '2026-06-15', '2026-12-31', '2024-02-29']) {
      assert.equal(toDateOnly(fromDateOnly(value)), value);
    }
  });
});

describe('fromDateOnly', () => {
  it('parses to local midnight, not UTC midnight', () => {
    const d = fromDateOnly('2026-06-15');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 5);
    assert.equal(d.getDate(), 15);
    assert.equal(d.getHours(), 0);
  });

  it('tolerates a malformed value without throwing', () => {
    assert.equal(Number.isNaN(fromDateOnly('not-a-date').getTime()), true);
  });
});

describe('addDays', () => {
  it('moves forward and backward', () => {
    assert.equal(addDays('2026-01-15', 7), '2026-01-22');
    assert.equal(addDays('2026-01-15', -7), '2026-01-08');
    assert.equal(addDays('2026-01-15', 0), '2026-01-15');
  });

  it('crosses month and year boundaries', () => {
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  it('handles a leap year', () => {
    assert.equal(addDays('2024-02-28', 1), '2024-02-29');
    assert.equal(addDays('2024-02-29', 1), '2024-03-01');
    // 2026 is not a leap year.
    assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  });
});

describe('addMonths', () => {
  it('clamps to the last valid day instead of overflowing', () => {
    // 31 January + 1 month must be 28 February, never 3 March.
    assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
    assert.equal(addMonths('2024-01-31', 1), '2024-02-29'); // leap year
    assert.equal(addMonths('2026-03-31', 1), '2026-04-30');
  });

  it('crosses a year boundary', () => {
    assert.equal(addMonths('2026-11-15', 3), '2027-02-15');
    assert.equal(addMonths('2026-01-15', -1), '2025-12-15');
  });

  it('leaves mid-month dates untouched', () => {
    assert.equal(addMonths('2026-06-15', 1), '2026-07-15');
  });
});

describe('daysBetween', () => {
  it('is positive in the future and negative in the past', () => {
    assert.equal(daysBetween('2026-06-15', '2026-06-20'), 5);
    assert.equal(daysBetween('2026-06-20', '2026-06-15'), -5);
    assert.equal(daysBetween('2026-06-15', '2026-06-15'), 0);
  });

  it('spans month, year and DST boundaries without drift', () => {
    assert.equal(daysBetween('2026-01-01', '2027-01-01'), 365);
    assert.equal(daysBetween('2024-01-01', '2025-01-01'), 366); // leap year
    assert.equal(daysBetween('2026-03-01', '2026-04-01'), 31);
  });
});

describe('isOverdue', () => {
  it('is true only for a strictly earlier date', () => {
    assert.equal(isOverdue('2026-06-14', '2026-06-15'), true);
    assert.equal(isOverdue('2026-06-15', '2026-06-15'), false);
    assert.equal(isOverdue('2026-06-16', '2026-06-15'), false);
  });

  it('treats a missing due date as not overdue', () => {
    assert.equal(isOverdue(null, '2026-06-15'), false);
    assert.equal(isOverdue(undefined, '2026-06-15'), false);
  });
});

describe('formatDate', () => {
  it('renders an unambiguous short form', () => {
    assert.equal(formatDate('2026-06-15'), '15 Jun 2026');
    assert.equal(formatDate('2026-01-05'), '5 Jan 2026');
  });

  it('renders a placeholder for missing or invalid input', () => {
    assert.equal(formatDate(null), '--');
    assert.equal(formatDate(undefined), '--');
    assert.equal(formatDate('rubbish'), '--');
  });
});

describe('formatRelativeDue', () => {
  const today = '2026-06-15';

  it('names the immediate cases', () => {
    assert.equal(formatRelativeDue(today, today), 'Due today');
    assert.equal(formatRelativeDue('2026-06-16', today), 'Due tomorrow');
    assert.equal(formatRelativeDue('2026-06-14', today), '1 day overdue');
  });

  it('counts days within the month window', () => {
    assert.equal(formatRelativeDue('2026-06-18', today), 'in 3 days');
    assert.equal(formatRelativeDue('2026-06-12', today), '3 days overdue');
  });

  it('falls back to an absolute date outside the window', () => {
    assert.equal(formatRelativeDue('2026-07-20', today), '20 Jul 2026');
    assert.equal(formatRelativeDue('2026-05-01', today), '1 May 2026');
  });

  it('handles a missing due date', () => {
    assert.equal(formatRelativeDue(null, today), 'No due date');
  });
});

describe('formatFriendlyDate', () => {
  const today = '2026-06-15';

  it('names today, yesterday and tomorrow', () => {
    assert.equal(formatFriendlyDate(today, today), 'Today');
    assert.equal(formatFriendlyDate('2026-06-14', today), 'Yesterday');
    assert.equal(formatFriendlyDate('2026-06-16', today), 'Tomorrow');
  });

  it('falls back to an absolute date', () => {
    assert.equal(formatFriendlyDate('2026-06-01', today), '1 Jun 2026');
  });
});

describe('calendarDays', () => {
  it('produces whole weeks starting on Monday', () => {
    for (const [year, month] of [
      [2026, 0], [2026, 5], [2026, 11], [2024, 1],
    ]) {
      const cells = calendarDays(year, month);
      assert.equal(cells.length % 7, 0, 'grid must be whole weeks');
      const blanks = cells.filter((c) => c === null).length;
      assert.ok(blanks <= 6, 'leading blanks must be under a week');
    }
  });

  it('contains every day of the month', () => {
    const cells = calendarDays(2026, 1).filter(Boolean) as string[];
    assert.equal(cells.length, 28);
    assert.equal(cells[0], '2026-02-01');
    assert.equal(cells[27], '2026-02-28');
  });
});

describe('todayISO', () => {
  it('returns a well-formed local date', () => {
    assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
  });
});