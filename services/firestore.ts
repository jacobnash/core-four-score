import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    limit,
    orderBy,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { Game, LeaderboardEntry, Reneg, Tournament, User, UserStats } from '../types';
import { db } from './firebase';

// User Service
export const userService = {
    async getUser(uid: string): Promise<User | null> {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) return null;

        const data = userDoc.data();
        return {
            uid: userDoc.id,
            displayName: data.displayName,
            email: data.email,
            photoURL: data.photoURL,
            stats: data.stats || { wins: 0, renegs: 0, gamesPlayed: 0 }
        };
    },

    async createUser(uid: string, displayName: string, email: string, photoURL?: string): Promise<User> {
        const newUser: User = {
            uid,
            displayName,
            email,
            photoURL,
            stats: { wins: 0, renegs: 0, gamesPlayed: 0 }
        };

        await setDoc(doc(db, 'users', uid), {
            displayName,
            email,
            photoURL,
            stats: newUser.stats,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        return newUser;
    },

    async updateUserStats(uid: string, stats: Partial<UserStats>): Promise<void> {
        const userRef = doc(db, 'users', uid);
        const updates: any = {
            updatedAt: Timestamp.now()
        };

        if (stats.wins !== undefined) {
            updates['stats.wins'] = increment(stats.wins);
        }
        if (stats.renegs !== undefined) {
            updates['stats.renegs'] = increment(stats.renegs);
        }
        if (stats.gamesPlayed !== undefined) {
            updates['stats.gamesPlayed'] = increment(stats.gamesPlayed);
        }

        try {
            await updateDoc(userRef, updates);
        } catch (err) {
            // If update fails (e.g., doc doesn't exist), create/merge the document
            const base: any = {
                displayName: uid,
                email: '',
                photoURL: '',
                stats: { wins: 0, renegs: 0, gamesPlayed: 0 },
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            // Apply increments to base.stats
            if (stats.wins !== undefined) base.stats.wins += stats.wins;
            if (stats.renegs !== undefined) base.stats.renegs += stats.renegs;
            if (stats.gamesPlayed !== undefined) base.stats.gamesPlayed += stats.gamesPlayed;

            await setDoc(userRef, base, { merge: true });
        }
    }
};

// Tournament Service
export const tournamentService = {
    async getTournament(id: string): Promise<Tournament | null> {
        const tournamentDoc = await getDoc(doc(db, 'tournaments', id));
        if (!tournamentDoc.exists()) return null;

        const data = tournamentDoc.data();
        return {
            id: tournamentDoc.id,
            name: data.name,
            memberIds: data.memberIds,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate()
        };
    },

    async getTournamentMembers(tournamentId: string): Promise<User[]> {
        const tournament = await this.getTournament(tournamentId);
        if (!tournament) return [];

        const members = await Promise.all(
            tournament.memberIds.map(uid => userService.getUser(uid))
        );

        return members.filter((u): u is User => u !== null);
    }
};

// Game Service
export const gameService = {
    async createGame(game: Omit<Game, 'id'>): Promise<string> {
        const gameRef = doc(collection(db, 'games'));

        await setDoc(gameRef, {
            timestamp: Timestamp.fromDate(game.timestamp),
            location: game.location,
            teams: game.teams,
            tags: game.tags,
            notes: game.notes,
            tournamentId: game.tournamentId
        });

        // Update player stats
        const allPlayerIds = game.teams.flatMap(t => t.playerIds);
        const winningTeam = game.teams.find(t => t.isWinner);

        for (const playerId of allPlayerIds) {
            const isWinner = winningTeam?.playerIds.includes(playerId) || false;
            await userService.updateUserStats(playerId, {
                gamesPlayed: 1,
                wins: isWinner ? 1 : 0
            });
        }

        return gameRef.id;
    },

    async deleteGame(id: string): Promise<void> {
        const gameRef = doc(db, 'games', id);
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) return;

        const data = gameSnap.data();
        const teams: any[] = data.teams || [];

        const allPlayerIds: string[] = teams.flatMap(t => t.playerIds || []);
        const winningTeam = teams.find(t => t.isWinner);

        // Roll back stats for each player involved in the game
        for (const playerId of allPlayerIds) {
            const isWinner = winningTeam?.playerIds?.includes(playerId) || false;
            try {
                await userService.updateUserStats(playerId, {
                    gamesPlayed: -1,
                    wins: isWinner ? -1 : 0
                });
            } catch (err) {
                console.error('Failed to rollback stats for user', playerId, err);
            }
        }

        await deleteDoc(gameRef);
    },

    async getGames(tournamentId: string, max: number = 20): Promise<Game[]> {
        const baseQuery = [where('tournamentId', '==', tournamentId), orderBy('timestamp', 'desc')];

        const q = max > 0
            ? query(collection(db, 'games'), ...baseQuery, limit(max))
            : query(collection(db, 'games'), ...baseQuery);

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const d: any = doc.data();
            return {
                id: doc.id,
                timestamp: d.timestamp ? d.timestamp.toDate() : new Date(0),
                location: d.location,
                teams: d.teams,
                tags: d.tags,
                notes: d.notes,
                tournamentId: d.tournamentId
            } as Game;
        });
    },
    async getAllGames(max: number = 0): Promise<Game[]> {
        const baseQuery = [orderBy('timestamp', 'desc')];

        const q = max > 0
            ? query(collection(db, 'games'), ...baseQuery, limit(max))
            : query(collection(db, 'games'), ...baseQuery);

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const d: any = doc.data();
            return {
                id: doc.id,
                timestamp: d.timestamp ? d.timestamp.toDate() : new Date(0),
                location: d.location,
                teams: d.teams,
                tags: d.tags,
                notes: d.notes,
                tournamentId: d.tournamentId
            } as Game;
        });
    },
    // Return a list of unique location suggestions sorted by frequency (most played places first),
    // falling back to recent times when frequencies are equal.
    async getLocationSuggestions(tournamentId: string, maxGames: number = 500, includeAll: boolean = false): Promise<string[]> {
        try {
            const games = includeAll ? await this.getAllGames(maxGames || 0) : await this.getGames(tournamentId, maxGames);

            // Count frequency and capture most recent timestamp for each location
            const map: Record<string, { count: number; latest: number }> = {};
            for (const g of games) {
                const loc = (g.location || 'Unknown Location').trim();
                if (!loc) continue;
                if (!map[loc]) map[loc] = { count: 0, latest: 0 };
                map[loc].count += 1;
                const t = g.timestamp ? g.timestamp.getTime() : 0;
                if (t > map[loc].latest) map[loc].latest = t;
            }

            // Convert to array and sort by count desc, then latest desc
            const arr = Object.entries(map).map(([location, meta]) => ({ location, ...meta }));
            arr.sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return b.latest - a.latest;
            });

            return arr.map(a => a.location);
        } catch (err: any) {
            // If something unexpected fails, log the error and any index link Firestore returned.
            console.warn('getLocationSuggestions: server query failed', err?.message || err);
            try {
                const msg: string = err?.message || String(err);
                const m = msg.match(/https?:\/\/console\.firebase\.google\.com\/[^\s)]+/);
                if (m && m[0]) {
                    console.warn('Create the recommended composite index here:', m[0]);
                }
            } catch (extractErr) {
                // ignore
            }
            // Re-throw so caller can decide how to handle it (we removed the heavy client-side fallback now the index exists)
            throw err;
        }
    }
};

