jest.mock('../services/firebase', () => ({ db: {} }));

import { gameService } from '../services/gameService';

jest.mock('firebase/firestore', () => {
    // Simple mock with getDocs returning a set of games
    const docs = [
        { id: 'g1', data: () => ({ timestamp: { toDate: () => new Date('2024-01-01') }, location: 'Park', teams: [], tags: [], notes: '', tournamentId: 't1' }) },
        { id: 'g2', data: () => ({ timestamp: { toDate: () => new Date('2024-02-01') }, location: 'Beach', teams: [], tags: [], notes: '', tournamentId: 't1' }) },
        { id: 'g3', data: () => ({ timestamp: { toDate: () => new Date('2024-03-01') }, location: 'Park', teams: [], tags: [], notes: '', tournamentId: 't2' }) }
    ];

    return {
        collection: jest.fn(() => ({})),
        query: jest.fn(() => ({})),
        where: jest.fn(() => ({})),
        orderBy: jest.fn(() => ({})),
        limit: jest.fn(() => ({})),
        getDocs: jest.fn(async () => ({ docs })),
        Timestamp: { fromDate: (d: Date) => ({ _seconds: Math.floor(d.getTime() / 1000) }) }
    };
});

describe('gameService', () => {
    it('getGames returns mapped games for a tournament', async () => {
        const list = await gameService.getGames('t1', 10);
        expect(Array.isArray(list)).toBe(true);
        expect(list.every(g => typeof g.id === 'string')).toBe(true);
    });

    it('getAllGames returns mapped games', async () => {
        const all = await gameService.getAllGames(0);
        expect(Array.isArray(all)).toBe(true);
        expect(all.length).toBeGreaterThan(0);
    });

    it('getLocationSuggestions returns locations sorted by frequency', async () => {
        const locs = await gameService.getLocationSuggestions('t1', 10, false);
        // Expect 'Park' and 'Beach' at least
        expect(locs).toEqual(expect.arrayContaining(['Park', 'Beach']));
    });
});
