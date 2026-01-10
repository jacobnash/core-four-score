import { LeaderboardEntry } from '../types';
import { tournamentService } from './tournamentService';
import { userService } from './userService';

export const leaderboardService = {
    async getLeaderboard(tournamentId: string): Promise<LeaderboardEntry[]> {
        const members = await tournamentService.getTournamentMembers(tournamentId);

        const entries = await Promise.all(
            members.map(async (user) => {
                const stats = await userService.getUserStats(user.uid, tournamentId);
                return {
                    userId: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    wins: stats.wins,
                    winPercentage: stats.gamesPlayed > 0
                        ? (stats.wins / stats.gamesPlayed) * 100
                        : 0,
                    totalRenegs: stats.renegs,
                    gamesPlayed: stats.gamesPlayed
                };
            })
        );

        return entries.sort((a, b) => b.wins - a.wins);
    }
};
