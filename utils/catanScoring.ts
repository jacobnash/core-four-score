import { CatanExpansion, CatanPlayerScore } from '../types';

export const CATAN_EXPANSIONS: CatanExpansion[] = ['base', 'extended'];

export const CATAN_EXPANSION_LABELS: Record<CatanExpansion, string> = {
    base: 'Base game',
    extended: '5-6 Player Extension',
};

/** Player-count bounds each expansion is designed for. */
export const CATAN_PLAYER_RANGE: Record<CatanExpansion, { min: number; max: number }> = {
    base: { min: 3, max: 4 },
    extended: { min: 5, max: 6 },
};

export const CATAN_WINNING_SCORE = 10;

export function expansionForPlayerCount(count: number): CatanExpansion {
    return count > CATAN_PLAYER_RANGE.base.max ? 'extended' : 'base';
}

/** Marks the highest score(s) as winner — ties (rare) all win. */
export function markWinners(players: { playerId: string; score: number }[]): CatanPlayerScore[] {
    if (players.length === 0) return [];
    const high = Math.max(...players.map(p => p.score));
    return players.map(p => ({ ...p, isWinner: p.score === high }));
}

export interface CatanShooterTotal {
    playerId: string;
    gamesPlayed: number;
    wins: number;
    totalScore: number;
    bestScore: number;
}

/** Aggregate saved games into per-player totals. */
export function aggregateCatanTotals(
    games: { players: CatanPlayerScore[] }[]
): CatanShooterTotal[] {
    const map = new Map<string, CatanShooterTotal>();
    for (const game of games) {
        for (const p of game.players) {
            const existing = map.get(p.playerId) ?? {
                playerId: p.playerId,
                gamesPlayed: 0,
                wins: 0,
                totalScore: 0,
                bestScore: 0,
            };
            existing.gamesPlayed += 1;
            existing.wins += p.isWinner ? 1 : 0;
            existing.totalScore += p.score;
            existing.bestScore = Math.max(existing.bestScore, p.score);
            map.set(p.playerId, existing);
        }
    }
    return Array.from(map.values()).sort(
        (a, b) => b.wins - a.wins || b.totalScore / b.gamesPlayed - a.totalScore / a.gamesPlayed
    );
}
