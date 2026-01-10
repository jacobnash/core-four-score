import { doc, getDoc, collection, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { Tournament, User } from '../types';
import { db } from './firebase';
import { userService } from './userService';

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
,

    async getAllTournaments(): Promise<Tournament[]> {
        const snap = await getDocs(collection(db, 'tournaments'));
        return snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                name: data.name,
                memberIds: data.memberIds || [],
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            } as Tournament;
        });
    },

    async createTournament(name: string, memberIds: string[]): Promise<Tournament> {
        const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
        const payload = {
            name,
            memberIds,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        await setDoc(doc(db, 'tournaments', id), payload);
        return {
            id,
            name,
            memberIds,
            createdAt: new Date(),
            updatedAt: new Date()
        } as Tournament;
    }
};
