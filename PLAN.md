# Remediation Plan — Core Four Score

Companion to `AUDIT.md`. Every item below cites the finding it comes from.
Nothing here is a rewrite — every stage keeps `npm test` green and ships
incrementally.

## The 5 things that matter most (do these, skip the rest if short on time)

1. **Merge `origin/security/lock-firestore-rules` and deploy it.** (Audit Theme D)
   This is outside the staged plan below on purpose — it doesn't depend on
   anything here and shouldn't wait for it. `git checkout main && git merge
   origin/security/lock-firestore-rules && firebase deploy --only
   firestore:rules`. Verify with the Firebase console rules simulator or by
   confirming an unauthenticated read now fails.
2. Add a CI step that runs `npm test` and `npm run lint` on every PR and blocks
   merge on failure (Stage 1, item 1.1).
3. Extract the tournament-visibility booleans out of
   `app/tournament/[id].tsx`, `app/(tabs)/rules.tsx`, `app/(tabs)/clays.tsx` into
   one shared hook, and pin current screen behavior with characterization tests
   first (Stage 0 → Stage 2).
4. Collapse the 4 duplicated membership-guard sequences in
   `services/tournamentService.ts` into one function (Stage 1, item 1.4).
5. Move the hardcoded Firebase API key into `.env` / `expo-constants`, matching
   the `.env.example` that already exists (Stage 1, item 1.5) — not urgent for
   security (the key is meant to be public) but removes 4-way copy-paste.

---

## Stage 0 — Safety net

### 0.1 Characterization tests for the screens Stage 2 will touch
- **Rationale**: Audit Theme A — `app/tournament/[id].tsx`, `app/(tabs)/rules.tsx`,
  `app/(tabs)/clays.tsx` are complexity 27-34 and 0% covered. Refactoring them
  without pinning current behavior first risks silently changing who can invite,
  share, or see what.
- **Files touched**: new `__tests__/tournamentDetailScreen.test.tsx`,
  `__tests__/rulesScreen.test.tsx`, `__tests__/claysScreen.test.tsx` (or extend
  existing `tournamentNavigation.test.tsx` if it already renders these).
- **Test strategy**: `@testing-library/react-native` render tests (the pattern
  already used in `tournaments.ui.test.tsx`/`auth.test.tsx`) covering the
  branches that matter: member vs. non-member, draft vs. active, core-four-locked
  vs. open, clays vs. euchre. Assert on rendered output (button visibility, text
  shown), not implementation details.
- **Acceptance criteria**: each of the 3 screens has tests covering every
  branch identified in the audit's complexity table for that file, all passing
  against current behavior.
- **Size**: M. **Dependencies**: none. **Risk**: low — pure test addition.

### 0.2 Record baseline metrics
- **Rationale**: so Stage 2/3 progress is measurable, not asserted.
- **What**: commit the current numbers from `AUDIT.md` (21.58% statement
  coverage, 2.48% jscpd duplication, complexity table) as the baseline. No new
  tooling — just don't lose the numbers already gathered.
- **Size**: XS (already done by writing AUDIT.md).

---

## Stage 1 — Low-risk, high-leverage

### 1.1 Wire lint + test into CI
- **Rationale**: Audit Theme B — CI currently runs neither.
- **Files touched**: `.github/workflows/*.yml` (add a `test` job or step
  running `npm run lint && npm test` before the existing build/deploy jobs;
  make deploy depend on it via `needs:`).
- **Acceptance criteria**: a PR with a failing test or lint error is blocked
  from merging/deploying; a passing PR is unaffected.
- **Test strategy**: open a throwaway PR with a deliberately broken test to
  confirm the gate fires, then revert.
- **Size**: S. **Dependencies**: none (ESLint config from this audit already
  committed). **Risk**: low.

### 1.2 Keep the ESLint config this audit added, fix what it found
- **Rationale**: Audit Theme B — `npm run lint` was non-functional; first real
  run surfaced 24 problems (7 errors, 17 warnings).
- **Files touched**: `eslint.config.js` (already created), plus the flagged
  files: `app/game.tsx:106`, `app/matchup.tsx:93`,
  `components/EditScreenInfo.tsx:41` (unescaped `'` → `&apos;`),
  `components/__tests__/StyledText-test.js` (missing Jest globals in ESLint
  env), a handful of `react-hooks/exhaustive-deps` warnings
  (`app/_layout.tsx:75`, `app/profile.tsx:49,65`, `app/tournament/[id].tsx:73`).
- **Acceptance criteria**: `npm run lint` exits 0 (errors fixed; warnings
  triaged — either fixed or explicitly suppressed with a comment explaining
  why, e.g. an intentionally-omitted effect dependency).
- **Test strategy**: existing test suite must stay green; these are lint-level
  fixes, not behavior changes.
- **Size**: S. **Dependencies**: 1.1 (so it stays fixed). **Risk**: low —
  double-check the `exhaustive-deps` fixes don't change *when* effects fire.

### 1.3 Delete dead code
- **Rationale**: Audit Phase 1 — `components/PlayerCheckbox.tsx` has zero
  importers anywhere in the codebase.
- **Files touched**: delete `components/PlayerCheckbox.tsx`.
- **Acceptance criteria**: `npm test` and `npx tsc --noEmit` still pass.
- **Size**: XS. **Risk**: none — confirmed zero references before deleting.

### 1.4 Collapse the tournament-membership guard duplication
- **Rationale**: Audit Theme C — `tournamentService.ts` `addMember` (`:131-147`),
  `acceptInvite` (`:149-167`), `inviteUser` (`:105-122`), and
  `joinViaInviteLink` (`:173-194`) each repeat the same 3-4 check sequence
  (`assertTournamentAcceptsInvites` → `canAddMemberToTournament` →
  `isRosterLocked`).
- **Files touched**: `services/tournamentService.ts` — extract a private
  `assertCanJoin(tournament, uid)` helper called by all four methods.
- **Acceptance criteria**: existing `__tests__/tournamentService.test.ts` and
  `__tests__/tournamentMembership.test.ts` pass unmodified (behavior-preserving
  refactor); no new `if` branches added, only consolidated.
- **Test strategy**: run existing suite before/after; add one test per method
  confirming it still calls through the shared guard (if not already covered).
- **Size**: S. **Dependencies**: none. **Risk**: low — pure extraction, tests
  already exist for each public method.

### 1.5 Extract a `mapUserDoc` helper in `userService.ts`
- **Rationale**: Audit Theme C — `getUser`, `findUserByEmail`, `getAllUsers`
  each hand-build the same `User` shape; `tournamentService.ts:12-27` already
  has this pattern as `mapTournamentDoc`.
- **Files touched**: `services/userService.ts:16-93`.
- **Acceptance criteria**: `__tests__/userService.test.ts` passes unmodified.
- **Size**: XS. **Dependencies**: none. **Risk**: low.

### 1.6 Move the Firebase config to env vars
- **Rationale**: Audit Theme D / Phase 1 — the same API key is hardcoded in 4+
  files; `.env.example` already documents the intended shape.
- **Files touched**: `services/firebase.ts:19`, `check-config.js:8`,
  `check-firestore.js:10`, `scripts/dev/test-alex-kim-flow.js:34` → read from
  `process.env.EXPO_PUBLIC_FIREBASE_API_KEY` (Expo's public-env convention) or
  `expo-constants`, sourced from a real (gitignored) `.env`.
- **Acceptance criteria**: app still builds and connects to Firebase in dev
  (`npm run dev:web`); no behavior change, just one source of truth.
- **Size**: S. **Risk**: low — this key isn't secret, so there's no rotation
  urgency; do it opportunistically.

### 1.7 Dependency hygiene
- **Rationale**: Audit Phase 1 — 56 `npm audit` findings, all transitive,
  mostly build-tooling (`ws`, `yaml`) inside `expo`/`react-native`.
- **What**: `npx expo install --fix` to align versions Expo actually supports,
  then re-run `npm audit --omit=dev` and confirm the count drops or the
  remainder is genuinely unfixable without a major Expo SDK bump (which is a
  Stage 3 decision, not a Stage 1 patch).
- **Size**: S. **Risk**: low — `expo install --fix` targets known-compatible
  versions.

---

## Stage 2 — Structural

### 2.1 Extract tournament-access derivation into a shared hook
- **Rationale**: Audit Theme A + the connascence finding — `isMember`,
  `canShareLink`, `isCoreFourLocked`, `isDraft`-shaped booleans are
  independently recomputed in `app/tournament/[id].tsx:75-81`,
  `app/(tabs)/rules.tsx:42-49`, `app/(tabs)/clays.tsx:48-49`, each combining the
  same primitives from `utils/tournamentMembership.ts` /
  `utils/tournamentVisibility.ts` slightly differently.
- **Current state**: 3+ screens each hand-roll their own combination of the
  same primitives, untested, at high cyclomatic complexity.
- **Target state**: one `hooks/useTournamentAccess.ts` (parallel to the
  existing `hooks/useTournamentHomeRedirect.ts`) taking `(tournament, user)`
  and returning `{ isMember, isDraft, isCoreFourLocked, canShareLink, isClays,
  showClays }`, built from and delegating to the existing `utils/` functions —
  not reimplementing them.
- **Migration steps** (each keeps the build green):
  1. Write `hooks/useTournamentAccess.ts` + its own unit tests, covering the
     matrix from the Stage 0.1 characterization tests.
  2. Swap `app/tournament/[id].tsx` to use it; re-run its characterization
     tests — must pass unchanged.
  3. Repeat for `app/(tabs)/rules.tsx`, then `app/(tabs)/clays.tsx`.
  4. Delete the now-dead inline derivations in each screen.
- **Acceptance criteria**: all Stage 0.1 characterization tests still pass;
  screen-level cyclomatic complexity for the migrated portions drops (recheck
  with `npx eslint --rule '{"complexity":["warn",10]}'`); the access rule
  exists in exactly one place.
- **Rollback plan**: each screen migration is an independent commit; revert the
  single screen's commit if it regresses, the hook and other screens are
  unaffected.
- **Size**: M. **Dependencies**: Stage 0.1. **Risk**: medium — this is the
  actual behavior-bearing logic; the characterization tests are what make it
  safe.

### 2.2 Split the largest screens' rendering from their data/logic
- **Rationale**: Audit Theme A — `app/(tabs)/clays.tsx` (636 lines, complexity
  34), `app/(tabs)/rules.tsx` (407 lines, complexity 27) are doing data
  fetching, derived state, and full JSX in one function.
- **Current state**: one function per screen owns `useEffect` data loading,
  derived booleans, and JSX.
- **Target state**: extract the data-loading/derived-state portion into a
  screen-specific hook (`useClaysScreenData`, `useRulesScreenData`), leaving
  the component as JSX + hook call — same pattern as 2.1, applied per-screen
  instead of to the shared access logic.
- **Migration steps**: one screen at a time, hook extracted with its own tests
  before the component is simplified, existing render tests re-run after each.
- **Acceptance criteria**: `ClaysScreen`/`RulesScreen` component function
  complexity drops below ~15; extracted hooks are independently unit-tested
  (currently impossible for logic trapped in a screen component).
- **Size**: L (2 large screens). **Dependencies**: 2.1 (do the shared access
  hook first, then screen-specific hooks build on top of it). **Risk**: medium.

### 2.3 Refresh `README.md`'s Project Structure section
- **Rationale**: Audit Phase 0 gap — doesn't mention `TournamentContext`,
  `utils/`, or the clays feature.
- **Files touched**: `README.md` lines ~163-186.
- **Acceptance criteria**: structure section matches `ls` of the actual
  directories in use.
- **Size**: XS. **Risk**: none.

---

## Stage 3 — Longer-horizon (needs a decision, not a decree)

### 3.1 Error types instead of `throw new Error(string)`
- **Rationale**: Audit's error-handling section — every service throws plain
  `Error` with a message string, so the UI can't distinguish "not found" from
  "permission denied" from "validation failed" without string-matching.
- **Option A — do nothing**: fine at 4 users and the current UI (everything
  shows the same generic `Alert.alert('Error', ...)` anyway). Lowest effort.
- **Option B — a small tagged-error type** (`{ code: 'not_found' |
  'permission_denied' | 'validation', message: string }`) thrown instead of
  bare `Error`, used only where the UI would actually behave differently (e.g.
  showing "ask the organizer for a new invite" vs. a generic error on the join
  screen).
- **Recommendation**: B, but only when a screen actually needs to branch on
  error kind — don't do it repo-wide speculatively (this is exactly the kind of
  premature generality the audit's YAGNI check looks for).

### 3.2 OCP for activity-type dispatch (`renderRule`, `ClaysScreen` branching)
- **Rationale**: Audit's OCP finding — `if (isClays) ... else if
  (isCoreFourLocked) ...`-shaped branching in `app/(tabs)/rules.tsx:221` and
  `app/(tabs)/clays.tsx:43` means a third activity type (implied by the
  roadmap doc) means editing these functions again.
- **Option A — wait**: there's exactly one non-Euchre activity type (clays)
  today; a dispatch table for 2 cases isn't clearly better than 2 `if`
  branches. Revisit when a 3rd type is actually being built.
- **Option B — build the dispatch table now**, ahead of the 3rd type.
- **Recommendation**: A. This is the textbook "wait for the second concrete
  case" YAGNI call — building the abstraction now, for one real case, is
  exactly the kind of speculative generality the audit was asked to flag.

### 3.3 Runtime validation at the Firestore read boundary
- **Rationale**: Audit's trust-boundary note — reads are cast (`as`) rather
  than validated; fine today (single writer, no external API), but relevant if
  the "No Deletes"/archival policy is ever violated by a malformed doc, or if
  a second write path is added.
- **Option A — do nothing** until there's a second writer (e.g. a public API
  or a second app) that could actually produce a malformed doc.
- **Option B — add lightweight runtime checks** (e.g. `zod`) at the
  `mapXDoc()` functions specifically, since those are already the single
  choke point every read goes through.
- **Recommendation**: A for now; B becomes attractive for free once Stage 1.5
  (mapUserDoc) exists, since it's the same choke point — revisit together.

---

## Guardrails (keep the improvement from decaying)

- **CI gate** (Stage 1.1): `npm run lint && npm test` required to pass before
  merge/deploy. This is the one guardrail that matters most given Audit Theme B.
- **Coverage floor that ratchets up, not a hard gate**: after Stage 0/2 land,
  record the new statement-coverage number and configure Jest's
  `coverageThreshold` at *that* number (not 100%, not today's 21.58%) so
  coverage can't silently regress below wherever it lands, and bump the
  threshold each time a Stage 2 item raises it.
- **Complexity ceiling**: keep the ESLint `complexity` rule this audit's config
  run used, but as a real rule in `eslint.config.js` (currently only run
  ad-hoc via `--rule` for this audit) — set at `warn` at 15 initially (matches
  where the bulk of the codebase already sits), tightened to 10 once Stage 2
  screen extractions land.
- **jscpd in CI** (optional, only if duplication becomes a recurring problem):
  not recommended as a blocking gate yet — 2.48% is low and the tool was only
  just introduced for this audit; revisit if it climbs.
- **No new ADR process needed** — this is a 4-person app, not a team needing
  decision records. The one thing worth writing down: a one-paragraph note in
  `README.md` (or a `docs/ARCHITECTURE.md`) stating "domain rules live in
  `utils/`, screens call them, they don't reimplement them" — the rule the
  codebase already mostly follows, made explicit so it doesn't drift again the
  way `clays.tsx`/`rules.tsx` did.

## Metrics to track / success at 30 and 90 days

| Metric | Baseline (this audit) | 30 days | 90 days |
|---|---|---|---|
| CI runs tests+lint on every PR | No | Yes | Yes (unchanged) |
| Firestore rules locked down | No (fix exists, unmerged) | Yes | Yes |
| Statement coverage | 21.58% | ≥35% (Stage 0/1 tests land) | ≥55% (Stage 2 screens covered) |
| Screens at 0% coverage | 12 | ≤8 | ≤3 |
| Max function complexity outside scripts | 34 (`ClaysScreen`) | unchanged (Stage 2 not done yet) | ≤15 |
| jscpd duplication | 2.48% | ≤2% (Stage 1 dedup) | ≤1.5% |
| `npm run lint` exit code | N/A (broken) | 0 | 0 |

30-day success = Stage 0 + Stage 1 fully shipped, security branch merged.
90-day success = Stage 2 shipped for at least the top hotspot
(`app/tournament/[id].tsx` + its shared access hook).
