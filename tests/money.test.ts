/**
 * Tests for the money layer.
 *
 * This is the highest-risk code in the project: a rounding error here quietly
 * corrupts a user's ledger. Run with `npm test`.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  currencyMeta,
  formatMoney,
  minorToInput,
  parseAmount,
  progress,
  remaining,
} from '../src/domain/money.ts';

describe('parseAmount', () => {
  it('converts a plain decimal to minor units', () => {
    assert.equal(parseAmount('100', 'LKR'), 10_000);
    assert.equal(parseAmount('100.50', 'LKR'), 10_050);
    assert.equal(parseAmount('0.01', 'LKR'), 1);
  });

  it('handles a zero-decimal currency', () => {
    assert.equal(parseAmount('1000', 'JPY'), 1000);
    // 1000.4 yen cannot be represented, so it rounds down to 1000.
    assert.equal(parseAmount('1000.4', 'JPY'), 1000);
  });

  it('strips currency symbols and grouping separators', () => {
    assert.equal(parseAmount('Rs 1,250.00', 'LKR'), 125_000);
    assert.equal(parseAmount('$45.99', 'USD'), 4599);
  });

  it('avoids floating-point dust', () => {
    // 19.99 * 100 === 1998.9999999999998 in raw floating point.
    assert.equal(parseAmount('19.99', 'LKR'), 1999);
    assert.equal(parseAmount('8.20', 'LKR'), 820);
    assert.equal(parseAmount('1.15', 'LKR'), 115);
  });

  it('rejects unusable input', () => {
    assert.equal(parseAmount('', 'LKR'), null);
    assert.equal(parseAmount('   ', 'LKR'), null);
    assert.equal(parseAmount('abc', 'LKR'), null);
    assert.equal(parseAmount('-', 'LKR'), null);
    assert.equal(parseAmount('.', 'LKR'), null);
  });

  it('accepts negative input so callers can decide', () => {
    assert.equal(parseAmount('-50.00', 'LKR'), -5000);
  });
});

describe('formatMoney', () => {
  it('renders minor units with the currency symbol', () => {
    assert.equal(formatMoney(125_000, 'LKR'), 'Rs 1,250.00');
    assert.equal(formatMoney(0, 'LKR'), 'Rs 0.00');
  });

  it('omits decimals for zero-decimal currencies', () => {
    assert.equal(formatMoney(1000, 'JPY'), '\u00A5 1,000');
  });

  it('groups thousands', () => {
    assert.equal(formatMoney(100_000_000, 'LKR'), 'Rs 1,000,000.00');
    assert.equal(formatMoney(999, 'USD'), '$ 9.99');
  });

  it('handles negatives', () => {
    assert.equal(formatMoney(-5000, 'LKR'), '-Rs 50.00');
  });

  it('renders compact form for stat tiles', () => {
    assert.equal(formatMoney(125_000, 'LKR', { compact: true }), 'Rs 1.3K');
    assert.equal(formatMoney(50_000_000, 'LKR', { compact: true }), 'Rs 500K');
    assert.equal(formatMoney(250_000_000, 'LKR', { compact: true }), 'Rs 2.5M');
  });

  it('falls back gracefully for unknown currencies', () => {
    assert.equal(currencyMeta('ZZZ').symbol, 'ZZZ');
    assert.equal(formatMoney(1000, 'ZZZ'), 'ZZZ 10.00');
    assert.equal(formatMoney(1000, undefined), formatMoney(1000, DEFAULT_CURRENCY));
  });

  it('survives non-finite input rather than printing NaN', () => {
    assert.equal(formatMoney(Number.NaN, 'LKR'), 'Rs 0.00');
    assert.equal(formatMoney(Number.POSITIVE_INFINITY, 'LKR'), 'Rs 0.00');
  });
});

describe('parseAmount / formatMoney round trip', () => {
  const cases = [
    '0.00',
    '0.01',
    '1.00',
    '9.99',
    '10.50',
    '99.99',
    '100.00',
    '1234.56',
    '9999.99',
    '100000.00',
  ];

  for (const code of ['LKR', 'USD', 'GBP']) {
    for (const input of cases) {
      it(`${code} ${input}`, () => {
        const minor = parseAmount(input, code);
        assert.ok(minor !== null, `${input} should parse`);
        assert.equal(minorToInput(minor, code), input);
      });
    }
  }
});

describe('remaining', () => {
  it('subtracts payments', () => {
    assert.equal(remaining(100_000, 0), 100_000);
    assert.equal(remaining(100_000, 25_000), 75_000);
    assert.equal(remaining(100_000, 100_000), 0);
  });

  it('never returns a negative balance', () => {
    // Overpayment must not produce a negative outstanding amount.
    assert.equal(remaining(100_000, 150_000), 0);
  });

  it('tolerates float noise from callers', () => {
    assert.equal(remaining(100.4, 0), 100);
    assert.equal(remaining(0.1 + 0.2, 0), 0);
  });
});

describe('progress', () => {
  it('reports a 0..1 ratio', () => {
    assert.equal(progress(100_000, 0), 0);
    assert.equal(progress(100_000, 50_000), 0.5);
    assert.equal(progress(100_000, 100_000), 1);
  });

  it('clamps outside the valid range', () => {
    assert.equal(progress(100_000, 150_000), 1);
    assert.equal(progress(100_000, -5000), 0);
    assert.equal(progress(0, 0), 1);
  });
});

describe('minorToInput', () => {
  it('renders a fixed decimal count', () => {
    assert.equal(minorToInput(5, 'LKR'), '0.05');
    assert.equal(minorToInput(123456, 'LKR'), '1234.56');
    assert.equal(minorToInput(1000, 'JPY'), '1000');
  });

  it('preserves the sign', () => {
    assert.equal(minorToInput(-5000, 'LKR'), '-50.00');
  });
});

describe('CURRENCIES', () => {
  it('defines valid metadata for every currency', () => {
    for (const [code, meta] of Object.entries(CURRENCIES)) {
      assert.equal(meta.code, code);
      assert.ok(meta.symbol.length > 0, `${code} needs a symbol`);
      assert.ok([0, 2, 3].includes(meta.decimals), `${code} has odd decimals`);
      assert.ok(meta.label.length > 0, `${code} needs a label`);
    }
  });
});