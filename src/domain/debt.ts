import type { Ionicons } from '@expo/vector-icons';

import type {
  DashboardSummary,
  Debt,
  DebtCategory,
  DebtDirection,
  DebtWithPerson,
  Person,
  DateOnly,
} from '../types/index.ts';
import { daysBetween, todayISO } from '../utils/date.ts';
import { remaining } from './money.ts';

type Glyph = keyof typeof Ionicons.glyphMap;

/**
 * Direction is expressed by arrow shape and never by colour — see
 * docs/06-design-system.md § 5.2. Money leaving you points up; money coming in
 * points down.
 */
export const DIRECTION_ICON: Record<DebtDirection, Glyph> = {
  lent: 'arrow-up',
  borrowed: 'arrow-down',
};

export const DIRECTION_LABEL: Record<DebtDirection, string> = {
  lent: 'Lent',
  borrowed: 'Borrowed',
};

/** Longer phrasing for screens with room to explain. */
export const DIRECTION_PHRASE: Record<DebtDirection, string> = {
  lent: 'They owe you',
  borrowed: 'You owe them',
};

export const DEBT_CATEGORIES: ReadonlyArray<{
  key: DebtCategory;
  icon: Glyph;
  label: string;
}> = [
  { key: 'general', icon: 'bookmark-outline', label: 'General' },
  { key: 'family', icon: 'home-outline', label: 'Family' },
  { key: 'friend', icon: 'people-outline', label: 'Friend' },
  { key: 'work', icon: 'briefcase-outline', label: 'Work' },
  { key: 'travel', icon: 'airplane-outline', label: 'Travel' },
  { key: 'purchase', icon: 'cart-outline', label: 'Purchase' },
  { key: 'loan', icon: 'cash-outline', label: 'Loan' },
  { key: 'other', icon: 'ellipsis-horizontal', label: 'Other' },
];

export const CATEGORY_LABEL: Record<DebtCategory, string> = DEBT_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.label }),
  {} as Record<DebtCategory, string>,
);

export const CATEGORY_ICON: Record<DebtCategory, Glyph> = DEBT_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.icon }),
  {} as Record<DebtCategory, string> as Record<DebtCategory, Glyph>,
);

/** Derived lifecycle state used for badge colour and icon. */
export type DebtState = 'settled' | 'overdue' | 'dueSoon' | 'partial' | 'open';

export function debtState(
  debt: Pick<Debt, 'status' | 'dueAt' | 'principal' | 'paid'>,
  today: DateOnly = todayISO(),
  dueSoonDays = 3,
): DebtState {
  if (debt.status === 'settled' || remaining(debt.principal, debt.paid) === 0) {
    return 'settled';
  }
  if (debt.dueAt) {
    if (debt.dueAt < today) return 'overdue';
    const diff = daysBetween(today, debt.dueAt);
    if (diff <= dueSoonDays) return 'dueSoon';
  }
  if (debt.paid > 0) return 'partial';
  return 'open';
}

export const DEBT_STATE_META: Record<
  DebtState,
  { label: string; icon: Glyph; tone: 'primary' | 'overdue' | 'partial' | 'muted' }
> = {
  settled: { label: 'Settled', icon: 'checkmark-circle', tone: 'muted' },
  overdue: { label: 'Overdue', icon: 'alert-circle', tone: 'overdue' },
  dueSoon: { label: 'Due soon', icon: 'time', tone: 'partial' },
  partial: { label: 'Part paid', icon: 'pie-chart', tone: 'partial' },
  open: { label: 'Open', icon: 'ellipse-outline', tone: 'primary' },
};

export function personInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable per-person avatar hue, chosen from the brand's own accent family. */
export function avatarTint(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const palette = ['#3484F0', '#2A6FD1', '#5AA0F4', '#757575', '#4D4D4D', '#1B5FA8'];
  return palette[hash % palette.length];
}

export function summarise(
  debts: DebtWithPerson[],
  currency: string,
  today: DateOnly = todayISO(),
): DashboardSummary {
  let lentTotal = 0;
  let borrowedTotal = 0;
  let overdueTotal = 0;
  let openCount = 0;
  let overdueCount = 0;
  let settledCount = 0;

  for (const debt of debts) {
    const outstanding = remaining(debt.principal, debt.paid);
    if (debt.direction === 'lent') lentTotal += outstanding;
    else borrowedTotal += outstanding;

    if (outstanding === 0) {
      settledCount += 1;
      continue;
    }
    openCount += 1;
    if (debt.dueAt && debt.dueAt < today) {
      overdueCount += 1;
      overdueTotal += outstanding;
    }
  }

  return {
    lentTotal,
    borrowedTotal,
    net: lentTotal - borrowedTotal,
    currency,
    openCount,
    overdueCount,
    settledCount,
    overdueTotal,
  };
}

export function sortDebts(debts: DebtWithPerson[], today: DateOnly = todayISO()): DebtWithPerson[] {
  const rank: Record<DebtState, number> = { overdue: 0, dueSoon: 1, open: 2, partial: 3, settled: 4 };
  return [...debts].sort((a, b) => {
    const sa = rank[debtState(a, today)];
    const sb = rank[debtState(b, today)];
    if (sa !== sb) return sa - sb;
    // Within a bucket, soonest due date first, then most recently issued.
    if (a.dueAt && b.dueAt && a.dueAt !== b.dueAt) return a.dueAt < b.dueAt ? -1 : 1;
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;
    return a.issuedAt < b.issuedAt ? 1 : -1;
  });
}

export function filterDebts(
  debts: DebtWithPerson[],
  query: string,
  direction: DebtDirection | 'all',
  category: DebtCategory | 'all',
  state: DebtState | 'all' | 'open',
  today: DateOnly = todayISO(),
): DebtWithPerson[] {
  const q = query.trim().toLowerCase();
  return debts.filter((debt) => {
    if (direction !== 'all' && debt.direction !== direction) return false;
    if (category !== 'all' && debt.category !== category) return false;
    const s = debtState(debt, today);
    if (state === 'open' && s === 'settled') return false;
    if (state !== 'all' && state !== 'open' && s !== state) return false;
    if (!q) return true;
    return (
      debt.person.name.toLowerCase().includes(q) ||
      (debt.note ?? '').toLowerCase().includes(q) ||
      CATEGORY_LABEL[debt.category].toLowerCase().includes(q)
    );
  });
}

/** Build a full-text-ish search over people. */
export function filterPeople(people: Person[], query: string): Person[] {
  const q = query.trim().toLowerCase();
  const list = people.filter((p) => !p.archived);
  if (!q) return list.sort((a, b) => a.name.localeCompare(b.name));
  return list
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? '').toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}