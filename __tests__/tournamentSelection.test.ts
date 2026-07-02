import { resolveAutoSelectTournament } from '../utils/tournamentSelection';
import { Tournament } from '../types';

function makeTournament(id: string, overrides: Partial<Tournament> = {}): Tournament {
    return {
        id,
        name: `Tournament ${id}`,
        memberIds: ['u1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('resolveAutoSelectTournament', () => {
    it('returns null when user has no tournaments', () => {
        expect(resolveAutoSelectTournament([])).toBeNull();
    });

    it('auto-selects the only tournament', () => {
        const only = makeTournament('t1');
        expect(resolveAutoSelectTournament([only])).toBe(only);
    });

    it('auto-selects preferred tournament when user has multiple', () => {
        const t1 = makeTournament('t1');
        const t2 = makeTournament('t2');
        expect(resolveAutoSelectTournament([t1, t2], 't2')).toBe(t2);
    });

    it('matches preferred tournament by tournamentId field', () => {
        const t1 = makeTournament('doc-id', { tournamentId: 'legacy-id' });
        const t2 = makeTournament('t2');
        expect(resolveAutoSelectTournament([t1, t2], 'legacy-id')).toBe(t1);
    });

    it('returns null for multiple tournaments without a valid preferred id', () => {
        const t1 = makeTournament('t1');
        const t2 = makeTournament('t2');
        expect(resolveAutoSelectTournament([t1, t2])).toBeNull();
        expect(resolveAutoSelectTournament([t1, t2], 'missing')).toBeNull();
    });
});
