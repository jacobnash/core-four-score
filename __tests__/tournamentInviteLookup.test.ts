import { findUsersForTournamentInvite } from '../utils/tournamentInviteLookup';
import { User } from '../types';

const users: User[] = [
    {
        uid: 'u1',
        displayName: 'Alex Kim',
        email: 'alex.kim@example.com',
        stats: { wins: 0, renegs: 0, gamesPlayed: 0 },
    },
    {
        uid: 'u2',
        displayName: 'Sam Rivera',
        email: 'sam.rivera@example.com',
        stats: { wins: 0, renegs: 0, gamesPlayed: 0 },
    },
];

describe('tournamentInviteLookup', () => {
    it('finds users by partial display name', () => {
        const matches = findUsersForTournamentInvite(users, 'alex', []);
        expect(matches.map(u => u.uid)).toEqual(['u1']);
    });

    it('finds users by email prefix', () => {
        const matches = findUsersForTournamentInvite(users, 'sam.rivera', []);
        expect(matches.map(u => u.uid)).toEqual(['u2']);
    });

    it('excludes existing members', () => {
        const matches = findUsersForTournamentInvite(users, 'alex', ['u1']);
        expect(matches).toHaveLength(0);
    });

    it('requires at least 2 characters', () => {
        expect(findUsersForTournamentInvite(users, 'a', [])).toHaveLength(0);
    });
});
