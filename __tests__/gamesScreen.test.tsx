import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import GamesScreen from '../app/(tabs)/games';
import { Game, Tournament, User } from '../types';

// Characterization tests for app/(tabs)/games.tsx (complexity 15, was 0% covered,
// 4 churns in 90 days).

jest.mock('expo-router', () => ({
    router: { replace: jest.fn(), push: jest.fn() },
}));

const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockUseTournament = jest.fn();
jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => mockUseTournament(),
}));

const mockGetGames = jest.fn();
const mockGetTournamentMembers = jest.fn();
jest.mock('../services/firestore', () => ({
    gameService: { getGames: (...args: unknown[]) => mockGetGames(...args) },
    tournamentService: { getTournamentMembers: (...args: unknown[]) => mockGetTournamentMembers(...args) },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const TOURNAMENT_ID = 'weekend-euchre-123';
const MEMBER_UID = 'member-1';

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
    return {
        id: TOURNAMENT_ID,
        tournamentId: TOURNAMENT_ID,
        name: 'Weekend Euchre',
        memberIds: [MEMBER_UID],
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
            { playerIds: ['member-2'], score: 0, isWinner: false },
        ],
        tags: [],
        tournamentId: TOURNAMENT_ID,
        ...overrides,
    };
}

describe('GamesScreen', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetGames.mockResolvedValue([]);
        mockGetTournamentMembers.mockResolvedValue([]);
    });

    it('shows a loading state while auth is resolving', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });
        mockUseTournament.mockReturnValue({ activeTournament: null, startupReady: false });

        render(<GamesScreen />);

        expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('prompts sign-in when there is no user', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: null, startupReady: false });

        render(<GamesScreen />);

        expect(screen.getByText('Please sign in to view games.')).toBeTruthy();
    });

    it('shows a tournament-loading state before startup finishes', () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID }, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: null, startupReady: false });

        render(<GamesScreen />);

        expect(screen.getByText('Loading tournament...')).toBeTruthy();
    });

    it('does not fetch games when no tournament is active', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID }, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: null, startupReady: true });

        render(<GamesScreen />);
        await flush();

        expect(mockGetGames).not.toHaveBeenCalled();
    });

    it('shows an empty state when there are no games recorded yet', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID }, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });

        render(<GamesScreen />);
        await flush();

        expect(screen.getByText('No games recorded yet')).toBeTruthy();
        expect(mockGetGames).toHaveBeenCalledWith(TOURNAMENT_ID, 50);
    });

    it('renders games with resolved player names and opens the detail modal on press', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID }, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });
        mockGetGames.mockResolvedValue([makeGame()]);
        mockGetTournamentMembers.mockResolvedValue([makeUser(MEMBER_UID, 'Jacob'), makeUser('member-2', 'Dylan')]);

        render(<GamesScreen />);
        await flush();

        expect(screen.getByText(/Deer Camp/)).toBeTruthy();

        fireEvent.press(screen.getByText('Jan 1, 2026'));
        await flush();

        // GameDetailModal renders the winner's resolved name.
        expect(screen.getAllByText(/Jacob/).length).toBeGreaterThan(0);
    });
});
