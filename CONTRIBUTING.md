# Contributing to Siyana Debt Tracker

Thank you for your interest. This is an open source project and contributions
are genuinely welcome — code, issues, ideas, translations and documentation
corrections all count.

**Please read [`docs/08-contributing.md`](docs/08-contributing.md)** — it has the
setup steps, code conventions, UI rules and pre-PR checklist.

## The short version

```bash
git clone https://github.com/<you>/Siyana-Debt-Tracker.git
cd Siyana-Debt-Tracker
npm install
npm start
```

- Branch from **`develop`** — `git checkout -b feature/my-thing`
- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(debt): add …`
- Open your PR against **`develop`**, never `main`
- Run `npm run typecheck && npm run lint && npm test` before requesting review
- Test on Android **and** iOS

## What helps most right now

| | |
|---|---|
| **Tests** | `src/domain/money.ts` and `src/domain/debt.ts` are pure and uncovered |
| **Accessibility** | A real VoiceOver / TalkBack pass would surface genuine issues |
| **Translations** | English → සිංහල, தமிழ் |
| **Small-screen layouts** | Check every screen at 320 pt width |
| **Docs** | Anything unclear, wrong, or missing a practical example |

See the ⬜ items in [`docs/03-feature-list.md`](docs/03-feature-list.md).

## One rule worth knowing

**This app makes no network requests.** It has no account, no server and no
telemetry. Please do not propose a dependency that would add any of those — it
would break the premise the whole project is built on. If a feature seems to
need a backend, read the non-goals in
[`docs/00-action-plan.md`](docs/00-action-plan.md) first.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licence

Contributions are accepted under the [MIT Licence](LICENSE).

## Contact

**Rasindu Appuhami** — part of **Siyana Code**
[@i4matrixrasindu](https://github.com/i4matrixrasindu) ·
[github.com/siyana-code](https://github.com/siyana-code)