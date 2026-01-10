jest.mock('../services/firebase', () => ({ db: {} }));

import { userService } from '../services/userService';

jest.mock('firebase/firestore', () => {
    const storage: Record<string, any> = {};
    return {
        collection: jest.fn(() => ({})),
        doc: jest.fn((db: any, collection: string, id?: string) => ({ _collection: collection, _id: id })),
        setDoc: jest.fn(async (ref: any, payload: any, opts?: any) => { storage[ref._id || 'new'] = payload; }),
        getDoc: jest.fn(async (ref: any) => {
            const id = ref._id;
            if (storage[id]) return { exists: () => true, id, data: () => storage[id] };
            return { exists: () => false };
        }),
        getDocs: jest.fn(async () => ({ docs: [] })),
        query: jest.fn(() => ({})),
        where: jest.fn(() => ({})),
        Timestamp: { now: () => ({}) }
    };
});

describe('userService', () => {
    it('createUser and getUser roundtrip', async () => {
        const u = await userService.createUser('u1', 'Test User', 'test@example.com', 'http://photo');
        expect(u.uid).toBe('u1');
        const fetched = await userService.getUser('u1');
        expect(fetched).not.toBeNull();
        expect(fetched?.displayName).toBe('Test User');
    });

    it('updateUser merges fields', async () => {
        await userService.updateUser('u1', 'New Name', 'http://new');
        const fetched = await userService.getUser('u1');
        expect(fetched?.displayName).toBe('New Name');
    });
});
