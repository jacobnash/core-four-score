import { Game, Reneg, User } from '../types';
import {
    computeMemberStats,
    computeStatsSummary,
    computeTagCounts,
    didMemberWinGame,
} from '../utils/playerStats';

const uid = (n: number) => `user-${n}`;

function makeMember(n: number, name: string): User {
    return {
        uid: uid(n),
        displayName: name,
        email: `${name}@test.com`,
        stats: { wins: 0, renegs: 0, gamesPlayed: 0 },
    };
}

function makeGame(id: string, dayOffset: number, winnerIds: string[], loserIds: string[]): Game {
    const d = new Date('2026-06-01T12:00:00Z');
    d.setDate(d.getDate() + dayOffset);
    return {
        id,
        timestamp: d,
        location: 'Camp',
        tournamentId: 't1',
        tags: [],
        teams: [
            { playerIds: winnerIds, score: 1, isWinner: true },
            { playerIds: loserIds, score: 0, isWinner: false },
        ],
    };
}

describe('didMemberWinGame', () => {
    test('uses isWinner flag', () => {
        const game = makeGame('g1', 0, [uid(1), uid(2)], [uid(3), uid(4)]);
        expect(didMemberWinGame(game, uid(1))).toBe(true);
        expect(didMemberWinGame(game, uid(3))).toBe(false);
    });

    test('falls back to highest score when isWinner missing', () => {
        const game: Game = {
            ...makeGame('g2', 1, [uid(1), uid(2)], [uid(3), uid(4)]),
            teams: [
                { playerIds: [uid(1), uid(2)], score: 10 },
                { playerIds: [uid(3), uid(4)], score: 6 },
            ],
        };
        expect(didMemberWinGame(game, uid(1))).toBe(true);
        expect(didMemberWinGame(game, uid(4))).toBe(false);
    });
});

describe('computeMemberStats', () => {
    const members = [makeMember(1, 'Alice'), makeMember(2, 'Bob'), makeMember(3, 'Cara'), makeMember(4, 'Dan')];
    const games = [
        makeGame('g1', 0, [uid(1), uid(2)], [uid(3), uid(4)]),
        makeGame('g2', 1, [uid(1), uid(3)], [uid(2), uid(4)]),
        makeGame('g3', 2, [uid(1), uid(4)], [uid(2), uid(3)]),
    ];
    const renegs: Reneg[] = [
        { id: 'r1', playerId: uid(2), gameId: 'g1', excuse: 'oops', tournamentId: 't1', timestamp: new Date() },
    ];

    test('computes wins, win %, and renegs per member', () => {
        const stats = computeMemberStats(members, games, renegs);
        const alice = stats.find(s => s.uid === uid(1));
        const bob = stats.find(s => s.uid === uid(2));
        expect(alice?.wins).toBe(3);
        expect(alice?.gamesPlayed).toBe(3);
        expect(alice?.winPercentage).toBe(100);
        expect(bob?.renegs).toBe(1);
    });

    test('computes current win streak from most recent games', () => {
        const stats = computeMemberStats(members, games, renegs);
        const alice = stats.find(s => s.uid === uid(1));
        expect(alice?.winStreak).toBe(3);
    });
});

describe('computeTagCounts', () => {
    test('aggregates game tags', () => {
        const games: Game[] = [
            { ...makeGame('g1', 0, [uid(1), uid(2)], [uid(3), uid(4)]), tags: ['Braveheart', 'Skunked'] },
            { ...makeGame('g2', 1, [uid(1), uid(3)], [uid(2), uid(4)]), tags: ['Braveheart'] },
        ];
        const counts = computeTagCounts(games);
        expect(counts).toEqual([
            { tag: 'Braveheart', count: 2 },
            { tag: 'Skunked', count: 1 },
        ]);
    });
});

describe('computeStatsSummary', () => {
    test('builds leader labels from member stats', () => {
        const memberStats = computeMemberStats(
            [makeMember(1, 'Alice'), makeMember(2, 'Bob'), makeMember(3, 'Cara'), makeMember(4, 'Dan')],
            [
                makeGame('g1', 0, [uid(1), uid(2)], [uid(3), uid(4)]),
                makeGame('g2', 1, [uid(1), uid(3)], [uid(2), uid(4)]),
                makeGame('g3', 2, [uid(1), uid(4)], [uid(2), uid(3)]),
            ],
            [],
        );
        const summary = computeStatsSummary(memberStats);
        expect(summary.leaderLabel).toContain('Alice');
        expect(summary.hottestStreakLabel).toContain('3W');
    });
});
