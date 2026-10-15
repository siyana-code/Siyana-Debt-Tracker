/**
 * Money utilities.
 *
 * Invariant: every amount crossing a boundary (DB, user input, export) is an
 * integer number of minor units. Floats only ever exist inside `parseAmount`,
 * and are immediately rounded back to an integer before being returned.
 */

export interface CurrencyMeta {
  code: string;
  symbol: string;
  /** Number of decimal places used by this currency. */
  decimals: number;
  label: string;
}

/** Currencies the app ships with. Users can add more in Settings. */
export const CURRENCIES: Record<string, CurrencyMeta> = {
  LKR: { code: 'LKR', symbol: 'Rs', decimals: 2, label: 'Sri Lankan Rupee' },
  USD: { code: 'USD', symbol: '$', decimals: 2, label: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '\u20AC', decimals: 2, label: 'Euro' },
  GBP: { code: 'GBP', symbol: '\u00A3', decimals: 2, label: 'British Pound' },
  INR: { code: 'INR', symbol: '\u20B9', decimals: 2, label: 'Indian Rupee' },
  JPY: { code: 'JPY', symbol: '\u00A5', decimals: 0, label: 'Japanese Yen' },
  AUD: { code: 'AUD', symbol: 'A$', decimals: 2, label: 'Australian Dollar' },
  CAD: { code: 'CAD', symbol: 'C$', decimals: 2, label: 'Canadian Dollar' },
};

export const DEFAULT_CURRENCY = 'LKR';

export function currencyMeta(code: string | undefined | null): CurrencyMeta {
  if (!code) return CURRENCIES[DEFAULT_CURRENCY];
  return CURRENCIES[code] ?? { code, symbol: code, decimals: 2, label: code };
}

const GROUP_SEPARATOR = ',';

/**
 * Format minor units for display.
 * `compact` renders 1_250_00 as "Rs 12.5K" for dense stat tiles.
 */
export function formatMoney(
  minor: number,
  code: string = DEFAULT_CURRENCY,
  options: { compact?: boolean; showSymbol?: boolean; showSign?: boolean } = {},
): string {
  const { compact = false, showSymbol = true, showSign = false } = options;
  const meta = currencyMeta(code);
  const safe = Number.isFinite(minor) ? Math.round(minor) : 0;
  const negative = safe < 0;
  const abs = Math.abs(safe);

  // A negative amount must always show its sign, otherwise a balance of -50 and
  // +50 render identically. `showSign` only adds an explicit "+" for positives.
  const sign = negative ? '-' : showSign ? '+' : '';

  if (compact) {
    return `${sign}${showSymbol ? `${meta.symbol} ` : ''}${formatCompact(abs, meta)}`;
  }

  const divisor = 10 ** meta.decimals;
  const whole = Math.floor(abs / divisor);
  const frac = abs % divisor;
  const body = `${groupDigits(whole)}${meta.decimals > 0 ? `.${String(frac).padStart(meta.decimals, '0')}` : ''}`;
  const prefix = showSymbol ? `${meta.symbol} ` : '';

  return `${sign}${prefix}${body}`;
}

function formatCompact(abs: number, meta: CurrencyMeta): string {
  const divisor = 10 ** meta.decimals;
  const major = abs / divisor;
  const units: Array<[number, string]> = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ];
  for (const [threshold, suffix] of units) {
    if (major >= threshold) {
      const scaled = major / threshold;
      const rounded = Math.round(scaled * 10) / 10;
      return `${trimZero(rounded)}${suffix}`;
    }
  }
  return groupDigits(abs < divisor ? abs : Math.floor(major));
}

function trimZero(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function groupDigits(value: number): string {
  const s = String(value);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += GROUP_SEPARATOR;
    out += s[i];
  }
  return out;
}

/**
 * Parse user input ("1,250.50", "Rs 500", "-20") into minor units.
 * Returns `null` when the text is not a usable amount.
 */
export function parseAmount(
  input: string,
  code: string = DEFAULT_CURRENCY,
): number | null {
  if (typeof input !== 'string') return null;
  const meta = currencyMeta(code);
  const cleaned = input.replace(/[^\d.,-]/g, '').replace(/,/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;

  const scaled = value * 10 ** meta.decimals;
  // Guard against float dust like 19.99 * 100 === 1998.9999999999998
  return Math.round(scaled);
}

/** Minor units -> plain decimal string, for text inputs that edit an amount. */
export function minorToInput(minor: number, code: string = DEFAULT_CURRENCY): string {
  const meta = currencyMeta(code);
  const divisor = 10 ** meta.decimals;
  const safe = Number.isFinite(minor) ? Math.round(minor) : 0;
  const negative = safe < 0;
  const abs = Math.abs(safe);
  const whole = Math.floor(abs / divisor);
  const frac = abs % divisor;
  return `${negative ? '-' : ''}${whole}${meta.decimals > 0 ? `.${String(frac).padStart(meta.decimals, '0')}` : ''}`;
}

/** Still outstanding on a debt = principal - paid, floored at zero. */
export function remaining(principal: number, paid: number): number {
  return Math.max(0, Math.round(principal) - Math.round(paid));
}

/** 0..1 progress toward settlement. */
export function progress(principal: number, paid: number): number {
  if (principal <= 0) return 1;
  const value = Math.min(1, Math.max(0, Math.round(paid) / principal));
  return Math.round(value * 1000) / 1000;
}

export const money = {
  formatMoney,
  parseAmount,
  minorToInput,
  remaining,
  progress,
  currencyMeta,
  CURRENCIES,
  DEFAULT_CURRENCY,
};

export default money;