// Reneg Service
export const renegService = {
    async createReneg(reneg: Omit<Reneg, 'id'>): Promise<string> {
        const renegRef = doc(collection(db, 'renegs'));

        await setDoc(renegRef, {
            playerId: reneg.playerId,
            gameId: reneg.gameId,
            excuse: reneg.excuse,
            timestamp: Timestamp.fromDate(reneg.timestamp)
        });

        // Update player reneg count
        await userService.updateUserStats(reneg.playerId, { renegs: 1 });

        return renegRef.id;
    },

    async deleteReneg(id: string): Promise<void> {
        const renegRef = doc(db, 'renegs', id);
        const renegSnap = await getDoc(renegRef);
        if (!renegSnap.exists()) return;

        const data = renegSnap.data();
        const playerId: string | undefined = data.playerId;

        if (playerId) {
            try {
                await userService.updateUserStats(playerId, { renegs: -1 });
            } catch (err) {
                console.error('Failed to rollback reneg stat for user', playerId, err);
            }
        }

        await deleteDoc(renegRef);
    },

    async getRenegs(limit: number = 50): Promise<Reneg[]> {
        const q = query(
            collection(db, 'renegs'),
            orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            playerId: doc.data().playerId,
            gameId: doc.data().gameId,
            excuse: doc.data().excuse,
            timestamp: doc.data().timestamp.toDate()
        }));
    },

    async getRenegsByPlayer(playerId: string, max: number = 200): Promise<Reneg[]> {
        const q = query(
            collection(db, 'renegs'),
            where('playerId', '==', playerId),
            orderBy('timestamp', 'desc'),
            limit(max)
        );

        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                playerId: doc.data().playerId,
                gameId: doc.data().gameId,
                excuse: doc.data().excuse,
                timestamp: doc.data().timestamp.toDate()
            }));
        } catch (err: any) {
            // Firestore can require a composite index for queries that mix where + orderBy.
            // Fall back to fetching recent renegs and filtering client-side so the UI still shows data.
            console.warn('getRenegsByPlayer: query failed, falling back to client-side filter', err?.message || err);

            // If Firestore provided a create-index link in the error message, extract and log it for convenience.
            try {
                const msg: string = err?.message || String(err);
                const m = msg.match(/https?:\/\/console\.firebase\.google\.com\/[^\s)]+/);
                if (m && m[0]) {
                    console.warn('Create the recommended composite index here:', m[0]);
                }
            } catch (extractErr) {
                // ignore
            }

            console.warn('If you expect many renegs, create the recommended composite index in the Firebase console to speed this query.');

            // Use the existing getRenegs to fetch recent entries and filter locally.
            const recent = await this.getRenegs(max);
            return recent.filter(r => r.playerId === playerId);
        }
    }
};

// Leaderboard Service
export const leaderboardService = {
    async getLeaderboard(tournamentId: string): Promise<LeaderboardEntry[]> {
        const members = await tournamentService.getTournamentMembers(tournamentId);

        return members
            .map(user => ({
                userId: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
                wins: user.stats.wins,
                winPercentage: user.stats.gamesPlayed > 0
                    ? (user.stats.wins / user.stats.gamesPlayed) * 100
                    : 0,
                totalRenegs: user.stats.renegs,
                gamesPlayed: user.stats.gamesPlayed
            }))
            .sort((a, b) => b.wins - a.wins);
    }
};
