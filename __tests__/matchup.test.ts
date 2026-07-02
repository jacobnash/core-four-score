import {
    buildSpinSequence,
    pickMatchupPlayerIds,
    randomTeamSplit,
    reelNamesFromSplit,
} from '../utils/matchup';

describe('pickMatchupPlayerIds', () => {
    test('returns all members when 4 or fewer', () => {
        const ids = pickMatchupPlayerIds(['a', 'b', 'c', 'd']);
        expect(ids.sort()).toEqual(['a', 'b', 'c', 'd']);
    });

    test('returns 4 when more than 4 members', () => {
        const ids = pickMatchupPlayerIds(['a', 'b', 'c', 'd', 'e', 'f']);
        expect(ids).toHaveLength(4);
    });
});

describe('buildSpinSequence', () => {
    test('produces 4 to 6 frames', () => {
        const result = buildSpinSequence(['a', 'b', 'c', 'd']);
        expect(result.spinCount).toBeGreaterThanOrEqual(4);
        expect(result.spinCount).toBeLessThanOrEqual(6);
        expect(result.frames).toHaveLength(result.spinCount);
        expect(result.team1).toEqual(result.frames[result.frames.length - 1].team1);
    });
});

describe('randomTeamSplit', () => {
    test('splits four players into two teams', () => {
        const split = randomTeamSplit(['a', 'b', 'c', 'd']);
        expect(split.team1.length + split.team2.length).toBe(4);
    });
});

describe('reelNamesFromSplit', () => {
    test('maps ids to display names for four reels', () => {
        const names = reelNamesFromSplit(
            { team1: ['a', 'b'], team2: ['c', 'd'] },
            { a: 'Alice', b: 'Bob', c: 'Cait', d: 'Dylan' },
        );
        expect(names).toEqual(['Alice', 'Bob', 'Cait', 'Dylan']);
    });
});
