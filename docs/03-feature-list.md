# Feature List — Siyana Debt Tracker

> **Last updated:** 2026-10-15
> Legend — ✅ Shipped · 🔄 In progress · ⬜ Planned · ❌ Rejected

---

## Summary

| | Count |
|---|---|
| ✅ Shipped | 57 |
| 🔄 In progress | 1 |
| ⬜ Planned | 16 |
| ❌ Rejected | 6 |

---

## 1. Core ledger ✅

| Feature | Notes |
|---|---|
| ✅ Create, edit, delete a person | Name required; phone, email, location, note optional |
| ✅ Archive / unarchive a person | Hidden from pickers, history preserved |
| ✅ Create a debt — lent | They owe you |
| ✅ Create a debt — borrowed | You owe them |
| ✅ Set amount, issue date, due date | Money stored as integer minor units |
| ✅ Eight debt categories | General, family, friend, work, travel, purchase, loan, other |
| ✅ Record a payment | Amount, date, method, note |
| ✅ Partial payments | Progress bar and percentage per debt |
| ✅ Automatic settlement | Fully covering a payment settles the debt |
| ✅ Manual settle / reopen | Does not disturb payment history |
| ✅ Payment deletion | Debt totals recalculate correctly |
| ✅ Overdue detection | Past the due date and still outstanding |
| ✅ Due-soon detection | Configurable 1–30 day window |

---

## 2. Dashboard ✅

| Feature | Notes |
|---|---|
| ✅ Net balance headline | Lent minus borrowed, with a trend arrow |
| ✅ Lent / borrowed totals | Side by side |
| ✅ Overdue count and total | Prominent when non-zero |
| ✅ Settled count | All time |
| ✅ Overdue strip | Top three, soonest first |
| ✅ Due-soon strip | Top three |
| ✅ Recent activity | Five most recently touched debts |
| ✅ Tab bar overdue badge | Hidden at zero |
| ✅ Six-month trend data | Exposed for charting |

---

## 3. Finding things ✅

| Feature | Notes |
|---|---|
| ✅ Search by name, note, category | Case-insensitive partial match |
| ✅ Filter by direction | All / Lent / Borrowed |
| ✅ Filter by state | Open / Overdue / Settled / All |
| ✅ Filter by category | Any one category |
| ✅ Combined filters | Removable chips show what is active |
| ✅ Attention-first sorting | Overdue → due soon → open → part-paid → settled |
| ✅ Smart empty states | Distinguishes "nothing here" from "nothing matched" |

---

## 4. People ✅

| Feature | Notes |
|---|---|
| ✅ People list with balances | Ordered by outstanding, then name |
| ✅ Per-person debt history | Reuses the debt card |
| ✅ Per-person open count | Badge on the profile |
| ✅ Deterministic avatar colours | The same person is always the same colour |
| ✅ Search people | Name, phone, email |
| ✅ Delete protection | Blocked while open debts exist |
| ✅ Inline person creation | Create from inside the debt form |

---

## 5. Settings ✅

| Feature | Notes |
|---|---|
| ✅ Currency selection | LKR, USD, EUR, GBP, INR, JPY, AUD, CAD |
| ✅ Theme: light / dark / system | Instant, persisted |
| ✅ Due-soon window stepper | 1–30 days |
| ✅ Reminder preference | Stored; delivery lands in Phase 3 |
| ✅ Record counts | People, debts, payments, schema version |
| ✅ Erase all data | With a destructive confirmation |
| ✅ About screen | Author, brand, licence |

---

## 6. Data safety ✅

| Feature | Notes |
|---|---|
| ✅ JSON export | Full backup — people, debts **and payment history**, raw minor units, versioned |
| ✅ CSV export | One row per debt, RFC 4180 quoting |
| ✅ Share-sheet hand-off | OS decides where the file goes |
| ✅ **JSON import** | Restores on a new device. Merge keeps what's here, Replace overwrites |
| ✅ **Import validation** | Rejects foreign files, bad JSON and future versions before writing anything |
| ✅ **Balance rebuilt from history** | `paid` and `status` are recomputed after restore, never trusted from the file |
| ✅ Re-import is a no-op | Records match by stable id, so restoring twice cannot duplicate |
| ⬜ Scheduled auto-backup | Write a snapshot before each major change |
| ⬜ **Biometric lock** | PIN or fingerprint gate — Phase 3 |
| ⬜ Scheduled reminders | Local notifications for due dates — Phase 3 |

> **Backup works on Android and iOS only.** `expo-file-system` has no web
> implementation, so the browser preview shows the ledger but cannot read or
> write a file. The screen says so plainly instead of failing opaquely.

---

## 7. User experience ✅

