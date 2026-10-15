/**
 * Tests for debt state derivation, filtering, sorting and aggregation.
 *
 * `debtState` drives what the user sees as "overdue" or "settled". Getting it
 * wrong either cries wolf or misses a real overdue debt, so every combination
 * is pinned down here.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  CATEGORY_LABEL,
  avatarTint,
  debtState,
  filterDebts,
  filterPeople,
  personInitials,
  sortDebts,
  summarise,
} from '../src/domain/debt.ts';
import type { Debt, DebtWithPerson, Person } from '../src/types/index.ts';

const TODAY = '2026-06-15';

function person(name: string, id = `per_${name}`): Person {
  return {
    id,
    name,
    initials: null,
    phone: null,
    email: null,
    location: null,
    note: null,
    archived: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function debt(overrides: Partial<DebtWithPerson> = {}): DebtWithPerson {
  return {
    id: 'dbt_test',
    personId: 'per_test',
    direction: 'lent',
    principal: 100_00,
    paid: 0,
    currency: 'LKR',
    interestRate: null,
    category: 'general',
    status: 'open',
    note: null,
    issuedAt: '2026-06-01',
    dueAt: null,
    settledAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    person: person('Test'),
    ...overrides,
  } as DebtWithPerson;
}

describe('debtState', () => {
  it('reports settled when the status says so', () => {
    assert.equal(debtState(debt({ status: 'settled' }), TODAY), 'settled');
  });

  it('reports settled when the balance reaches zero even if status is stale', () => {
    // A debt fully paid by payments must never still read as open.
    assert.equal(debtState(debt({ paid: 100_00 }), TODAY), 'settled');
    assert.equal(debtState(debt({ paid: 150_00 }), TODAY), 'settled');
  });

  it('reports overdue past the due date with money outstanding', () => {
    assert.equal(debtState(debt({ dueAt: '2026-06-14' }), TODAY), 'overdue');
  });

  it('does not report overdue on the due date itself', () => {
    // Due today means due today, not late.
    assert.equal(debtState(debt({ dueAt: '2026-06-15' }), TODAY), 'dueSoon');
  });

  it('reports dueSoon inside the configured window', () => {
    assert.equal(debtState(debt({ dueAt: '2026-06-16' }), TODAY, 3), 'dueSoon');
    assert.equal(debtState(debt({ dueAt: '2026-06-18' }), TODAY, 3), 'dueSoon');
    assert.equal(debtState(debt({ dueAt: '2026-06-25' }), TODAY, 3), 'open');
  });

  it('reports partial when some but not all is paid', () => {
    assert.equal(debtState(debt({ paid: 40_00 }), TODAY), 'partial');
  });

  it('reports open for an unpaid debt with no due date', () => {
    assert.equal(debtState(debt(), TODAY), 'open');
  });

  it('never reports overdue for a settled debt', () => {
    // Overdue must lose to settled, whatever the dates say.
    assert.equal(
      debtState(debt({ status: 'settled', dueAt: '2020-01-01' }), TODAY),
      'settled',
    );
  });

  it('treats a missing due date as not due', () => {
    assert.equal(debtState(debt({ dueAt: null }), TODAY), 'open');
  });
});

describe('sortDebts', () => {
  it('puts what needs attention first', () => {
    const list = [
      debt({ id: 'a', status: 'settled', paid: 100_00 }),
      debt({ id: 'b' }),
      debt({ id: 'c', paid: 50_00 }),
      debt({ id: 'd', dueAt: '2026-06-01' }),
      debt({ id: 'e', dueAt: '2026-06-16' }),
    ];
    const order = sortDebts(list, TODAY).map((d) => d.id);
    assert.deepEqual(order, ['d', 'e', 'b', 'c', 'a']);
  });

  it('breaks ties on the soonest due date', () => {
    const list = [
      debt({ id: 'later', dueAt: '2026-06-20' }),
      debt({ id: 'sooner', dueAt: '2026-06-02' }),
    ];
    assert.equal(sortDebts(list, TODAY)[0].id, 'sooner');
  });

  it('puts debts without a due date last within their bucket', () => {
    const list = [debt({ id: 'none', dueAt: null }), debt({ id: 'dated', dueAt: '2026-06-16' })];
    assert.equal(sortDebts(list, TODAY)[0].id, 'dated');
  });

  it('does not mutate the input array', () => {
    const list = [debt({ id: 'a' }), debt({ id: 'b', status: 'settled', paid: 100_00 })];
    const before = list.map((d) => d.id);
    sortDebts(list, TODAY);
    assert.deepEqual(list.map((d) => d.id), before);
  });
});

describe('filterDebts', () => {
  const list = [
    debt({ id: '1', direction: 'lent', category: 'family', note: 'bike' }),
    debt({ id: '2', direction: 'borrowed', category: 'work', note: 'lunch' }),
    debt({ id: '3', direction: 'lent', category: 'work', person: person('Nuwan', 'per_n') }),
  ];

  it('filters by direction', () => {
    const lent = filterDebts(list, '', 'lent', 'all', 'all', TODAY);
    assert.deepEqual(lent.map((d) => d.id), ['1', '3']);
  });

  it('filters by category', () => {
    const work = filterDebts(list, '', 'all', 'work', 'all', TODAY);
    assert.deepEqual(work.map((d) => d.id).sort(), ['2', '3']);
  });

  it('filters by open state', () => {
    const open = filterDebts(list, '', 'all', 'all', 'open', TODAY);
    assert.equal(open.length, 3);
  });

  it('searches person name, note and category', () => {
    assert.equal(filterDebts(list, 'nuwan', 'all', 'all', 'all', TODAY).length, 1);
    assert.equal(filterDebts(list, 'BIKE', 'all', 'all', 'all', TODAY).length, 1);
    assert.equal(filterDebts(list, 'family', 'all', 'all', 'all', TODAY).length, 1);
  });

  it('combines filters', () => {
    const result = filterDebts(list, '', 'lent', 'work', 'all', TODAY);
    assert.deepEqual(result.map((d) => d.id), ['3']);
  });

  it('returns nothing for a query that matches nothing', () => {
    assert.equal(filterDebts(list, 'zzzz', 'all', 'all', 'all', TODAY).length, 0);
  });
});

describe('summarise', () => {
  it('nets lent against borrowed', () => {
    const result = summarise(
      [
        debt({ id: '1', direction: 'lent', principal: 500_00 }),
        debt({ id: '2', direction: 'borrowed', principal: 200_00 }),
      ],
      'LKR',
      TODAY,
    );
    assert.equal(result.lentTotal, 500_00);
    assert.equal(result.borrowedTotal, 200_00);
    assert.equal(result.net, 300_00);
    assert.equal(result.openCount, 2);
  });

  it('counts only the outstanding balance, not the principal', () => {
    const result = summarise(
      [debt({ direction: 'lent', principal: 1000_00, paid: 400_00 })],
      'LKR',
      TODAY,
    );
    assert.equal(result.lentTotal, 600_00);
  });

  it('treats a fully paid debt as settled and out of the balance', () => {
    const result = summarise(
      [debt({ direction: 'lent', principal: 1000_00, paid: 1000_00, status: 'settled' })],
      'LKR',
      TODAY,
    );
    assert.equal(result.lentTotal, 0);
    assert.equal(result.settledCount, 1);
    assert.equal(result.openCount, 0);
  });

  it('counts overdue debts and their total', () => {
    const result = summarise(
      [
        debt({ id: '1', direction: 'lent', principal: 100_00, dueAt: '2026-06-01' }),
        debt({ id: '2', direction: 'lent', principal: 50_00, dueAt: '2026-06-14' }),
        debt({ id: '3', direction: 'lent', principal: 70_00, dueAt: '2026-06-30' }),
      ],
      'LKR',
      TODAY,
    );
    assert.equal(result.overdueCount, 2);
    assert.equal(result.overdueTotal, 150_00);
    assert.equal(result.openCount, 3);
  });

  it('handles an empty ledger', () => {
    const result = summarise([], 'LKR', TODAY);
    assert.equal(result.net, 0);
    assert.equal(result.openCount, 0);
    assert.equal(result.settledCount, 0);
  });
});

describe('personInitials', () => {
  it('handles the usual name shapes', () => {
    assert.equal(personInitials('Nuwan Perera'), 'NP');
    assert.equal(personInitials('Kamal'), 'KA');
    assert.equal(personInitials('Rasindu Appuhami'), 'RA');
  });

  it('handles a single letter and missing input', () => {
    assert.equal(personInitials('X'), 'X');
    assert.equal(personInitials(''), '?');
    assert.equal(personInitials(null), '?');
    assert.equal(personInitials(undefined), '?');
    assert.equal(personInitials('   '), '?');
  });
});

describe('avatarTint', () => {
  it('is stable for the same id', () => {
    assert.equal(avatarTint('per_abc'), avatarTint('per_abc'));
  });

  it('differs across different ids', () => {
    const tints = new Set(
      Array.from({ length: 50 }, (_, i) => avatarTint(`per_${i}`)),
    );
    assert.ok(tints.size > 1, 'tints must vary between people');
  });
});

describe('filterPeople', () => {
  const people = [
    { ...person('Nuwan Perera', 'p1'), phone: '0771234567' },
    { ...person('Amara Silva', 'p2'), email: 'amara@example.com' },
    { ...person('Hidden Person', 'p3'), archived: 1 as const },
  ];

  it('hides archived people by default', () => {
    assert.deepEqual(filterPeople(people, '').map((p) => p.name), ['Amara Silva', 'Nuwan Perera']);
  });

  it('searches name, phone and email', () => {
    assert.equal(filterPeople(people, 'nuwan').length, 1);
    assert.equal(filterPeople(people, '0771').length, 1);
    assert.equal(filterPeople(people, 'amara@').length, 1);
  });

  it('never surfaces an archived person through search', () => {
    assert.equal(filterPeople(people, 'hidden').length, 0);
  });

  it('sorts alphabetically by default', () => {
    assert.deepEqual(filterPeople(people, '').map((p) => p.name), ['Amara Silva', 'Nuwan Perera']);
  });
});

describe('CATEGORY_LABEL', () => {
  it('labels every category', () => {
    for (const key of ['general', 'family', 'friend', 'work', 'travel', 'purchase', 'loan', 'other'] as const) {
      assert.ok(CATEGORY_LABEL[key], `${key} needs a label`);
    }
  });
});