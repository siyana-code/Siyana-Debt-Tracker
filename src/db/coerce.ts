/**
 * Defensive coercion helpers for reading a backup file.
 *
 * A backup file may be hand-edited, truncated, or produced by an older build.
 * Every value read out of one passes through here, so a wrong type becomes a
 * sane default instead of a crash halfway through a restore.
 *
 * Kept separate and dependency-free so both `backup.ts` (format) and
 * `import.ts` (restore) can use it without pulling in the database.
 */

import type { DebtCategory, DebtDirection, SettlementMethod } from '../types/index.ts';

const CATEGORIES: ReadonlySet<string> = new Set<DebtCategory>([
  'general',
  'family',
  'friend',
  'work',
  'travel',
  'purchase',
  'loan',
  'other',
]);

const METHODS: ReadonlySet<string> = new Set<SettlementMethod>([
  'cash',
  'bank',
  'card',
  'cheque',
  'other',
]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asInteger(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export function asBoolInt(value: unknown): 0 | 1 {
  return value === 1 || value === true ? 1 : 0;
}

export function asCategory(value: unknown): DebtCategory {
  return typeof value === 'string' && CATEGORIES.has(value)
    ? (value as DebtCategory)
    : 'general';
}

export function asDirection(value: unknown): DebtDirection {
  return value === 'borrowed' ? 'borrowed' : 'lent';
}

export function asMethod(value: unknown): SettlementMethod {
  return typeof value === 'string' && METHODS.has(value)
    ? (value as SettlementMethod)
    : 'cash';
}

/** A calendar date, or `fallback` when the value is absent or malformed. */
export function asDate(value: unknown, fallback: string): string {
  return typeof value === 'string' && DATE_PATTERN.test(value) ? value : fallback;
}

/** An optional calendar date; anything malformed becomes "no date". */
export function asNullableDate(value: unknown): string | null {
  return typeof value === 'string' && DATE_PATTERN.test(value) ? value : null;
}

/** Optional free text: empty strings collapse to null rather than ''. */
export function asOptionalText(value: unknown): string | null {
  if (value == null) return null;
  return asString(value) || null;
}