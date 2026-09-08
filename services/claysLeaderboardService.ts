import { ClaysMemberStats } from '../types';
import {
    aggregateClayTotals,
    CLAYS_ROLLING_MONTHS,
    computeClaysAccuracy,
    filterRecordsSince,
} from '../utils/claysScoring';
import { claysService } from './claysService';
import { tournamentService } from './tournamentService';

export const claysLeaderboardService = {
    async getClaysLeaderboard(
        tournamentId: string,
        options?: { months?: number }
    ): Promise<ClaysMemberStats[]> {
        const months = options?.months ?? CLAYS_ROLLING_MONTHS;
        const [records, members] = await Promise.all([
            claysService.getScoresForTournament(tournamentId),
            tournamentService.getTournamentMembers(tournamentId),
        ]);

        const recent = filterRecordsSince(records, months);
        const totals = aggregateClayTotals(recent);
        const nameMap = Object.fromEntries(members.map(m => [m.uid, m.displayName]));

        const lastOutingByShooter = new Map<string, Date>();
        for (const r of recent) {
            const prev = lastOutingByShooter.get(r.shooterId);
            if (!prev || r.timestamp > prev) {
                lastOutingByShooter.set(r.shooterId, r.timestamp);
            }
        }

        const presentationCount = new Map<string, number>();
        for (const r of recent) {
            presentationCount.set(r.shooterId, (presentationCount.get(r.shooterId) ?? 0) + 1);
        }

        const stats: ClaysMemberStats[] = totals.map(t => ({
            userId: t.shooterId,
            displayName: nameMap[t.shooterId] || t.shooterId,
            hits: t.hits,
            possible: t.possible,
            percentage: computeClaysAccuracy(t.hits, t.possible),
            presentationCount: presentationCount.get(t.shooterId) ?? 0,
            lastOutingDate: lastOutingByShooter.get(t.shooterId) ?? null,
        }));

        return stats.sort(
            (a, b) =>
                (b.percentage ?? -1) - (a.percentage ?? -1) ||
                b.hits - a.hits ||
                b.possible - a.possible
        );
    },
};
