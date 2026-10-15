# Architecture — Siyana Debt Tracker

> **Last updated:** 2026-10-15
> How the code is organised, why, and what was deliberately not chosen.

---

## 1. The shape of the system

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation          src/app/**    file-based routes      │
│                        src/components/ui/**   component kit  │
└────────────────────────────┬────────────────────────────────┘
                             │  reads state, calls intents
┌────────────────────────────▼────────────────────────────────┐
│  State                 src/hooks/**                          │
│                        publish/subscribe change bus          │
└────────────────────────────┬────────────────────────────────┘
                             │  calls repository functions
┌────────────────────────────▼────────────────────────────────┐
│  Persistence            src/db/repositories/**               │
│                        src/db/index.ts     connection+txns  │
│                        src/db/migrations.ts forward-only     │
└────────────────────────────┬────────────────────────────────┘
                             │  SQL
┌────────────────────────────▼────────────────────────────────┐
│  Storage               SQLite (expo-sqlite), WAL mode       │
│                        siyana-debts.db — device-local only   │
└─────────────────────────────────────────────────────────────┘

  src/domain/**  pure logic, no I/O, no React — unit-testable in isolation
  src/theme/**   design tokens + ThemeProvider
  src/types/**   shared domain types
  src/utils/**   date and id helpers
```

**Rules that hold everywhere:**

1. Dependencies point downward only. UI never imports SQL. `domain/` imports
   nothing from the app.
2. SQL lives exclusively in `src/db/`. A `grep -r "SELECT" src/app` returns
   nothing.
3. Colours come only from `src/theme/`. No hex literal in a component.
4. Money crosses no boundary as a float.

---

## 2. Why these choices

### Expo, not bare React Native

The app is small, open source, and maintained largely by one person. Expo
removes the entire native build toolchain from the contributor's path — a
stranger can clone, `npm install`, and run it on their phone. That is worth
more than the handful of kilobytes a bare workflow would save.

Cost accepted: a larger dependency tree, and Expo's release cadence constrains
upgrade timing.

### expo-router, not React Navigation

File-based routing makes the screen list self-documenting — `src/app` *is* the
navigation map. Typed routes give compile-time checking of every `router.push`
target, which caught several real mistakes during development.

### SQLite, not AsyncStorage

AsyncStorage is a key-value blob store. A ledger is relational: a debt belongs
to a person and has many payments. Doing that on a key-value store means
loading and re-serialising the entire dataset on every read, with no indexes,
no constraints, and no transactions.

SQLite gives:

- **Constraints** — `CHECK (direction IN ('lent','borrowed'))` makes an invalid
  state physically un-storable, not merely unlikely
- **Transactions** — recording a payment updates two tables atomically
- **Indexes** — the debt list sorts and filters in SQL, not in JavaScript
- **Migrations** — the schema can evolve without losing a user's ledger
- **WAL mode** — readers do not block the writer

### A change bus instead of a state library

With no server, the "cache" is just SQLite. There is nothing to invalidate
across a process boundary. `notifyDataChanged()` after a write, and
`subscribe()` in each hook, is enough to keep every mounted screen consistent —
and it is about thirty lines instead of a state-management dependency.

```
   recordPayment()  ──►  notifyDataChanged()  ──┬──►  useDashboard  (tabs)
                                                ├──►  useDebts      (tabs)
                                                └──►  people screen
```

### Domain logic with no I/O

`src/domain/money.ts` and `src/domain/debt.ts` import only from `src/types`
and `src/utils`. They can be unit-tested without a database, a React renderer,
or an emulator. This is where the correctness risk lives — money arithmetic,
state derivation, sorting — so it is deliberately the most isolated code in the
project.

---

## 3. Directory map

| Path | Responsibility | May import |
|---|---|---|
| `src/app/` | Routes and screens | everything below |
| `src/components/ui/` | Reusable, theme-aware components | theme, ui |
| `src/hooks/` | Data access and state | db, domain, types |
| `src/db/repositories/` | All SQL and entity CRUD | db, domain, types, utils |
| `src/db/index.ts` | Connection, transactions, settings | expo-sqlite |
| `src/db/migrations.ts` | Forward-only schema steps | schema |
| `src/domain/` | Pure business logic | types, utils |
| `src/theme/` | Tokens and theming | — |
| `src/types/` | Shared type definitions | — |
| `src/utils/` | Dates, ids | — |

---

## 4. Navigation map

```
(tabs)                         Stack root
├── index          Overview     ├── debt/new      modal
├── debts          Debts        ├── debt/[id]     detail
├── people         People       ├── person/new    modal
└── settings       Settings     ├── person/[id]   profile
                                ├── payment/new   modal
                                ├── export        JSON / CSV
                                └── +not-found
```

Modals for creation, push for detail. Tabs stay mounted so returning from a
detail screen shows live figures with no refetch flash.

---

## 5. Data flow, end to end

**Recording a payment**

```
payment/new.tsx
  │  user types an amount
  ▼
parseAmount()                    domain/money.ts
  │  "2500.00" → 250000 (integer minor units)
  ▼
recordPayment()                  db/repositories/payments.ts
  │  BEGIN TRANSACTION
  │    INSERT INTO payments …
  │    UPDATE debts SET paid = ?, status = ? …
  │  COMMIT
  ▼
notifyDataChanged()              hooks/useDebts.ts
  │
  ├─► useDashboard.reload()      SQLite → state → render
  ├─► useDebts.reload()
  └─► router.back()
```

Every step is local. There is no network call anywhere in this trace, and there
is no code path that could add one without adding a dependency first.

---

## 6. Boot sequence

```
app/_layout.tsx
  │  SplashScreen.preventAutoHideAsync()
  ▼
getDatabase()                    opens SQLite, runs migrations
  │  PRAGMA journal_mode = WAL, foreign_keys = ON
  │  pending migrations applied, each in its own transaction
  ▼
loadSettings()                   currency, theme, reminders
  ▼
SplashScreen.hideAsync()         first paint
  ▼
<Tabs>                           dashboard mounts, skeletons → data
```

Migrations run *before* the first screen paints, so a user never sees a screen
half-migrated. If the database cannot open, the app still renders and logs the
error rather than white-screening.

---

## 7. Decision records

### ADR-001 — SQLite as the only store

**Context.** Needs constraints, transactions and indexed queries.
**Decision.** `expo-sqlite` with WAL.
**Consequence.** No ORM, no schema DSL — plain SQL in repository files.
**Rejected.** AsyncStorage (no constraints, no transactions), a SQL ORM
(obscures the SQL, adds a dependency, still needs migrations).

### ADR-002 — Money as integer minor units

**Context.** `0.1 + 0.2 !== 0.3`. A ledger that rounds wrongly is worthless.
**Decision.** All amounts are integers of the currency's minor unit. Floats
exist only inside `parseAmount` and are rounded before returning.
**Consequence.** Every currency needs a `decimals` value (0 for JPY, 2 for most).
**Rejected.** Storing floats (drifts), storing strings (cannot sum in SQL).

### ADR-003 — Denormalised `paid` column

**Context.** Outstanding balance is needed on nearly every screen.
**Decision.** `debts.paid` is maintained by the payment repository inside the
same transaction, rather than summing payments on read.
**Consequence.** One extra invariant to maintain — every write path must update
it. Guarded by `CHECK (paid >= 0)` and by the transaction.
**Rejected.** `SUM()` over payments per row (O(n) per debt, on every list).

### ADR-004 — Direction by glyph, not colour

**Context.** Red/green is unreadable for roughly 8% of men, and worse in bright
sunlight — both common for this audience.
**Decision.** Lent and borrowed are distinguished by arrow shape
(`arrow-up-right` / `arrow-down-left`). Colour is reserved for genuine status
(overdue, part-paid).
**Consequence.** Two extra icons in the kit; every status badge pairs an icon
with a text label.

### ADR-005 — Explicitly no network layer

**Context.** The premise is a private offline ledger.
**Decision.** No HTTP client dependency exists. There is no fetch wrapper, no
API module, no sync queue.
**Consequence.** Export is a file write plus the OS share sheet. Adding sync
later would be a deliberate, reviewed change — not an accident.
**Rejected.** Optional sync "just in case" (it would not stay optional).

### ADR-006 — Dependencies are added when used, not in advance

**Context.** It is tempting to install a package while a feature is being
planned — haptics "for later", a date picker "for the due-date form", an image
library "for receipts".
**Decision.** A dependency may only be declared if it is imported today. Each
of those was removed from `package.json` because nothing imported it.
**Consequence.** A Phase 3 feature that needs `expo-haptics` adds it in the
commit that uses it. The dependency list stays a short, accurate inventory of
what the app actually does, and the CI privacy guard keeps it that way.

---

## 8. Testing strategy

`src/domain/` is pure and is where the tests go:

| Module | What must be proven |
|---|---|
| `money.ts` | `parseAmount` → `formatMoney` round-trips; rounding never drifts; grouping is correct; remaining never goes negative |
| `debt.ts` | `debtState` for every combination of due date and payment; `sortDebts` puts overdue first; `summarise` totals correctly per direction |
| `date.ts` | Month-end arithmetic (`31 Jan + 1 month = 28 Feb`); local-time, not UTC |
| `export.ts` | CSV quoting for commas, quotes and newlines; RFC 4180 conformance |

Database behaviour is covered by exercising migrations against a seeded
fixture rather than mocking SQLite.

---

## 9. Performance decisions

| Concern | Decision |
|---|---|
| Aggregate figures | Computed in SQL (`summarise`), not by iterating rows in JS |
| List filtering | SQL for the coarse filter, JS for search — the dataset is small enough that the split is simpler and faster in practice |
| Re-render cost | Rows are memoised; the change bus replaces prop-drilled callbacks |
| Images | Only the avatar, which is a coloured circle — no bitmaps in list rows |
| Opening the DB | Guarded by one in-flight promise so four mounting screens open one connection |

---

## 10. What is deliberately absent

| Absent | Reason |
|---|---|
| Network client | ADR-005 |
| ORM / query builder | Plain SQL is shorter here and keeps migrations honest |
| State management library | A 30-line bus covers the whole problem (ADR-003 context) |
| Icon font beyond Ionicons | One consistent set; no emoji anywhere in the product |
| Analytics | Would violate the privacy promise outright |
| Feature flags | Ships open source; the maintainer gates with branches instead |