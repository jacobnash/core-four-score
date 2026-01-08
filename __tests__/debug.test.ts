/**
 * Manual Debugging Test Suite
 * Run this to diagnose authentication issues
 */

import { auth, db } from '../services/firebase';

describe('Firebase Connection Tests', () => {
    it('Firebase app should be initialized', () => {
        expect(auth).toBeDefined();
        expect(db).toBeDefined();
    });

    it('Auth should have correct config', () => {
        // @ts-ignore - accessing internal config for testing
        const config = auth.app.options;

        console.log('Firebase Config:', {
            apiKey: config.apiKey?.substring(0, 10) + '...',
            authDomain: config.authDomain,
            projectId: config.projectId,
        });

        expect(config.apiKey).toBeTruthy();
        expect(config.apiKey).not.toBe('YOUR_API_KEY');
        expect(config.authDomain).toContain('firebaseapp.com');
        expect(config.projectId).toBeTruthy();
        expect(config.projectId).not.toBe('YOUR_PROJECT_ID');
    });

    it('Should have core-four-score project ID', () => {
        // @ts-ignore
        const projectId = auth.app.options.projectId;
        expect(projectId).toBe('core-four-score');
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
