# Data Model — Siyana Debt Tracker

> **Schema version:** 2 · **Engine:** SQLite (WAL) · **Last updated:** 2026-10-15
> Database file: `siyana-debts.db`, inside the OS app sandbox.

---

## 1. Entity relationship

```
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│   people     │ 1        n   │    debts     │ 1        n   │   payments   │
│──────────────│──────────────│──────────────│──────────────│──────────────│
│ id       PK  │              │ id       PK  │              │ id       PK  │
│ name         │              │ person_id FK │              │ debt_id   FK │
│ initials     │              │ direction    │              │ amount       │
│ phone        │              │ principal    │              │ currency     │
│ email        │              │ paid         │              │ method       │
│ location     │              │ currency     │              │ note         │
│ note         │              │ interest_rate│              │ paid_at      │
│ archived     │              │ category     │              │ created_at   │
│ created_at   │              │ status       │              └──────────────┘
│ updated_at   │              │ note         │
└──────────────┘              │ issued_at    │
                              │ due_at       │
       ┌──────────────┐       │ settled_at   │
       │   settings   │       │ created_at   │
       │──────────────│       │ updated_at   │
       │ key      PK  │       └──────────────┘
       │ value        │
       └──────────────┘
```

Deleting a person cascades to their debts; deleting a debt cascades to its
payments. Deleting a payment never touches the debt row beyond recomputing
`paid`.

---

## 2. Tables

### 2.1 `people`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT | no | — | **PK** — `per_` + base36 timestamp + random |
| `name` | TEXT | no | — | Trimmed; required |
| `initials` | TEXT | yes | — | Optional override; derived from name otherwise |
| `phone` | TEXT | yes | — | Free text, not validated |
| `email` | TEXT | yes | — | Free text, not validated |
| `location` | TEXT | yes | — | Free text |
| `note` | TEXT | yes | — | Free text |
| `archived` | INTEGER | no | `0` | 0 = active, 1 = archived |
| `created_at` | TEXT | no | — | ISO-8601 |
| `updated_at` | TEXT | no | — | ISO-8601 |

**Indexes:** `idx_people_archived (archived)`, `idx_people_name (name COLLATE NOCASE)`

> Names are stored as typed. The app deliberately does **not** assume a
> Sinhala/Tamil family-name convention — for many users in the audience, that
> assumption is simply wrong.

### 2.2 `debts`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT | no | — | **PK** — `dbt_` + … |
| `person_id` | TEXT | no | — | **FK** → `people(id)` `ON DELETE CASCADE` |
| `direction` | TEXT | no | — | `CHECK (direction IN ('lent','borrowed'))` |
| `principal` | INTEGER | no | — | `CHECK (principal > 0)` — **integer minor units** |
| `paid` | INTEGER | no | `0` | `CHECK (paid >= 0)` — denormalised total of payments |
| `currency` | TEXT | no | — | ISO 4217, e.g. `LKR` |
| `interest_rate` | REAL | yes | — | Percentage; unused in v1 calculations, stored for later |
| `category` | TEXT | no | `'general'` | One of eight values |
| `status` | TEXT | no | `'open'` | `CHECK (status IN ('open','settled'))` |
| `note` | TEXT | yes | — | Free text |
| `issued_at` | TEXT | no | — | `YYYY-MM-DD`, local calendar date |
| `due_at` | TEXT | yes | — | `YYYY-MM-DD`; null = no deadline |
| `settled_at` | TEXT | yes | — | ISO-8601; set when settled, cleared on reopen |
| `created_at` | TEXT | no | — | ISO-8601 |
| `updated_at` | TEXT | no | — | ISO-8601; drives "recent" ordering |

**Indexes:** `idx_debts_person`, `idx_debts_status`, `idx_debts_direction`,
`idx_debts_due_at`, `idx_debts_updated_at (DESC)`

### 2.3 `payments`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT | no | — | **PK** — `pay_` + … |
| `debt_id` | TEXT | no | — | **FK** → `debts(id)` `ON DELETE CASCADE` |
| `amount` | INTEGER | no | — | `CHECK (amount > 0)` — always positive |
| `currency` | TEXT | no | — | Denormalised so history survives a currency change |
| `method` | TEXT | no | `'cash'` | cash / bank / card / cheque / other |
| `note` | TEXT | yes | — | Free text |
| `paid_at` | TEXT | no | — | `YYYY-MM-DD`, defaults to today |
| `created_at` | TEXT | no | — | ISO-8601 |

