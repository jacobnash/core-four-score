# Architecture & Code Quality Audit — Core Four Score

Scope: whole repo (app, ops/migration scripts, tests). Audited 2026-09-07 against the
state of `main` (uncommitted working-tree changes included, since that's the real
code that exists right now).

## Executive summary — the 5 things that matter most

1. **This repo is public on GitHub, its Firebase API key is committed in source,
   and `firestore.rules` on `main` currently allows anyone unauthenticated
   read/write/delete access to every document.** The API key being public is
   normal (see security section) — the problem is the rules. Combined, this is a
   live, immediately exploitable exposure of real data (your friend group's
   tournament/game/reneg history), not a theoretical one. **A correct fix already
   exists, unmerged, on `origin/security/lock-firestore-rules`.** Merge it before
   anything else in this document.
2. **Screens carry the business logic and none of it is tested.** Every top-level
   screen (`app/tournament/[id].tsx`, `app/(tabs)/rules.tsx`, `app/(tabs)/clays.tsx`,
   `app/profile.tsx`, `app/(tabs)/stats.tsx`, `app/join/[id].tsx`) is simultaneously
   the highest-complexity code in the repo (complexity 15–34 per ESLint) *and* sits at
   0% test coverage. This is not a coincidence — the access-control and data-shaping
   logic (who can invite, who can share a link, what to show for a locked roster) is
   written inline in JSX instead of in the already-existing `utils/tournamentMembership.ts`
   / `utils/tournamentVisibility.ts` layer. This is the highest-leverage code-quality fix.
3. **`npm run lint` was completely broken** — no ESLint config existed and ESLint
   itself wasn't installed. Nothing has been linted, possibly ever. Fixed as part of
   this audit (see Stage 1).
4. **CI never runs tests or lint.** All three GitHub Actions workflows only build and
   deploy to Firebase Hosting. The 190 passing Jest tests are a private safety net —
   a regression can merge and deploy without anyone finding out until a user does.
5. **The architecture itself is sound.** Clear layering (screens → contexts → services
   → Firestore), no circular dependencies (`madge --circular` found zero), a real
   domain-rules module (`utils/tournamentMembership.ts`) instead of scattered
   `if`-checks, and a `mapXDoc()` normalization pattern already established in
   `tournamentService.ts`. The problems below are consistency and coverage gaps, not
   a structural redesign.

---

## Phase 0 — Ground truth

**Intended architecture** (from `README.md`, `PROJECT_SUMMARY.md`,
`docs/EUCHRE_TOURNAMENTS_ROADMAP.md`): an Expo/React Native app (`expo-router` file
routing) for one friend group's Euchre tournament tracking, backed by Firebase
(Auth + Firestore), styled with NativeWind. Documented layering:
`app/` (screens) → `contexts/` (Auth, Tournament state) → `services/` (Firestore
CRUD, one file per collection) → `types/index.ts` (shared shapes). A documented
**"No Deletes" policy** (README §"Data Policy: No Deletes") requires archival
flags instead of destructive writes, enforced (per the doc) at the service layer
and in Firestore rules. There's no formal ADR directory; `docs/` has one roadmap
doc for a newer feature (multi-activity tournaments / "clays") that is mid-flight
(several `?? ` untracked files in `git status` — `app/(tabs)/clays.tsx`,
`services/clays*.ts`, `utils/claysScoring.ts` — match the roadmap).

**Actual structure** matches the intent well:
- Entry: `app/_layout.tsx` (root), `app/(tabs)/_layout.tsx`, `app/(auth)/_layout.tsx`
  — standard `expo-router` convention.
- `services/*.ts` — one module per Firestore collection (`userService`,
  `tournamentService`, `gameService`, `renegService`, `claysService`,
  `claysMatchService`, `claysLeaderboardService`), re-exported through
  `services/firestore.ts` as a barrel (`services/firestore.ts:1-10`).
- `contexts/AuthContext.tsx`, `contexts/TournamentContext.tsx` — global state, both
  consumed widely (see coupling numbers below).
- `utils/tournamentMembership.ts`, `utils/tournamentVisibility.ts`,
  `utils/tournamentNavigation.ts` — the domain-rules layer the README implies.
- Root-level `*.js` (backfill-*, import-*, check-*, test-*) and `scripts/` — one-off
  ops tooling against production/emulator Firestore, not part of the shipped app.
