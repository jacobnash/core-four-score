import { ClayDiscipline, ClayPairType } from '../types';

export type { ClayDiscipline, ClayPairType };

export const CLAY_PAIR_TYPES: ClayPairType[] = ['single', 'report', 'true', 'following'];

export const CLAY_PAIR_LABELS: Record<ClayPairType, string> = {
    single: 'Single',
    report: 'Report Pair',
    true: 'True Pair',
    following: 'Following Pair',
};

export const CLAY_PAIR_HINTS: Record<ClayPairType, string> = {
    single: 'One target',
    report: '2nd bird on report of 1st shot',
    true: 'Both birds at once',
    following: '2nd bird follows 1st',
};

export const CLAY_DISCIPLINES: ClayDiscipline[] = ['sporting', 'trap', 'skeet', '5stand'];

export const CLAY_DISCIPLINE_LABELS: Record<ClayDiscipline, string> = {
    sporting: 'Sporting Clays',
    trap: 'Trap',
    skeet: 'Skeet',
    '5stand': '5-Stand',
};

/** Fixed round sizes for trap / skeet / 5-stand (separate from sporting). */
export const CLAY_DISCIPLINE_DEFAULT_TARGETS: Record<ClayDiscipline, number> = {
    sporting: 100,
    trap: 25,
    skeet: 25,
    '5stand': 25,
};

export const CLAYS_ROLLING_MONTHS = 6;

export const PAIR_BIRD_LABELS = ['Left', 'Right'] as const;

/** Targets scored for this presentation type. */
export function birdsInPresentation(pairType: ClayPairType): number {
    return pairType === 'single' ? 1 : 2;
}

export function nextShooterIndex(currentIndex: number, shooterCount: number): number {
    if (shooterCount <= 0) return 0;
    return (currentIndex + 1) % shooterCount;
}

export function hitsFromBirdResults(results: boolean[]): number {
    return results.filter(Boolean).length;
}

export function defaultExpectedTargets(discipline: ClayDiscipline): number {
    return CLAY_DISCIPLINE_DEFAULT_TARGETS[discipline];
}

export function isSportingDiscipline(discipline: ClayDiscipline): boolean {
    return discipline === 'sporting';
}

export function filterRecordsSince<T extends { timestamp: Date }>(
    records: T[],
    months: number
): T[] {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return records.filter(r => r.timestamp >= cutoff);
}

export function computeClaysAccuracy(hits: number, possible: number): number | null {
    if (possible <= 0) return null;
    return Math.round((hits / possible) * 1000) / 10;
}

export interface ClayShooterTotal {
    shooterId: string;
    hits: number;
    possible: number;
}

/** Aggregate saved records into per-shooter totals. */
export function aggregateClayTotals(
    records: { shooterId: string; hits: number; possible: number }[]
): ClayShooterTotal[] {
    const map = new Map<string, ClayShooterTotal>();
    for (const r of records) {
        const existing = map.get(r.shooterId) ?? { shooterId: r.shooterId, hits: 0, possible: 0 };
        existing.hits += r.hits;
        existing.possible += r.possible;
        map.set(r.shooterId, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.hits - a.hits || b.possible - a.possible);
}

export function sumBirdsScored(
    records: { hits?: number; possible?: number; birdResults?: boolean[] }[]
): number {
    return records.reduce((sum, r) => {
        if (Array.isArray(r.birdResults)) return sum + r.birdResults.length;
        return sum + (r.possible ?? 0);
    }, 0);
}

export function nextPresentationNumber(
    records: { presentationNumber?: number }[]
): number {
    if (records.length === 0) return 1;
    return Math.max(...records.map(r => r.presentationNumber ?? 0)) + 1;
}
