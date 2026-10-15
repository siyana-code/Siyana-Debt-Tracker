# Documentation index

> **Siyana Debt Tracker** — a private, offline-first ledger for what you lend
> and borrow. Built by Rasindu Appuhami for **Siyana Code**.

Start with the [action plan](00-action-plan.md) if you want the shape of the
project, or the [architecture](04-architecture.md) if you want to change the
code.

---

## Core documents

| # | Document | What it is for |
|---|---|---|
| 00 | [Action Plan](00-action-plan.md) | Vision, principles, phases, milestones, risks |
| 01 | [Functional Requirements](01-functional-requirements.md) | What the app must do, with IDs and acceptance criteria |
| 02 | [Non-Functional Requirements](02-non-functional-requirements.md) | Performance, privacy, accessibility, reliability |
| 03 | [Feature List](03-feature-list.md) | Shipped, in progress, planned, and explicitly rejected |

## Technical documents

| # | Document | What it is for |
|---|---|---|
| 04 | [Architecture](04-architecture.md) | Layers, data flow, and the decision records |
| 05 | [Data Model](05-data-model.md) | Tables, indexes, invariants, migrations |
| 06 | [Design System](06-design-system.md) | Palette, typography, spacing, iconography, UI rules |
| 07 | [Branch & Release Strategy](07-branch-and-release-strategy.md) | `main` / `develop` rules, versioning, releases |
| 08 | [Contributing](08-contributing.md) | Setup, conventions, commit format, PR process |

## Project files

| File | |
|---|---|
| [README.md](../README.md) | Project overview and quick start |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Short contribution guide |
| [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | Community expectations |
| [SECURITY.md](../SECURITY.md) | Reporting a vulnerability, and the threat model |
| [LICENSE](../LICENSE) | MIT |

---

## Reading by intent

**I want to understand what this app does**
→ [README](../README.md), then [Functional Requirements](01-functional-requirements.md)

**I want to build this locally**
→ [README § Quick start](../README.md#quick-start)

**I want to contribute code**
→ [Contributing](08-contributing.md), then [Branch Strategy](07-branch-and-release-strategy.md)

**I want to change the database**
→ [Data Model § 4 Migrations](05-data-model.md#4-migrations), then read the
migration rules in [Contributing](../CONTRIBUTING.md#schema-changes)

**I want to change the UI**
→ [Design System](06-design-system.md) — especially §5 Iconography and §7 Interaction rules

**I want to change the colours**
→ [Design System § 2 Colour palette](06-design-system.md#2-colour-palette) and
[`src/theme/colors.ts`](../src/theme/colors.ts). Both must change together.

**I want to ship a release**
→ [Branch Strategy § 7 Releases](07-branch-and-release-strategy.md#7-releases)

**I want to file a bug**
→ [Contributing § Reporting a bug](08-contributing.md#reporting-a-bug)

---

## Conventions used throughout

- **Requirement IDs** — `FR-DBT-14`, `NFR-PERF-03`. Referenced from issues,
  tests and pull requests.
- **Status markers** — ✅ shipped · 🔄 in progress · ⬜ planned · ❌ rejected
- **Priority** — 🔴 must · 🟡 should · 🟢 could
- **Branch naming** — `feature/`, `fix/`, `refactor/`, `docs/`, `release/`, `hotfix/`

---

## Keeping documentation current

Documentation is part of the definition of done (see the
[action plan § 7](00-action-plan.md#7-definition-of-done)). A change that
alters behaviour should update the relevant document in the same pull request.

| You changed | Update |
|---|---|
| A user-visible behaviour | `01-functional-requirements.md` |
| A performance, privacy or reliability property | `02-non-functional-requirements.md` |
| A feature's status | `03-feature-list.md` |
| The schema or a data rule | `05-data-model.md` |
| A colour, component or UI rule | `06-design-system.md` |
| The project stage or a milestone | `00-action-plan.md` |