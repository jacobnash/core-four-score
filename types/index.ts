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

// Rules Types
export interface Rule {
    id: string;
    title: string;
    description: string;
    category: 'Gameplay' | 'Etiquette' | 'Scoring';
    order: number;
}
