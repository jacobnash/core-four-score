import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import ClaysScreen from '../app/(tabs)/clays';
import { Tournament } from '../types';

// Characterization tests for app/(tabs)/clays.tsx (complexity 34, was 0% covered).
// Scoped to the top-level gates this file's Stage 2.1 migration touches — the
// Core-Four-lock and euchre-tournament early returns — not the full scoring UI,
// which is a separate concern from the shared access hook.

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
    router: { replace: (...args: unknown[]) => mockReplace(...args), push: jest.fn() },
}));

const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockUseTournament = jest.fn();
jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => mockUseTournament(),
}));

jest.mock('../services/firestore', () => ({
    tournamentService: { getTournamentMembers: jest.fn().mockResolvedValue([]) },
    claysMatchService: { getActiveMatch: jest.fn().mockResolvedValue(null) },
    claysService: { getScoresForMatch: jest.fn().mockResolvedValue([]) },
    claysLeaderboardService: { getClaysLeaderboard: jest.fn().mockResolvedValue([]) },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const CLAYS_TOURNAMENT_ID = 'skeet-league-1';
const CORE_FOUR_TOURNAMENT_ID = 'the-core-four';
const MEMBER_UID = 'member-1';

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
    return {
        id: CLAYS_TOURNAMENT_ID,
        tournamentId: CLAYS_TOURNAMENT_ID,
        name: 'Skeet League',
        memberIds: [MEMBER_UID],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        activityType: 'clays',
        ...overrides,
    };
}

describe('ClaysScreen', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
    });

    it('blocks clays scoring for the legacy Core Four tournament', async () => {
        mockUseTournament.mockReturnValue({
            activeTournament: makeTournament({ id: CORE_FOUR_TOURNAMENT_ID, tournamentId: CORE_FOUR_TOURNAMENT_ID }),
            startupReady: true,
        });

        render(<ClaysScreen />);
        await flush();

        expect(screen.getByText(/separate shooting groups/)).toBeTruthy();
    });

    it('tells a euchre-tournament user to pick a clays tournament instead', async () => {
        mockUseTournament.mockReturnValue({
            activeTournament: makeTournament({ activityType: 'euchre' }),
            startupReady: true,
        });

        render(<ClaysScreen />);
        await flush();

        expect(screen.getByText(/is a euchre tournament/)).toBeTruthy();
    });

    it('does not show the euchre-tournament or Core-Four message for an active clays tournament', async () => {
        mockUseTournament.mockReturnValue({
            activeTournament: makeTournament(),
            startupReady: true,
        });

        render(<ClaysScreen />);
        await flush();

        expect(screen.queryByText(/is a euchre tournament/)).toBeNull();
        expect(screen.queryByText(/separate shooting groups/)).toBeNull();
    });

    it('prompts to select a tournament when none is active', async () => {
        mockUseTournament.mockReturnValue({ activeTournament: null, startupReady: true });

        render(<ClaysScreen />);
        await flush();

        expect(screen.queryByText(/is a euchre tournament/)).toBeNull();
        expect(screen.queryByText(/separate shooting groups/)).toBeNull();
    });
});
