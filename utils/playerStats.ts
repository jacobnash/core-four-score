import { resolveWinningTeam } from '../components/GameListItem';
import { Game, Reneg, User } from '../types';

export interface MemberStats {
    uid: string;
    displayName: string;
    photoURL?: string;
    wins: number;
    gamesPlayed: number;
    winPercentage: number;
    renegs: number;
    winStreak: number;
}

export function didMemberWinGame(game: Game, memberId: string): boolean {
    const winTeam = resolveWinningTeam(game.teams);
    return !!winTeam?.playerIds.includes(memberId);
}

export function computeMemberStats(members: User[], games: Game[], renegs: Reneg[]): MemberStats[] {
    const sortedGames = [...games].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return members.map((member) => {
        let wins = 0;
        let gamesPlayed = 0;
        for (const game of sortedGames) {
            const inGame = game.teams.some(t => t.playerIds?.includes(member.uid));
            if (!inGame) continue;
            gamesPlayed++;
            if (didMemberWinGame(game, member.uid)) wins++;
        }

        const renegCount = renegs.filter(r => r.playerId === member.uid).length;
        const winStreak = computeWinStreak(member.uid, sortedGames);

        return {
            uid: member.uid,
            displayName: member.displayName,
            photoURL: member.photoURL,
            wins,
            gamesPlayed,
            winPercentage: gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0,
            renegs: renegCount,
            winStreak,
        };
    }).sort((a, b) => b.wins - a.wins || b.winPercentage - a.winPercentage);
}

function computeWinStreak(memberId: string, gamesChronological: Game[]): number {
    let streak = 0;
    for (let i = gamesChronological.length - 1; i >= 0; i--) {
        const game = gamesChronological[i];
        const inGame = game.teams.some(t => t.playerIds?.includes(memberId));
        if (!inGame) continue;
        if (didMemberWinGame(game, memberId)) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

export function computeTagCounts(games: Game[]): { tag: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const game of games) {
        for (const tag of game.tags || []) {
            counts.set(tag, (counts.get(tag) || 0) + 1);
        }
    }
    return Array.from(counts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
}

export interface StatsSummary {
    totalRenegs: number;
    leaderLabel: string;
    topRenegLabel: string;
    bestWinPctLabel: string;
    hottestStreakLabel: string;
}

export function computeStatsSummary(memberStats: MemberStats[]): StatsSummary {
    const totalRenegs = memberStats.reduce((sum, m) => sum + m.renegs, 0);

    const leader = memberStats[0];
    const renegLeader = [...memberStats].sort((a, b) => b.renegs - a.renegs)[0];
    const winPctLeader = [...memberStats]
        .filter(m => m.gamesPlayed >= 3)
        .sort((a, b) => b.winPercentage - a.winPercentage)[0]
        || memberStats.find(m => m.gamesPlayed > 0);
    const streakLeader = [...memberStats].sort((a, b) => b.winStreak - a.winStreak)[0];

    return {
        totalRenegs,
        leaderLabel: leader?.wins ? `${leader.displayName} (${leader.wins})` : '—',
        topRenegLabel: renegLeader?.renegs ? `${renegLeader.displayName} (${renegLeader.renegs})` : '—',
        bestWinPctLabel: winPctLeader?.gamesPlayed
            ? `${winPctLeader.displayName} (${winPctLeader.winPercentage.toFixed(0)}%)`
            : '—',
        hottestStreakLabel: streakLeader?.winStreak
            ? `${streakLeader.displayName} (${streakLeader.winStreak}W)`
            : '—',
    };
}
