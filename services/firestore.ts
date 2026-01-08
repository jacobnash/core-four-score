import {
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
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

        await updateDoc(userRef, updates);
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

    async getGames(tournamentId: string, limit: number = 20): Promise<Game[]> {
        const q = query(
            collection(db, 'games'),
            where('tournamentId', '==', tournamentId),
            orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            timestamp: doc.data().timestamp.toDate(),
            location: doc.data().location,
            teams: doc.data().teams,
            tags: doc.data().tags,
            notes: doc.data().notes,
            tournamentId: doc.data().tournamentId
        }));
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
