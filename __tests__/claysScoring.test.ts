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
    fixedSequenceDiscipline,
    nextPresentationNumber,
    nextSequencePosition,
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

    test('fixedSequenceDiscipline: only trap and skeet follow one fixed rulebook', () => {
        expect(fixedSequenceDiscipline('trap')).toBe(true);
        expect(fixedSequenceDiscipline('skeet')).toBe(true);
        expect(fixedSequenceDiscipline('sporting')).toBe(false);
        expect(fixedSequenceDiscipline('5stand')).toBe(false);
    });

    test('nextSequencePosition: trap rotates one shot at a time, 5 singles per post', () => {
        const squad = 3;
        expect(nextSequencePosition('trap', 0, squad)).toEqual({
            station: 1,
            stationLabel: 'Post 1',
            pairType: 'single',
            shooterIndex: 0,
        });
        // Still post 1 for all 5 rounds through a 3-person squad (15 shots).
        expect(nextSequencePosition('trap', 14, squad)?.station).toBe(1);
        expect(nextSequencePosition('trap', 14, squad)?.shooterIndex).toBe(2);
        // 15th shot at this post rotates the whole squad to post 2.
        expect(nextSequencePosition('trap', 15, squad)).toEqual({
            station: 2,
            stationLabel: 'Post 2',
            pairType: 'single',
            shooterIndex: 0,
        });
    });

    test('nextSequencePosition: skeet gives one shooter their whole station before the next shooter goes', () => {
        const squad = 2;
        // Station 1: high house, low house, true pair (double) — 3 presentations.
        expect(nextSequencePosition('skeet', 0, squad)).toEqual({
            station: 1,
            stationLabel: 'Station 1',
            pairType: 'single',
            shooterIndex: 0,
        });
        expect(nextSequencePosition('skeet', 2, squad)?.pairType).toBe('true');
        expect(nextSequencePosition('skeet', 2, squad)?.shooterIndex).toBe(0);
        // Shooter 0 just finished station 1 — shooter 1 starts it fresh.
        expect(nextSequencePosition('skeet', 3, squad)).toEqual({
            station: 1,
            stationLabel: 'Station 1',
            pairType: 'single',
            shooterIndex: 1,
        });
        // Station 3 has no true pair — just high house / low house singles.
        const station3Start = 2 /* stations 1-2 */ * 3 * squad;
        expect(nextSequencePosition('skeet', station3Start, squad)?.station).toBe(3);
        expect(nextSequencePosition('skeet', station3Start, squad)?.pairType).toBe('single');
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
