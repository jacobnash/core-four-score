import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    Timestamp,
    updateDoc,
    where,
    doc,
} from 'firebase/firestore';
import { ClayDiscipline, ClaysMatch } from '../types';
import { getDb } from './firebase';

function mapMatchDoc(id: string, data: Record<string, unknown>): ClaysMatch {
    return {
        id,
        tournamentId: data.tournamentId,
        discipline: data.discipline,
        expectedTargets: data.expectedTargets ?? 0,
        status: data.status ?? 'active',
        startedAt: data.startedAt?.toDate ? data.startedAt.toDate() : new Date(),
        endedAt: data.endedAt?.toDate ? data.endedAt.toDate() : null,
        createdBy: data.createdBy,
        notes: data.notes ?? null,
    };
}

export const claysMatchService = {
    async createMatch(input: {
        tournamentId: string;
        discipline: ClayDiscipline;
        expectedTargets: number;
        createdBy: string;
        notes?: string | null;
    }): Promise<ClaysMatch> {
        const ref = await addDoc(collection(getDb(), 'claysMatches'), {
            tournamentId: input.tournamentId,
            discipline: input.discipline,
            expectedTargets: input.expectedTargets,
            status: 'active',
            startedAt: Timestamp.now(),
            createdBy: input.createdBy,
            notes: input.notes?.trim() || null,
        });
        return {
            id: ref.id,
            tournamentId: input.tournamentId,
            discipline: input.discipline,
            expectedTargets: input.expectedTargets,
            status: 'active',
            startedAt: new Date(),
            createdBy: input.createdBy,
            notes: input.notes?.trim() || null,
        };
    },

    async getActiveMatch(tournamentId: string): Promise<ClaysMatch | null> {
        const q = query(
            collection(getDb(), 'claysMatches'),
            where('tournamentId', '==', tournamentId),
            where('status', '==', 'active'),
            orderBy('startedAt', 'desc')
        );
        try {
            const snap = await getDocs(q);
            if (snap.empty) return null;
            const d = snap.docs[0];
            return mapMatchDoc(d.id, d.data());
        } catch {
            const snap = await getDocs(
                query(
                    collection(getDb(), 'claysMatches'),
                    where('tournamentId', '==', tournamentId),
                    where('status', '==', 'active')
                )
            );
            if (snap.empty) return null;
            const sorted = snap.docs
                .map(d => ({ doc: d, match: mapMatchDoc(d.id, d.data()) }))
                .sort((a, b) => b.match.startedAt.getTime() - a.match.startedAt.getTime());
            return sorted[0].match;
        }
    },

    async completeMatch(matchId: string): Promise<void> {
        await updateDoc(doc(getDb(), 'claysMatches', matchId), {
            status: 'complete',
            endedAt: Timestamp.now(),
        });
    },
};