**Indexes:** `idx_payments_debt`, `idx_payments_paid_at (DESC)`

Payments are **append-only**. Correction is a delete followed by a re-add, so
there is never an audit trail with a hole in it.

### 2.4 `settings`

| Column | Type | Notes |
|---|---|---|
| `key` | TEXT | **PK** |
| `value` | TEXT | Always a string; parsed by `loadSettings` |

| Key | Example | Default |
|---|---|---|
| `currency` | `LKR` | `LKR` |
| `themeMode` | `system` | `system` |
| `remindersEnabled` | `true` | `true` |
| `dueSoonDays` | `3` | `3` |
| `defaultMethod` | `cash` | `cash` |
| `autoBackupEnabled` | `false` | `false` |

### 2.5 `schema_meta`

| Column | Type | Notes |
|---|---|---|
| `key` | TEXT | **PK** — always `schemaVersion` |
| `value` | TEXT | Integer version as a string |

Read once at open to decide which migrations to apply.

---

## 3. Invariants

These hold at all times. Each is enforced somewhere it cannot be bypassed.

| # | Invariant | Enforced by |
|---|---|---|
| 1 | A debt always belongs to an existing person | Foreign key + `PRAGMA foreign_keys = ON` |
| 2 | A payment always belongs to an existing debt | Foreign key + `PRAGMA foreign_keys = ON` |
| 3 | `direction` is only `lent` or `borrowed` | `CHECK` constraint |
| 4 | `status` is only `open` or `settled` | `CHECK` constraint |
| 5 | `principal > 0` | `CHECK` constraint |
| 6 | `paid >= 0` and `paid <= principal` | `CHECK` + clamping in `recordPayment` |
| 7 | Every `amount` in `payments` is positive | `CHECK` constraint |
| 8 | Money is an integer at rest | `INTEGER` columns + `parseAmount` rounding |
| 9 | `paid` equals the sum of its payments | Updated in the same transaction as every insert/delete |
| 10 | Dates are `YYYY-MM-DD`, timestamps are ISO-8601 | Constructed by `src/utils/date.ts`, never by hand |
| 11 | Dates are stored in **local** time | `toDateOnly()` builds from local getters, not `toISOString()` |

### Why local time matters

`new Date().toISOString().slice(0,10)` returns **yesterday** for anyone east
of UTC in the evening. For a due-date app that makes debts appear overdue a day
early. `toDateOnly()` composes from `getFullYear()` / `getMonth()` / `getDate()`
so the calendar date always matches what the user sees on their phone.

---

## 4. Migrations

### Rules

1. **Forward-only.** A shipped migration is never edited. Ever.
2. **Append.** New changes mean a new entry in `MIGRATIONS` and a bump of
   `SCHEMA_VERSION`.
3. **Transactional.** Each migration runs inside `withTransactionAsync`.
4. **Replay-safe.** Must succeed against a fresh install *and* against a database
   created by any earlier version.
5. **Never duplicate what `SCHEMA_SQL` already declares.** `CREATE TABLE IF NOT
   EXISTS` is idempotent; `ALTER TABLE … ADD COLUMN` is not. Re-adding a column
   fails with `duplicate column name` on *every* launch — the app still opens,
   but the version never advances. These invariants are enforced by
   [`tests/migrations.test.ts`](../tests/migrations.test.ts).

### History

| v | Name | Change |
|---|---|---|
| 1 | `initial_schema` | `people`, `debts`, `payments`, `settings`, `schema_meta`, nine indexes, WAL and foreign-key pragmas |
| 2 | `settings_defaults` | Seed `remindersEnabled`, `dueSoonDays`, `defaultMethod`, `autoBackupEnabled` |

> **Nothing has been released yet**, so the base schema and the migration list
> are still in step: v1 builds the complete current shape and v2 only seeds
> defaults. There are deliberately no `ALTER TABLE` migrations yet.
>
> The moment v1 ships, `SCHEMA_SQL` **freezes**. Every later change — including
> adding an index that already exists in `SCHEMA_SQL` — must arrive as a new
> migration. Removing migration v3, which wrongly re-added `people.archived`
> and `debts.interest_rate`, is exactly the mistake rule 5 exists to prevent.

### The freeze boundary, concretely

