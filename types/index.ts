// User Types
export interface User {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    stats: UserStats;
}

export interface UserStats {
    wins: number;
    renegs: number;
    gamesPlayed: number;
}

// Tournament Types
export interface Tournament {
    id: string;
    name: string;
    memberIds: string[];
    createdAt: Date;
    updatedAt: Date;
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
    timestamp: Date;
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
