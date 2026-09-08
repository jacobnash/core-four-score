import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    Timestamp,
    where
} from 'firebase/firestore';
import { User, UserStats } from '../types';
import { findUsersForTournamentInvite } from '../utils/tournamentInviteLookup';
import { getDb } from './firebase';

function mapUserDoc(uid: string, data: Record<string, unknown>): User {
    return {
        uid,
        displayName: data.displayName as string,
        email: data.email as string,
        photoURL: data.photoURL as string | undefined,
        stats: { wins: 0, renegs: 0, gamesPlayed: 0 }, // Stats calculated dynamically via getUserStats
        preferredTournamentId: (data.preferredTournamentId as string | null | undefined) ?? null,
        lastActiveTournamentId: (data.lastActiveTournamentId as string | null | undefined) ?? null,
    };
}

export const userService = {
    async getUser(uid: string): Promise<User | null> {
        const userDoc = await getDoc(doc(getDb(), 'users', uid));
        if (!userDoc.exists()) return null;

        return mapUserDoc(userDoc.id, userDoc.data());
    },

    async createUser(uid: string, displayName: string, email: string, photoURL?: string): Promise<User> {
        const newUser: User = {
            uid,
            displayName,
            email,
            photoURL,
            stats: { wins: 0, renegs: 0, gamesPlayed: 0 },
            preferredTournamentId: null,
            lastActiveTournamentId: null,
        };

        await setDoc(doc(getDb(), 'users', uid), {
            displayName,
            email,
            photoURL,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            preferredTournamentId: null,
            lastActiveTournamentId: null,
        });

        return newUser;
    },

    async findUserByEmail(email: string): Promise<User | null> {
        const normalized = email.trim().toLowerCase();
        if (!normalized) return null;
        const snap = await getDocs(query(collection(getDb(), 'users'), where('email', '==', normalized)));
        if (snap.empty) return null;
        const d = snap.docs[0];
        return mapUserDoc(d.id, d.data());
    },

    async searchUsers(queryText: string, excludeMemberIds: string[] = []): Promise<User[]> {
        const all = await this.getAllUsers();
        return findUsersForTournamentInvite(all, queryText, excludeMemberIds);
    },

    async getAllUsers(): Promise<User[]> {
        const snap = await getDocs(collection(getDb(), 'users'));
        return snap.docs.map(d => mapUserDoc(d.id, d.data()));
    },

    async updateUser(uid: string, displayName?: string, photoURL?: string): Promise<void> {
        const payload: any = {
            updatedAt: Timestamp.now()
        };

        if (typeof displayName === 'string') payload.displayName = displayName;
        if (typeof photoURL === 'string') payload.photoURL = photoURL;

        await setDoc(doc(getDb(), 'users', uid), payload, { merge: true });
    },

    async setPreferredTournament(uid: string, tournamentId: string | null): Promise<void> {
        await setDoc(doc(getDb(), 'users', uid), {
            preferredTournamentId: tournamentId,
            updatedAt: Timestamp.now(),
        }, { merge: true });
    },

    async setLastActiveTournament(uid: string, tournamentId: string | null): Promise<void> {
        await setDoc(doc(getDb(), 'users', uid), {
            lastActiveTournamentId: tournamentId,
            updatedAt: Timestamp.now(),
        }, { merge: true });
    },

    async getUserStats(uid: string, tournamentId?: string): Promise<UserStats> {
        // Calculate stats from actual games and renegs filtered by tournament if provided
        let gamesQuery = query(collection(getDb(), 'games'));

        if (tournamentId) {
            gamesQuery = query(collection(getDb(), 'games'), where('tournamentId', '==', tournamentId));
        }

        const gamesSnapshot = await getDocs(gamesQuery);

        // Count games where this user was on a winning team
        let wins = 0;
        let gamesPlayed = 0;

        for (const gameDoc of gamesSnapshot.docs) {
            const gameData = gameDoc.data();
            const teams = gameData.teams || [];

            // Check if user is in any team
            const isInGame = teams.some((team: any) => team.playerIds?.includes(uid));

            if (isInGame) {
                gamesPlayed++;

                // Determine winning team: prefer explicit isWinner; fallback to highest score if unique
                let winningTeam: any = teams.find((team: any) => team.isWinner);

                if (!winningTeam) {
                    const numericTeams = teams.filter((t: any) => typeof t.score === 'number');
                    if (numericTeams.length >= 2) {
                        const scores = numericTeams.map((t: any) => t.score);
                        const max = Math.max(...scores);
                        const maxTeams = numericTeams.filter((t: any) => t.score === max);
                        if (maxTeams.length === 1) {
                            winningTeam = maxTeams[0];
                        }
                    }
                }

                const isWin = !!winningTeam && Array.isArray(winningTeam.playerIds) && winningTeam.playerIds.includes(uid);
                if (isWin) wins++;
            }
        }


        // Count renegs for this user
        let renegsQuery = query(collection(getDb(), 'renegs'), where('playerId', '==', uid));

        if (tournamentId) {
            renegsQuery = query(
                collection(getDb(), 'renegs'),
                where('playerId', '==', uid),
                where('tournamentId', '==', tournamentId)
            );
        }

        const renegsSnapshot = await getDocs(renegsQuery);
        const renegs = renegsSnapshot.size;

        return { wins, renegs, gamesPlayed };
    }
};
