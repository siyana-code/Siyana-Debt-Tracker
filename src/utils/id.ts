/**
 * Local-only ID generation.
 *
 * No network, no server: IDs are random enough to be unique within one device
 * and sortable by creation time. `sortableId` prefixes a base36 timestamp so
 * that lexicographic ordering matches insertion order, which keeps SQLite
 * inserts cheap and list queries stable.
 */

import { nowISO } from './date';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomChars(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function sortableId(prefix = ''): string {
  const ts = Date.now().toString(36).padStart(9, '0');
  const rand = randomChars(6);
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`;
}

export const newPersonId = () => sortableId('per');
export const newDebtId = () => sortableId('dbt');
export const newPaymentId = () => sortableId('pay');

export { nowISO };