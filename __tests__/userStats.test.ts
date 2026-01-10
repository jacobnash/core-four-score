// Prevent services/firebase from importing the real firebase ESM during tests
jest.mock('../services/firebase', () => ({ db: {} }));

import { leaderboardService, userService } from '../services/firestore';

// Mock the firebase/firestore functions
jest.mock('firebase/firestore', () => {
    const Timestamp = {
        fromDate: (d: Date) => ({
            _seconds: Math.floor(d.getTime() / 1000),
            toDate: () => d
        }),
        now: () => ({
            _seconds: Math.floor(Date.now() / 1000),
            toDate: () => new Date()
        })
    };

    // Mock data
    const users = [
        {
            id: 'user1',
            data: () => ({
                displayName: 'Alice',
                email: 'alice@test.com',
                photoURL: 'photo1.jpg',
                createdAt: { toDate: () => new Date() },
                updatedAt: { toDate: () => new Date() }
            })
        },
        {
            id: 'user2',
            data: () => ({
                displayName: 'Bob',
                email: 'bob@test.com',
                photoURL: 'photo2.jpg',
                createdAt: { toDate: () => new Date() },
                updatedAt: { toDate: () => new Date() }
            })
        },
        {
            id: 'user3',
            data: () => ({
                displayName: 'Charlie',
                email: 'charlie@test.com',
                photoURL: 'photo3.jpg',
                createdAt: { toDate: () => new Date() },
                updatedAt: { toDate: () => new Date() }
            })
        },
        {
            id: 'user4',
            data: () => ({
                displayName: 'Diana',
                email: 'diana@test.com',
                photoURL: 'photo4.jpg',
                createdAt: { toDate: () => new Date() },
                updatedAt: { toDate: () => new Date() }
            })
        }
    ];

    const tournaments = [
        {
            id: 'tournament1',
            data: () => ({
                name: 'Summer Tournament',
                memberIds: ['user1', 'user2', 'user3', 'user4'],
                createdAt: { toDate: () => new Date() },
                updatedAt: { toDate: () => new Date() }
            })
        }
    ];

    // Mock games data
    // Game 1: Alice & Bob vs Charlie & Diana (Alice & Bob win)
    // Game 2: Alice & Charlie vs Bob & Diana (Bob & Diana win) 
    // Game 3: Alice & Diana vs Bob & Charlie (Alice & Diana win)
    // Game 4: Different tournament - Alice & Bob vs Charlie & Diana (Alice & Bob win)
    const games = [
        {
            id: 'game1',
            data: () => ({
                timestamp: { toDate: () => new Date('2024-01-01') },
                location: 'Park',
                tournamentId: 'tournament1',
                teams: [
                    { playerIds: ['user1', 'user2'], isWinner: true, score: 21 },
                    { playerIds: ['user3', 'user4'], isWinner: false, score: 15 }
                ],
                tags: [],
                notes: ''
            })
        },
        {
            id: 'game2',
            data: () => ({
                timestamp: { toDate: () => new Date('2024-01-02') },
                location: 'Beach',
                tournamentId: 'tournament1',
                teams: [
                    { playerIds: ['user1', 'user3'], isWinner: false, score: 18 },
                    { playerIds: ['user2', 'user4'], isWinner: true, score: 21 }
                ],
                tags: [],
                notes: ''
            })
        },
        {
            id: 'game3',
            data: () => ({
                timestamp: { toDate: () => new Date('2024-01-03') },
                location: 'Park',
                tournamentId: 'tournament1',
                teams: [
                    { playerIds: ['user1', 'user4'], isWinner: true, score: 21 },
                    { playerIds: ['user2', 'user3'], isWinner: false, score: 19 }
                ],
                tags: [],
                notes: ''
            })
        },
        {
            id: 'game4',
            data: () => ({
                timestamp: { toDate: () => new Date('2024-01-04') },
                location: 'Gym',
                tournamentId: 'tournament2',
                teams: [
                    { playerIds: ['user1', 'user2'], isWinner: true, score: 21 },
                    { playerIds: ['user3', 'user4'], isWinner: false, score: 10 }
                ],
                tags: [],
                notes: ''
            })
        }
    ];

    // Mock renegs data
    const renegs = [
        {
            id: 'reneg1',
            data: () => ({
                playerId: 'user1',
                gameId: 'game1',
                excuse: 'Forgot about prior commitment',
                tournamentId: 'tournament1',
                timestamp: { toDate: () => new Date('2024-01-01') }
            })
        },
        {
            id: 'reneg2',
            data: () => ({
                playerId: 'user3',
                gameId: 'game2',
                excuse: 'Car broke down',
                tournamentId: 'tournament1',
                timestamp: { toDate: () => new Date('2024-01-02') }
            })
        },
        {
            id: 'reneg3',
            data: () => ({
                playerId: 'user3',
                gameId: 'game3',
                excuse: 'Sick',
                tournamentId: 'tournament1',
                timestamp: { toDate: () => new Date('2024-01-03') }
            })
        },
        {
            id: 'reneg4',
            data: () => ({
                playerId: 'user1',
                gameId: 'game4',
                excuse: 'Work emergency',
                tournamentId: 'tournament2',
                timestamp: { toDate: () => new Date('2024-01-04') }
            })
        }
    ];

    let queryConstraints: any[] = [];

    const getDocs = jest.fn(async (q: any) => {
        const collectionName = q._collectionName || 'unknown';

        if (collectionName === 'games') {
            // Filter games by constraints
            let filteredGames = games;

            const tournamentConstraint = queryConstraints.find(c => c.field === 'tournamentId');
            if (tournamentConstraint) {
                filteredGames = filteredGames.filter(g =>
                    g.data().tournamentId === tournamentConstraint.value
                );
            }

            queryConstraints = [];
            return { docs: filteredGames };
        }

        if (collectionName === 'renegs') {
            // Filter renegs by constraints
            let filteredRenegs = renegs;

            const playerConstraint = queryConstraints.find(c => c.field === 'playerId');
            const tournamentConstraint = queryConstraints.find(c => c.field === 'tournamentId');

            if (playerConstraint) {
                filteredRenegs = filteredRenegs.filter(r =>
                    r.data().playerId === playerConstraint.value
                );
            }

            if (tournamentConstraint) {
                filteredRenegs = filteredRenegs.filter(r =>
                    r.data().tournamentId === tournamentConstraint.value
                );
            }

            queryConstraints = [];
            return { docs: filteredRenegs, size: filteredRenegs.length };
        }

        queryConstraints = [];
        return { docs: [] };
    });

    const getDoc = jest.fn(async (docRef: any) => {
        const id = docRef._id;
        const collectionName = docRef._collection;

        if (collectionName === 'users') {
            const user = users.find(u => u.id === id);
            return {
                exists: () => !!user,
                id: user?.id,
                data: user?.data
            };
        }

        if (collectionName === 'tournaments') {
            const tournament = tournaments.find(t => t.id === id);
            return {
                exists: () => !!tournament,
                id: tournament?.id,
                data: tournament?.data
            };
        }

        return { exists: () => false };
    });

    return {
        collection: jest.fn((db: any, name: string) => ({ _collectionName: name })),
        doc: jest.fn((db: any, collectionName: string, id?: string) => ({
            _collection: collectionName,
            _id: id
        })),
        setDoc: jest.fn(async () => { }),
        getDoc,
        getDocs,
        query: jest.fn((collection: any, ...constraints: any[]) => {
            return { ...collection, _constraints: constraints };
        }),
        where: jest.fn((field: string, op: string, value: any) => {
            const constraint = { type: 'where', field, op, value };
            queryConstraints.push(constraint);
            return constraint;
        }),
        orderBy: jest.fn((field: string, direction?: string) => {
            return { type: 'orderBy', field, direction };
        }),
        limit: jest.fn((count: number) => {
            return { type: 'limit', count };
        }),
        Timestamp,
        increment: jest.fn((n: number) => n),
        updateDoc: jest.fn(async () => { }),
        deleteDoc: jest.fn(async () => { })
    };
});

