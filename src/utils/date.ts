/** Date helpers. The app stores calendar dates as "YYYY-MM-DD" strings. */

const MS_PER_DAY = 86_400_000;

export type DateOnly = string;

/** Local-time YYYY-MM-DD for a Date (avoids the UTC shift of toISOString). */
export function toDateOnly(date: Date): DateOnly {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): DateOnly {
  return toDateOnly(new Date());
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Parse "YYYY-MM-DD" into a local Date at midnight. */
export function fromDateOnly(value: DateOnly): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(value: DateOnly, days: number): DateOnly {
  const date = fromDateOnly(value);
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
}

export function addMonths(value: DateOnly, months: number): DateOnly {
  const date = fromDateOnly(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  // Clamp: 31 Jan + 1 month => 28/29 Feb, not 3 Mar.
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toDateOnly(date);
}

/** Whole days from `from` to `to`. Positive when `to` is in the future. */
export function daysBetween(from: DateOnly, to: DateOnly): number {
  return Math.round((fromDateOnly(to).getTime() - fromDateOnly(from).getTime()) / MS_PER_DAY);
}

/** True when `date` is strictly before `today`. */
export function isOverdue(date: DateOnly | null | undefined, today: DateOnly = todayISO()): boolean {
  return !!date && date < today;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "14 Oct 2026" — unambiguous and short. */
export function formatDate(value: DateOnly | null | undefined): string {
  if (!value) return '--';
  const d = fromDateOnly(value);
  if (Number.isNaN(d.getTime())) return '--';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Today", "Tomorrow", "in 3 days", "5 days ago", then falls back to formatDate. */
export function formatRelativeDue(
  value: DateOnly | null | undefined,
  today: DateOnly = todayISO(),
): string {
  if (!value) return 'No due date';
  const diff = daysBetween(today, value);
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff === -1) return '1 day overdue';
  if (diff > 1 && diff <= 30) return `in ${diff} days`;
  if (diff < -1 && diff >= -30) return `${Math.abs(diff)} days overdue`;
  return formatDate(value);
}

/** "Today", "Yesterday", or formatDate — used for activity lists. */
export function formatFriendlyDate(value: DateOnly | null | undefined, today: DateOnly = todayISO()): string {
  if (!value) return '--';
  const diff = daysBetween(value, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  return formatDate(value);
}

/** Calendar grid for the date picker fallback on web. */
export function calendarDays(year: number, monthIndex: number): Array<DateOnly | null> {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  // JS weeks start Sunday; shift so Monday is first.
  const lead = (first.getDay() + 6) % 7;
  const cells: Array<DateOnly | null> = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toDateOnly(new Date(year, monthIndex, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}