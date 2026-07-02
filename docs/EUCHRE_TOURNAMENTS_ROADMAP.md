# Euchre Tournaments & Multiplayer Roadmap

This document captures research and planned work for expanding **Core Four Score** beyond the original deer-camp group while keeping **The Core Four** tournament exclusive.

## Goals (this PR — foundation)

- [x] Anyone with Google sign-in can use the app (Firestore user record on first login)
- [x] Create **open** tournaments with 4+ players and invite by search
- [x] Accept / decline tournament invites
- [x] Lock legacy **`the-core-four`** tournament to the original four UIDs only
- [ ] Brackets, rotation schedules, and speed-euchre modes (future PRs)

## The Core Four vs open tournaments

| Tournament | Who can join | Notes |
|------------|--------------|-------|
| **The Core Four** (`the-core-four`) | Cait, Dylan, Grace, Jacob only | Original deer-camp stats preserved |
| **New tournaments** | Anyone invited by a member | Min 4 players to create; grows to 5+ for bracket formats |

## Euchre tournament formats (research)

### Standard table play

- **4 players per table** — two partnerships (North–South vs East–West)
- Games typically to **10 points**; tournament **rounds** often use **4–8 hands** or a fixed time limit instead of a full 10-point game per round

### Progressive / “speed” social tournaments (12–60+ players)

Popular for parties and fundraisers ([euchre.cards tournament guide](https://euchre.cards/tournament/)):

1. Seat players at numbered tables (4 per table)
2. Play a **round** (fixed hands or short point cap — “speed” nights favor fewer hands)
3. **Rotate**: winners move up, losers move down; **partners split** so you rarely partner twice in a row
4. Track **individual** points across rounds; highest total wins

**Top / bottom table edge cases:**

- Table 1 winners stay (losers drop to bottom)
- Bottom table losers stay (winners move up)

### Fixed-partner tournaments

Teams stay together; round-robin or bracket determines which teams play which. Better for competitive league play.

### Odd player counts (5, 6, 7, 9, …)

Euchre needs multiples of 4 at the table, so schedules use:

- **Byes** — one or more players sit out each round (balanced so everyone gets equal byes)
- **Pre-printed rotation charts** — e.g. 6-player, 8-player, 10-player progressive tally cards
- **Whist / cyclic movement** (World Euchre Federation) — for singles events, seat labels N/S/E/W with arithmetic rotation so partners/opponents rarely repeat

References:

- [Progressive Euchre rules](https://euchre.cards/variations/progressive-euchre/)
- [World Euchre Federation — table rotation](https://www.worldeuchrefederation.com/world-euchre-news/tournament-table-rotation)
- [Euchre tournament scheduling theory (Odd-Whist)](https://euchretournaments.wordpress.com/)

## Planned product phases

### Phase 1 — Open membership (this PR)

- Google sign-in for any user
- Tournament create + invite + accept/decline
- Core Four lock on legacy tournament
- Rules tab remains Core Four only (house rules doc)

### Phase 2 — Tournament operations

- Tournament admin role (creator can invite/remove while `draft`)
- `start` tournament → freeze roster (already partially implemented)
- Public vs private tournament visibility
- Email/display-name discovery improvements

### Phase 3 — Brackets & rotation (5+ players)

Data model sketch:

```typescript
type TournamentFormat = 'casual' | 'progressive' | 'fixed-partner' | 'round-robin';

interface TournamentRound {
  roundNumber: number;
  tables: Array<{
    tableNumber: number;
    seats: [uid, uid, uid, uid]; // N, S, E, W
    byePlayerIds?: string[];
  }>;
}
```

Features:

- Generate progressive rotation for N players (N mod 4 ≠ 0 → bye schedule)
- Round score entry per player (not just per-game team wins)
- Leaderboard by cumulative round points
- Optional “speed” preset: 4 hands per round, 6–8 total rounds

### Phase 4 — Speed euchre mode

- Shorter games (e.g. to 7 or timed hands)
- Quick re-deal flow from Ope'Land
- Optional separate “speed night” tournament template

## Technical notes

- Membership enforcement today is **app-layer** in `tournamentService` + `utils/tournamentMembership.ts`
- Firestore rules are still open (`allow read, write: if true`) — **must tighten before broad public launch**
- Bracket generation likely lives in `utils/euchreRotation/` with unit tests per player count (6, 8, 10, 12, …)

## Open questions

1. Should progressive tournaments score **individual** points or **team** wins per round?
2. For 5–7 players, prefer **byes** or **ghost fourth** at a table?
3. Do we need TD/admin override to add late arrivals after `start`?
