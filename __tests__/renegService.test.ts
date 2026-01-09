// Prevent services/firebase from importing the real firebase ESM during tests
jest.mock('../services/firebase', () => ({ db: {} }));

import { renegService } from '../services/firestore';

// Mock the firebase/firestore functions used by services/firestore
jest.mock('firebase/firestore', () => {
    const Timestamp = {
        fromDate: (d: Date) => ({ _seconds: Math.floor(d.getTime() / 1000) }),
    };

    // simple in-memory collection
    const docs: any[] = [
        { id: 'r1', data: () => ({ playerId: 'uid-1', gameId: 'g1', excuse: 'I forgot', timestamp: { toDate: () => new Date('2024-01-01') } }) },
        { id: 'r2', data: () => ({ playerId: 'uid-2', gameId: 'g2', excuse: 'No excuse', timestamp: { toDate: () => new Date('2024-02-01') } }) },
        { id: 'r3', data: () => ({ playerId: 'uid-1', gameId: 'g3', excuse: 'Distracted', timestamp: { toDate: () => new Date('2024-03-01') } }) }
    ];

    let lastWhereValue: string | null = null;

    return {
        collection: jest.fn(() => ({})),
        doc: jest.fn(() => ({})),
        setDoc: jest.fn(async () => { }),
        getDoc: jest.fn(async () => ({ exists: () => false })),
        getDocs: jest.fn(async () => {
            if (lastWhereValue) {
                const filtered = docs.filter(d => d.data().playerId === lastWhereValue);
                lastWhereValue = null;
                return { docs: filtered };
            }
            return { docs };
        }),
        query: jest.fn(() => ({})),
        orderBy: jest.fn(() => ({})),
        where: jest.fn((field: string, op: string, value: string) => {
            lastWhereValue = value;
            return {};
        }),
        limit: jest.fn(() => ({})),
        Timestamp,
        increment: jest.fn((n: number) => n)
    };
});

describe('renegService (unit tests, mocked firestore)', () => {
    it('getRenegs returns list and maps fields', async () => {
        const list = await renegService.getRenegs(50);
        expect(Array.isArray(list)).toBe(true);
        expect(list.length).toBeGreaterThan(0);
        expect(list[0]).toHaveProperty('playerId');
        expect(list[0]).toHaveProperty('excuse');
        expect(list[0]).toHaveProperty('timestamp');
    });

    it('getRenegsByPlayer filters by playerId', async () => {
        const list = await renegService.getRenegsByPlayer('uid-1', 200);
        expect(list.every(r => r.playerId === 'uid-1')).toBe(true);
        expect(list.length).toBe(2);
    });
});
