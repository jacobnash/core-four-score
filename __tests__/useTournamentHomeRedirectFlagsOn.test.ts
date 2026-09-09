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

jest.mock('../constants/featureFlags', () => ({
    ENABLE_CLAYS_SCORING: true,
    ENABLE_CATAN_SCORING: true,
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

describe('useTournamentHomeRedirect (flags on)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('redirects off the tournament tab to clays when the flag is genuinely on', () => {
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });

        renderHook(() => useTournamentHomeRedirect('tournament'));

        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/clays');
    });

    it('redirects a catan tournament off the tournament tab to catan', () => {
        mockUseTournament.mockReturnValue({
            activeTournament: makeTournament({ activityType: 'catan' }),
            startupReady: true,
        });

        renderHook(() => useTournamentHomeRedirect('tournament'));

        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/catan');
    });

    it('does not redirect a euchre tournament away from the tournament tab', () => {
        mockUseTournament.mockReturnValue({
            activeTournament: makeTournament({ activityType: 'euchre' }),
            startupReady: true,
        });

        renderHook(() => useTournamentHomeRedirect('tournament'));

        expect(mockReplace).not.toHaveBeenCalled();
    });
});
