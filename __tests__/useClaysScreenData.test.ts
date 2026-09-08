import { act, renderHook } from '@testing-library/react-native';
import { useClaysScreenData } from '../hooks/useClaysScreenData';
import { User } from '../types';

// Unit tests for the hook extracted out of app/(tabs)/clays.tsx (PLAN.md Stage 2.2) —
// focused on the roster/presence reconciliation logic in load(), which the screen-level
// characterization tests in claysScreen.test.tsx don't exercise directly.

const mockGetTournamentMembers = jest.fn();
const mockGetActiveMatch = jest.fn();
const mockGetScoresForMatch = jest.fn();
const mockGetClaysLeaderboard = jest.fn();

jest.mock('../services/firestore', () => ({
    tournamentService: { getTournamentMembers: (...args: unknown[]) => mockGetTournamentMembers(...args) },
    claysMatchService: {
        getActiveMatch: (...args: unknown[]) => mockGetActiveMatch(...args),
        createMatch: jest.fn(),
        completeMatch: jest.fn(),
    },
    claysService: {
        getScoresForMatch: (...args: unknown[]) => mockGetScoresForMatch(...args),
        savePresentation: jest.fn(),
        deleteLastScoreForMatch: jest.fn(),
    },
    claysLeaderboardService: { getClaysLeaderboard: (...args: unknown[]) => mockGetClaysLeaderboard(...args) },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const TOURNAMENT_ID = 'skeet-league-1';

function makeUser(uid: string, displayName: string): User {
    return { uid, displayName, email: `${uid}@example.com`, stats: { wins: 0, renegs: 0, gamesPlayed: 0 } };
}

describe('useClaysScreenData', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetActiveMatch.mockResolvedValue(null);
        mockGetScoresForMatch.mockResolvedValue([]);
        mockGetClaysLeaderboard.mockResolvedValue([]);
    });

    it('marks every fetched shooter present by default when nothing was present before', async () => {
        mockGetTournamentMembers.mockResolvedValue([makeUser('u1', 'Jacob'), makeUser('u2', 'Dylan')]);

        const { result } = renderHook(() => useClaysScreenData(TOURNAMENT_ID, false, true, makeUser('u1', 'Jacob')));
        await flush();

        expect(result.current.presentShooters.map(s => s.uid)).toEqual(['u1', 'u2']);
        expect(result.current.loading).toBe(false);
    });

    it('togglePresent removes a shooter from the present set, but never the last one', async () => {
        mockGetTournamentMembers.mockResolvedValue([makeUser('u1', 'Jacob'), makeUser('u2', 'Dylan')]);
        const { result } = renderHook(() => useClaysScreenData(TOURNAMENT_ID, false, true, makeUser('u1', 'Jacob')));
        await flush();

        act(() => result.current.togglePresent('u2'));
        expect(result.current.presentShooters.map(s => s.uid)).toEqual(['u1']);

        // Only one shooter left present — toggling them off should be a no-op.
        act(() => result.current.togglePresent('u1'));
        expect(result.current.presentShooters.map(s => s.uid)).toEqual(['u1']);
    });

    it('drops a shooter from presence when they leave the roster on refetch', async () => {
        mockGetTournamentMembers.mockResolvedValueOnce([makeUser('u1', 'Jacob'), makeUser('u2', 'Dylan')]);
        const { result } = renderHook(() => useClaysScreenData(TOURNAMENT_ID, false, true, makeUser('u1', 'Jacob')));
        await flush();
        expect(result.current.presentShooters.map(s => s.uid)).toEqual(['u1', 'u2']);

        mockGetTournamentMembers.mockResolvedValueOnce([makeUser('u1', 'Jacob')]);
        await act(async () => {
            await result.current.load();
        });

        expect(result.current.shooters.map(s => s.uid)).toEqual(['u1']);
        expect(result.current.presentShooters.map(s => s.uid)).toEqual(['u1']);
    });

    it('resets to empty state for the locked Core Four tournament without fetching', async () => {
        const { result } = renderHook(() => useClaysScreenData(TOURNAMENT_ID, true, true, makeUser('u1', 'Jacob')));
        await flush();

        expect(mockGetTournamentMembers).not.toHaveBeenCalled();
        expect(result.current.shooters).toEqual([]);
        expect(result.current.loading).toBe(false);
    });
});
