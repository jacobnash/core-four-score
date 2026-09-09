// User Types
export interface User {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    stats: UserStats;
    // Preferred tournament (persisted) used to auto-select on login
    preferredTournamentId?: string | null;
    // Last active tournament (persisted) for UX fallbacks
    lastActiveTournamentId?: string | null;
}

export interface UserStats {
    wins: number;
    renegs: number;
    gamesPlayed: number;
}

// Tournament Types
export type TournamentActivityType = 'euchre' | 'clays' | 'catan';

export interface Tournament {
    id: string;
    // Backwards-compatible string id stored on tournament documents
    tournamentId?: string;
    name: string;
    memberIds: string[];
    createdAt: Date;
    updatedAt: Date;
    // Lifecycle status: draft (pre-start), active (started), archived (not deleted)
    status?: 'draft' | 'active' | 'archived';
    /** Primary activity for this group — drives home tab (euchre vs clays). */
    activityType?: TournamentActivityType;
    // Creator uid (best-effort backfill)
    createdBy?: string | null;
    // Optional visibility control
    visibility?: 'private' | 'public';
    // Optional invites list (uids awaiting acceptance)
    inviteIds?: string[];
    // Lightweight schema version for forward migration
    schemaVersion?: number;
}

// Game Types
export interface Game {
    id: string;
    timestamp: Date;
    location: string;
    teams: Team[];
    tags: GameTag[];
    notes?: string;
    tournamentId: string;
    // No-deletes policy: support archival
    status?: 'active' | 'archived';
    archivedAt?: Date | null;
}

export interface Team {
    playerIds: string[];
    score: number;
    isWinner?: boolean;
}

export type GameTag =
    | 'Braveheart'
    | 'Skunked'
    | 'Going Alone'
    | 'Barn Burner'
    | 'Loner'
    | 'Perfect Game';

// Reneg Types (Wall of Shame)
export interface Reneg {
    id: string;
    playerId: string;
    gameId: string;
    excuse: string;
    tournamentId: string;
    timestamp: Date;
    // No-deletes policy: support archival
    status?: 'active' | 'archived';
    archivedAt?: Date | null;
}

// Leaderboard Types
export interface LeaderboardEntry {
    userId: string;
    displayName: string;
    photoURL?: string;
    wins: number;
    winPercentage: number;
    totalRenegs: number;
    gamesPlayed: number;
}

// Team Generator Types
export interface PlayerSelection {
    userId: string;
    displayName: string;
    isPresent: boolean;
}

export interface TeamMatchup {
    team1: string[];
    team2: string[];
}

// Rules Types (Firestore `rules` collection)
export interface TournamentRule {
    id: string;
    text: string;
    author: string;
    approvals: string[];
    createdAt: Date;
    lockedAt?: Date | null;
    status?: string;
    expiredAt?: Date | null;
    /** Tournament these rules belong to; legacy docs omit this and map to Core Four. */
    tournamentId?: string;
    schemaVersion?: number;
    /** bulk = added at draft setup; proposal = normal vote flow (default). */
    seedMethod?: 'bulk' | 'proposal';
}

// Clays Types
export type ClayDiscipline = 'sporting' | 'trap' | 'skeet' | '5stand';

export type ClayPairType = 'single' | 'report' | 'true' | 'following';

export interface ClaysMatch {
    id: string;
    tournamentId: string;
    discipline: ClayDiscipline;
    expectedTargets: number;
    status: 'active' | 'complete';
    startedAt: Date;
    endedAt?: Date | null;
    createdBy: string;
    notes?: string | null;
}

export interface ClayScoreRecord {
    id: string;
    tournamentId: string;
    matchId: string;
    presentationNumber: number;
    shooterId: string;
    pairType: ClayPairType;
    discipline: ClayDiscipline;
    station?: string | null;
    hits: number;
    possible: number;
    birdResults: boolean[];
    birdLabels?: string[] | null;
    timestamp: Date;
    recordedBy: string;
}

export interface ClaysMemberStats {
    userId: string;
    displayName: string;
    hits: number;
    possible: number;
    percentage: number | null;
    presentationCount: number;
    lastOutingDate?: Date | null;
}

// Catan Types
/** base = standard 3-4 player game; extended = 5-6 Player Extension in play. */
export type CatanExpansion = 'base' | 'extended';

export interface CatanPlayerScore {
    playerId: string;
    score: number;
    isWinner?: boolean;
}

export interface CatanGame {
    id: string;
    tournamentId: string;
    timestamp: Date;
    expansion: CatanExpansion;
    players: CatanPlayerScore[];
    notes?: string | null;
    // No-deletes policy: support archival
    status?: 'active' | 'archived';
    archivedAt?: Date | null;
}

export interface CatanMemberStats {
    userId: string;
    displayName: string;
    gamesPlayed: number;
    wins: number;
    winPercentage: number;
    avgScore: number | null;
    bestScore: number | null;
}
