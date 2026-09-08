import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import HomeScreen from '../app/(tabs)/index';
import { Tournament } from '../types';

// Characterization tests for app/(tabs)/index.tsx (complexity 15, was 0% covered,
// 4 churns in 90 days — the home/leaderboard screen).

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
    router: { push: (...args: unknown[]) => mockPush(...args), replace: (...args: unknown[]) => mockReplace(...args) },
}));

const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockUseTournament = jest.fn();
jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => mockUseTournament(),
}));

const mockGetLeaderboard = jest.fn();
jest.mock('../services/firestore', () => ({
    leaderboardService: { getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args) },
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

describe('HomeScreen', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetLeaderboard.mockResolvedValue([]);
    });

    it('shows a loading state while auth is resolving', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });
        mockUseTournament.mockReturnValue({ activeTournament: null, startupReady: false });

        render(<HomeScreen />);

        expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('prompts sign-in when auth resolves with no user', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: null, startupReady: false });

        render(<HomeScreen />);

        expect(screen.getByText('Please sign in to view this content.')).toBeTruthy();
    });

    it('shows a tournament-loading state once signed in but before tournament startup finishes', () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID, displayName: 'Jacob' }, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: null, startupReady: false });

        render(<HomeScreen />);

        expect(screen.getByText('Loading tournament...')).toBeTruthy();
    });

    it('shows an empty-leaderboard message when there are no games yet', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID, displayName: 'Jacob' }, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });
        mockGetLeaderboard.mockResolvedValue([]);

        render(<HomeScreen />);
        await flush();

        expect(screen.getByText('No games played yet!')).toBeTruthy();
        expect(mockGetLeaderboard).toHaveBeenCalledWith(TOURNAMENT_ID);
    });

    it('renders leaderboard entries when present', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID, displayName: 'Jacob' }, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });
        mockGetLeaderboard.mockResolvedValue([
            { userId: MEMBER_UID, displayName: 'Jacob', wins: 3, gamesPlayed: 5, totalRenegs: 1, winPercentage: 60 },
        ]);

        render(<HomeScreen />);
        await flush();

        expect(screen.queryByText('No games played yet!')).toBeNull();
        expect(screen.getByText('Jacob')).toBeTruthy();
    });

    it('does not fetch the leaderboard when no tournament is active', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID, displayName: 'Jacob' }, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: null, startupReady: true });

        render(<HomeScreen />);
        await flush();

        expect(mockGetLeaderboard).not.toHaveBeenCalled();
    });

    it('warns and redirects to tournaments instead of starting a game with no active tournament', async () => {
        const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID, displayName: 'Jacob' }, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: null, startupReady: true });

        render(<HomeScreen />);
        await flush();

        fireEvent.press(screen.getByText('🎲 START NEW GAME'));

        expect(alertSpy).toHaveBeenCalledWith('No tournament selected', 'Please select a tournament first.');
        expect(mockPush).toHaveBeenCalledWith('/(tabs)/tournaments');
        alertSpy.mockRestore();
    });

    it('navigates to matchup with the active tournament id when starting a game', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID, displayName: 'Jacob' }, loading: false });
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });

        render(<HomeScreen />);
        await flush();

        fireEvent.press(screen.getByText('🎲 START NEW GAME'));

        expect(mockPush).toHaveBeenCalledWith({ pathname: '/matchup', params: { tournamentId: TOURNAMENT_ID } });
    });
});
