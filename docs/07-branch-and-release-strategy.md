# Branch & Release Strategy

> **Default branch:** `develop` · **Production branch:** `main`
> **Last updated:** 2026-10-15

---

## 1. The two permanent branches

| Branch | Purpose | Who merges into it | Stability |
|---|---|---|---|
| **`develop`** | Default branch. All ongoing work lands here | Anyone with write access | Stable enough to run, not necessarily stable enough to release |
| **`main`** | Production releases only | Maintainer, via a release PR | Always releasable. Never broken. |

**Everything else is temporary.** Feature branches are created from `develop` and
merge back into `develop`. They are deleted on merge.

---

## 2. The rule that matters

> **`main` receives releases. `develop` receives everything else.**
>
> No feature branch, hotfix, experiment or "quick fix" ever targets `main`
> directly.

`main` is the branch people clone by accident, the branch release tooling
watches, and the branch store builds read from. Its value comes entirely from
being boring. Protecting it is the point of having a `develop` branch at all.

---

## 3. Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<slug>` | `feature/recurring-debts` |
| Fix | `fix/<slug>` | `fix/overdue-date-timezone` |
| Refactor | `refactor/<slug>` | `refactor/extract-debt-repository` |
| Docs | `docs/<slug>` | `docs/localisation-guide` |
| Release | `release/v<major>.<minor>` | `release/v1.1` |
| Hotfix | `hotfix/<slug>` | `hotfix/migration-crash` |
| Experiment | `spike/<slug>` | `spike/biometric-api` |

Rules:

- Lowercase, hyphen-separated, no ticket numbers in the name
- One concern per branch
- Delete the branch when it merges

---

## 4. Everyday workflow

```bash
# 1. Always start from develop
git checkout develop
git pull origin develop

# 2. Branch for the work
git checkout -b feature/recurring-debts

# 3. Commit in small, reviewable pieces
git add src/
git commit -m "feat(debt): add recurrence interval to the debt form"

# 4. Push and open a PR against develop — never main
git push -u origin feature/recurring-debts

# 5. After review and green CI
#    Merge via squash, then delete the branch
```

### Why squash merge

A `develop` history that reads `feat(debt): …` → `fix typo` → `fix typo again`
is noise. Squash merging keeps the default branch legible: one commit per
merged unit of work, matching the PR title.

---

## 5. Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<optional body>

<optional footer>
```

| Type | Use |
|---|---|
| `feat` | New user-visible capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting only, no behaviour change |
| `refactor` | No behaviour change, no feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `build` | Dependencies, build config |
| `chore` | Housekeeping |
| `revert` | Reverting a previous change |

**Scope** is the area: `debt`, `payment`, `person`, `db`, `theme`, `ui`,
`export`, `docs`, `build`.

Rules:

- Subject in the imperative: "add payment method", not "added" or "adds"
- Under 72 characters
- No full stop at the end
- One logical change per commit

Examples:

```
feat(payment): support cheque settlement
fix(debt): correct overdue detection across a month boundary
refactor(db): extract the debt repository from the screen layer
docs(readme): document the offline-first design decision
feat(db): add migration for the archived flag
```

---

## 6. Pull requests

### Targeting

Every PR targets **`develop`**. A PR to `main` is wrong unless it is a release.

### Before requesting review

- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Works on Android **and** iOS
- [ ] Loading, empty and error states handled
- [ ] No console statements left behind
- [ ] Documentation updated if behaviour or setup changed
- [ ] Screenshots attached for any visual change

### Review

- At least one approving review from someone other than the author
- CI green
- No unresolved review conversations

### After merge

- Delete the branch
- `git checkout develop && git pull`

---

## 7. Releases

### Versioning — [Semantic Versioning](https://semver.org/)

```
MAJOR.MINOR.PATCH

1.4.2
│ │ └── Patch — bug fixes only
│ └──── Minor — new features, backwards compatible
└────── Major — breaking changes
```

The public API here is the data format. A change that makes an existing JSON
export impossible to import is **breaking**, regardless of the UI.

### Release procedure

```bash
# 1. Freeze and cut a release branch from develop
git checkout develop
git pull
git checkout -b release/v1.1

# 2. Bump the version in package.json and app.json
#    npm version minor          (creates the git tag too)

# 3. Open the CHANGELOG entry, link the issues closed

# 4. Open a PR:  release/v1.1  ->  main
#    This is the ONLY time a PR targets main.

# 5. Merge with a merge commit, not squash — preserve the release history.

# 6. Tag and push
git tag -a v1.1.0 -m "Siyana Debt Tracker v1.1.0"
git push origin v1.1.0

# 7. Merge back into develop so the release branch does not linger
git checkout develop
git merge --no-ff release/v1.1
git branch -d release/v1.1

# 8. Build and publish via EAS
eas build --platform all --profile production
```

### Hotfix

Only for a crash or data-loss bug in a shipped release.

```bash
git checkout main
git checkout -b hotfix/<slug>
# ... fix, with a regression test ...
git commit -m "fix(db): prevent crash when opening a v1 database"
# Open PR:  hotfix/<slug>  ->  main
# After merge and release:
git checkout develop
git merge hotfix/<slug>
```

A hotfix **must** also land on `develop`, or the next release reintroduces the
bug.

---

## 8. Branch protection

Recommended settings for both permanent branches:

| Setting | `develop` | `main` |
|---|---|---|
| Require a pull request | ✅ 1 approval | ✅ 1 approval, maintainer only |
| Require status checks | ✅ typecheck, lint, test | ✅ all checks |
| Require branches up to date | ✅ | ✅ |
| Block force push | ✅ | ✅ |
| Block deletion | ✅ | ✅ |
| Allow squash merge | ✅ preferred | ❌ merge commit only |
| Linear history | ❌ | ❌ |

`main` additionally needs **release-only** in its description, so nobody merges
into it casually.

---

## 9. GitHub flow, in one picture

```
                        ┌──────────────────────────────────┐
                        │  main — production releases      │
                        └──────────────────────────────────┘
                            ▲                     ▲
                            │ merge commit        │ hotfix
                            │ (release PR)        │
              ┌─────────────┴──────────┐          │
              │                        │          │
      ┌───────┴────────┐      ┌────────┴──────┐   │
      │  develop       │◄─────┤  hotfix/…    │───┘
      │  DEFAULT       │      └───────────────┘
      └───────┬────────┘              ▲
              │                       │
    ┌─────────┼─────────┬───────────┬──┴────────────┐
    │         │         │           │               │
feature/…  fix/…     docs/…     refactor/…       spike/…
(delete after merge)      (delete after merge)
```

---

## 10. Rules in one list

1. **`develop` is the default branch.** All work starts there.
2. **`main` is production only.** Only release PRs and hotfixes touch it.
3. **Never commit directly to `main`.**
4. **Name every branch** `type/slug` in lowercase.
5. **Squash-merge** feature branches into `develop`; **merge-commit** releases
   into `main`.
6. **Conventional Commits**, always.
7. **Delete a branch** once it is merged.
8. **A hotfix goes to both** `main` and `develop`.
9. **Never force-push** a permanent branch.
10. **Tag every release** `vX.Y.Z`.