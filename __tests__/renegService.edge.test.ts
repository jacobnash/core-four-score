jest.mock('../services/firebase', () => ({ db: {} }));

describe('renegService edge cases', () => {
    const mockDocs = (items: any[]) => ({ docs: items.map((it, idx) => ({ id: `r${idx}`, data: () => it })), });

    beforeEach(() => {
        jest.resetModules();
    });

    it('getRenegs maps timestamp and returns items', async () => {
        jest.mock('firebase/firestore', () => {
            let lastWhereValue: string | null = null;
            return {
                collection: jest.fn(() => ({})),
                query: jest.fn(() => ({})),
                orderBy: jest.fn(() => ({})),
                limit: jest.fn(() => ({})),
                where: jest.fn((field: string, op: string, value: string) => { lastWhereValue = value; return {}; }),
                getDocs: async () => {
                    const items = [
                        { playerId: 'u1', gameId: 'g1', excuse: 'late', tournamentId: 't1', timestamp: { toDate: () => new Date('2020-01-01') } },
                        { playerId: 'u2', gameId: 'g2', excuse: 'missed', tournamentId: 't1', timestamp: { toDate: () => new Date('2020-02-01') } }
                    ];
                    const docs = (lastWhereValue ? items.filter(i => i.playerId === lastWhereValue) : items).map((it, idx) => ({ id: `r${idx}`, data: () => it }));
                    return { docs };
                }
            };
        });

        const { renegService } = require('../services/renegService');
        const res = await renegService.getRenegs(1);
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBe(2);
        expect(res[0].playerId).toBe('u1');
        expect(res[0].timestamp instanceof Date).toBe(true);
    });

    it('getRenegsByPlayer success path returns filtered and sorted', async () => {

        jest.mock('firebase/firestore', () => {
            let lastWhereValue: string | null = null;
            return {
                collection: jest.fn(() => ({})),
                query: jest.fn(() => ({})),
                where: jest.fn((field: string, op: string, value: string) => { lastWhereValue = value; return {}; }),
                getDocs: async () => {
                    const items = [
                        { playerId: 'u1', gameId: 'g1', excuse: 'x', tournamentId: 't1', timestamp: { toDate: () => new Date('2020-03-01') } },
                        { playerId: 'u1', gameId: 'g2', excuse: 'y', tournamentId: 't1', timestamp: { toDate: () => new Date('2020-02-01') } },
                        { playerId: 'u2', gameId: 'g3', excuse: 'z', tournamentId: 't1', timestamp: { toDate: () => new Date('2020-01-01') } }
                    ];
                    const docs = (lastWhereValue ? items.filter(i => i.playerId === lastWhereValue) : items).map((it, idx) => ({ id: `r${idx}`, data: () => it }));
                    return { docs };
                }
            };
        });

        const { renegService } = require('../services/renegService');
        const res = await renegService.getRenegsByPlayer('u1', 10);
        expect(res.length).toBe(2);
        // Ensure sorted descending by timestamp: first item is newer (2020-03-01)
        expect(res[0].timestamp.getTime()).toBeGreaterThan(res[1].timestamp.getTime());
    });

    it('getRenegsByPlayer fallback uses client-side filter when query throws', async () => {
        // First, mock the getDocs used by getRenegsByPlayer to throw
        jest.mock('firebase/firestore', () => ({
            collection: jest.fn(() => ({})),
            query: jest.fn(() => ({})),
            where: jest.fn(() => ({})),
            getDocs: async () => { throw new Error('missing index'); }
        }));

        const { renegService } = require('../services/renegService');

        // Also mock getRenegs which will be called inside fallback
        const spyGetRenegs = jest.spyOn(renegService, 'getRenegs').mockImplementation(async () => ([
            { id: 'r1', playerId: 'u1', gameId: 'g1', excuse: '', tournamentId: 't1', timestamp: new Date('2020-01-01') },
            { id: 'r2', playerId: 'u2', gameId: 'g2', excuse: '', tournamentId: 't1', timestamp: new Date('2020-02-01') }
        ] as any));

        const res = await renegService.getRenegsByPlayer('u1', 10);
        expect(res.length).toBe(1);
        expect(res[0].playerId).toBe('u1');

        spyGetRenegs.mockRestore();
    });

    it('getRenegsByTournament fallback returns filtered list when server fails', async () => {
        jest.mock('firebase/firestore', () => ({
            collection: jest.fn(() => ({})),
            query: jest.fn(() => ({})),
            where: jest.fn(() => ({})),
            orderBy: jest.fn(() => ({})),
            limit: jest.fn(() => ({})),
            getDocs: async () => { throw new Error('server failure'); }
        }));

        const { renegService } = require('../services/renegService');

        const spyGetRenegs = jest.spyOn(renegService, 'getRenegs').mockImplementation(async () => ([
            { id: 'r1', playerId: 'u1', gameId: 'g1', excuse: '', tournamentId: 't1', timestamp: new Date('2020-01-01') },
            { id: 'r2', playerId: 'u2', gameId: 'g2', excuse: '', tournamentId: 't2', timestamp: new Date('2020-02-01') }
        ] as any));

        const res = await renegService.getRenegsByTournament('t1', 10);
        expect(res.length).toBe(1);
        expect(res[0].tournamentId).toBe('t1');

        spyGetRenegs.mockRestore();
    });
});
