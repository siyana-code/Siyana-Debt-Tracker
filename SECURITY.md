# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `develop` | ✅ |
| Latest `main` release | ✅ |
| Anything older | ❌ |

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report privately via
**[GitHub Security Advisories](https://github.com/siyana-code/Siyana-Debt-Tracker/security/advisories/new)** —
"Report a vulnerability" — which opens a private thread with the maintainer.

Include:

- What the issue is and how to reproduce it
- Which version or commit is affected
- What an attacker could achieve
- Any suggested fix, if you have one

**Response target:** acknowledgement within 72 hours, assessment within seven
days.

Please give the maintainer a reasonable window to release a fix before
disclosing publicly.

---

## Threat model

Siyana Debt Tracker is an **offline-only** app. That shapes what "security"
means here far more than a typical web service would.

### What the app is

| | |
|---|---|
| **Data** | Personal financial records — who owes whom, how much |
| **Trust boundary** | The device. The app sandbox is the boundary. |
| **Network** | **None.** There is no server, no sync, no backend. |
| **Authentication** | **None.** There is no account to log into. |
| **Identifiers** | None collected. No device ID, no advertising ID. |
| **Telemetry** | **None.** No analytics, no crash reporting, no Sentry. |
| **Third-party data sharing** | **None.** |

### Assets worth protecting

1. **The ledger.** Financial relationships and amounts, on a lost or stolen
   device.
2. **The export files.** JSON and CSV exports are plaintext by design — they
   are meant to be portable. Once shared, the user controls them.

### In scope

| Concern | Mitigation |
|---|---|
| Data at rest | OS app-sandbox private storage; device-level encryption applies |
| SQL injection | Bound parameters only; no interpolation of user input into SQL |
| Invalid state | `CHECK` constraints and foreign keys, so bad data is un-storable |
| Crash on malformed data | Input parsing returns `null`; screens handle absent data |
| Export tampering | Exports are user-generated files; the user owns them |
| Dependency compromise | Lockfile committed; minimal dependency set; CI runs on every push |

### Out of scope

| Not a vulnerability | Why |
|---|---|
| Data on a jailbroken or rooted device | The OS sandbox is already gone |
| A user sharing their own export | Working as intended |
| No app lock | Known gap — biometric lock is Phase 3 |
| Loss of data from uninstalling | Expected; the app has no cloud backup |
| No encryption of the database file | Relies on OS sandbox protection, like most local-first apps |

---

## Security principles

1. **The offline guarantee is a security feature.** Adding any network
   capability is a security change, not just a feature. It requires a threat
   model, and it will be rejected without one.
2. **Least privilege.** The app requests no permissions it does not use. Camera
   and notifications are requested only when the user enables the feature that
   needs them.
3. **Destructive actions confirm, and say what is lost.**
4. **No silent data loss.** A failed write leaves state unchanged.

---

## Dependency posture

The runtime dependency list is deliberately short and auditable:

| Category | Packages |
|---|---|
| **Framework** | `expo`, `react`, `react-dom`, `react-native` |
| **Storage** | `expo-sqlite` |
| **Navigation** | `expo-router`, `expo-linking`, `react-native-screens`, `react-native-gesture-handler`, `react-native-safe-area-context` |
| **Platform** | `expo-status-bar`, `expo-system-ui`, `expo-splash-screen`, `expo-constants`, `expo-haptics` |
| **Export** | `expo-file-system`, `expo-sharing` |
| **Icons** | `@expo/vector-icons` |
| **Web** | `react-native-web` |

Two rules follow from this:

- Anything that opens a socket, reads a device identifier, or phones home is
  incompatible with the product and will be rejected in review.
- A package declared but not yet imported is equally rejected. Dependencies are
  added when they are used, not in anticipation — including for planned
  features.

---

## Verifying these claims yourself

Do not take the privacy claim on trust — check it.

```bash
npm ci

# 1. Any HTTP client in the dependency tree?
npm ls | grep -Ei "axios|fetch|graphql|apollo|sentry|analytics|firebase|mixpanel"
#    Expected: no matches

# 2. Any network call in the source?
grep -rniE "\bfetch\(|XMLHttpRequest|axios\.|WebSocket" src/
#    Expected: no matches

# 3. Any analytics or telemetry?
grep -rniE "sentry|analytics|telemetry|tracking|amplitude|posthog" src/
#    Expected: no matches

# 4. Any device identifier?
grep -rniE "deviceId|advertisingIdentifier|IDFA|androidId" src/
#    Expected: no matches
```

If any of these commands returns a match, that is a bug worth reporting.

---

## Responsible disclosure

We are grateful for reports. Credit is given in the release notes unless you
prefer otherwise, and we will not take legal action against good-faith research
that respects user privacy, avoids accessing real user data, and gives us a
reasonable window to fix issues before disclosure.