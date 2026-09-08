import {
    aggregateClayTotals,
    birdsInPresentation,
    CLAY_PAIR_HINTS,
    CLAY_PAIR_LABELS,
    CLAY_PAIR_TYPES,
    computeClaysAccuracy,
    defaultExpectedTargets,
    filterRecordsSince,
    hitsFromBirdResults,
    nextPresentationNumber,
    nextShooterIndex,
    sumBirdsScored,
} from '../utils/claysScoring';

describe('claysScoring', () => {
    test('birdsInPresentation', () => {
        expect(birdsInPresentation('single')).toBe(1);
        expect(birdsInPresentation('report')).toBe(2);
        expect(birdsInPresentation('true')).toBe(2);
        expect(birdsInPresentation('following')).toBe(2);
    });

    test('nextShooterIndex rotates through squad', () => {
        expect(nextShooterIndex(0, 4)).toBe(1);
        expect(nextShooterIndex(3, 4)).toBe(0);
        expect(nextShooterIndex(0, 0)).toBe(0);
    });

    test('hitsFromBirdResults', () => {
        expect(hitsFromBirdResults([true, false])).toBe(1);
        expect(hitsFromBirdResults([true, true])).toBe(2);
        expect(hitsFromBirdResults([false])).toBe(0);
    });

    test('aggregateClayTotals sums by shooter', () => {
        const totals = aggregateClayTotals([
            { shooterId: 'a', hits: 2, possible: 2 },
            { shooterId: 'b', hits: 1, possible: 2 },
            { shooterId: 'a', hits: 1, possible: 2 },
        ]);
        expect(totals.find(t => t.shooterId === 'a')).toEqual({ shooterId: 'a', hits: 3, possible: 4 });
        expect(totals[0].shooterId).toBe('a');
    });

    test('pair labels cover all types', () => {
        for (const t of CLAY_PAIR_TYPES) {
            expect(CLAY_PAIR_LABELS[t].length).toBeGreaterThan(0);
            expect(CLAY_PAIR_HINTS[t].length).toBeGreaterThan(0);
        }
    });

    test('discipline defaults are separate for trap/skeet vs sporting', () => {
        expect(defaultExpectedTargets('sporting')).toBe(100);
        expect(defaultExpectedTargets('trap')).toBe(25);
        expect(defaultExpectedTargets('skeet')).toBe(25);
    });

    test('filterRecordsSince keeps only recent records', () => {
        const now = new Date();
        const old = new Date(now);
        old.setMonth(old.getMonth() - 8);
        const recent = new Date(now);
        recent.setMonth(recent.getMonth() - 1);
        const filtered = filterRecordsSince(
            [
                { timestamp: old, id: 'old' },
                { timestamp: recent, id: 'new' },
            ],
            6
        );
        expect(filtered.map(r => r.id)).toEqual(['new']);
    });

    test('computeClaysAccuracy', () => {
        expect(computeClaysAccuracy(0, 0)).toBeNull();
        expect(computeClaysAccuracy(1, 2)).toBe(50);
    });

    test('nextPresentationNumber', () => {
        expect(nextPresentationNumber([])).toBe(1);
        expect(nextPresentationNumber([{ presentationNumber: 12 }])).toBe(13);
    });

    test('sumBirdsScored', () => {
        expect(sumBirdsScored([{ birdResults: [true, false] }, { possible: 1 }])).toBe(3);
    });
});
