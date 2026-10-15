# Action Plan — Siyana Debt Tracker

> **Owner:** Rasindu Appuhami · **Brand:** Siyana Code · **Status:** Phase 1 complete
> **Last updated:** 2026-10-15

---

## 1. Vision

Money lent and borrowed is a universal, unglamorous problem. Existing solutions
are either spreadsheets, paper notebooks, or apps that demand an account and a
network connection. Siyana Debt Tracker takes one position:

> **A debt ledger that works with no signal, asks for nothing, and explains
> itself with icons.**

### Success looks like

| Horizon | Measure | Target |
|---|---|---|
| 30 days | App opens in under 2 seconds on a mid-range Android | 95th percentile < 2.0 s |
| 30 days | Crashes during normal use | Zero |
| 90 days | Public contributors (issues, PRs, translations) | 10+ |
| 180 days | Play Store public release | Shipped and stable |
| 180 days | People who keep using it after week one | > 40% |

### Non-goals

These are deliberately **out of scope**. Saying no early prevents the slow
erosion of a focused app.

- ❌ Cloud sync or a backend of any kind
- ❌ User accounts, authentication, or social login
- ❌ Bank integration or automatic transaction import
- ❌ Multi-device real-time collaboration
- ❌ Investment tracking, budgeting, or expense categories
- ❌ Advertising or analytics SDKs of any kind

---

## 2. Principles

These decision rules outrank speed of delivery.

1. **Offline is the default, not a fallback.** Any feature that cannot work
   without a network is not a feature. If something needs a server, it is out.
2. **Privacy is a feature, not a policy.** No telemetry, no crash reporting to
   third parties, no identifiers. The device is the whole trust boundary.
3. **Icons before words.** Every screen should be navigable by glyph. Text labels
   are a fallback, never the primary signal.
4. **Money is never a float.** Integer minor units, always, at rest.
5. **Schema changes are permanent.** Migrations are forward-only and shipped.
   Never rewrite history in a released version.
6. **Destructive actions require confirmation.** Deleting a person, erasing all
   data — always confirm, always say what is lost.

---

## 3. Product principles in practice

| Principle | Concrete consequence in the codebase |
|---|---|
| Icons before words | `SegmentedControl`, `SheetOption` and `CategoryChip` all accept `icon` without a `label` |
| Direction by shape | Lent/borrowed uses arrow glyphs (`arrow-up-right` / `arrow-down-left`), never red/green |
| Money precision | `src/domain/money.ts` — `parseAmount` / `formatMoney` are the only place floats exist |
| Offline default | No HTTP client is a dependency. There is literally no code path that calls a server |
| Destructive safety | `deletePerson` refuses while open debts exist; `eraseAllData` double-confirms |

---

## 4. Phases

### Phase 0 — Foundation ✅ **Complete**

**Goal:** a repository that a stranger can clone, run and understand.

| # | Task | Status |
|---|---|---|
| 0.1 | Git repository, `main` + `develop` branch rules | ✅ |
| 0.2 | GitHub repository, description, topics, licence | ✅ |
| 0.3 | Expo SDK 57 + TypeScript strict scaffold | ✅ |
| 0.4 | SQLite schema, forward-only migrations, repositories | ✅ |
| 0.5 | Design tokens and `ThemeProvider` | ✅ |
| 0.6 | App icon and splash assets, generated from SVG | ✅ |
| 0.7 | Documentation set | ✅ |

---

### Phase 1 — Core ledger ✅ **Complete**

**Goal:** the smallest app that genuinely solves the problem.

| # | Task | Status |
|---|---|---|
| 1.1 | People: create, edit, archive, delete | ✅ |
| 1.2 | Debts: create with direction, amount, category, due date | ✅ |
| 1.3 | Payments: record, list, delete | ✅ |
| 1.4 | Dashboard: net balance, lent, borrowed, overdue, settled | ✅ |
| 1.5 | Debt list: search, filter by direction/state/category | ✅ |
| 1.6 | Person screen with per-person balance and history | ✅ |
| 1.7 | Settled / overdue state derived correctly | ✅ |

