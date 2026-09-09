import { renderHook } from '@testing-library/react-native';
import { Tournament } from '../types';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
    router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

const mockUseTournament = jest.fn();
jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => mockUseTournament(),
}));

// Simulate the flag being off for both features — this is exactly the
// production state that caused the infinite-redirect crash.
jest.mock('../constants/featureFlags', () => ({
    ENABLE_CLAYS_SCORING: false,
    ENABLE_CATAN_SCORING: false,
}));

const { useTournamentHomeRedirect } = require('../hooks/useTournamentHomeRedirect');

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
    return {
        id: 'jkj',
        tournamentId: 'jkj',
        name: 'jkj',
        memberIds: ['u1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        activityType: 'clays',
        ...overrides,
    };
}

describe('useTournamentHomeRedirect', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('does not redirect from the tournament tab when the clays flag is off, even for a clays tournament', () => {
        // Regression: previously wantsClays was computed independently of the
        // flag, so this fired router.replace('/(tabs)/') while already on
        // '/(tabs)/' — a self-redirect that spiraled into "Maximum update
        // depth exceeded" and crashed the screen.
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });

        renderHook(() => useTournamentHomeRedirect('tournament'));

        expect(mockReplace).not.toHaveBeenCalled();
    });

});
