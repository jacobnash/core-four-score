import { getTournamentHomeRoute, isClaysTournament, resolveTournamentActivityType } from '../utils/tournamentNavigation';
import { Tournament } from '../types';

describe('tournamentNavigation', () => {
    const euchreTournament: Tournament = {
        id: 'weekend-euchre',
        name: 'Weekend Euchre',
        memberIds: ['u1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        activityType: 'euchre',
    };

    const claysTournament: Tournament = {
        id: 'saturday-clays',
        name: 'Saturday Clays',
        memberIds: ['u1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        activityType: 'clays',
    };

    const coreFour: Tournament = {
        id: 'the-core-four',
        name: 'The Core Four',
        memberIds: ['u1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        activityType: 'clays',
    };

    it('defaults missing activityType to euchre', () => {
        const legacy = { ...euchreTournament, activityType: undefined };
        expect(resolveTournamentActivityType(legacy)).toBe('euchre');
    });

    it('Core Four is always euchre', () => {
        expect(resolveTournamentActivityType(coreFour)).toBe('euchre');
        expect(isClaysTournament(coreFour)).toBe(false);
    });

    it('routes clays tournaments to the clays tab in dev', () => {
        expect(getTournamentHomeRoute(claysTournament)).toBe('/(tabs)/clays');
    });

    it('routes euchre tournaments to tournament home', () => {
        expect(getTournamentHomeRoute(euchreTournament)).toBe('/(tabs)/');
    });
});
