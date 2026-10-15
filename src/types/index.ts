/**
 * Core domain types.
 *
 * Money rule for the whole codebase: **never store money as a float.**
 * All amounts are integer counts of the currency's minor unit (e.g. cents,
 * or paisa for LKR). Formatting to a display string happens only at the edge,
 * in `src/utils/money.ts`.
 */

export type ID = string;

/** ISO-8601 timestamp, e.g. "2026-10-14T09:30:00.000Z". */
export type Timestamp = string;

/** ISO-8601 calendar date, e.g. "2026-10-14". */
export type DateOnly = string;

/**
 * Which way the debt points.
 * - `lent`     — you gave money to someone; they owe you.
 * - `borrowed` — you took money from someone; you owe them.
 */
export type DebtDirection = 'lent' | 'borrowed';

/** Lifecycle of a single debt. */
export type DebtStatus = 'open' | 'settled';

/** Broader bucket a debt can be filed under. */
export type DebtCategory =
  | 'general'
  | 'family'
  | 'friend'
  | 'work'
  | 'travel'
  | 'purchase'
  | 'loan'
  | 'other';

/** How a debt was settled. */
export type SettlementMethod = 'cash' | 'bank' | 'card' | 'cheque' | 'other';

export interface Person {
  id: ID;
  name: string;
  /** Optional short label shown on avatars. */
  initials?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Free-text address or location. */
  location?: string | null;
  note?: string | null;
  /** Archived people stay in history but drop out of pickers. */
  archived: 0 | 1;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Debt {
  id: ID;
  personId: ID;
  direction: DebtDirection;
  /** Original amount, in minor units. */
  principal: number;
  /** Sum of all payments, in minor units. Derived but denormalised for fast lists. */
  paid: number;
  currency: string;
  /** interestRate is a percentage stored with 2dp (e.g. 1.5% -> 150). */
  interestRate: number | null;
  category: DebtCategory;
  status: DebtStatus;
  note?: string | null;
  /** Date the debt was created / money changed hands. */
  issuedAt: DateOnly;
  /** Optional repayment deadline. null = no deadline. */
  dueAt: DateOnly | null;
  settledAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: ID;
  debtId: ID;
  /** Always a positive number of minor units. */
  amount: number;
  currency: string;
  method: SettlementMethod;
  note?: string | null;
  paidAt: DateOnly;
  createdAt: Timestamp;
}

export interface AppSettings {
  key: string;
  value: string;
}

export interface Settings {
  currency: string;
  /** 'system' | 'light' | 'dark' */
  themeMode: 'system' | 'light' | 'dark';
  /** Show home-screen widget reminders. */
  remindersEnabled: boolean;
  /** Days before due date to surface a "due soon" reminder. */
  dueSoonDays: number;
  /** Default settlement method. */
  defaultMethod: SettlementMethod;
  /** Backup the database to a file on manual request only (v1). */
  autoBackupEnabled: boolean;
}

/** A debt joined with its person — the shape every list screen consumes. */
export interface DebtWithPerson extends Debt {
  person: Person;
}

/** Aggregated figures for the dashboard. */
export interface DashboardSummary {
  lentTotal: number;
  borrowedTotal: number;
  /** lentTotal - borrowedTotal. Positive = net in your favour. */
  net: number;
  currency: string;
  openCount: number;
  overdueCount: number;
  settledCount: number;
  overdueTotal: number;
}