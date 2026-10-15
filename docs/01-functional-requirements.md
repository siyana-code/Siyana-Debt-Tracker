# Functional Requirements — Siyana Debt Tracker

> **Version:** 1.0 · **Last updated:** 2026-10-15
> Each requirement has a stable ID (`FR-<AREA>-<n>`) so it can be referenced in
> issues, tests and pull requests.

**Legend** — 🔴 Must (release blocker) · 🟡 Should (important) · 🟢 Could (nice to have)

---

## 1. People

The counterparty. One person can hold many debts.

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-PER-01 | A user can create a person with a name | 🔴 | Name is required and non-blank; save fails with a visible message otherwise | ✅ |
| FR-PER-02 | Optional phone, email, location and note can be stored | 🟡 | Each is optional; blank is stored as `null` | ✅ |
| FR-PER-03 | A user can edit a person | 🟡 | All fields update; `updatedAt` changes | ✅ |
| FR-PER-04 | A user can archive a person | 🟡 | Archived people are hidden from pickers and the People list, but keep their history | ✅ |
| FR-PER-05 | A user can unarchive a person | 🟡 | Person returns to pickers and lists | ✅ |
| FR-PER-06 | Deleting a person is blocked while they have open debts | 🔴 | Delete returns `{deleted:false, openDebts:n}` and the UI explains what is blocking it | ✅ |
| FR-PER-07 | Deleting a person deletes their debts and payments | 🟡 | Confirmed deletion cascades via foreign key; a confirmation dialog states the consequence | ✅ |
| FR-PER-08 | People can be searched by name, phone or email | 🟡 | Search is case-insensitive and matches partial strings | ✅ |
| FR-PER-09 | Each person has a stable initials avatar with a deterministic colour | 🟢 | Same person always gets the same colour; initials derived from name | ✅ |
| FR-PER-10 | A person's total outstanding balance is shown | 🟡 | Sum of `principal - paid` across their open debts | ✅ |

---

## 2. Debts

The central record. Every debt points at exactly one person.

### 2.1 Creation

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-DBT-01 | A user can create a debt with a direction of **lent** or **borrowed** | 🔴 | Direction is required; stored as a `CHECK`-constrained enum | ✅ |
| FR-DBT-02 | A user selects the person the debt belongs to | 🔴 | A person must be chosen before save; save is disabled otherwise | ✅ |
| FR-DBT-03 | A new person can be created inline without leaving the form | 🟡 | Typing a name in the person sheet creates and selects that person | ✅ |
| FR-DBT-04 | The amount is entered in the app's currency | 🔴 | Stored as integer minor units; `0` and negatives are rejected | ✅ |
| FR-DBT-05 | Quick-amount chips fill common amounts | 🟢 | Tapping a chip populates the amount field | ✅ |
| FR-DBT-06 | A debt is filed under one of eight categories | 🟡 | `general`, `family`, `friend`, `work`, `travel`, `purchase`, `loan`, `other` | ✅ |
| FR-DBT-07 | An issue date is recorded, defaulting to today | 🔴 | Stored as `YYYY-MM-DD` in local time | ✅ |
| FR-DBT-08 | An optional due date can be set | 🟡 | Toggle to enable; quick chips for today / 7 days / 30 days | ✅ |
| FR-DBT-09 | A debt can be created already settled | 🟢 | `paid` is set equal to `principal` and status becomes `settled` | ✅ |
| FR-DBT-10 | A note can be attached | 🟢 | Free text, optional | ✅ |

### 2.2 Reading and filtering

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-DBT-11 | All debts are listed, newest activity first | 🔴 | Default ordering is `updated_at DESC` | ✅ |
| FR-DBT-12 | Debts can be filtered by direction | 🔴 | All / Lent / Borrowed | ✅ |
| FR-DBT-13 | Debts can be filtered by state | 🔴 | Open / Overdue / Settled / All | ✅ |
| FR-DBT-14 | Debts can be filtered by category | 🟡 | Any single category or all | ✅ |
| FR-DBT-15 | Debts can be searched by person name, note or category | 🔴 | Case-insensitive partial match, applied alongside filters | ✅ |
| FR-DBT-16 | Sorting prioritises what needs attention | 🟡 | Overdue → due soon → open → part-paid → settled; ties broken by soonest due date | ✅ |
| FR-DBT-17 | Active filters are shown as removable chips | 🟢 | Each chip clears its own filter | ✅ |
| FR-DBT-18 | An empty result distinguishes "no data" from "no match" | 🟡 | Empty state icon and message differ; a clear-filters action is offered | ✅ |

