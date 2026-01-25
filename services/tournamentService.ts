import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
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
            tournamentId: data.tournamentId || tournamentDoc.id,
            name: data.name,
            memberIds: data.memberIds || [],
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            status: data.status || 'active',
            createdBy: data.createdBy ?? null,
            visibility: data.visibility || 'private',
            inviteIds: data.inviteIds || [],
            schemaVersion: typeof data.schemaVersion === 'number' ? data.schemaVersion : 1,
        };
    },

    async getTournamentMembers(tournamentId: string): Promise<User[]> {
        const tournament = await this.getTournament(tournamentId);
        if (!tournament) return [];

        const members = await Promise.all(
            tournament.memberIds.map(uid => userService.getUser(uid))
        );

        return members.filter((u): u is User => u !== null);
    },

    async getAllTournaments(): Promise<Tournament[]> {
        const snap = await getDocs(collection(db, 'tournaments'));
        return snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                tournamentId: data.tournamentId || d.id,
                name: data.name,
                memberIds: data.memberIds || [],
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                status: data.status || 'active',
                createdBy: data.createdBy ?? null,
                visibility: data.visibility || 'private',
                inviteIds: data.inviteIds || [],
                schemaVersion: typeof data.schemaVersion === 'number' ? data.schemaVersion : 1,
            } as Tournament;
        });
    },

    async createTournament(name: string, memberIds: string[], createdBy?: string): Promise<Tournament> {
        const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
        const payload = {
            tournamentId: id,
            name,
            memberIds,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            status: 'draft',
            createdBy: createdBy ?? null,
            visibility: 'private',
            inviteIds: [],
            schemaVersion: 1,
        };
        await setDoc(doc(db, 'tournaments', id), payload);
        return {
            id,
            tournamentId: id,
            name,
            memberIds,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'draft',
            createdBy: createdBy ?? null,
            visibility: 'private',
            inviteIds: [],
            schemaVersion: 1,
        } as Tournament;
    },

    async startTournament(id: string): Promise<void> {
        await updateDoc(doc(db, 'tournaments', id), {
            status: 'active',
            updatedAt: Timestamp.now(),
        });
    },

    async inviteUser(tournamentId: string, uid: string): Promise<void> {
        const t = await this.getTournament(tournamentId);
        if (!t) throw new Error('Tournament not found');
        if ((t.status || 'active') === 'active') {
            throw new Error('Cannot invite after tournament is started');
        }
        await updateDoc(doc(db, 'tournaments', tournamentId), {
            inviteIds: arrayUnion(uid),
            updatedAt: Timestamp.now(),
        });
    },

    async acceptInvite(tournamentId: string, uid: string): Promise<void> {
        const t = await this.getTournament(tournamentId);
        if (!t) throw new Error('Tournament not found');
        if ((t.status || 'active') === 'active') {
            throw new Error('Cannot add members after tournament is started');
        }
        await updateDoc(doc(db, 'tournaments', tournamentId), {
            memberIds: arrayUnion(uid),
            inviteIds: arrayRemove(uid),
            updatedAt: Timestamp.now(),
        });
    }
};
