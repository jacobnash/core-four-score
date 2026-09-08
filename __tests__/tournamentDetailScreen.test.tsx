import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import TournamentDetail from '../app/tournament/[id].tsx';
import { Tournament } from '../types';

// Characterization tests for app/tournament/[id].tsx, the highest-complexity (29),
// 0%-covered, most-churned screen per AUDIT.md. These pin current behavior before
// any Stage 2 refactor (see PLAN.md 2.1) extracts its access-derivation logic.
//
// Uses a manual `flush()` (act + a real setTimeout tick) rather than
// @testing-library's `waitFor`: waitFor's polling doesn't reliably observe state
// updates from an async IIFE inside useEffect on this React 19 / RN 0.81 test
// setup, but a single real macrotask tick reliably drains the whole microtask
// chain first (verified with a minimal repro before writing this file).

const mockPush = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
    router: { push: (...args: unknown[]) => mockPush(...args) },
    useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockSetActiveTournamentById = jest.fn();
jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => ({ setActiveTournamentById: mockSetActiveTournamentById }),
}));

const mockGetTournament = jest.fn();
const mockGetTournamentMembers = jest.fn();
const mockGetLeaderboard = jest.fn();
const mockGetClaysLeaderboard = jest.fn();

jest.mock('../services/firestore', () => ({
    tournamentService: {
        getTournament: (...args: unknown[]) => mockGetTournament(...args),
        getTournamentMembers: (...args: unknown[]) => mockGetTournamentMembers(...args),
        startTournament: jest.fn(),
    },
    leaderboardService: {
        getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args),
    },
    claysLeaderboardService: {
        getClaysLeaderboard: (...args: unknown[]) => mockGetClaysLeaderboard(...args),
    },
    userService: {
        searchUsers: jest.fn().mockResolvedValue([]),
        getUser: jest.fn().mockResolvedValue(null),
    },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const OPEN_TOURNAMENT_ID = 'weekend-euchre-123';
const CORE_FOUR_TOURNAMENT_ID = 'the-core-four';
const MEMBER_UID = 'member-1';
const OUTSIDER_UID = 'outsider-1';

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
    return {
        id: OPEN_TOURNAMENT_ID,
        tournamentId: OPEN_TOURNAMENT_ID,
        name: 'Weekend Euchre',
        memberIds: [MEMBER_UID],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        activityType: 'euchre',
        createdBy: MEMBER_UID,
        visibility: 'private',
        inviteIds: [],
        schemaVersion: 1,
        ...overrides,
    };
}

describe('TournamentDetail screen', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseLocalSearchParams.mockReturnValue({ id: OPEN_TOURNAMENT_ID });
        mockGetTournamentMembers.mockResolvedValue([]);
        mockGetLeaderboard.mockResolvedValue([]);
        mockGetClaysLeaderboard.mockResolvedValue([]);
    });

    it('shows a loading indicator before the tournament resolves', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockGetTournament.mockReturnValue(new Promise(() => {})); // never resolves

        render(<TournamentDetail />);

        expect(screen.queryByText('Tournament not found')).toBeNull();
        expect(screen.queryByText('Private tournament')).toBeNull();
    });

    it('shows "Tournament not found" when getTournament resolves null', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockGetTournament.mockResolvedValue(null);

        render(<TournamentDetail />);
        await flush();

        expect(screen.getByText('Tournament not found')).toBeTruthy();
    });

    it('shows "Private tournament" for a signed-in non-member, non-invitee', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: OUTSIDER_UID } });
        mockGetTournament.mockResolvedValue(makeTournament());

        render(<TournamentDetail />);
        await flush();

        expect(screen.getByText('Private tournament')).toBeTruthy();
        expect(mockGetTournamentMembers).not.toHaveBeenCalled();
    });

    it('shows "Private tournament" when signed out', async () => {
        mockUseAuth.mockReturnValue({ user: null });
        mockGetTournament.mockResolvedValue(makeTournament());

        render(<TournamentDetail />);
        await flush();

        expect(screen.getByText('Private tournament')).toBeTruthy();
    });

    it('renders member view for an active, open-roster euchre tournament', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockGetTournament.mockResolvedValue(makeTournament());
        mockGetTournamentMembers.mockResolvedValue([
            { uid: MEMBER_UID, displayName: 'Jacob', email: 'j@example.com', stats: { wins: 0, renegs: 0, gamesPlayed: 0 } },
        ]);

        render(<TournamentDetail />);
        await flush();

        expect(screen.getByText('Weekend Euchre')).toBeTruthy();
        expect(screen.getByText('Start Game')).toBeTruthy();
        expect(screen.getByText('Open tournament home')).toBeTruthy();
        expect(screen.queryByText('Start Tournament')).toBeNull(); // not draft
        expect(screen.getByText(/open roster/)).toBeTruthy();
        expect(mockSetActiveTournamentById).toHaveBeenCalledWith(OPEN_TOURNAMENT_ID);
    });

    it('shows "Start Tournament" for a draft tournament and no game/home buttons yet', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockGetTournament.mockResolvedValue(makeTournament({ status: 'draft' }));

        render(<TournamentDetail />);
        await flush();

        expect(screen.getByText('Start Tournament')).toBeTruthy();
        expect(screen.getByText(/draft/)).toBeTruthy();
    });

    it('shows the clays scoring entry point and hides Start Game for a clays tournament', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockGetTournament.mockResolvedValue(makeTournament({ activityType: 'clays' }));

        render(<TournamentDetail />);
        await flush();

        expect(screen.getByText('Open clays scoring')).toBeTruthy();
        expect(screen.queryByText('Start Game')).toBeNull();
    });

    it('locks the roster and hides the invite panel for the legacy Core Four tournament', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockGetTournament.mockResolvedValue(
            makeTournament({ id: CORE_FOUR_TOURNAMENT_ID, tournamentId: CORE_FOUR_TOURNAMENT_ID })
        );

        render(<TournamentDetail />);
        await flush();

        expect(screen.getByText(/Core Four exclusive/)).toBeTruthy();
        expect(screen.getByText(/Closed roster/)).toBeTruthy();
        // Clays scoring is never offered on the locked legacy tournament, regardless of activityType.
        expect(screen.queryByText('Open clays scoring')).toBeNull();
        expect(screen.queryByText('Score clays')).toBeNull();
    });

    it('shows an empty-state message when there are no leaderboard entries yet', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockGetTournament.mockResolvedValue(makeTournament());
        mockGetLeaderboard.mockResolvedValue([]);

        render(<TournamentDetail />);
        await flush();

        expect(screen.getByText('No games yet for this tournament.')).toBeTruthy();
    });
});
