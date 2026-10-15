# Non-Functional Requirements — Siyana Debt Tracker

> **Version:** 1.0 · **Last updated:** 2026-10-15
> How the app must *behave*, rather than what it does.

---

## 1. Performance

| ID | Requirement | Target | How it is met | Status |
|---|---|---|---|---|
| NFR-PERF-01 | Cold start to first paint | < 2.0 s (p95, mid-range Android) | Root layout warms the database while the splash is up; routes render skeletons, never blocking spinners | ✅ |
| NFR-PERF-02 | Dashboard data visible | < 500 ms after mount | Aggregate figures computed in SQL, not in JS | ✅ |
| NFR-PERF-03 | List scroll | 60 fps with 1,000 debts | `FlatList`, no per-row images beyond the avatar, memoised row components | ✅ |
| NFR-PERF-04 | Search response | < 100 ms for 1,000 debts | In-memory filtering over the loaded set; the dataset is intentionally small | ✅ |
| NFR-PERF-05 | Write latency | < 50 ms | Single transaction per write; WAL journaling | ✅ |
| NFR-PERF-06 | Memory ceiling | < 150 MB | No images held in memory; skeleton loaders replace avatars while loading | ✅ |
| NFR-PERF-07 | Full ledger query at 10,000 debts | < 1 s | Indexed on `status`, `direction`, `due_at`, `updated_at` | ✅ |
| NFR-PERF-08 | No jank when switching tabs | < 100 ms | Tabs stay mounted; data reloads on the change bus, not on focus | ✅ |

**Design assumption:** this app targets *hundreds* of records, not millions. A
person who lends money has tens of debts, not thousands. Optimisation effort is
spent on first paint and responsiveness, not on scale that will never occur.

---

## 2. Privacy and security

The most important section in this document.

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-SEC-01 | **No network requests for core functionality** | Zero. There is no HTTP client in the dependency tree | ✅ |
| NFR-SEC-02 | No telemetry or analytics | No Sentry, no Firebase, no Amplitude, no PostHog | ✅ |
| NFR-SEC-03 | No user identifiers collected | No device ID, no advertising ID, no account | ✅ |
| NFR-SEC-04 | No data leaves the device without an explicit user action | Only via the share sheet, which the user must invoke | ✅ |
| NFR-SEC-05 | No crash reporting to third parties | Errors stay local; only `console` output in development | ✅ |
| NFR-SEC-06 | All data at rest in app-private storage | SQLite inside the OS app sandbox | ✅ |
| NFR-SEC-07 | Biometric app lock | Optional PIN / fingerprint gate | ⬜ Phase 3 |
| NFR-SEC-08 | Export files are user-controlled | Written to cache/document directory, passed to the share sheet | ✅ |
| NFR-SEC-09 | No permissions requested beyond what is used | Camera and notifications only, only when that feature is enabled | ✅ |
| NFR-SEC-10 | Third-party code is auditable | Minimal dependency set; every dependency is declared in `package.json` | ✅ |

### Dependency posture

Only three categories of runtime dependency are accepted:

1. **Expo / React Native** — the framework itself
2. **Expo modules** — SQLite, filesystem, sharing, haptics, icons
3. **Routing** — `expo-router`

Anything that opens a socket, reads a device identifier, or phones home is
incompatible with this app's premise and will be rejected in review.

---

## 3. Accessibility

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-A11Y-01 | Minimum touch target | 44×44 pt on every interactive element | ✅ |
| NFR-A11Y-02 | Text contrast (body) | ≥ 4.5:1 against its background | ✅ |
| NFR-A11Y-03 | Non-text contrast (icons, borders) | ≥ 3:1 | ✅ |
| NFR-A11Y-04 | No information conveyed by colour alone | Every status pairs an icon and a text label | ✅ |
| NFR-A11Y-05 | Screen reader support | Every control has an `accessibilityLabel` and a correct `role` | ✅ |
| NFR-A11Y-06 | Progress indicators expose their value | `progressbar` role with `accessibilityValue` | ✅ |
| NFR-A11Y-07 | Text scales with OS font settings | Layouts use flexible rows, not fixed-height text boxes | ⬜ Audit pending |
| NFR-A11Y-08 | Reduced motion respected | Animations limited to the skeleton pulse; no decorative motion | ✅ |
| NFR-A11Y-10 | Haptics are optional and never block an action | A user switch; every call is fire-and-forget and cannot throw into a caller | ✅ |
| NFR-A11Y-09 | Focus order is logical | Reading order matches visual order | ⬜ Audit pending |

---

## 4. Reliability and data integrity

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-REL-01 | No data loss on app kill | Every write commits before the UI confirms it | ✅ |
| NFR-REL-02 | Multi-table writes are atomic | Payment + debt update in one transaction | ✅ |
| NFR-REL-03 | Schema upgrades never lose data | Forward-only, transactional migrations | ✅ |
| NFR-REL-04 | A failed write leaves state unchanged | Transactions roll back on throw | ✅ |
| NFR-REL-05 | Foreign keys enforced at runtime | `PRAGMA foreign_keys = ON` on every open | ✅ |
| NFR-REL-06 | Money arithmetic is exact | Integer minor units; no float at rest | ✅ |
| NFR-REL-07 | The app never crashes on an empty database | Empty states are designed states, not fallbacks | ✅ |
| NFR-REL-08 | Recovery from a corrupt database | Restore from a JSON export | ✅ |
| NFR-REL-09 | A malformed backup cannot corrupt the ledger | Validation runs before any write; the restore is one transaction | ✅ |
| NFR-REL-10 | A backup cannot lie about a balance | `paid` and `status` are rebuilt from restored payments | ✅ |
| NFR-REL-11 | Crash-free sessions | > 99.5% | ⬜ Phase 3 |