### 2.3 Editing and deletion

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-DBT-19 | A user can edit a debt's details | 🟡 | Partial updates do not clear unrelated fields | ✅ |
| FR-DBT-20 | A user can mark a debt settled manually | 🔴 | Sets `status` and `settled_at` | ✅ |
| FR-DBT-21 | A user can reopen a settled debt | 🟡 | Clears `settled_at`; payment history is untouched | ✅ |
| FR-DBT-22 | A user can delete a debt | 🔴 | Confirmation states that payment history is also removed | ✅ |

### 2.4 Derived state

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-DBT-23 | A debt's state is derived, never stored redundantly | 🔴 | `settled` when status is settled or outstanding is 0; `overdue` when past due and unpaid; `dueSoon` within the window; `partial` when some paid; else `open` | ✅ |
| FR-DBT-24 | The due-soon window is user-configurable | 🟡 | 1–30 days, default 3 | ✅ |
| FR-DBT-25 | Overdue and due-soon lists are capped on the dashboard | 🟢 | At most three entries each | ✅ |

---

## 3. Payments

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-PAY-01 | A user can record a payment against a debt | 🔴 | Amount, date (defaults today), method, optional note | ✅ |
| FR-PAY-02 | A payment updates the debt's `paid` total | 🔴 | `paid` increases by the payment amount, in the same transaction as the insert | ✅ |
| FR-PAY-03 | A payment that fully covers the principal settles the debt automatically | 🔴 | `status` becomes `settled` and `settled_at` is stamped | ✅ |
| FR-PAY-04 | A partial payment leaves the debt open | 🔴 | `status` remains `open` and progress reflects the new total | ✅ |
| FR-PAY-05 | Overpayment is clamped, never negative | 🔴 | `paid` is capped at `principal`; the payment row keeps the true figure | ✅ |
| FR-PAY-06 | Payments are listed newest first per debt | 🔴 | Ordered by `paid_at DESC, created_at DESC` | ✅ |
| FR-PAY-07 | A payment can be deleted and the debt total is corrected | 🔴 | `paid` decreases; the debt reopens if it drops below `principal` | ✅ |
| FR-PAY-08 | Settlement method is one of cash, bank, card, cheque, other | 🟡 | Defaults to the user's preference from Settings | ✅ |
| FR-PAY-09 | Quick actions fill the full or half outstanding amount | 🟢 | "Pay all" and "Half" chips | ✅ |
| FR-PAY-10 | Deleting a payment requires confirmation | 🔴 | The amount is named in the dialog | ✅ |

---

## 4. Dashboard

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-DSH-01 | Net balance is shown as the headline figure | 🔴 | `lent outstanding − borrowed outstanding`, with direction indicated by a trend arrow | ✅ |
| FR-DSH-02 | Total lent out is shown | 🔴 | Sum of outstanding on `lent` debts | ✅ |
| FR-DSH-03 | Total borrowed is shown | 🔴 | Sum of outstanding on `borrowed` debts | ✅ |
| FR-DSH-04 | Open and settled counts are shown | 🟡 | Count of open debts with outstanding > 0; count of settled | ✅ |
| FR-DSH-05 | Overdue count and total are shown | 🔴 | Prominent when non-zero, muted when clear | ✅ |
| FR-DSH-06 | Overdue debts are listed with person, amount and how late | 🟡 | Strip appears only when there is something overdue | ✅ |
| FR-DSH-07 | Debts due soon are listed | 🟡 | Within the configured window | ✅ |
| FR-DSH-08 | Recently touched debts are listed | 🟢 | Five most recently updated, each with a state badge | ✅ |
| FR-DSH-09 | A first-use dashboard prompts the first debt | 🟢 | "Record your first debt" card when no open debts exist | ✅ |
| FR-DSH-10 | The tab bar badges the overdue count | 🟢 | Badge hidden when zero | ✅ |
| FR-DSH-11 | Monthly lent/borrowed totals are available | 🟢 | Six-month trend available to the chart | ✅ |

---

## 5. Settings

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-SET-01 | The currency can be changed | 🔴 | Seven currencies; the change affects display and future records | ✅ |
| FR-SET-02 | The theme can be light, dark or follow the system | 🔴 | Applied instantly; persisted across restarts | ✅ |
| FR-SET-03 | The due-soon window can be adjusted | 🟡 | Stepper between 1 and 30 days | ✅ |
| FR-SET-04 | Reminders can be enabled or disabled | 🟡 | Off by default; persisted (notification delivery lands in Phase 3) | ✅ |
| FR-SET-05 | Record counts are displayed | 🟢 | People, debts and payment counts plus schema version | ✅ |
| FR-SET-06 | All data can be erased | 🔴 | Destructive confirmation naming exactly what is lost | ✅ |
| FR-SET-07 | The app states that storage is device-local | 🟡 | "On this device only" with a lock icon | ✅ |
| FR-SET-08 | About screen names the author and licence | 🟡 | Credits Siyana Code and Rasindu Appuhami | ✅ |

