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
import { Reneg } from '../types';
import { db } from './firebase';

export const renegService = {
    async createReneg(reneg: Omit<Reneg, 'id'>): Promise<string> {
        const renegRef = doc(collection(db, 'renegs'));

        await setDoc(renegRef, {
            playerId: reneg.playerId,
            gameId: reneg.gameId,
            excuse: reneg.excuse,
            tournamentId: reneg.tournamentId,
            timestamp: Timestamp.fromDate(reneg.timestamp)
        });

        // Note: renegs are calculated from reneg documents via getUserStats

        return renegRef.id;
    },

    async deleteReneg(id: string): Promise<void> {
        const renegRef = doc(db, 'renegs', id);
        const renegSnap = await getDoc(renegRef);
        if (!renegSnap.exists()) return;

        // Note: renegs are calculated from reneg documents via getUserStats

        await deleteDoc(renegRef);
    },

    async getRenegs(maxResults: number = 1000): Promise<Reneg[]> {
        let q = query(
            collection(db, 'renegs'),
            orderBy('timestamp', 'desc')
        );

        // Apply limit if specified (0 means no limit)
        if (maxResults > 0) {
            q = query(
                collection(db, 'renegs'),
                orderBy('timestamp', 'desc'),
                limit(maxResults)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            playerId: doc.data().playerId,
            gameId: doc.data().gameId,
            excuse: doc.data().excuse,
            tournamentId: doc.data().tournamentId,
            timestamp: doc.data().timestamp.toDate()
        }));
    },

    async getRenegsByPlayer(playerId: string, max: number = 200): Promise<Reneg[]> {
        try {
            // First try: simple where query without orderBy (doesn't need composite index)
            const q = query(
                collection(db, 'renegs'),
                where('playerId', '==', playerId)
            );

            const snapshot = await getDocs(q);
            const renegs = snapshot.docs.map(doc => ({
                id: doc.id,
                playerId: doc.data().playerId,
                gameId: doc.data().gameId,
                excuse: doc.data().excuse,
                tournamentId: doc.data().tournamentId,
                timestamp: doc.data().timestamp.toDate()
            }));

            // Sort by timestamp descending on the client
            renegs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            // Apply limit on client if specified
            return max > 0 ? renegs.slice(0, max) : renegs;
        } catch (err: any) {
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

            // Use the existing getRenegs to fetch recent entries and filter locally.
            const recent = await this.getRenegs(max);
            return recent.filter(r => r.playerId === playerId);
        }
    },

    async getRenegsByTournament(tournamentId: string, max: number = 200): Promise<Reneg[]> {
        const base = [where('tournamentId', '==', tournamentId), orderBy('timestamp', 'desc')];
        const q = max > 0
            ? query(collection(db, 'renegs'), ...base, limit(max))
            : query(collection(db, 'renegs'), ...base);

        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                playerId: doc.data().playerId,
                gameId: doc.data().gameId,
                excuse: doc.data().excuse,
                tournamentId: doc.data().tournamentId,
                timestamp: doc.data().timestamp.toDate()
            }));
        } catch (err: any) {
            console.warn('getRenegsByTournament: server query failed', err?.message || err);
            try {
                const msg: string = err?.message || String(err);
                const m = msg.match(/https?:\/\/console\.firebase\.google\.com\/[^\s)]+/);
                if (m && m[0]) {
                    console.warn('Create the recommended composite index here:', m[0]);
                }
            } catch { }
            // Fall back to all renegs filtered client-side if index missing
            const recent = await this.getRenegs(max);
            return recent.filter(r => r.tournamentId === tournamentId);
        }
    }
};