- CI: `.github/workflows/{deploy,firebase-hosting-merge,firebase-hosting-pull-request}.yml`
  — build + deploy only.

**Gaps between intent and reality:**
- The "No Deletes" policy is documented and (per README) meant to be enforced in
  Firestore rules — but the committed `firestore.rules` currently allows
  unrestricted read/write/delete to everything (see Finding S1). A correct version
  exists unmerged on `origin/security/lock-firestore-rules`.
- The README's "Project Structure" section is stale — it doesn't mention `clays*`
  services, `TournamentContext`, or most of `utils/`. Not urgent, but the first
  thing a future contributor (or future-you in six months) would trust and be
  misled by.
- No documented rule says "domain logic belongs in `utils/`, not in screens" — but
  the codebase clearly started that way (`tournamentMembership.ts`,
  `tournamentVisibility.ts` exist and are well-tested) and the newest screens
  don't follow it. That's drift, not a missing spec.

**Stack/idioms**: TypeScript + React (function components, hooks) + Expo Router +
Firebase JS SDK v9 modular API. Judged against those idioms — plain object modules
for services (not classes) are correct for this ecosystem; there is no dependency
injection framework and none is expected.

---

## Phase 1 — Measurements

All numbers below are from real tool runs against the current working tree, not
estimates. Tools installed for this audit: `eslint` + `eslint-config-expo` (via
`npx expo lint`, the framework's own scaffolding), `madge`, `jscpd`, `ts-prune`
(added as devDependencies, per your approval).

### Complexity (ESLint `complexity` rule, threshold 10)

Full output: ran across the whole repo. Everything above 10, sorted by area:

| File | Function | Complexity |
|---|---|---|
| `app/(tabs)/clays.tsx:43` | `ClaysScreen` | **34** |
| `scripts/audit-production-data.js:74` | `audit` | 34 |
| `app/tournament/[id].tsx:21` | `TournamentDetail` | **29** |
| `app/(tabs)/rules.tsx:28` | `RulesScreen` | **27** |
| `test-stats.js:21` | `testStats` | 24 |
| `app/profile.tsx:20` | `ProfileScreen` | **23** |
| `app/join/[id].tsx:12` | `JoinTournamentScreen` | **19** |
| `import-data.js:263` / `scripts/import/import-data.js:85` | `importData` | 20 / 16 |
| `app/(tabs)/rules.tsx:221` | `renderRule` | 20 |
| `services/gameService.ts:85` | `getLocationSuggestions` | 19 |
| `app/(tabs)/rules.tsx:110` | `cleanupOldProposals` | 17 |
| `__tests__/userStats.test.ts:372` | (test helper) | 17 |
| `app/game.tsx:10` | `GameScreen` | 16 |
| `app/(tabs)/stats.tsx:47` | `StatsScreen` | 17 |
| `app/(tabs)/games.tsx:22` | `GamesScreen` | 15 |
| `app/(tabs)/index.tsx:24` | `HomeScreen` | 15 |
| `services/tournamentService.ts:12` | `mapTournamentDoc` | 15 |
| `contexts/AuthContext.tsx:105` | (async handler) | 15 |
| ~13 more functions in the 11–14 range (components, services, scripts) | | |

**Pattern**: 10 of the 12 functions above complexity 15 are top-level screen
components. Services and utils rarely exceed 15, and when they do
(`mapTournamentDoc`, `getLocationSuggestions`) it's data-shaping, not control flow
sprawl.

Cognitive complexity / Halstead / maintainability-index tooling: **not measured** —
there is no maintained, actively-supported tool for these on a modern
TypeScript+JSX codebase (the historical options, e.g. `plato`, are unmaintained).
Cyclomatic complexity + file length are used as the practical proxy, which is
standard practice for this ecosystem.

### Coupling (afferent Ca / efferent Ce, via `madge`'s dependency graph)

| Module | Ca (depended on by) | Ce (depends on) | Note |
|---|---|---|---|
| `types/index.ts` | 31 | 0 | Correctly stable — pure types, zero cost to depend on. |
| `contexts/AuthContext.tsx` | 16 | 4 | High Ca *and* Ce — a hub. |
| `services/firestore.ts` | 15 | 8 | Barrel re-export, expected shape. |
| `contexts/TournamentContext.tsx` | 14 | 6 | Same hub pattern as AuthContext. |
| `components/Button.tsx` | 11 | 1 | Correctly stable leaf component. |
| `app/(tabs)/stats.tsx` | 0 | 13 | Leaf screen, pulls in the most. |
| `app/tournament/[id].tsx` | 0 | 12 | Leaf screen. |
| `app/(tabs)/index.tsx` | 0 | 11 | Leaf screen. |

Screens correctly have Ca=0 (nothing should depend on a screen) but the Ce=10-13
range confirms they're pulling together auth, tournament context, 2-4 services,
and 2-3 utils modules each — consistent with the complexity numbers above.

**Circular dependencies: zero** (`madge --circular`, 71 files scanned). This is
worth stating plainly as a strength — it's common for Firebase-service-heavy
codebases to develop `serviceA ↔ serviceB` cycles, and this one hasn't.

**Cycles/god-modules**: none by import-cycle detection. The closest thing to a
"god module" is `AuthContext.tsx` / `TournamentContext.tsx` by coupling count, but
their responsibilities (own their respective piece of global state) are coherent —
this is a legitimate use of React Context, not an SRP violation.

LCOM: **not applicable** — services are stateless plain-object modules
(`export const tournamentService = { async getTournament() {...}, ... }`), not
classes with instance fields, so "methods sharing fields" has no meaning here.
Distance-from-main-sequence: not applicable for the same reason (no
abstract/concrete class hierarchy in this codebase — correct for this stack).

### Duplication (`jscpd`, min 8 lines / 50 tokens)

19 clones found, 2.48% duplicated lines overall (2.18% in `.tsx`, 3.60% in `.ts`).
Concrete instances worth naming:

- **`services/tournamentService.ts:105-115` and `:149-159`** — `addMember` and
  `acceptInvite` both run the identical four-check guard sequence
  (`assertTournamentAcceptsInvites` → `canAddMemberToTournament` →
  `isRosterLocked` → membership check). `inviteUser` (`:105-122`) and
  `joinViaInviteLink` (`:173-194`) repeat three of the four. This is true
  duplication, not coincidence — it's the same business rule, copy-pasted per
  entry point.
- **`services/userService.ts:22-32`, `:62-71`, `:82-91`** — `getUser`,
  `findUserByEmail`, and `getAllUsers` each hand-build the same `User` object
  literal from a Firestore doc. `tournamentService.ts:12-27` already extracted
  this exact pattern into `mapTournamentDoc()` — `userService.ts` just never got
  the same treatment. Inconsistent application of an existing, working pattern.
- **`services/gameService.ts:40-61` (self-duplicate) and `:110-119` vs
  `renegService.ts:87-98`, `:52-61` vs `:113-122`** — similar Firestore
  query-and-map duplication within and across services.
- **UI clones** (`app/(tabs)/games.tsx` vs `app/(tabs)/index.tsx` vs
  `LeaderboardCard.tsx`; `GameDetailModal.tsx` vs `GameListItem.tsx` /
  `RenegListModal.tsx`) — smaller (9-17 lines), lower priority; likely
  copy-pasted list-item rendering.

Distinguishing true duplication from coincidence: the service-layer clones above
are true duplication (same business rule/shape, will need to change together).
The UI clones are more borderline — some is inherent to React Native's inline
`style={{...}}` idiom, not a design flaw.

### Design principles (with citations)

- **SRP** — largely respected. No file is doing more than one job at the module
  level; the issue is altitude, not responsibility-mixing (see DIP note below).
- **OCP** — `app/(tabs)/rules.tsx:221` `renderRule` (complexity 20) and
  `app/(tabs)/clays.tsx:43` `ClaysScreen` (complexity 34) both branch heavily on
  tournament/activity type inline (`if (isClays) ... else if (isCoreFourLocked)
  ... else if (isDraft) ...`) rather than dispatching through a small
  type→behavior table. Adding a third activity type (the roadmap doc mentions
  more than Euchre/clays) means editing these functions again, in place.
- **DIP** — mild violation, not severe: `app/tournament/[id].tsx:10` imports
  `claysLeaderboardService`, `leaderboardService`, `tournamentService` directly
  from `services/firestore.ts` rather than through a context/hook seam. Screens
  are the composition root here (there's no DI framework, which is correct for
  this app's size), so this is acceptable — flagging only because it's *why*
  screens are hard to test without hitting Firebase.
- **DRY** — see duplication section above; the concrete instances cited are worth
  fixing, everything else is within normal tolerance.
- **Law of Demeter** — `tournament.memberIds.includes(user.uid)` /
  `tournament?.memberIds?.includes(user.uid)`-shaped chains appear inline in at
  least `app/tournament/[id].tsx:63`, `app/(tabs)/rules.tsx:47`, and
  `app/(tabs)/clays.tsx` — three screens re-deriving "is this user a member"
  instead of calling the one function that already exists for it,
  `isTournamentMember()` in `utils/tournamentVisibility.ts` (used correctly at
  `app/tournament/[id].tsx:75` but bypassed two lines later at `:78-81` for a
  hand-rolled version). This is the clearest concrete Law-of-Demeter /
  DRY finding in the repo.
- **YAGNI** — no meaningful violations found. No frameworks-for-one-implementation,
  no speculative plugin systems. If anything the codebase under-abstracts (see
  userService above) rather than over-abstracts.
- **Connascence** — the membership/visibility rules exhibit **connascence of
  algorithm across module boundaries**: the *rule* "member AND not locked AND
  tournament active" is encoded once in `utils/tournamentMembership.ts` /
  `tournamentVisibility.ts`, but each screen re-derives its own boolean
  combination of those primitives inline (`app/tournament/[id].tsx:75-81`,
  `app/(tabs)/rules.tsx:46-49`, `app/(tabs)/clays.tsx:48-49`). Change the rule and
  you must find and update every screen's inline combination — that's the
  concrete cost, and it's the same root cause as the coverage gap below.
- **Composition over inheritance / DIT / NOC**: not applicable — no class
  inheritance in the codebase (correct for this stack).
- **Primitive obsession**: minor — tournament/user IDs are raw `string`
  everywhere with no branded type, so `addMember(tournamentId, uid)` vs
  `addMember(uid, tournamentId)` would type-check either way. Low severity for a
  4-person app; would matter more if the team or API surface grew.

### Error handling & boundaries

- 54 `catch` blocks across `app/`, `components/`, `services/`, `contexts/`. Sampled
  broadly: the common shape is `console.error(err); Alert.alert('Error', '...')`
  (e.g. `app/tournament/[id].tsx:66-68`, `:152-155`) — this is a reasonable pattern
  for a mobile app (user gets feedback, error is logged), not a silent swallow.
  No `catch {}` empty blocks were found.
  Missing: no error *types* — everything is `Error` with a string message, so
  callers can't distinguish "not found" from "permission denied" from "network
  error" (e.g. `services/tournamentService.ts:63,107,113,116` all `throw new
  Error(string)`). Not urgent at this scale, but relevant if the UI ever needs to
  react differently per error kind.
- No explicit timeouts/retries on Firestore calls — acceptable; the Firebase SDK
  has its own retry/backoff for transient network errors, so hand-rolling this
  would be reinventing what the SDK already does (correctly skipped).
- Trust boundary validation: `utils/tournamentMembership.ts`'s
  `validateTournamentMemberIds` is the one real input-validation boundary and it's
  exercised by tests (`__tests__/tournamentMembership.test.ts`). Firestore
  document shapes coming back from reads are trusted via `as` casts
  (`services/tournamentService.ts:15-25`, `services/userService.ts:23-29`) with no
  runtime validation — acceptable at this scale (single-writer, no external API
  consumers) but worth knowing if the "No Deletes"/archival policy ever gets
  violated by a malformed doc.

### Testing

- **190 tests, 26 suites, all passing** (`npx jest`, run for this audit). Zero
  skipped/xfail/flaky tests observed in this run.
- **Coverage** (`npx jest --coverage`): **21.58% statements / 15.23% branches /
  26.77% functions / 20.78% lines**, repo-wide.
- Coverage is not evenly bad — it's polarized:
  - `utils/tournamentMembership.ts`, `utils/tournamentVisibility.ts`,
    `utils/claysScoring.ts`, `utils/playerStats.ts`, `services/*Service.ts`
    (business logic + data layer) are well covered — this is where the 190 tests
    actually live, and it shows real behavioral assertions
    (`__tests__/tournamentMembership.test.ts`, `__tests__/renegService.test.ts`),
    not mock-only assertions.
  - **Every screen component is at 0% coverage**: `app/_layout.tsx`,
    `app/game.tsx`, `app/matchup.tsx`, `app/profile.tsx`, `app/(tabs)/clays.tsx`,
    `app/(tabs)/games.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/rules.tsx`,
    `app/(tabs)/stats.tsx`, `app/(tabs)/tournaments.tsx`, `app/join/[id].tsx`,
    `app/tournament/[id].tsx`, plus several components
    (`InteractiveStatsChart.tsx`, `RenegListModal.tsx`, `TournamentInvitePanel.tsx`,
    `MatchupSlotMachine.tsx`) and the brand-new `claysService.ts` /
    `claysLeaderboardService.ts` / `claysMatchService.ts` (3-5%).
- **Coverage × complexity × churn correlation** (the prioritization the task
  asked for): cross-referencing the complexity table, the coverage numbers, and
  `git log --since="90 days ago" --name-only`, one file is the clear top hotspot:

  | File | Complexity | Coverage | Churn (90d) |
  |---|---|---|---|
  | `app/tournament/[id].tsx` | 29 | 0% | 4 commits |
  | `app/(tabs)/rules.tsx` | 27 (+20, +17 in helpers) | 0% | 2 commits |
  | `app/(tabs)/tournaments.tsx` | 12 | 0% | 3 commits |
  | `contexts/TournamentContext.tsx` | — | 0% | 3 commits |
  | `app/(tabs)/index.tsx` | 15 | 0% | 3 commits |

  `app/tournament/[id].tsx` hits all three: it's the most complex screen, it has
  zero tests, and it's been touched in 4 of the last commits — every one of those
  edits was made blind, with no test catching a regression.
- Test pyramid: 100% unit-level (no e2e; a few `*.tsx` render tests via
  `@testing-library/react-native`, e.g. `tournaments.ui.test.tsx`,
  `tournamentNavigation.test.tsx`, `auth.test.tsx`). No integration tests against
  a real/emulated Firestore in the `__tests__` suite itself (the `scripts/dev/
  test-*.js` files do exercise the emulator, but they're manual dev scripts, not
  part of `npm test` or CI). Reasonable pyramid shape for this app's size — the
  gap is screen coverage, not pyramid shape.
- Test quality: assertions are behavior-level, not mock-call-count-level, in the
  suites sampled (`renegService.test.ts`, `tournamentService.test.ts`,
  `userStats.test.ts`). No shared-mutable-fixture smell observed.

### Operational & security hygiene

Given this repo is **public** (`git remote -v` → `github.com:jacobnash/core-four-score`,
confirmed public), the bar here is "what could a stranger who finds this repo
actually do," not just internal hygiene. Checked the full git history
(`git log --all -p`, all branches), not just the current tree.

- **CRITICAL — `firestore.rules` currently allows `allow read, write: if true` for
  every document** (`firestore.rules:6-8`), with the real auth-scoped rules
  commented out below it. Anyone who reads this public repo (or the Firebase
  client config that ships in the deployed web app, see below) can point the
  Firestore client SDK at this project and read, write, or delete every
  document — no login required. **A correct replacement already exists,
  unmerged, on `origin/security/lock-firestore-rules`** (adds `isSignedIn()`
  checks, per-collection read/write rules, and `allow delete: if false`
  everywhere, matching the documented No-Deletes policy). This is the most
  severe open item in the repo and it's already solved — it just needs merging,
  today, independent of anything else in this audit.
- **Firebase Web API key is hardcoded and committed** — same literal value
  (`AIzaSyA2hN4pECNQfFEkXXjMHBSd1vwZ1ZCxvlY`) appears in `services/firebase.ts:19`,
  `check-config.js:8`, `check-firestore.js:10`, and
  `scripts/dev/test-alex-kim-flow.js:34`, and is present throughout git history
  back to an early commit. **This is not itself a secret** — Firebase's own
  security model treats the client `apiKey` as a public project identifier (it
  ships in every web/mobile bundle by design; Google's docs explicitly say not
  to try to keep it secret). Its exposure here changes nothing on its own. What
  it *does* mean: since the key is public knowledge either way, **Firestore
  Security Rules are the only thing standing between this database and the
  internet** — which is exactly the rule set found wide open above. Separately,
  from a plain maintainability angle, having the same literal value copy-pasted
  into 4+ files instead of read from `.env` (a `.env.example` exists, implying
  this was the intent) means rotating the key later means hunting down every
  copy by hand.
- **Google OAuth web client ID is hardcoded** (`contexts/AuthContext.tsx:57`,
  `605611128312-....apps.googleusercontent.com`) — also a public identifier by
  design (OAuth client *IDs* are meant to be embedded in clients; only a client
  *secret* would be sensitive, and no client secret was found anywhere in the
  tree or history). Not a finding on its own.
- **No genuine secrets found** in the current tree or in full git history
  (`git log --all -p` grepped for private-key headers, AWS-style keys, Stripe
  live keys, and `SECRET`/`PASSWORD`/`PRIVATE_KEY`-shaped literal assignments):
  `serviceAccountKey.json` (the one file that *would* be a real secret — a
  Firebase Admin credential) exists locally but is **correctly gitignored**
  (`.gitignore` lists it explicitly) and was **never committed**
  (`git log --all --diff-filter=A --name-only` shows only
  `serviceAccountKey.example.json`, whose values are all `YOUR_*` placeholders).
  `backups/` (local Firestore data dumps, potentially containing real player
  data) is likewise untracked. GitHub Actions workflows correctly reference
  `secrets.FIREBASE_SERVICE_ACCOUNT_CORE_FOUR_SCORE` rather than inlining
  credentials. This is worth stating plainly: the secret-handling hygiene here
  is actually good — the exposure risk is entirely the Firestore rules, not
  leaked credentials.
- `npm audit` (production dependencies only): 56 vulnerabilities (5 critical, 22
  high, 27 moderate, 2 low), all in transitive dependencies of `expo`/
  `react-native`/`firebase-tools` build tooling (`ws`, `yaml`, etc.) — not code
  shipped in the client bundle. Not a fire to fight today, but `npx expo install
  --fix` / periodic `expo upgrade` is the correct maintenance path, not manual
  patching of transitive deps.
- **CI runs no tests and no lint** — all three `.github/workflows/*.yml` files
  only build (`expo export`) and deploy to Firebase Hosting. The 190 tests and
  (now-fixed) lint config provide zero protection against a broken merge.
- **`npm run lint` was broken**: `eslint` wasn't in `node_modules` and no config
  file existed anywhere in the repo (verified: no `.eslintrc*`, no
  `eslint.config.*` before this audit). Running it threw `eslint: command not
  found`. Fixed via `npx expo lint` (the framework's own scaffolding), which
  installed `eslint` + `eslint-config-expo` and generated `eslint.config.js`;
  first real run surfaced 24 problems (7 errors, 17 warnings) — mostly
  `react-hooks/exhaustive-deps` warnings and unescaped-entity errors, listed in
  full further down in the working tree.
- Documentation drift: `README.md`'s "Project Structure" section (lines ~163-186)
  predates `contexts/TournamentContext.tsx`, all of `utils/`, and the clays
  feature. Low severity, real friction for a future reader trusting it.
- Dead code (`ts-prune`, filtered for false positives — Expo Router `default`
  exports are always flagged as "unused" because the router loads them by file
  convention, not by import, so those are excluded below):
  - **`components/PlayerCheckbox.tsx`** — exported, zero importers anywhere in the
    codebase (`grep` confirms only self-references). Genuinely dead.
  - `services/firebase.ts:29` (`storage` export) and several `types/index.ts`
    exports (`User`, `Tournament`, `Game`, `Reneg`, `LeaderboardEntry`,
    `PlayerSelection`, `TeamMatchup`, `TournamentRule`, `ClaysMatch`,
    `ClayScoreRecord`, `ClaysMemberStats`) are flagged unused by `ts-prune` but
    are public type exports meant for consumers — normal for a `types/index.ts`
    barrel, not dead code. Included here only per the "flag what tools report"
    rule, not as an action item.

---

## Themed findings (Phase 2)

### Theme A — Screen components own business logic that belongs in `utils/`, and it's completely untested
**Where**: `app/tournament/[id].tsx`, `app/(tabs)/rules.tsx`, `app/(tabs)/clays.tsx`,
`app/profile.tsx`, `app/join/[id].tsx`, `app/(tabs)/stats.tsx`, `app/(tabs)/index.tsx`.
**Measurements**: these are the 7 highest-complexity functions in the repo (15-34,
ESLint `complexity`), and every one of them is at 0% Jest coverage. `app/tournament/[id].tsx`
additionally has the highest 90-day churn (4 commits) of any non-test file.
**Cost**: this is where real bugs will hide — access-control logic
(`isMember`/`canShareLink`/`isCoreFourLocked` combinations) is recomputed per
screen (Connascence-of-algorithm finding above) instead of called from the
already-tested `utils/tournamentVisibility.ts`, so a fix to the rule in one
screen doesn't propagate, and no test would catch it either way. Every edit to
these files (4 in the last 90 days on `tournament/[id].tsx` alone) is made blind.
**Severity**: High. **Effort**: M (per screen) — this is extraction + characterization
tests, not a rewrite.

### Theme B — `npm run lint` and CI provide no actual protection
**Where**: repo had no ESLint config/install at all (fixed during this audit); all
3 `.github/workflows/*.yml` only build+deploy.
**Measurements**: `eslint: command not found` before the fix; zero `test`/`lint`
steps in any workflow file.
**Cost**: 190 passing tests currently protect nothing in CI — a regression can
merge and auto-deploy to production (`deploy.yml` on push to `main`) without
anyone running the test suite. This is pure downside with a trivial fix.
**Severity**: High. **Effort**: S.

### Theme C — Working, existing patterns (mapper functions, membership rule module) aren't applied consistently
**Where**: `services/userService.ts` (no `mapUserDoc`, unlike `tournamentService.ts`'s
`mapTournamentDoc`); `services/tournamentService.ts:105-194` (4 near-identical guard
sequences instead of one shared function).
**Measurements**: `jscpd` clones cited above, 3.6% duplication in `.ts` files
concentrated in these two files.
**Cost**: when the membership rule changes (and it has — clays support, invite
links, and the security-rules branch all touched this area recently), there are
4 call sites in `tournamentService.ts` to update by hand instead of 1.
**Severity**: Medium. **Effort**: S.

### Theme D — Public repo + open Firestore rules = live, exploitable exposure right now
**Where**: `firestore.rules` on `main` (open) vs. `origin/security/lock-firestore-rules`
(fixed, unmerged); Firebase API key duplicated in `services/firebase.ts:19`,
`check-config.js:8`, `check-firestore.js:10`, `scripts/dev/test-alex-kim-flow.js:34`.
**Cost**: the repo is public, the Firebase project identifier is committed (which
is normal and fine on its own), and the only thing that would normally stand
between that public config and the database — the security rules — currently
allows anyone unauthenticated `read, write` on every document. This is not
"could be found eventually," it's "is discoverable by anyone who opens this
GitHub repo today." The fix already exists and is unmerged.
**Severity**: Critical. **Effort**: S — it's a `git merge` + `firebase deploy
--only firestore:rules`, not new work. **Not otherwise part of this audit's
Stage plan below** beyond flagging it first — merging it doesn't depend on
anything else here and shouldn't wait for it.

### What's already good (said plainly, not manufactured complaints)
- No circular dependencies anywhere in 71 files.
- The domain-rules layer (`utils/tournamentMembership.ts`,
  `utils/tournamentVisibility.ts`) is a real, well-tested abstraction — not
  over-engineered, not under-used by the services layer, just under-used by
  the newest screens.
- `services/*.ts` are consistently thin, stateless, one-collection-per-file — no
  god service, no cross-service coupling beyond the expected
  `tournamentService → userService` call.
- The 190 existing tests assert on real behavior, not mock call counts.
- No secrets committed to git.
- No dependency is wildly out of date or abandoned — `expo`, `react-native`,
  `firebase` are all current major versions.

---

## Things flagged as un-inspectable / out of scope
- `dist/`, `coverage/`, `node_modules/`, `.expo/` — generated/vendored, not audited.
- `Deck/` — a separate, differently-permissioned directory (`drwx------`); not
  readable/relevant to this app's source, not inspected.
- `firebase-debug.log`, `firestore-debug.log`, `nativewind-bundler.log`,
  `out.nativewind.test.css` — local debug artifacts sitting in the repo root
  (1.4MB, 27KB, 125KB, 20KB respectively). Not a code-quality issue, but worth
  noting they're untracked-but-present working-tree cruft; check `.gitignore`
  coverage for these patterns if they keep reappearing.
- Mutation testing: not run — no mutation-testing tool is set up for this stack in
  this repo (e.g. Stryker), and installing one for a single audit pass wasn't
  worth the setup cost given coverage-by-line already identifies the real gap
  (whole files at 0%, not subtle gaps within well-tested files).
