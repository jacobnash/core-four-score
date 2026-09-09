import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    Timestamp,
    where,
} from 'firebase/firestore';
import { CatanGame } from '../types';
import { getDb } from './firebase';

export const catanService = {
    async createGame(game: Omit<CatanGame, 'id'>): Promise<string> {
        const gameRef = doc(collection(getDb(), 'catanGames'));
        await setDoc(gameRef, {
            tournamentId: game.tournamentId,
            timestamp: Timestamp.fromDate(game.timestamp),
            expansion: game.expansion,
            players: game.players,
            notes: game.notes ?? null,
        });
        return gameRef.id;
    },

    async getGames(tournamentId: string, max: number = 20): Promise<CatanGame[]> {
        const baseQuery = [where('tournamentId', '==', tournamentId), orderBy('timestamp', 'desc')];
        const q = max > 0
            ? query(collection(getDb(), 'catanGames'), ...baseQuery, limit(max))
            : query(collection(getDb(), 'catanGames'), ...baseQuery);

        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => {
            const data: any = d.data();
            return {
                id: d.id,
                tournamentId: data.tournamentId,
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date(0),
                expansion: data.expansion ?? 'base',
                players: data.players ?? [],
                notes: data.notes ?? null,
            } as CatanGame;
        });
    },
};
