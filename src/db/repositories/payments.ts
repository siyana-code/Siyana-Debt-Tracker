/**
 * Payment repository.
 *
 * Payments are append-only. Adding one updates the parent debt's denormalised
 * `paid` column and `status` in the same transaction, so the list queries never
 * have to aggregate on read.
 */

import { getAllAsync, runAsync, transaction } from '../index';
import { nowISO } from '../../utils/date';
import { newPaymentId } from '../../utils/id';
import { remaining } from '../../domain/money';
import type { ID, Payment, SettlementMethod } from '../../types';

const SELECT = `
  SELECT id, debt_id AS debtId, amount, currency, method, note,
         paid_at AS paidAt, created_at AS createdAt
    FROM payments`;

interface Row {
  id: string;
  debtId: string;
  amount: number;
  currency: string;
  method: SettlementMethod;
  note: string | null;
  paidAt: string;
  createdAt: string;
}

export async function listPayments(debtId: ID): Promise<Payment[]> {
  return getAllAsync<Row>(`${SELECT} WHERE debt_id = ? ORDER BY paid_at DESC, created_at DESC;`, [
    debtId,
  ]);
}

export interface PaymentInput {
  debtId: ID;
  amount: number;
  currency: string;
  method?: SettlementMethod;
  note?: string | null;
  paidAt: string;
}

export interface RecordPaymentResult {
  payment: Payment;
  /** Outstanding after this payment. 0 means the debt is now settled. */
  remaining: number;
  settled: boolean;
}

export async function recordPayment(input: PaymentInput): Promise<RecordPaymentResult> {
  const amount = Math.round(input.amount);
  if (amount <= 0) throw new Error('Payment amount must be greater than zero');

  return transaction(async () => {
    // Read inside the transaction so the balance we update is the balance we
    // saw. No nested transaction here — the outer one already covers it.
    const debtRows = await getAllAsync<{ principal: number; paid: number; status: string }>(
      `SELECT principal, paid, status FROM debts WHERE id = ? LIMIT 1;`,
      [input.debtId],
    );
    const debt = debtRows[0] ?? null;

    if (!debt) throw new Error('Debt not found');

    const id = newPaymentId();
    const ts = nowISO();

    await runAsync(
      `INSERT INTO payments (id, debt_id, amount, currency, method, note, paid_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, input.debtId, amount, input.currency, input.method ?? 'cash', input.note ?? null, input.paidAt, ts],
    );

    const newPaid = debt.paid + amount;
    // Overpayment is clamped at the principal so `paid` can never exceed the
    // amount owed; the payment row keeps the real figure for the audit trail.
    const clamped = Math.min(newPaid, debt.principal);
    const settled = clamped >= debt.principal;
    const ts2 = nowISO();

    await runAsync(
      `UPDATE debts SET paid = ?, status = ?, settled_at = ?, updated_at = ? WHERE id = ?;`,
      [clamped, settled ? 'settled' : 'open', settled ? ts2 : null, ts2, input.debtId],
    );

    const rows = await getAllAsync<Row>(`${SELECT} WHERE id = ? LIMIT 1;`, [id]);
    return {
      payment: rows[0] as unknown as Payment,
      remaining: remaining(debt.principal, clamped),
      settled,
    };
  });
}

export async function deletePayment(id: ID): Promise<void> {
  await transaction(async () => {
    const rows = await getAllAsync<{ debtId: string; amount: number }>(
      `SELECT debt_id AS debtId, amount FROM payments WHERE id = ? LIMIT 1;`,
      [id],
    );
    const payment = rows[0];
    if (!payment) return;

    await runAsync(`DELETE FROM payments WHERE id = ?;`, [id]);

    const debtRows = await getAllAsync<{ principal: number; paid: number }>(
      `SELECT principal, paid FROM debts WHERE id = ? LIMIT 1;`,
      [payment.debtId],
    );
    const debt = debtRows[0];
    if (!debt) return;

    const newPaid = Math.max(0, debt.paid - payment.amount);
    const settled = debt.principal > 0 && newPaid >= debt.principal;
    await runAsync(
      `UPDATE debts SET paid = ?, status = ?, settled_at = ?, updated_at = ? WHERE id = ?;`,
      [newPaid, settled ? 'settled' : 'open', settled ? nowISO() : null, nowISO(), payment.debtId],
    );
  });
}