**Exit criteria:** a user can record a debt, partially pay it, see the balance
drop, and mark it settled — entirely offline. **Met.**

---

### Phase 2 — Polish and trust 🔄 **In progress**

**Goal:** make it feel finished and safe to hand to someone else.

| # | Task | Priority | Status |
|---|---|---|---|
| 2.1 | JSON export / import round-trip | High | ✅ Export done |
| 2.2 | CSV export for spreadsheets | High | ✅ |
| 2.3 | Light / dark / system theme | High | ✅ |
| 2.4 | Currency selection | High | ✅ |
| 2.5 | Due-soon reminder window setting | Medium | ✅ |
| 2.6 | Haptic feedback on record / settle | Medium | ⬜ |
| 2.7 | Onboarding: three-screen first-run guide | Medium | ⬜ |
| 2.8 | Accessibility audit (screen reader, contrast) | High | ⬜ |
| 2.9 | Automated test suite for money and debt logic | High | ⬜ |
| 2.10 | Import from JSON (completes the backup story) | High | ⬜ |

---

### Phase 3 — Reach ⬜ **Planned**

**Goal:** people can actually find and trust the app.

| # | Task | Priority |
|---|---|---|
| 3.1 | Local notifications for due dates | High |
| 3.2 | Biometric app lock | High |
| 3.3 | Store listing: screenshots, description, privacy policy | High |
| 3.4 | Release signing and internal testing track | High |
| 3.5 | Play Store / App Store public release | High |
| 3.6 | In-app language switch (English, සිංහල, தமிழ்) | Medium |

---

### Phase 4 — Depth ⬜ **Planned**

**Goal:** remove the remaining manual friction.

| # | Task | Priority |
|---|---|---|
| 4.1 | Recurring / scheduled debts | Medium |
| 4.2 | Receipt photo attached to a debt | Medium |
| 4.3 | Multi-currency dashboard totals | Medium |
| 4.4 | Debt splitting between people | Medium |
| 4.5 | Home-screen widget showing net balance | Low |

---

## 5. Milestones

| Milestone | Definition | Target |
|---|---|---|
| **M1 — Ledger works** | Phase 1 exit criteria met | ✅ Done |
| **M2 — Trustworthy** | Tests pass, a11y audit clean, backup round-trips | 2026-11 |
| **M3 — In store** | Public release on both platforms | 2026-12 |
| **M4 — Localised** | Three languages, community-translated | 2027-Q1 |

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SQLite migration breaks on a real user upgrade | Medium | **Critical** | Forward-only migrations, tested on seeded fixtures, never edit a shipped migration |
| Floating-point money rounding | Low | **Critical** | Integer minor units everywhere; dedicated test suite in 2.9 |
| Scope creep toward a finance suite | High | High | Written non-goals in §1; any new idea is weighed against them |
| Slow first paint on low-end Android | Medium | Medium | Deferred DB warm-up only in the root layout; skeleton loaders instead of spinners |
| Notification permission feels intrusive | Medium | Low | Off until the user explicitly enables it in Settings |
| Sole maintainer bus factor | High | High | Documentation-first, open source by design, community PRs encouraged |
| npm registry flakiness during CI | High | Low | Pinned lockfile, `npm ci` in CI |

---

## 7. Definition of done

A task is done when **all** of these hold:

- [ ] Implemented and working on Android and iOS
- [ ] `npm run typecheck` passes with zero errors, strict mode
- [ ] Pull-to-refresh reflects the change
- [ ] Loading, empty and error states all handled
- [ ] Icons used in preference to text for any new control
- [ ] Accessibility labels on every interactive element
- [ ] Touch targets at least 44×44
- [ ] Relevant documentation updated
- [ ] Merged into `develop`, not `main`

---

## 8. How to use this document

1. **Adding a feature?** Write it under the matching phase, with a priority.
2. **Starting work?** Create `feature/<slug>` from `develop` (see
   [07-branch-and-release-strategy.md](07-branch-and-release-strategy.md)).
3. **Something changed?** Update the phase status and the date at the top.
4. **Disagreeing with a principle?** Raise it before building — changing the
   direction afterwards is far more expensive than the feature itself.