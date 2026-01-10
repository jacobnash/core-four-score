jest.mock('../services/firebase', () => ({ db: {} }));

import { tournamentService } from '../services/tournamentService';
import { userService } from '../services/userService';

jest.mock('firebase/firestore', () => {
    return {
        collection: jest.fn(() => ({})),
        doc: jest.fn((db: any, collectionName: string, id?: string) => ({ _collection: collectionName, _id: id })),
        getDoc: jest.fn(async (ref: any) => {
            if (ref._collection === 'tournaments' && ref._id === 't1') {
                return { exists: () => true, id: 't1', data: () => ({ name: 'T1', memberIds: ['u1', 'u2'], createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) };
            }
            return { exists: () => false };
        })
    };
});

jest.spyOn(userService, 'getUser').mockImplementation(async (uid: string) => ({ uid, displayName: `User ${uid}`, email: `${uid}@example.com`, photoURL: '', stats: { wins: 0, renegs: 0, gamesPlayed: 0 } }));

describe('tournamentService', () => {
    it('getTournamentMembers returns User array', async () => {
        const members = await tournamentService.getTournamentMembers('t1');
        expect(Array.isArray(members)).toBe(true);
        expect(members.length).toBe(2);
        expect(members[0]).toHaveProperty('uid');
    });
});
