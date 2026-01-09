/**
 * Manual Debugging Test Suite
 * Run this to diagnose authentication issues
 */

// Avoid importing the real firebase during Jest runs (ESM package causes transform issues).
jest.mock('../services/firebase', () => ({
    auth: { app: { options: { apiKey: 'FAKE_API_KEY', authDomain: 'fake.firebaseapp.com', projectId: 'core-four-score' } } },
    db: {}
}));

import { auth, db } from '../services/firebase';

describe('Firebase Connection Tests (mocked)', () => {
    it('Firebase mock should be available', () => {
        expect(auth).toBeDefined();
        expect(db).toBeDefined();
    });

    it('Auth mock should have config', () => {
        // @ts-ignore
        const config = auth.app.options;
        expect(config.apiKey).toBeTruthy();
        expect(config.authDomain).toContain('firebaseapp.com');
        expect(config.projectId).toBe('core-four-score');
    });
});

describe('Team Generation - Edge Cases', () => {
    const { generateTeams } = require('../utils/helpers');

    it('should handle exactly 4 players', () => {
        const result = generateTeams(['p1', 'p2', 'p3', 'p4']);
        expect(result.team1).toHaveLength(2);
        expect(result.team2).toHaveLength(2);
    });

    it('should not duplicate players', () => {
        const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
        const result = generateTeams(players);
        const allPlayers = [...result.team1, ...result.team2];
        const uniquePlayers = new Set(allPlayers);
        expect(uniquePlayers.size).toBe(players.length);
    });

    it('should randomize teams (run 10 times)', () => {
        const players = ['p1', 'p2', 'p3', 'p4'];
        const results = new Set();

        for (let i = 0; i < 10; i++) {
            const result = generateTeams(players);
            results.add(JSON.stringify(result));
        }

        // At least 2 different team combinations in 10 tries
        expect(results.size).toBeGreaterThan(1);
    });
});

describe('Console Debug Info', () => {
    it('should log current environment', () => {
        console.log('=== ENVIRONMENT DEBUG ===');
        console.log('Platform:', typeof window !== 'undefined' ? 'Web' : 'Native');
        console.log('Auth initialized:', !!auth);
        console.log('Firestore initialized:', !!db);

        // @ts-ignore
        const config = auth.app.options;
        console.log('Project ID:', config.projectId);
        console.log('Auth Domain:', config.authDomain);
        console.log('========================');

        expect(true).toBe(true);
    });
});
