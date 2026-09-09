import { act, renderHook } from '@testing-library/react-native';
import { useCatanScreenData } from '../hooks/useCatanScreenData';
import { User } from '../types';

const mockGetTournamentMembers = jest.fn();
const mockCreateGame = jest.fn();
const mockGetGames = jest.fn();
const mockGetCatanLeaderboard = jest.fn();

jest.mock('../services/firestore', () => ({
    tournamentService: { getTournamentMembers: (...args: unknown[]) => mockGetTournamentMembers(...args) },
    catanService: {
        createGame: (...args: unknown[]) => mockCreateGame(...args),
        getGames: (...args: unknown[]) => mockGetGames(...args),
    },
    catanLeaderboardService: {
        getCatanLeaderboard: (...args: unknown[]) => mockGetCatanLeaderboard(...args),
    },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const TOURNAMENT_ID = 'catan-league-1';

function makeUser(uid: string, displayName: string): User {
    return { uid, displayName, email: `${uid}@example.com`, stats: { wins: 0, renegs: 0, gamesPlayed: 0 } };
}

describe('useCatanScreenData', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetGames.mockResolvedValue([]);
        mockGetCatanLeaderboard.mockResolvedValue([]);
    });

    it('marks every fetched player present by default', async () => {
        mockGetTournamentMembers.mockResolvedValue([makeUser('u1', 'Jacob'), makeUser('u2', 'Dylan')]);
        const { result } = renderHook(() => useCatanScreenData(TOURNAMENT_ID, false, true, makeUser('u1', 'Jacob')));
        await flush();

        expect(result.current.presentPlayers.map(p => p.uid)).toEqual(['u1', 'u2']);
        expect(result.current.loading).toBe(false);
    });

    it('togglePresent never drops the last remaining player', async () => {
        mockGetTournamentMembers.mockResolvedValue([makeUser('u1', 'Jacob')]);
        const { result } = renderHook(() => useCatanScreenData(TOURNAMENT_ID, false, true, makeUser('u1', 'Jacob')));
        await flush();

        act(() => result.current.togglePresent('u1'));
        expect(result.current.presentPlayers.map(p => p.uid)).toEqual(['u1']);
    });

    it('refuses to save with fewer than 3 players', async () => {
        mockGetTournamentMembers.mockResolvedValue([makeUser('u1', 'Jacob'), makeUser('u2', 'Dylan')]);
        const { result } = renderHook(() => useCatanScreenData(TOURNAMENT_ID, false, true, makeUser('u1', 'Jacob')));
        await flush();

        await act(async () => {
            await result.current.saveGame();
        });

        expect(mockCreateGame).not.toHaveBeenCalled();
    });

    it('saves a game with base expansion for 4 players and marks the high scorer as winner', async () => {
        const users = [
            makeUser('u1', 'Jacob'),
            makeUser('u2', 'Dylan'),
            makeUser('u3', 'Grace'),
            makeUser('u4', 'Cait'),
        ];
        mockGetTournamentMembers.mockResolvedValue(users);
        mockCreateGame.mockResolvedValue('game-1');
        const { result } = renderHook(() => useCatanScreenData(TOURNAMENT_ID, false, true, users[0]));
        await flush();

        act(() => {
            result.current.setScore('u1', '10');
            result.current.setScore('u2', '7');
            result.current.setScore('u3', '5');
            result.current.setScore('u4', '4');
        });

        await act(async () => {
            await result.current.saveGame();
        });

        expect(mockCreateGame).toHaveBeenCalledWith(
            expect.objectContaining({
                tournamentId: TOURNAMENT_ID,
                expansion: 'base',
                players: expect.arrayContaining([
                    expect.objectContaining({ playerId: 'u1', score: 10, isWinner: true }),
                    expect.objectContaining({ playerId: 'u2', score: 7, isWinner: false }),
                ]),
            })
        );
    });

    it('resets to empty state for the locked Core Four tournament without fetching', async () => {
        const { result } = renderHook(() => useCatanScreenData(TOURNAMENT_ID, true, true, makeUser('u1', 'Jacob')));
        await flush();

        expect(mockGetTournamentMembers).not.toHaveBeenCalled();
        expect(result.current.players).toEqual([]);
        expect(result.current.loading).toBe(false);
    });

    it('randomizeBoard fills in a board for the selected expansion', async () => {
        mockGetTournamentMembers.mockResolvedValue([makeUser('u1', 'Jacob')]);
        const { result } = renderHook(() => useCatanScreenData(TOURNAMENT_ID, false, true, makeUser('u1', 'Jacob')));
        await flush();

        expect(result.current.board).toBeNull();
        act(() => result.current.randomizeBoard());
        expect(result.current.board?.expansion).toBe('base');
        expect(result.current.board?.tiles.length).toBe(19);
    });
});