```ts
//  BEFORE v1 ships — SCHEMA_SQL is still editable.
//  Edit the table here and no migration is needed.

CREATE TABLE IF NOT EXISTS people ( ..., archived INTEGER NOT NULL DEFAULT 0 );

//  AFTER v1 ships — SCHEMA_SQL above is frozen. Append instead.

{
  version: 3,
  name: 'add_person_nickname',
  up: `ALTER TABLE people ADD COLUMN nickname TEXT;`,
}
```

### Adding a migration

```ts
// src/db/migrations.ts
{
  version: 3,
  name: 'add_debt_tags',
  up: `
    ALTER TABLE debts ADD COLUMN tags TEXT;
    CREATE INDEX IF NOT EXISTS idx_debts_tags ON debts(tags);
  `,
}
```

Then bump `SCHEMA_VERSION` to `3` in `src/db/schema.ts`. `tests/migrations.test.ts`
will fail if the versions fall out of step.

---

## 5. Performance

### Index coverage

| Query | Index used |
|---|---|
| Debts by person | `idx_debts_person` |
| Open debts (dashboard) | `idx_debts_status` |
| Filter by direction | `idx_debts_direction` |
| Overdue sweep | `idx_debts_due_at` |
| Recent activity | `idx_debts_updated_at (DESC)` |
| Payments for a debt | `idx_payments_debt` |
| Payment history | `idx_payments_paid_at (DESC)` |
| Person search | `idx_people_name (name COLLATE NOCASE)` |

### Pragmas

```sql
PRAGMA journal_mode = WAL;      -- readers don't block the writer
PRAGMA foreign_keys = ON;       -- enforce referential integrity
```

### Scale

Design target is **hundreds** of rows, tested to **ten thousand**. Beyond that
the dominant cost is loading the full list into memory for in-app search —
acceptable at this scale, and the point at which a real search index would
become worth adding.

---

## 6. Backup and recovery

The database is the only copy. Two escape hatches:

| Format | Purpose | Contents |
|---|---|---|
| JSON | Full backup **and restore** | People, debts and **payments** with raw minor-unit amounts, plus a format marker and version |
| CSV | Spreadsheet analysis | One row per debt with formatted amounts. Read-only |

Filenames are `siyana-debts-<YYYY-MM-DD>.<ext>`, written to the app's cache
directory, then handed to the OS share sheet. **The app never uploads anything.**

### The backup file is a versioned API

```jsonc
{
  "app": "Siyana Debt Tracker",
  "format": "siyana-debts-export",  // identity check
  "version": 2,                     // read 1..2, refuse anything newer
  "exportedAt": "2026-10-15T…",
  "people":   [ /* Person records */ ],
  "debts":    [ /* Debt + a readable "outstanding" */ ],
  "payments": [ /* added in version 2 */ ]
}
```

Two rules govern changes to it:

1. **Bump `version` and keep reading every earlier version.** A user with a v1
   file must be able to restore it after any future update.
2. **A file from a newer version is refused, not guessed at.** The message tells
   them to update the app.

### Restoring

| Mode | Behaviour |
|---|---|
| **Merge** | Keeps what is on the device, adds what is new |
| **Replace** | Wipes the ledger first, then restores — what "restore my backup" means to someone who lost the phone |

Records are matched by their **stable id**, so restoring the same file twice is
a no-op rather than a pile of duplicates.

Three safety properties:

- **Validate before writing.** `parseBackup` runs first and touches no
  database, so a bad file is rejected with nothing written at all.
- **Restore in one transaction.** A failure half-way leaves the ledger untouched.
- **Rebuild derived values.** `paid` and `status` are recomputed from the
  payments that were actually restored, never taken from the file. A
  hand-edited or inconsistent backup therefore cannot produce a debt whose
  total disagrees with its own history.

> **Android and iOS only.** `expo-file-system` has no web implementation, so
> the browser preview can display the ledger but cannot read or write a file.
> The screen disables the controls and says so.

---

## 7. Security posture

| Concern | Status |
|---|---|
| SQL injection | All user values are bound parameters; no interpolation of user input |
| Foreign key bypass | `PRAGMA foreign_keys = ON` on every connection open |
| Invalid state | `CHECK` constraints, not application convention |
| Secrets | None stored anywhere |
| At rest | App-sandbox private storage, OS-level protection |
| At export | Plaintext by design — the user controls the destination via the share sheet |
| Biometric gate | Phase 3 |