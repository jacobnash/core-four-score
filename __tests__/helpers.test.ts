import {
    calculateWinPercentage,
    generateTeams,
    isBarnBurner,
    isSkunked,
    validateScore
} from '../utils/helpers';

describe('Utility Functions', () => {
    describe('calculateWinPercentage', () => {
        it('should return 0 when no games played', () => {
            expect(calculateWinPercentage(0, 0)).toBe(0);
        });

        it('should calculate correct percentage', () => {
            expect(calculateWinPercentage(5, 10)).toBe(50);
            expect(calculateWinPercentage(7, 10)).toBe(70);
            expect(calculateWinPercentage(10, 10)).toBe(100);
        });

        it('should handle decimal results', () => {
            expect(calculateWinPercentage(1, 3)).toBeCloseTo(33.33, 2);
        });
    });

    describe('generateTeams', () => {
        it('should throw error with less than 4 players', () => {
            expect(() => generateTeams(['p1', 'p2', 'p3'])).toThrow();
        });

        it('should throw error with odd number of players', () => {
            expect(() => generateTeams(['p1', 'p2', 'p3', 'p4', 'p5'])).toThrow();
        });

        it('should split players evenly', () => {
            const result = generateTeams(['p1', 'p2', 'p3', 'p4']);
            expect(result.team1.length).toBe(2);
            expect(result.team2.length).toBe(2);
        });

        it('should include all players', () => {
            const players = ['p1', 'p2', 'p3', 'p4'];
            const result = generateTeams(players);
            const allPlayers = [...result.team1, ...result.team2];
            expect(allPlayers.sort()).toEqual(players.sort());
        });

        it('should handle 6 players', () => {
            const result = generateTeams(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
            expect(result.team1.length).toBe(3);
            expect(result.team2.length).toBe(3);
        });
    });

    describe('validateScore', () => {
        it('should accept valid scores', () => {
            expect(validateScore(0)).toBe(true);
            expect(validateScore(5)).toBe(true);
            expect(validateScore(10)).toBe(true);
        });

        it('should reject negative scores', () => {
            expect(validateScore(-1)).toBe(false);
        });

        it('should reject scores above max', () => {
            expect(validateScore(11)).toBe(false);
            expect(validateScore(15)).toBe(false);
        });

        it('should reject decimal scores', () => {
            expect(validateScore(5.5)).toBe(false);
        });

        it('should respect custom max score', () => {
            expect(validateScore(15, 20)).toBe(true);
            expect(validateScore(25, 20)).toBe(false);
        });
    });

    describe('isSkunked', () => {
        it('should return true when team 1 scores 0', () => {
            expect(isSkunked(0, 10)).toBe(true);
        });

        it('should return true when team 2 scores 0', () => {
            expect(isSkunked(10, 0)).toBe(true);
        });

        it('should return false when both teams score', () => {
            expect(isSkunked(5, 10)).toBe(false);
            expect(isSkunked(8, 7)).toBe(false);
        });
    });

    describe('isBarnBurner', () => {
        it('should return true for close games', () => {
            expect(isBarnBurner(10, 9)).toBe(true);
            expect(isBarnBurner(8, 10)).toBe(true);
            expect(isBarnBurner(7, 7)).toBe(true);
        });

        it('should return false for blowouts', () => {
            expect(isBarnBurner(10, 3)).toBe(false);
            expect(isBarnBurner(10, 0)).toBe(false);
        });

        it('should respect custom threshold', () => {
            expect(isBarnBurner(10, 8, 1)).toBe(false);
            expect(isBarnBurner(10, 8, 3)).toBe(true);
        });
    });
});