describe('User Stats (calculated from game and reneg documents)', () => {
    describe('getUserStats', () => {
        it('should calculate stats correctly for user1 in tournament1', async () => {
            const stats = await userService.getUserStats('user1', 'tournament1');

            // user1 played in game1 (won), game2 (lost), game3 (won) = 2 wins, 3 games
            expect(stats.gamesPlayed).toBe(3);
            expect(stats.wins).toBe(2);

            // user1 has 1 reneg in tournament1
            expect(stats.renegs).toBe(1);
        });

        it('should calculate stats correctly for user2 in tournament1', async () => {
            const stats = await userService.getUserStats('user2', 'tournament1');

            // user2 played in game1 (won), game2 (won), game3 (lost) = 2 wins, 3 games
            expect(stats.gamesPlayed).toBe(3);
            expect(stats.wins).toBe(2);

            // user2 has 0 renegs in tournament1
            expect(stats.renegs).toBe(0);
        });

        it('should calculate stats correctly for user3 in tournament1', async () => {
            const stats = await userService.getUserStats('user3', 'tournament1');

            // user3 played in game1 (lost), game2 (lost), game3 (lost) = 0 wins, 3 games
            expect(stats.gamesPlayed).toBe(3);
            expect(stats.wins).toBe(0);

            // user3 has 2 renegs in tournament1
            expect(stats.renegs).toBe(2);
        });

        it('should calculate stats correctly for user4 in tournament1', async () => {
            const stats = await userService.getUserStats('user4', 'tournament1');

            // user4 played in game1 (lost), game2 (won), game3 (won) = 2 wins, 3 games
            expect(stats.gamesPlayed).toBe(3);
            expect(stats.wins).toBe(2);

            // user4 has 0 renegs in tournament1
            expect(stats.renegs).toBe(0);
        });

        it('should include games from all tournaments when tournamentId not specified', async () => {
            const stats = await userService.getUserStats('user1');

            // user1 played in 4 games total (3 in tournament1, 1 in tournament2)
            expect(stats.gamesPlayed).toBe(4);
            expect(stats.wins).toBe(3); // won 2 in tournament1, 1 in tournament2

            // user1 has 2 renegs total (1 in tournament1, 1 in tournament2)
            expect(stats.renegs).toBe(2);
        });

        it('should return zero stats for user with no games', async () => {
            const stats = await userService.getUserStats('user999', 'tournament1');

            expect(stats.gamesPlayed).toBe(0);
            expect(stats.wins).toBe(0);
            expect(stats.renegs).toBe(0);
        });
    });

    describe('getUser', () => {
        it('should return user with default stats placeholder', async () => {
            const user = await userService.getUser('user1');

            expect(user).not.toBeNull();
            expect(user?.uid).toBe('user1');
            expect(user?.displayName).toBe('Alice');
            expect(user?.email).toBe('alice@test.com');
            expect(user?.photoURL).toBe('photo1.jpg');

            // Stats should be placeholder - actual stats come from getUserStats
            expect(user?.stats).toEqual({ wins: 0, renegs: 0, gamesPlayed: 0 });
        });

        it('should return null for non-existent user', async () => {
            const user = await userService.getUser('nonexistent');
            expect(user).toBeNull();
        });
    });

    describe('leaderboard', () => {
        it('should calculate leaderboard correctly for tournament1', async () => {
            const leaderboard = await leaderboardService.getLeaderboard('tournament1');

            expect(leaderboard).toHaveLength(4);

            // All should be sorted by wins (descending)
            // user1: 2 wins, user2: 2 wins, user4: 2 wins, user3: 0 wins
            expect(leaderboard[0].wins).toBeGreaterThanOrEqual(leaderboard[1].wins);
            expect(leaderboard[1].wins).toBeGreaterThanOrEqual(leaderboard[2].wins);
            expect(leaderboard[2].wins).toBeGreaterThanOrEqual(leaderboard[3].wins);

            // Check specific user stats
            const aliceEntry = leaderboard.find(e => e.userId === 'user1');
            expect(aliceEntry?.wins).toBe(2);
            expect(aliceEntry?.gamesPlayed).toBe(3);
            expect(aliceEntry?.totalRenegs).toBe(1);
            expect(aliceEntry?.winPercentage).toBeCloseTo(66.67, 1);

            const bobEntry = leaderboard.find(e => e.userId === 'user2');
            expect(bobEntry?.wins).toBe(2);
            expect(bobEntry?.gamesPlayed).toBe(3);
            expect(bobEntry?.totalRenegs).toBe(0);
            expect(bobEntry?.winPercentage).toBeCloseTo(66.67, 1);

            const charlieEntry = leaderboard.find(e => e.userId === 'user3');
            expect(charlieEntry?.wins).toBe(0);
            expect(charlieEntry?.gamesPlayed).toBe(3);
            expect(charlieEntry?.totalRenegs).toBe(2);
            expect(charlieEntry?.winPercentage).toBe(0);

            const dianaEntry = leaderboard.find(e => e.userId === 'user4');
            expect(dianaEntry?.wins).toBe(2);
            expect(dianaEntry?.gamesPlayed).toBe(3);
            expect(dianaEntry?.totalRenegs).toBe(0);
            expect(dianaEntry?.winPercentage).toBeCloseTo(66.67, 1);
        });
    });

    describe('win percentage calculation', () => {
        it('should calculate correct win percentages', async () => {
            const user1Stats = await userService.getUserStats('user1', 'tournament1');
            const winPercentage = (user1Stats.wins / user1Stats.gamesPlayed) * 100;
            expect(winPercentage).toBeCloseTo(66.67, 1);

            const user3Stats = await userService.getUserStats('user3', 'tournament1');
            const user3WinPercentage = user3Stats.gamesPlayed > 0
                ? (user3Stats.wins / user3Stats.gamesPlayed) * 100
                : 0;
            expect(user3WinPercentage).toBe(0);
        });

        it('should return 0% when no games played', async () => {
            const stats = await userService.getUserStats('user999', 'tournament1');
            const winPercentage = stats.gamesPlayed > 0
                ? (stats.wins / stats.gamesPlayed) * 100
                : 0;
            expect(winPercentage).toBe(0);
        });
    });
});
