# Contributing — Siyana Debt Tracker

> Contributions are genuinely welcome — code, issues, ideas, translations, and
> corrections to the documentation. This guide covers the practical part.
> For branch rules see [07-branch-and-release-strategy.md](07-branch-and-release-strategy.md).

---

## Quick start

```bash
# 1. Fork the repository on GitHub, then:
git clone https://github.com/<you>/Siyana-Debt-Tracker.git
cd Siyana-Debt-Tracker

# 2. Install
npm install

# 3. Start
npm start
#    then press  a  for Android,  i  for iOS,  w  for web
```

Requires **Node.js 20+**. An Android phone with [Expo Go](https://expo.dev/go)
is the fastest way to see it running; no Android Studio or Xcode needed.

---

## Project layout

```
src/
├── app/            Routes (expo-router). The directory IS the navigation map.
│   ├── (tabs)/     Overview · Debts · People · Settings
│   ├── debt/       new · [id]
│   ├── person/     new · [id]
│   ├── payment/    new
│   ├── export.tsx
│   └── _layout.tsx
├── components/ui/  The component kit
├── db/             Schema, migrations, repositories, export
├── domain/         Pure logic — money, debt state. No React, no I/O
├── hooks/          Data access and the change bus
├── theme/          Colour, type, spacing tokens
├── types/          Shared types
└── utils/          Dates, ids
docs/               Requirements, architecture, design system
scripts/            Icon generation, maintenance
```

---

## Code conventions

### TypeScript

- `strict: true` — no `any`, no non-null assertions without a comment
- Types are exported from `src/types` and shared; do not redeclare shapes
- Prefer discriminated unions over optional-field bags

```ts
// Good
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Avoid
type Result<T> = { ok: boolean; value?: T; error?: string };
```

### Money

Never write a float literal in business logic.

```ts
// Wrong
const total = debts.reduce((s, d) => s + d.principal / 100, 0);

// Right — minor units are already integers
const total = debts.reduce((s, d) => s + d.principal, 0);
const display = formatMoney(total, 'LKR');
```

### SQL

All SQL lives in `src/db/repositories/`. Use bound parameters.

```ts
// Wrong — injection risk
await runAsync(`SELECT * FROM debts WHERE person_id = '${id}'`);

// Right
await runAsync('SELECT * FROM debts WHERE person_id = ?', [id]);
```

### Colours and spacing

Tokens only. `grep -r "#[0-9A-Fa-f]\{6\}" src/components src/app` must return
nothing.

```tsx
// Wrong
<View style={{ backgroundColor: '#F7F7F7' }} />

// Right
const theme = useTheme();
<View style={{ backgroundColor: theme.colors.background }} />
```

### Accessibility — not optional

Every interactive element needs a label and a role.

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={`Record payment for ${person.name}`}
  hitSlop={8}
  onPress={onPress}
>
```

### Comments

Comment the *why*, never the *what*. The code already says what it does.

```ts
// Weak
// Loop through debts
for (const debt of debts) {

// Strong
// Overpayment is clamped so `paid` can never exceed what is owed; the payment
// row keeps the true figure for the audit trail.
const clamped = Math.min(newPaid, debt.principal);
```

---

## UI guidelines

The full system is in [06-design-system.md](06-design-system.md). The short version:

1. **Icons before text.** If a control can be a glyph, make it a glyph.
2. **Never colour-code direction.** Lent/borrowed is `arrow-up-right` /
   `arrow-down-left`.
3. **Never encode meaning in colour alone.** Every status badge is icon + label.
4. **44 pt minimum touch target**, plus hit slop.
5. **Loading uses skeletons**, never spinners. There is no network to wait for.
6. **Destructive actions confirm**, and the confirmation says exactly what is
   lost.
7. **No emoji.** Ionicons only.

---

## Schema changes

Schema changes are permanent. If you touch the schema:

1. **Never edit `SCHEMA_SQL` in `src/db/schema.ts`** once it has shipped.
2. **Append** a migration to `src/db/migrations.ts`.
3. **Bump** `SCHEMA_VERSION` in `src/db/schema.ts`.
4. Migrations must run inside a transaction and work on both a fresh install and
   an existing database.

```ts
{
  version: 4,
  name: 'add_debt_tags',
  up: `
    ALTER TABLE debts ADD COLUMN tags TEXT;
    CREATE INDEX IF NOT EXISTS idx_debts_tags ON debts(tags);
  `,
}
```

---

## Adding a dependency

A high bar. The app has a specific dependency posture (see
[02-non-functional-requirements.md §2](02-non-functional-requirements.md)).

**Automatically rejected:** anything that makes a network request, collects a
device identifier, or reports telemetry. This is not a technical judgement — it
is the product.

**Before proposing anything else, ask whether it is already available:**
`expo-*` modules, `Ionicons`, or ~30 lines of your own code.

If a new dependency is genuinely necessary, the PR should explain what it
replaces and what it costs the user in bundle size.

---

## Before opening a pull request

```bash
npm run typecheck   # must be clean
npm run lint        # must be clean
npm test            # must pass
```

Then confirm:

- [ ] Works on **both** Android and iOS
- [ ] Loading, empty and error states handled
- [ ] Pull to refresh reflects the change
- [ ] Documentation updated if behaviour or setup changed
- [ ] Screenshots for any visual change
- [ ] PR targets **`develop`**
- [ ] Branch name is `type/slug`

---

## Reporting a bug

Include:

- **Device and OS version**
- **App version** (Settings → About)
- **Expo SDK / React Native version** if you built from source
- What you did, what happened, what you expected
- Screenshots or a screen recording

If the bug involves data, describe the *shape* of the data — never paste
someone's real financial records into an issue.

---

## Good first issues

| Area | Example |
|---|---|
| Documentation | Translate a document; clarify a confusing section |
| Tests | Cover a branch of `money.ts` or `debt.ts` |
| Accessibility | Run a VoiceOver / TalkBack pass and report findings |
| UI | Fix a small-screen layout issue at 320 pt width |
| Feature | Pick anything from the ⬜ list in [03-feature-list.md](03-feature-list.md) |
| Translation | English, සිංහල, தமிழ் strings |

Comment on an issue before starting so two people do not duplicate the work.

---

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
Briefly: be decent. Assume good faith. Criticise the code, never the person.

---

## Licence

Contributions are accepted under the [MIT Licence](../LICENSE). By opening a
pull request you confirm you have the right to submit the code under it.

---

## Recognition

Every contributor is listed in the GitHub contributors graph. For substantial
ongoing work — maintainership, large features, sustained review effort — ask to
be added to the acknowledgements in the README.