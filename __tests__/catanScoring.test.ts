import {
    aggregateCatanTotals,
    CATAN_EXPANSION_LABELS,
    CATAN_EXPANSIONS,
    CATAN_PLAYER_RANGE,
    expansionForPlayerCount,
    markWinners,
} from '../utils/catanScoring';

describe('catanScoring', () => {
    test('expansion labels cover both variants', () => {
        for (const e of CATAN_EXPANSIONS) {
            expect(CATAN_EXPANSION_LABELS[e].length).toBeGreaterThan(0);
        }
    });

    test('expansionForPlayerCount: base for 3-4, extended for 5-6', () => {
        expect(expansionForPlayerCount(3)).toBe('base');
        expect(expansionForPlayerCount(4)).toBe('base');
        expect(expansionForPlayerCount(5)).toBe('extended');
        expect(expansionForPlayerCount(6)).toBe('extended');
        expect(CATAN_PLAYER_RANGE.base).toEqual({ min: 3, max: 4 });
        expect(CATAN_PLAYER_RANGE.extended).toEqual({ min: 5, max: 6 });
    });

    test('markWinners flags the single highest score', () => {
        const result = markWinners([
            { playerId: 'a', score: 10 },
            { playerId: 'b', score: 7 },
            { playerId: 'c', score: 9 },
        ]);
        expect(result.find(p => p.playerId === 'a')?.isWinner).toBe(true);
        expect(result.find(p => p.playerId === 'b')?.isWinner).toBe(false);
        expect(result.find(p => p.playerId === 'c')?.isWinner).toBe(false);
    });

    test('markWinners flags every player tied for the top score', () => {
        const result = markWinners([
            { playerId: 'a', score: 10 },
            { playerId: 'b', score: 10 },
            { playerId: 'c', score: 8 },
        ]);
        expect(result.filter(p => p.isWinner).map(p => p.playerId).sort()).toEqual(['a', 'b']);
    });

    test('aggregateCatanTotals sums wins, games, and scores per player', () => {
        const totals = aggregateCatanTotals([
            { players: [{ playerId: 'a', score: 10, isWinner: true }, { playerId: 'b', score: 6, isWinner: false }] },
            { players: [{ playerId: 'a', score: 8, isWinner: false }, { playerId: 'b', score: 10, isWinner: true }] },
        ]);
        const a = totals.find(t => t.playerId === 'a')!;
        const b = totals.find(t => t.playerId === 'b')!;
        expect(a).toEqual({ playerId: 'a', gamesPlayed: 2, wins: 1, totalScore: 18, bestScore: 10 });
        expect(b).toEqual({ playerId: 'b', gamesPlayed: 2, wins: 1, totalScore: 16, bestScore: 10 });
    });
});
