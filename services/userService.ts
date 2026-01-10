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
import { db } from './firebase';

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
            stats: { wins: 0, renegs: 0, gamesPlayed: 0 } // Stats calculated dynamically via getUserStats
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
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        return newUser;
    },

    async getUserStats(uid: string, tournamentId?: string): Promise<UserStats> {
        // Calculate stats from actual games and renegs filtered by tournament if provided
        let gamesQuery = query(collection(db, 'games'));

        if (tournamentId) {
            gamesQuery = query(collection(db, 'games'), where('tournamentId', '==', tournamentId));
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
        let renegsQuery = query(collection(db, 'renegs'), where('playerId', '==', uid));

        if (tournamentId) {
            renegsQuery = query(
                collection(db, 'renegs'),
                where('playerId', '==', uid),
                where('tournamentId', '==', tournamentId)
            );
        }

        const renegsSnapshot = await getDocs(renegsQuery);
        const renegs = renegsSnapshot.size;

        return { wins, renegs, gamesPlayed };
    }
};