---

## 6. Data export

The backup story. If the phone is lost, the data must be recoverable.

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-EXP-01 | All data can be exported as JSON | 🔴 | Includes people, debts, **payments**, and a format version | ✅ |
| FR-EXP-02 | Debts can be exported as CSV | 🔴 | One row per debt, formatted amounts, headers, RFC 4180 quoting | ✅ |
| FR-EXP-03 | Exports are written to a file and handed to the share sheet | 🔴 | Filename is `siyana-debts-<YYYY-MM-DD>.<ext>` | ✅ |
| FR-EXP-04 | The export screen explains what each format is for | 🟢 | JSON = backup; CSV = spreadsheets | ✅ |
| FR-EXP-05 | Record counts are shown before exporting | 🟢 | So the user can sanity-check | ✅ |
| FR-EXP-06 | A JSON export can be re-imported | 🔴 | Restores people, debts and payments; merge adds only what is missing | ✅ |
| FR-EXP-07 | Import validates the file before writing | 🔴 | Rejects non-JSON, foreign files and future versions with a clear message; nothing is written when rejected | ✅ |
| FR-EXP-08 | Merge and replace are both offered, and the destructive one is confirmed | 🔴 | Replace names exactly what will be deleted | ✅ |
| FR-EXP-09 | Restoring the same file twice does not duplicate records | 🔴 | People, debts and payments match by stable id | ✅ |
| FR-EXP-10 | Balances are rebuilt from restored payment history | 🔴 | `paid` and `status` are recomputed, never trusted from the file | ✅ |
| FR-EXP-11 | Records referencing something missing from the file are skipped | 🟡 | A debt whose person was not exported is not imported broken | ✅ |
| FR-EXP-12 | A version 1 file (from before payments were exported) still restores | 🟡 | Absent `payments` is valid, not an error | ✅ |
| FR-EXP-13 | Backup is unavailable on web, and says so | 🟢 | Controls disabled with an inline explanation | ✅ |

---

## 7. Notifications *(Phase 3)*

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-NOT-01 | A local notification fires on a due date | 🔴 | Scheduled at a user-set hour, offline | ⬜ |
| FR-NOT-02 | A notification fires N days before a due date | 🟡 | N from the due-soon window setting | ⬜ |
| FR-NOT-03 | Notification permission is requested only after the user opts in | 🔴 | Never requested on first launch | ⬜ |
| FR-NOT-04 | Turning reminders off cancels all pending notifications | 🔴 | Verified after a restart | ⬜ |

---

## 8. Accessibility

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-ACC-01 | Every interactive element has an accessibility label | 🔴 | Automated audit finds no unlabelled control | ✅ |
| FR-ACC-02 | Status is never communicated by colour alone | 🔴 | Every coloured badge pairs an icon with its label | ✅ |
| FR-ACC-03 | All touch targets are at least 44×44 | 🔴 | Icon buttons use `minTouchSize` plus hit slop | ✅ |
| FR-ACC-04 | The full ledger can be completed by screen reader alone | 🟡 | VoiceOver / TalkBack walkthrough passes | ⬜ Phase 2 |

---

## 9. Data integrity

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-DAT-01 | Money is stored as integers, never floats | 🔴 | `INTEGER` columns; `parseAmount` rounds at the boundary | ✅ |
| FR-DAT-02 | A debt can never reference a missing person | 🔴 | `FOREIGN KEY … ON DELETE CASCADE` with `PRAGMA foreign_keys = ON` | ✅ |
| FR-DAT-03 | `paid` can never be negative or exceed `principal` | 🔴 | `CHECK (paid >= 0)` plus application-level clamping | ✅ |
| FR-DAT-04 | Schema upgrades are transactional | 🔴 | Each migration runs inside `withTransactionAsync` | ✅ |
| FR-DAT-05 | Migrations are forward-only | 🔴 | Shipped migrations are never edited | ✅ |
| FR-DAT-06 | Writes that span tables are atomic | 🔴 | Payment insert + debt update share one transaction | ✅ |
| FR-DAT-07 | Concurrent screens never open two connections | 🟡 | A single in-flight promise guards database opening | ✅ |