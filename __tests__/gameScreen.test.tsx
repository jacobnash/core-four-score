import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import GameScreen from '../app/game';

// Characterization tests for app/game.tsx (complexity 16) — score entry, including the
// win/loss write and staged-reneg creation this app's "No Deletes" data policy relies on
// being correct on the way in. Previously at 0% coverage.

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();
jest.mock('expo-router', () => ({
    router: { push: (...args: unknown[]) => mockPush(...args), back: (...args: unknown[]) => mockBack(...args) },
    useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockUseTournament = jest.fn();
jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => mockUseTournament(),
}));

const mockCreateGame = jest.fn();
const mockCreateReneg = jest.fn();
const mockGetLocationSuggestions = jest.fn();
jest.mock('../services/firestore', () => ({
    gameService: {
        createGame: (...args: unknown[]) => mockCreateGame(...args),
        getLocationSuggestions: (...args: unknown[]) => mockGetLocationSuggestions(...args),
    },
    renegService: { createReneg: (...args: unknown[]) => mockCreateReneg(...args) },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const TOURNAMENT_ID = 'weekend-euchre-123';
const P1 = 'p1';
const P2 = 'p2';
const P3 = 'p3';
const P4 = 'p4';

function baseParams(overrides: Record<string, unknown> = {}) {
    return {
        team1: JSON.stringify([P1, P2]),
        team2: JSON.stringify([P3, P4]),
        playerNames: JSON.stringify({ [P1]: 'Jacob', [P2]: 'Dylan', [P3]: 'Cait', [P4]: 'Grace' }),
        tournamentId: TOURNAMENT_ID,
        ...overrides,
    };
}

describe('GameScreen', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseLocalSearchParams.mockReturnValue(baseParams());
        mockUseAuth.mockReturnValue({ user: { uid: P1 } });
        mockUseTournament.mockReturnValue({ activeTournament: null });
        mockGetLocationSuggestions.mockResolvedValue([]);
        mockCreateGame.mockResolvedValue('game-1');
        mockCreateReneg.mockResolvedValue('reneg-1');
    });

    it('prompts sign-in when there is no user', () => {
        mockUseAuth.mockReturnValue({ user: null });

        render(<GameScreen />);

        expect(screen.getByText('Please sign in to record games')).toBeTruthy();
    });

    it('renders both teams by resolved player names', () => {
        render(<GameScreen />);

        expect(screen.getByText('Jacob & Dylan')).toBeTruthy();
        expect(screen.getByText('Cait & Grace')).toBeTruthy();
    });

    it('requires a winner to be selected before saving', async () => {
        const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
        render(<GameScreen />);

        fireEvent.press(screen.getByText('📝 Record Game'));
        await flush();

        expect(alertSpy).toHaveBeenCalledWith('Select Winner', 'Please select which team won.');
        expect(mockCreateGame).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    it('saves the game with the correct winner/loser scores and navigates home', async () => {
        render(<GameScreen />);

        fireEvent.press(screen.getByText('Cait & Grace Wins'));
        fireEvent.press(screen.getByText('📝 Record Game'));
        await flush();

        expect(mockCreateGame).toHaveBeenCalledWith(
            expect.objectContaining({
                tournamentId: TOURNAMENT_ID,
                teams: [
                    { playerIds: [P1, P2], score: 0, isWinner: false },
                    { playerIds: [P3, P4], score: 1, isWinner: true },
                ],
            })
        );
        expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('falls back to the active tournament id when no tournamentId param is given', async () => {
        mockUseLocalSearchParams.mockReturnValue(baseParams({ tournamentId: undefined }));
        mockUseTournament.mockReturnValue({ activeTournament: { id: 'active-t1', tournamentId: 'active-t1' } });

        render(<GameScreen />);
        fireEvent.press(screen.getByText('Jacob & Dylan Wins'));
        fireEvent.press(screen.getByText('📝 Record Game'));
        await flush();

        expect(mockCreateGame).toHaveBeenCalledWith(expect.objectContaining({ tournamentId: 'active-t1' }));
    });

    it('creates a reneg doc for a staged excuse after the game saves', async () => {
        render(<GameScreen />);

        fireEvent.press(screen.getByText('Jacob'));
        fireEvent.changeText(screen.getByPlaceholderText('Enter excuse...'), 'renegged on hearts');
        fireEvent.press(screen.getByText('Save Excuse'));

        fireEvent.press(screen.getByText('Jacob & Dylan Wins'));
        fireEvent.press(screen.getByText('📝 Record Game'));
        await flush();

        expect(mockCreateReneg).toHaveBeenCalledWith(
            expect.objectContaining({ playerId: P1, gameId: 'game-1', excuse: 'renegged on hearts', tournamentId: TOURNAMENT_ID })
        );
    });

    it('shows an error alert when saving the game fails', async () => {
        const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
        mockCreateGame.mockRejectedValue(new Error('offline'));

        render(<GameScreen />);
        fireEvent.press(screen.getByText('Jacob & Dylan Wins'));
        fireEvent.press(screen.getByText('📝 Record Game'));
        await flush();

        expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to save game.');
        expect(mockPush).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });
});
