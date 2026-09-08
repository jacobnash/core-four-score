import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { Tournament, TournamentActivityType, User } from '../types';
import {
    assertTournamentAcceptsInvites,
    canAddMemberToTournament,
    isRosterLocked,
    validateTournamentMemberIds,
} from '../utils/tournamentMembership';
import { connectFirebaseEmulators, getDb } from './firebase';
import { userService } from './userService';

function mapTournamentDoc(id: string, data: Record<string, unknown>): Tournament {
    return {
        id,
        tournamentId: (data.tournamentId as string) || id,
        name: data.name as string,
        memberIds: (data.memberIds as string[]) || [],
        createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
        updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
        status: (data.status as Tournament['status']) || 'active',
        activityType: data.activityType === 'clays' ? 'clays' : 'euchre',
        createdBy: (data.createdBy as string | null) ?? null,
        visibility: (data.visibility as Tournament['visibility']) || 'private',
        inviteIds: (data.inviteIds as string[]) || [],
        schemaVersion: typeof data.schemaVersion === 'number' ? data.schemaVersion : 1,
    };
}

/**
 * Shared guard for every "add uid to this tournament" entry point: fetches the
 * tournament, then asserts it's found, still accepting invites, and open to `uid`.
 * Callers layer their own additional checks (already-a-member, roster-locked,
 * pending-invite) on top, in whatever order matches their existing behavior.
 */
async function assertJoinable(tournamentId: string, uid: string, notOpenMessage: string): Promise<Tournament> {
    const t = await tournamentService.getTournament(tournamentId);
    if (!t) throw new Error('Tournament not found');
    assertTournamentAcceptsInvites(t.id, t.tournamentId);
    if (!canAddMemberToTournament(t.id, t.tournamentId, uid)) {
        throw new Error(notOpenMessage);
    }
    return t;
}

export const tournamentService = {
    async getTournament(id: string): Promise<Tournament | null> {
        const tournamentDoc = await getDoc(doc(getDb(), 'tournaments', id));
        if (!tournamentDoc.exists()) return null;
        return mapTournamentDoc(tournamentDoc.id, tournamentDoc.data());
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
        const snap = await getDocs(collection(getDb(), 'tournaments'));
        return snap.docs.map(d => mapTournamentDoc(d.id, d.data()));
    },

    async createTournament(
        name: string,
        memberIds: string[],
        createdBy?: string,
        inviteIds: string[] = [],
        activityType: TournamentActivityType = 'euchre'
    ): Promise<Tournament> {
        connectFirebaseEmulators();
        const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
        const validation = validateTournamentMemberIds(id, id, memberIds);
        if (!validation.ok) {
            throw new Error(validation.message);
        }

        const pendingInvites = inviteIds.filter(uid => !memberIds.includes(uid));

        const payload = {
            tournamentId: id,
            name,
            memberIds,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            status: 'draft',
            activityType,
            createdBy: createdBy ?? null,
            visibility: 'private',
            inviteIds: pendingInvites,
            schemaVersion: 1,
        };
        await setDoc(doc(getDb(), 'tournaments', id), payload);
        return {
            id,
            tournamentId: id,
            name,
            memberIds,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'draft',
            activityType,
            createdBy: createdBy ?? null,
            visibility: 'private',
            inviteIds: pendingInvites,
            schemaVersion: 1,
        } as Tournament;
    },

    async startTournament(id: string): Promise<void> {
        await updateDoc(doc(getDb(), 'tournaments', id), {
            status: 'active',
            updatedAt: Timestamp.now(),
        });
    },

    async inviteUser(tournamentId: string, uid: string): Promise<void> {
        const t = await assertJoinable(tournamentId, uid, 'This tournament is limited to the original Core Four members.');
        if (t.memberIds.includes(uid)) {
            throw new Error('Player is already a member');
        }
        if (isRosterLocked(t.id, t.tournamentId)) {
            throw new Error('This tournament roster is locked.');
        }
        await updateDoc(doc(getDb(), 'tournaments', tournamentId), {
            inviteIds: arrayUnion(uid),
            updatedAt: Timestamp.now(),
        });
    },

    async declineInvite(tournamentId: string, uid: string): Promise<void> {
        await updateDoc(doc(getDb(), 'tournaments', tournamentId), {
            inviteIds: arrayRemove(uid),
            updatedAt: Timestamp.now(),
        });
    },

    async addMember(tournamentId: string, uid: string): Promise<void> {
        const t = await assertJoinable(tournamentId, uid, 'This tournament is limited to the original Core Four members.');
        if (isRosterLocked(t.id, t.tournamentId)) {
            throw new Error('This tournament roster is locked.');
        }
        if (t.memberIds.includes(uid)) return;
        await updateDoc(doc(getDb(), 'tournaments', tournamentId), {
            memberIds: arrayUnion(uid),
            inviteIds: arrayRemove(uid),
            updatedAt: Timestamp.now(),
        });
    },

    async acceptInvite(tournamentId: string, uid: string): Promise<void> {
        const t = await assertJoinable(tournamentId, uid, 'This tournament is limited to the original Core Four members.');
        if (isRosterLocked(t.id, t.tournamentId)) {
            throw new Error('This tournament roster is locked.');
        }
        if (!t.inviteIds?.includes(uid)) {
            throw new Error('No pending invite for this tournament');
        }
        await updateDoc(doc(getDb(), 'tournaments', tournamentId), {
            memberIds: arrayUnion(uid),
            inviteIds: arrayRemove(uid),
            updatedAt: Timestamp.now(),
        });
    },

    /**
     * Join a draft tournament via shared invite link.
     * Adds an invite if needed, then accepts — or accepts an existing invite.
     */
    async joinViaInviteLink(
        tournamentId: string,
        uid: string
    ): Promise<'joined' | 'already_member'> {
        const t = await assertJoinable(tournamentId, uid, 'This tournament is not open for new members.');
        if (t.memberIds.includes(uid)) return 'already_member';
        if (isRosterLocked(t.id, t.tournamentId)) {
            throw new Error('This tournament roster is locked.');
        }
        if (t.inviteIds?.includes(uid)) {
            await this.acceptInvite(tournamentId, uid);
            return 'joined';
        }
        await this.inviteUser(tournamentId, uid);
        await this.acceptInvite(tournamentId, uid);
        return 'joined';
    },
};
