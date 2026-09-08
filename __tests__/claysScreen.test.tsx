import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import ClaysScreen from '../app/(tabs)/clays';
import { Tournament, User } from '../types';

// Characterization tests for app/(tabs)/clays.tsx (complexity 34, was 0% covered).
// Covers the screen's top-level gates (Core-Four-lock, euchre-tournament, no-tournament,
// no-shooters) and the two main scoring-flow states (new-match setup, active scoring),
// including one end-to-end interaction (start a match, record a presentation) so a
// Stage 2.2 data/logic extraction has something real to pin against.

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

const mockGetTournamentMembers = jest.fn();
const mockGetActiveMatch = jest.fn();
const mockGetScoresForMatch = jest.fn();
const mockCreateMatch = jest.fn();
const mockSavePresentation = jest.fn();

jest.mock('../services/firestore', () => ({
    tournamentService: { getTournamentMembers: (...args: unknown[]) => mockGetTournamentMembers(...args) },
    claysMatchService: {
        getActiveMatch: (...args: unknown[]) => mockGetActiveMatch(...args),
        createMatch: (...args: unknown[]) => mockCreateMatch(...args),
        completeMatch: jest.fn(),
    },
    claysService: {
        getScoresForMatch: (...args: unknown[]) => mockGetScoresForMatch(...args),
        savePresentation: (...args: unknown[]) => mockSavePresentation(...args),
        deleteLastScoreForMatch: jest.fn(),
    },
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

function makeUser(overrides: Partial<User> = {}): User {
    return {
        uid: MEMBER_UID,
        displayName: 'Jacob',
        email: 'j@example.com',
        stats: { wins: 0, renegs: 0, gamesPlayed: 0 },
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
        mockGetTournamentMembers.mockResolvedValue([]);
        mockGetActiveMatch.mockResolvedValue(null);
        mockGetScoresForMatch.mockResolvedValue([]);
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

    it('prompts to invite a squad when the tournament has no shooters yet', async () => {
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });
        mockGetTournamentMembers.mockResolvedValue([]);

        render(<ClaysScreen />);
        await flush();

        expect(screen.getByText(/No shooters in Skeet League yet/)).toBeTruthy();
    });

    it('shows new-match setup with the squad list when there are shooters and no active match', async () => {
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });
        mockGetTournamentMembers.mockResolvedValue([
            makeUser(),
            makeUser({ uid: 'member-2', displayName: 'Dylan' }),
        ]);

        render(<ClaysScreen />);
        await flush();

        expect(screen.getByText('New match')).toBeTruthy();
        expect(screen.getByText('Jacob')).toBeTruthy();
        expect(screen.getByText('Dylan')).toBeTruthy();
        expect(screen.getByText('Start match')).toBeTruthy();
    });

    it('shows the scoring wizard once a match is active', async () => {
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });
        mockGetTournamentMembers.mockResolvedValue([makeUser()]);
        mockGetActiveMatch.mockResolvedValue({
            id: 'match-1',
            tournamentId: CLAYS_TOURNAMENT_ID,
            discipline: 'skeet',
            expectedTargets: 25,
            status: 'active',
        });

        render(<ClaysScreen />);
        await flush();

        expect(screen.getByText('HIT')).toBeTruthy();
        expect(screen.getByText('MISS')).toBeTruthy();
        expect(screen.getByText('Jacob')).toBeTruthy(); // current shooter name
    });

    it('starts a match and saves a completed 2-bird presentation (default pair type)', async () => {
        mockUseTournament.mockReturnValue({ activeTournament: makeTournament(), startupReady: true });
        mockGetTournamentMembers.mockResolvedValue([makeUser()]);
        // 5-stand: non-sporting (so "Where" isn't required) but still a manual,
        // course-defined pair-type menu — unlike trap/skeet's fixed sequence.
        mockCreateMatch.mockResolvedValue({
            id: 'match-1',
            tournamentId: CLAYS_TOURNAMENT_ID,
            discipline: '5stand',
            expectedTargets: 25,
            status: 'active',
        });
        mockSavePresentation.mockResolvedValue(undefined);

        render(<ClaysScreen />);
        await flush();

        fireEvent.press(screen.getByText('Start match'));
        await flush();

        expect(mockCreateMatch).toHaveBeenCalledWith(
            expect.objectContaining({ tournamentId: CLAYS_TOURNAMENT_ID, discipline: 'sporting', expectedTargets: 100 })
        );
        expect(screen.getByText('HIT')).toBeTruthy();

        // Default pairType is 'report' (2 birds) — one HIT tap shouldn't save yet.
        fireEvent.press(screen.getByText('HIT'));
        await flush();
        expect(mockSavePresentation).not.toHaveBeenCalled();

        // Second tap completes the presentation and saves.
        fireEvent.press(screen.getByText('HIT'));
        await flush();
        expect(mockSavePresentation).toHaveBeenCalledWith(
            expect.objectContaining({
                tournamentId: CLAYS_TOURNAMENT_ID,
                matchId: 'match-1',
                shooterId: MEMBER_UID,
                pairType: 'report',
                birdResults: [true, true],
            })
        );
    });
});
