<div align="center">

<img src="assets/icon.png" alt="Siyana Debt Tracker" width="110" />

# Siyana Debt Tracker

**Track what you lend and borrow. Keep it on your phone. Nothing else.**

[![Expo](https://img.shields.io/badge/Expo-57.0.28-000000?style=flat&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-000000?style=flat&logo=react&logoColor=61DAFB)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-3484F0?style=flat)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Web-3484F0?style=flat)](https://expo.dev)

</div>

---

## What it is

Siyana Debt Tracker is a small, private, **offline-first** app for the money you
hand out and take in. Lend a friend 5,000 for a bike. Borrow 20,000 from a
cousin. Record it once, and the app keeps the running balance, the due date and
the payment history — all on your device.

There is **no account, no server, no sync, and no telemetry**. Your ledger never
leaves the phone unless you export it yourself.

| | |
|---|---|
| **Offline** | 100% local. Works in aeroplane mode, on a dead SIM, in a village with no signal. |
| **Private** | No account, no tracking, no analytics, no network permission required for core use. |
| **Precise** | All money stored as integers in minor units — no floating-point rounding drift. |
| **Icon-led** | Meaning carried by glyphs and direction arrows so the UI reads at a glance. |
| **Open source** | MIT. Fork it, ship it, teach with it. |

## Screens

| Overview | Debts | People | Settings |
|---|---|---|---|
| Net balance, lent vs borrowed, overdue and due-soon strips | Filter by direction, state and category; search; progress per debt | Per-person balances and history | Currency, theme, due-soon window, export, erase data |

## Quick start

Requires **Node.js 20+**.

```bash
git clone https://github.com/siyana-code/Siyana-Debt-Tracker.git
cd Siyana-Debt-Tracker
npm install
npm start
```

Then press `a` for Android, `i` for iOS, or `w` for web in the Expo CLI.

```bash
npm run typecheck   # TypeScript, strict mode
npm run icons       # regenerate icons and splash from assets/source/*.svg
```

## Architecture at a glance

```
src/
├── app/            expo-router file-based routes
│   ├── (tabs)/     Overview · Debts · People · Settings
│   ├── debt/       new · [id]
│   ├── person/     new · [id]
│   └── payment/    new
├── components/ui/  the icon-first component kit
├── db/             SQLite schema, forward-only migrations, repositories
├── domain/         pure logic — money, debt state, summaries (no I/O)
├── hooks/          useDashboard · useDebts · useSettings
├── theme/          colour, type, spacing tokens + ThemeProvider
├── types/          shared domain types
└── utils/          date, id helpers
```

**Storage** is `expo-sqlite` with WAL journaling. Schema changes ship as
forward-only, transactional migrations — see [`src/db/migrations.ts`](src/db/migrations.ts).

**Data flow** is one-directional: screen → repository → SQLite → state. A small
publish/subscribe bus notifies every mounted screen after a write, so recording
a payment updates the dashboard, the list and the person page at once.

**Money** never touches a float at rest. `parseAmount` converts user input to
integer minor units once, and rounding happens only at that boundary.

## Documentation

Everything is documented in [`docs/`](docs/).

| Doc | What it covers |
|---|---|
| [Action Plan](docs/00-action-plan.md) | Phases, milestones, priorities, risks |
| [Functional Requirements](docs/01-functional-requirements.md) | What the app must do, with acceptance criteria |
| [Non-Functional Requirements](docs/02-non-functional-requirements.md) | Performance, privacy, accessibility, reliability |
| [Feature List](docs/03-feature-list.md) | Shipped, in progress, and planned features |
| [Architecture](docs/04-architecture.md) | Layers, data flow, decision records |
| [Data Model](docs/05-data-model.md) | Tables, indexes, invariants, migrations |
| [Design System](docs/06-design-system.md) | Palette, typography, spacing, iconography, UI rules |
| [Branch & Release Strategy](docs/07-branch-and-release-strategy.md) | `main` / `develop` rules, versioning, releases |
| [Contributing](docs/08-contributing.md) | Setup, conventions, commit format, PR process |

## Branching

`develop` is the default branch. Every feature branches from it and merges back
into it. `main` only ever receives release-ready, tested code.

```
develop  ──┬─── feature/xxx ──► develop
           ├─── fix/xxx ───────► develop
           └─── (release) ─────► main ──► tag v1.x.x
```

Full rules: [docs/07-branch-and-release-strategy.md](docs/07-branch-and-release-strategy.md).

## Roadmap

- [x] Core ledger — people, debts, payments, offline SQLite
- [x] Dashboard with net balance and attention strips
- [x] Filter, search and category system
- [x] JSON and CSV export
- [x] Light / dark / system themes
- [ ] Local notifications for due dates
- [ ] Biometric lock
- [ ] Scheduled recurring debts
- [ ] Attach a receipt photo to a debt
- [ ] Multi-currency totals on the dashboard

Track progress in [docs/03-feature-list.md](docs/03-feature-list.md).

## Contributing

Contributions are welcome — issues, ideas, translations, code. Read
[CONTRIBUTING.md](CONTRIBUTING.md) and
[docs/08-contributing.md](docs/08-contributing.md) first.

## Licence

MIT © [Rasindu Appuhami](https://github.com/i4matrixrasindu) — part of
**Siyana Code**. See [LICENSE](LICENSE).

## Acknowledgements

Built on [Expo](https://expo.dev) and [React Native](https://reactnative.dev).
Icons from [Ionicons](https://ionic.io/ionicons). Typography follows the
standard Google Material type scale.