---

## 5. Offline capability

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-OFF-01 | **Every feature works with no network** | 100% of v1 functionality | ✅ |
| NFR-OFF-02 | No network permission required for core use | Core features need no connectivity grant | ✅ |
| NFR-OFF-03 | No loading spinners caused by connectivity | Skeletons resolve immediately from SQLite | ✅ |
| NFR-OFF-04 | No "you appear to be offline" states | The concept of offline does not exist in the UI | ✅ |
| NFR-OFF-05 | Data survives an extended period offline | Indefinitely; SQLite is durable | ✅ |
| NFR-OFF-06 | Export works offline | Yes — writes to local storage only | ✅ |

---

## 6. Usability

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-USA-01 | Record a debt in under 15 seconds | Person → amount → direction → save, nothing required beyond those | ✅ |
| NFR-USA-02 | Icons preferred over text | Every primary control is recognisable by glyph alone | ✅ |
| NFR-USA-03 | No onboarding wall | The app is usable immediately; a hint appears only on a genuinely empty dashboard | ✅ |
| NFR-USA-04 | Destructive actions always confirmed | Deletes and erase-all require explicit confirmation | ✅ |
| NFR-USA-05 | Destructive confirmations state the consequence | "This also deletes every debt and payment linked to them" | ✅ |
| NFR-USA-06 | Undo where cheap | Payment deletion recalculates state correctly | ✅ |
| NFR-USA-07 | No hidden gestures | No swipe-to-delete without a visible alternative | ✅ |
| NFR-USA-08 | Pull to refresh everywhere a list exists | Consistent, always available | ✅ |
| NFR-USA-09 | Currency and date formats are unambiguous | `14 Oct 2026`, grouped thousands | ✅ |
| NFR-USA-10 | Dark mode is first-class, not an inversion | Full parallel palette, not just inverted colours | ✅ |

---

## 7. Maintainability and code quality

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-MNT-01 | TypeScript strict mode | `strict: true`, zero errors on `npm run typecheck` | ✅ |
| NFR-MNT-02 | Domain logic is pure and testable | `src/domain/` has no React and no I/O imports | ✅ |
| NFR-MNT-03 | Repositories are the only SQL | No inline SQL in components or screens | ✅ |
| NFR-MNT-04 | Colour never hard-coded in a component | Only tokens from `src/theme/colors.ts` | ✅ |
| NFR-MNT-05 | Schema changes go through migrations | `SCHEMA_SQL` is frozen after release | ✅ |
| NFR-MNT-06 | Automated tests for money and state logic | `node --test`, covering `money.ts`, `debt.ts`, `date.ts`, `migrations.ts`, `backup.ts` | ✅ 153 tests |
| NFR-MNT-07 | Lint clean | `npm run lint` with no errors | ⬜ Configure ESLint |
| NFR-MNT-08 | CI runs on every push to `develop` | Typecheck + lint + tests | ✅ |
| NFR-MNT-09 | Accessibility roles set on custom controls | Not just `Pressable`, but correct `role` and `state` | ✅ |
| NFR-MNT-10 | Public API documented | Docs folder kept in step with the code | ✅ |

---

## 8. Compatibility

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-CMP-01 | Android support | API 24 (Android 7.0) and above | ✅ |
| NFR-CMP-02 | iOS support | iOS 15.1 and above | ✅ |
| NFR-CMP-03 | Web build works | Expo Router, single-page output | ✅ |
| NFR-CMP-04 | New Architecture enabled | `newArchEnabled: true` | ✅ |
| NFR-CMP-05 | Small screen support | Down to 320 pt width without clipping | ⬜ Audit pending |
| NFR-CMP-06 | Tablet support | `supportsTablet: true` | ✅ |
| NFR-CMP-07 | RTL layout ready | `I18nManager` support, no hard-coded left/right in layout logic | ⬜ Phase 3 |

---

## 9. Security of the data store

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-DB-01 | Foreign keys enforced | `PRAGMA foreign_keys = ON` | ✅ |
| NFR-DB-02 | Integrity constraints at the schema level | `CHECK` on direction, status, amount ranges | ✅ |
| NFR-DB-03 | Parameterised queries only | No string interpolation of user input into SQL | ✅ |
| NFR-DB-04 | Migrations run in a transaction | Each migration is atomic | ✅ |
| NFR-DB-05 | Schema version recorded | `schema_meta` table tracks the applied version | ✅ |
| NFR-DB-06 | Indexes cover the hot query paths | Six indexes across people, debts and payments | ✅ |
| NFR-DB-07 | No secrets in the repository | `.env` files git-ignored | ✅ |

> **Note on parameterisation:** the settings seed in `migrations.ts` builds SQL
> by interpolation, but every value there is a compile-time constant from
> `DEFAULT_SETTINGS`, never user input. All user-supplied values go through
> bound parameters.

---

## 10. What "good" means here

The NFRs that actually decide whether this app succeeds, in order:

1. **NFR-SEC-01 — no network requests.** This is the product. Without it there is
   no reason for the app to exist rather than a notebook.
2. **NFR-OFF-01 — everything works offline.** Half-finished offline support is
   worse than none, because the user only discovers it when it matters.
3. **NFR-REL-06 — exact money.** A ledger that rounds wrongly is a ledger that
   cannot be trusted. Everything else is negotiable; this is not.
4. **NFR-USA-01 — fifteen seconds to record.** If capturing a debt is slower than
   writing it in a notebook, the app gets abandoned.
5. **NFR-A11Y-04 — no colour-only meaning.** A debt ledger is used by people who
   are tired and stressed, often in bright sunlight, on a cheap phone.

Everything else in this document is in service of those five.