import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    Timestamp,
    where
} from 'firebase/firestore';
import { Game } from '../types';
import { db } from './firebase';

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

        // Note: wins and gamesPlayed are calculated from game documents via getUserStats
        // No need to update user metadata here

        return gameRef.id;
    },

    async deleteGame(id: string): Promise<void> {
        const gameRef = doc(db, 'games', id);
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) return;

        // Note: wins and gamesPlayed are calculated from game documents via getUserStats
        // No need to roll back user metadata here

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
