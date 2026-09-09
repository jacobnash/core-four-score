import { CatanMemberStats } from '../types';
import { aggregateCatanTotals } from '../utils/catanScoring';
import { catanService } from './catanService';
import { tournamentService } from './tournamentService';

export const catanLeaderboardService = {
    async getCatanLeaderboard(tournamentId: string): Promise<CatanMemberStats[]> {
        const [games, members] = await Promise.all([
            catanService.getGames(tournamentId, 0),
            tournamentService.getTournamentMembers(tournamentId),
        ]);

        const totals = aggregateCatanTotals(games);
        const nameMap = Object.fromEntries(members.map(m => [m.uid, m.displayName]));

        const stats: CatanMemberStats[] = totals.map(t => ({
            userId: t.playerId,
            displayName: nameMap[t.playerId] || t.playerId,
            gamesPlayed: t.gamesPlayed,
            wins: t.wins,
            winPercentage: t.gamesPlayed > 0 ? Math.round((t.wins / t.gamesPlayed) * 1000) / 10 : 0,
            avgScore: t.gamesPlayed > 0 ? Math.round((t.totalScore / t.gamesPlayed) * 10) / 10 : null,
            bestScore: t.gamesPlayed > 0 ? t.bestScore : null,
        }));

        return stats.sort((a, b) => b.winPercentage - a.winPercentage || b.wins - a.wins);
    },
};
