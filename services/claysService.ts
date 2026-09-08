import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    Timestamp,
    where,
} from 'firebase/firestore';
import { ClayDiscipline, ClayPairType, ClayScoreRecord } from '../types';
import { getDb } from './firebase';

function mapScoreDoc(id: string, data: Record<string, unknown>): ClayScoreRecord {
    const ts = data.timestamp as { toDate?: () => Date } | undefined;
    return {
        id,
        tournamentId: data.tournamentId as string,
        matchId: (data.matchId as string) ?? '',
        presentationNumber: (data.presentationNumber as number) ?? 0,
        shooterId: data.shooterId as string,
        pairType: data.pairType as ClayPairType,
        discipline: (data.discipline as ClayDiscipline) ?? 'sporting',
        station: (data.station as string | null) ?? null,
        hits: (data.hits as number) ?? 0,
        possible: (data.possible as number) ?? 0,
        birdResults: (data.birdResults as boolean[]) ?? [],
        birdLabels: (data.birdLabels as string[] | null) ?? null,
        timestamp: ts?.toDate ? ts.toDate() : new Date(),
        recordedBy: data.recordedBy as string,
    };
}

export const claysService = {
    async savePresentation(input: {
        tournamentId: string;
        matchId: string;
        presentationNumber: number;
        shooterId: string;
        pairType: ClayPairType;
        discipline: ClayDiscipline;
        station?: string | null;
        birdResults: boolean[];
        birdLabels?: string[] | null;
        recordedBy: string;
    }): Promise<string> {
        const possible = input.birdResults.length;
        const hits = input.birdResults.filter(Boolean).length;
        const ref = await addDoc(collection(getDb(), 'clayScores'), {
            tournamentId: input.tournamentId,
            matchId: input.matchId,
            presentationNumber: input.presentationNumber,
            shooterId: input.shooterId,
            pairType: input.pairType,
            discipline: input.discipline,
            station: input.station?.trim() || null,
            hits,
            possible,
            birdResults: input.birdResults,
            birdLabels: input.birdLabels ?? null,
            timestamp: Timestamp.now(),
            recordedBy: input.recordedBy,
        });
        return ref.id;
    },

    async getScoresForMatch(matchId: string): Promise<ClayScoreRecord[]> {
        const q = query(
            collection(getDb(), 'clayScores'),
            where('matchId', '==', matchId),
            orderBy('presentationNumber', 'asc')
        );
        try {
            const snap = await getDocs(q);
            return snap.docs.map(d => mapScoreDoc(d.id, d.data()));
        } catch {
            const snap = await getDocs(
                query(collection(getDb(), 'clayScores'), where('matchId', '==', matchId))
            );
            return snap.docs
                .map(d => mapScoreDoc(d.id, d.data()))
                .sort((a, b) => a.presentationNumber - b.presentationNumber);
        }
    },

    async getScoresForTournament(tournamentId: string): Promise<ClayScoreRecord[]> {
        const q = query(
            collection(getDb(), 'clayScores'),
            where('tournamentId', '==', tournamentId),
            orderBy('timestamp', 'desc')
        );
        try {
            const snap = await getDocs(q);
            return snap.docs.map(d => mapScoreDoc(d.id, d.data()));
        } catch {
            const snap = await getDocs(
                query(collection(getDb(), 'clayScores'), where('tournamentId', '==', tournamentId))
            );
            return snap.docs
                .map(d => mapScoreDoc(d.id, d.data()))
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        }
    },

    async deleteLastScoreForMatch(matchId: string): Promise<ClayScoreRecord | null> {
        const records = await this.getScoresForMatch(matchId);
        if (records.length === 0) return null;
        const last = records[records.length - 1];
        await deleteDoc(doc(getDb(), 'clayScores', last.id));
        return last;
    },
};
