import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import JoinTournamentScreen from '../app/join/[id]';
import { Tournament } from '../types';

// Characterization tests for app/join/[id].tsx (complexity 19) — the invite-link
// join flow, business-critical and previously at 0% coverage.

const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn();
jest.mock('expo-router', () => ({
    router: { replace: (...args: unknown[]) => mockReplace(...args) },
    useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockLoadTournaments = jest.fn();
const mockSetActiveTournamentById = jest.fn();
jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => ({
        loadTournaments: mockLoadTournaments,
        setActiveTournamentById: mockSetActiveTournamentById,
    }),
}));

const mockGetTournament = jest.fn();
const mockJoinViaInviteLink = jest.fn();
jest.mock('../services/firestore', () => ({
    tournamentService: {
        getTournament: (...args: unknown[]) => mockGetTournament(...args),
        joinViaInviteLink: (...args: unknown[]) => mockJoinViaInviteLink(...args),
    },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const TOURNAMENT_ID = 'weekend-euchre-123';
const CORE_FOUR_ID = 'the-core-four';
const MEMBER_UID = 'member-1';
const OUTSIDER_UID = 'outsider-1';

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

describe('JoinTournamentScreen', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseLocalSearchParams.mockReturnValue({ id: TOURNAMENT_ID });
        mockLoadTournaments.mockResolvedValue(undefined);
        mockSetActiveTournamentById.mockResolvedValue(undefined);
    });

    it('shows an invalid-link message when there is no id param', async () => {
        mockUseLocalSearchParams.mockReturnValue({ id: undefined });
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID }, loading: false });

        render(<JoinTournamentScreen />);
        await flush();

        expect(screen.getByText('Invalid invite link')).toBeTruthy();
    });

    it('shows a not-found message when the tournament does not exist', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID }, loading: false });
        mockGetTournament.mockResolvedValue(null);

        render(<JoinTournamentScreen />);
        await flush();

        expect(screen.getByText('Tournament not found')).toBeTruthy();
    });

    it('blocks joining the locked legacy Core Four tournament via invite link', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID }, loading: false });
        mockGetTournament.mockResolvedValue(makeTournament({ id: CORE_FOUR_ID, tournamentId: CORE_FOUR_ID }));

        render(<JoinTournamentScreen />);
        await flush();

        expect(screen.getByText(/Core Four tournament is private/)).toBeTruthy();
    });

    it('prompts sign-in, preserving the return path, when not authenticated', async () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });
        mockGetTournament.mockResolvedValue(makeTournament());

        render(<JoinTournamentScreen />);
        await flush();

        expect(screen.getByText("You're invited!")).toBeTruthy();

        fireEvent.press(screen.getByText('Sign in to join'));
        expect(mockReplace).toHaveBeenCalledWith(
            `/(auth)/login?returnTo=${encodeURIComponent(`/join/${TOURNAMENT_ID}`)}`
        );
    });

    it('tells an existing member they are already in, with a shortcut to open it', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID }, loading: false });
        mockGetTournament.mockResolvedValue(makeTournament());

        render(<JoinTournamentScreen />);
        await flush();

        expect(screen.getByText('You are already a member of this tournament.')).toBeTruthy();

        fireEvent.press(screen.getByText('Open tournament'));
        await flush();

        expect(mockSetActiveTournamentById).toHaveBeenCalledWith(TOURNAMENT_ID);
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tournaments');
    });

    it('lets a non-member join and shows a welcome alert', async () => {
        const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
        mockUseAuth.mockReturnValue({ user: { uid: OUTSIDER_UID }, loading: false });
        mockGetTournament.mockResolvedValue(makeTournament());
        mockJoinViaInviteLink.mockResolvedValue('joined');

        render(<JoinTournamentScreen />);
        await flush();

        expect(screen.getByText('Join tournament')).toBeTruthy();

        fireEvent.press(screen.getByText('Join tournament'));
        await flush();

        expect(mockJoinViaInviteLink).toHaveBeenCalledWith(TOURNAMENT_ID, OUTSIDER_UID);
        expect(mockLoadTournaments).toHaveBeenCalled();
        expect(mockSetActiveTournamentById).toHaveBeenCalledWith(TOURNAMENT_ID);
        expect(alertSpy).toHaveBeenCalledWith(
            'Welcome!',
            'You joined "Weekend Euchre".',
            expect.any(Array)
        );
        alertSpy.mockRestore();
    });

    it('shows an error alert when joining fails', async () => {
        const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
        mockUseAuth.mockReturnValue({ user: { uid: OUTSIDER_UID }, loading: false });
        mockGetTournament.mockResolvedValue(makeTournament());
        mockJoinViaInviteLink.mockRejectedValue(new Error('This tournament roster is locked.'));

        render(<JoinTournamentScreen />);
        await flush();

        fireEvent.press(screen.getByText('Join tournament'));
        await flush();

        expect(alertSpy).toHaveBeenCalledWith('Could not join', 'This tournament roster is locked.');
        alertSpy.mockRestore();
    });
});
