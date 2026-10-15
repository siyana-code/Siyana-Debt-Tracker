<!--
  PR template for Siyana Debt Tracker.
  Target branch is always `develop` (except releases, which target `main`).
-->

## What this changes

<!-- One or two sentences. Link the issue if there is one: Closes #123 -->

## Type

- [ ] `feat` — new capability
- [ ] `fix` — bug fix
- [ ] `docs` — documentation only
- [ ] `refactor` — no behaviour change
- [ ] `perf` — performance
- [ ] `test` — tests
- [ ] `build` / `chore` — housekeeping

## Platform

- [ ] Android
- [ ] iOS
- [ ] Web
- [ ] All

## Checklist

- [ ] Branched from `develop` and named `type/slug`
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — clean
- [ ] `npm test` — passing
- [ ] Works on **both** Android and iOS
- [ ] Loading, empty and error states handled
- [ ] Pull to refresh reflects the change
- [ ] No hard-coded colours — tokens from `src/theme`
- [ ] No emoji — Ionicons glyphs only
- [ ] Every new control has an `accessibilityLabel` and a role
- [ ] Touch targets at least 44×44
- [ ] No SQL outside `src/db/`; user input bound as parameters
- [ ] No floats used for money
- [ ] Documentation updated if behaviour changed
- [ ] Screenshots attached for any visual change

## Schema

- [ ] Not applicable
- [ ] New migration appended to `src/db/migrations.ts`
- [ ] `SCHEMA_VERSION` bumped in `src/db/schema.ts`
- [ ] Verified against both a fresh install and an existing database

## Offline & privacy

- [ ] This change works with no network
- [ ] No new dependency that makes a network request, collects an identifier, or reports telemetry
- [ ] No user data is sent anywhere

## Screenshots

<!-- Before / after, or record a short GIF for interaction changes. -->

## Notes for reviewers

<!-- Anything that needs specific attention. Points of uncertainty.
     If you changed the data model, explain the migration path. -->