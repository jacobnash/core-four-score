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

/**
 * Trap and skeet are shot to one fixed, internationally standardized sequence —
 * unlike sporting clays and 5-stand, whose station "menus" (what's thrown, and
 * in what mix of single/report/true/following) are set by the course/club and
 * have no universal rule to encode. For those two, the shooter picks presentation
 * type by hand each shot, as the app already does.
 */
export function fixedSequenceDiscipline(discipline: ClayDiscipline): boolean {
    return discipline === 'trap' || discipline === 'skeet';
}

export interface ClaySequencePosition {
    /** 1-based station/post number. */
    station: number;
    stationLabel: string;
    pairType: ClayPairType;
    /** Index into the present-shooters array whose turn it is. */
    shooterIndex: number;
}

/** ATA trap: 5 posts, squad rotates one shot at a time, 5 singles per shooter per post. */
const TRAP_STATIONS = 5;
const TRAP_SHOTS_PER_STATION = 5;

/**
 * NSSA skeet: at each station a shooter takes the high-house single, the
 * low-house single, and — at stations 1, 2, 6 and 7 only — a true (simultaneous)
 * pair. Station 8 has no double. Each shooter shoots their whole station before
 * the next shooter starts (unlike trap's one-shot-at-a-time rotation).
 * Regulation skeet adds one optional 25th shot (repeat the round's first miss,
 * or an extra low-house look if none); simplified here as a 3rd single at
 * station 8 so the 24-target sequence still totals a clean 25.
 */
const SKEET_STATION_PLANS: ClayPairType[][] = [
    ['single', 'single', 'true'],
    ['single', 'single', 'true'],
    ['single', 'single'],
    ['single', 'single'],
    ['single', 'single'],
    ['single', 'single', 'true'],
    ['single', 'single', 'true'],
    ['single', 'single', 'single'],
];

/**
 * Given how many presentations the squad has already completed this match,
 * derive whose turn it is, what they're shooting, and what station/post
 * they're on — so trap and skeet never need manual station or pair-type entry.
 */
export function nextSequencePosition(
    discipline: ClayDiscipline,
    completedPresentations: number,
    squadSize: number
): ClaySequencePosition | null {
    if (squadSize <= 0) return null;

    if (discipline === 'trap') {
        const perStation = squadSize * TRAP_SHOTS_PER_STATION;
        const station = Math.min(TRAP_STATIONS - 1, Math.floor(completedPresentations / perStation)) + 1;
        const shooterIndex = completedPresentations % squadSize;
        return { station, stationLabel: `Post ${station}`, pairType: 'single', shooterIndex };
    }

    if (discipline === 'skeet') {
        let remaining = completedPresentations;
        for (let i = 0; i < SKEET_STATION_PLANS.length; i++) {
            const plan = SKEET_STATION_PLANS[i];
            const stationTotal = plan.length * squadSize;
            const isLastStation = i === SKEET_STATION_PLANS.length - 1;
            if (remaining < stationTotal || isLastStation) {
                const clamped = isLastStation ? remaining % stationTotal : remaining;
                const shooterIndex = Math.floor(clamped / plan.length) % squadSize;
                const stepIndex = clamped % plan.length;
                return { station: i + 1, stationLabel: `Station ${i + 1}`, pairType: plan[stepIndex], shooterIndex };
            }
            remaining -= stationTotal;
        }
    }

    return null;
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
