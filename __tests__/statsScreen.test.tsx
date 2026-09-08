import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import StatsScreen from '../app/(tabs)/stats';
import { Game, Reneg, Tournament, User } from '../types';

// Characterization tests for app/(tabs)/stats.tsx (complexity 17, was 0% covered).
// InteractiveStatsChart (a victory-native wrapper) is mocked out — testing a charting
// library's internals isn't worth it here; this screen's own data-loading/aggregation
// logic is the actual risk surface.

jest.mock('../components/InteractiveStatsChart', () => ({
    InteractiveStatsChart: () => null,
}));

const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockUseTournament = jest.fn();
jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => mockUseTournament(),
}));

const mockGetTournamentMembers = jest.fn();
const mockGetGames = jest.fn();
const mockGetRenegsByTournament = jest.fn();
jest.mock('../services/firestore', () => ({
    tournamentService: { getTournamentMembers: (...args: unknown[]) => mockGetTournamentMembers(...args) },
    gameService: { getGames: (...args: unknown[]) => mockGetGames(...args) },
    renegService: { getRenegsByTournament: (...args: unknown[]) => mockGetRenegsByTournament(...args) },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const TOURNAMENT_ID = 'weekend-euchre-123';
const MEMBER_UID = 'member-1';
const OTHER_UID = 'member-2';

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
    return {
        id: TOURNAMENT_ID,
        tournamentId: TOURNAMENT_ID,
        name: 'Weekend Euchre',
        memberIds: [MEMBER_UID, OTHER_UID],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        activityType: 'euchre',
        ...overrides,
    };
}

function makeUser(uid: string, displayName: string): User {
    return { uid, displayName, email: `${uid}@example.com`, stats: { wins: 0, renegs: 0, gamesPlayed: 0 } };
}

function makeGame(overrides: Partial<Game> = {}): Game {
    return {
        id: 'game-1',
        timestamp: new Date('2026-01-01T12:00:00Z'),
        location: 'Deer Camp',
        teams: [
            { playerIds: [MEMBER_UID], score: 1, isWinner: true },
            { playerIds: [OTHER_UID], score: 0, isWinner: false },
        ],
        tags: ['upset'],
        tournamentId: TOURNAMENT_ID,
        ...overrides,
    };
}

function makeReneg(overrides: Partial<Reneg> = {}): Reneg {
    return {
        id: 'reneg-1',
        playerId: OTHER_UID,
        gameId: 'game-1',
        excuse: 'thought spades was trump',
        tournamentId: TOURNAMENT_ID,
        timestamp: new Date('2026-01-01T12:05:00Z'),
        ...overrides,
    };
}

describe('StatsScreen', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTournamentMembers.mockResolvedValue([]);
        mockGetGames.mockResolvedValue([]);
        mockGetRenegsByTournament.mockResolvedValue([]);
    });

    it('prompts sign-in when there is no user', () => {
        mockUseAuth.mockReturnValue({ user: null });
        mockUseTournament.mockReturnValue({ activeTournament: null });

        render(<StatsScreen />);

        expect(screen.getByText('Please sign in to view stats')).toBeTruthy();
    });

    it('prompts to select a tournament when none is active', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockUseTournament.mockReturnValue({ activeTournament: null });

        render(<StatsScreen />);
        await flush();

        expect(screen.getAllByText('Select a tournament to view stats.').length).toBe(2); // wins + renegs cards
        expect(mockGetGames).not.toHaveBeenCalled();
    });

    it('shows empty-state messages when the tournament has no games yet', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament() });

        render(<StatsScreen />);
        await flush();

        expect(screen.getByText('No games recorded yet.')).toBeTruthy();
        expect(screen.getByText('No renegs recorded yet.')).toBeTruthy();
    });

    it('shows the overview, leaderboard, tag counts, and recent results once games exist', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament() });
        mockGetTournamentMembers.mockResolvedValue([makeUser(MEMBER_UID, 'Jacob'), makeUser(OTHER_UID, 'Dylan')]);
        mockGetGames.mockResolvedValue([makeGame()]);
        mockGetRenegsByTournament.mockResolvedValue([makeReneg()]);

        render(<StatsScreen />);
        await flush();

        expect(screen.getByText('📊 Overview')).toBeTruthy();
        expect(screen.getByText('Season Standings')).toBeTruthy();
        expect(screen.getAllByText('upset').length).toBeGreaterThan(0); // tag chip + recent-game tag
        expect(screen.getByText('🕐 Recent Results')).toBeTruthy();
        expect(screen.getByText(/Deer Camp/)).toBeTruthy();
    });

    it('excludes renegs from players who are no longer tournament members', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament() });
        // Only MEMBER_UID is a current member; the reneg belongs to someone who left.
        mockGetTournamentMembers.mockResolvedValue([makeUser(MEMBER_UID, 'Jacob')]);
        mockGetGames.mockResolvedValue([makeGame()]);
        mockGetRenegsByTournament.mockResolvedValue([makeReneg({ playerId: 'former-member' })]);

        render(<StatsScreen />);
        await flush();

        expect(screen.getByText('No renegs recorded yet.')).toBeTruthy();
    });
});