| Feature | Notes |
|---|---|
| ✅ Icon-first interface | Glyphs before words throughout |
| ✅ Direction by arrow shape | Never by red/green alone |
| ✅ Animated skeleton loaders | No spinner flashes |
| ✅ Pull to refresh | On every list |
| ✅ Inline validation | Save disabled until valid, with the reason shown |
| ✅ Quick-amount chips | Common values one tap away |
| ✅ Quick due-date chips | Today / 7 days / 30 days |
| ✅ Payment quick actions | "Pay all" and "Half" |
| ✅ Haptic feedback on key actions | Success on save/settle/record, warning on delete, tap on select |
| ✅ Vibration switch in Settings | Off on web; the preference is honoured on every call |

---

## 8. Accessibility ✅

| Feature | Notes |
|---|---|
| ✅ Labels on every control | `accessibilityLabel` throughout |
| ✅ Correct roles | `button`, `radio`, `tab`, `progressbar` |
| ✅ Exposed progress values | `accessibilityValue` on progress bars |
| ✅ 44pt minimum touch targets | Plus generous hit slop |
| ✅ Colour never the only signal | Icon plus label on every status |
| ✅ Text scales with system settings | ⬜ Audit pending |
| ✅ Logical focus order | ⬜ Audit pending |

---

## 9. Reliability ✅

| Feature | Notes |
|---|---|
| ✅ Forward-only migrations | Never edited after release |
| ✅ Transactional schema upgrades | Each migration atomic |
| ✅ Foreign keys enforced | Cascade on delete |
| ✅ CHECK constraints | Direction, status, amount ranges |
| ✅ Indexed hot paths | Six indexes |
| ✅ Atomic multi-table writes | Payment + debt update together |
| ✅ Single connection guard | Concurrent screens cannot double-open |
| ✅ Unit tests for money and state | ⬜ Phase 2 |

---

## 10. Notifications ⬜

| Feature | Notes |
|---|---|
| ⬜ Due-date notification | At a user-set hour, fully offline |
| ⬜ Advance warning | Uses the due-soon window |
| ⬜ Permission only on opt-in | Never requested at first launch |
| ⬜ Snooze an alert | Push to a later day |

---

## 11. Depth ⬜

| Feature | Notes |
|---|---|
| ⬜ Recurring debts | Installments and schedules |
| ⬜ Receipt photo | Attach an image to a debt |
| ⬜ Multi-currency dashboard | Show totals in several currencies |
| ⬜ Split a debt | Between several people |
| ⬜ Reminder notes | Per-person reminders |
| ⬜ Archive debts by year | Keep history, shrink the active list |
| ⬜ Widget | Net balance on the home screen |
| ⬜ Charts | A visual history of lending over time |
| ⬜ Interest calculation | Simple interest on overdue debts |
| ⬜ CSV import | Bulk-load a spreadsheet |

---

## 12. Localisation ⬜

| Feature | Notes |
|---|---|
| ⬜ English | ✅ Default |
| ⬜ සිංහල (Sinhala) | Sinhala |
| ⬜ தமிழ் (Tamil) | Tamil |
| ⬜ In-app language switch | Without reinstalling |
| ⬜ RTL support | For Arabic and other RTL locales |
| ⬜ Locale-aware number format | Digit grouping and currency placement |

---

## 13. Platform ⬜

| Feature | Notes |
|---|---|
| ✅ Android build | API 24+ |
| ✅ iOS build | iOS 15.1+ |
| ✅ Web build | Expo Router, single page |
| ⬜ Play Store release | Phase 3 |
| ⬜ App Store release | Phase 3 |
| ⬜ Tablet layout optimisation | Phase 4 |
| ⬜ Home-screen widget | Phase 4 |
| ⬜ Watch complication | Low priority |

---

## 14. Explicitly rejected ❌

Recorded so the reasoning is not silently re-litigated later.

| Feature | Why not |
|---|---|
| ❌ Cloud sync / backend | Defeats the privacy promise. The database is the product |
| ❌ User accounts | Nothing to log into means nothing to leak |
| ❌ Bank integration | Needs a network, a bank relationship, and a Play Store finance declaration |
| ❌ Advertising | Would compromise the privacy position and bloat the bundle |
| ❌ Analytics / telemetry | Same |
| ❌ Shared/collaborative debts | Requires a server; conflicts with NFR-SEC-01 |
| ❌ Investment tracking | A different app with a different user |

---

## 15. Feature request template

Copy this into a GitHub issue:

```markdown
### Feature
<one line>

### The problem it solves
<what is painful today, without the feature>

### Why it is not already in the app
<if it is a rejected idea, say which one from section 14>

### Offline behaviour
<what exactly happens with no network — this is required, not optional>

### Icons over text
<which glyph would represent this?>
```