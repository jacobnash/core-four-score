import { act, render } from '@testing-library/react-native';
import React from 'react';
import { TournamentProvider, useTournament } from '../contexts/TournamentContext';
import { Tournament } from '../types';

// Characterization tests for contexts/TournamentContext.tsx — the most-churned file
// in the last 90 days (4 commits) and, per AUDIT.md, completely uncovered. This is the
// hub behind "which tournament is active," auto-select-on-startup, and the one-time
// startup-navigation logic, consumed by every tournament screen.

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
    router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockGetAllTournaments = jest.fn();
const mockGetTournament = jest.fn();
const mockSetPreferredTournament = jest.fn();
const mockSetLastActiveTournament = jest.fn();

jest.mock('../services/firestore', () => ({
    tournamentService: {
        getAllTournaments: (...args: unknown[]) => mockGetAllTournaments(...args),
        getTournament: (...args: unknown[]) => mockGetTournament(...args),
    },
    userService: {
        setPreferredTournament: (...args: unknown[]) => mockSetPreferredTournament(...args),
        setLastActiveTournament: (...args: unknown[]) => mockSetLastActiveTournament(...args),
    },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

let latestCtx: ReturnType<typeof useTournament>;
function Probe() {
    latestCtx = useTournament();
    return null;
}

function renderProvider() {
    return render(
        <TournamentProvider>
            <Probe />
        </TournamentProvider>
    );
}

const USER_UID = 'user-1';
const OPEN_ID = 'weekend-euchre';
const LEAGUE_ID = 'thursday-league';

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
    return {
        id: OPEN_ID,
        tournamentId: OPEN_ID,
        name: 'Weekend Euchre',
        memberIds: [USER_UID],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        activityType: 'euchre',
        ...overrides,
    };
}

describe('TournamentProvider', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockSetPreferredTournament.mockResolvedValue(undefined);
        mockSetLastActiveTournament.mockResolvedValue(undefined);
    });

    it('is immediately startup-ready with empty state when signed out', async () => {
        mockUseAuth.mockReturnValue({ user: null });

        renderProvider();
        await flush();

        expect(latestCtx.startupReady).toBe(true);
        expect(latestCtx.loading).toBe(false);
        expect(latestCtx.tournaments).toEqual([]);
        expect(latestCtx.activeTournament).toBeNull();
        expect(mockGetAllTournaments).not.toHaveBeenCalled();
    });

    it('auto-selects the single tournament a user belongs to and navigates there', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: USER_UID, preferredTournamentId: null } });
        mockGetAllTournaments.mockResolvedValue([makeTournament()]);

        renderProvider();
        await flush();

        expect(latestCtx.startupReady).toBe(true);
        expect(latestCtx.activeTournament?.id).toBe(OPEN_ID);
        expect(mockSetPreferredTournament).toHaveBeenCalledWith(USER_UID, OPEN_ID);
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/');
    });

    it('sends the user to the tournament picker when there are multiple tournaments and no preference', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: USER_UID, preferredTournamentId: null } });
        mockGetAllTournaments.mockResolvedValue([
            makeTournament(),
            makeTournament({ id: LEAGUE_ID, tournamentId: LEAGUE_ID, name: 'Thursday League' }),
        ]);

        renderProvider();
        await flush();

        expect(latestCtx.activeTournament).toBeNull();
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tournaments');
        expect(mockSetPreferredTournament).not.toHaveBeenCalled();
    });

    it('auto-selects the preferred tournament among several', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: USER_UID, preferredTournamentId: LEAGUE_ID } });
        mockGetAllTournaments.mockResolvedValue([
            makeTournament(),
            makeTournament({ id: LEAGUE_ID, tournamentId: LEAGUE_ID, name: 'Thursday League' }),
        ]);

        renderProvider();
        await flush();

        expect(latestCtx.activeTournament?.id).toBe(LEAGUE_ID);
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/');
        // Already had a preference — shouldn't re-persist it.
        expect(mockSetPreferredTournament).not.toHaveBeenCalled();
    });

    it('only runs the startup navigation once, even if loadTournaments is called again', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: USER_UID, preferredTournamentId: null } });
        mockGetAllTournaments.mockResolvedValue([makeTournament()]);

        renderProvider();
        await flush();
        expect(mockReplace).toHaveBeenCalledTimes(1);

        await act(async () => {
            await latestCtx.loadTournaments();
        });

        expect(mockReplace).toHaveBeenCalledTimes(1); // not called again
    });

    it('shows an alert and stops loading if fetching tournaments fails', async () => {
        const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
        mockUseAuth.mockReturnValue({ user: { uid: USER_UID, preferredTournamentId: null } });
        mockGetAllTournaments.mockRejectedValue(new Error('network down'));

        renderProvider();
        await flush();

        expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to load tournaments');
        expect(latestCtx.loading).toBe(false);
        expect(latestCtx.startupReady).toBe(true);
        alertSpy.mockRestore();
    });

    describe('setActiveTournamentById', () => {
        it('activates the tournament, persists it, and navigates when the user is a member', async () => {
            mockUseAuth.mockReturnValue({ user: { uid: USER_UID, preferredTournamentId: null } });
            mockGetAllTournaments.mockResolvedValue([]);
            mockGetTournament.mockResolvedValue(makeTournament());

            renderProvider();
            await flush();
            mockReplace.mockClear();

            await act(async () => {
                await latestCtx.setActiveTournamentById(OPEN_ID);
            });

            expect(latestCtx.activeTournament?.id).toBe(OPEN_ID);
            expect(mockSetPreferredTournament).toHaveBeenCalledWith(USER_UID, OPEN_ID);
            expect(mockSetLastActiveTournament).toHaveBeenCalledWith(USER_UID, OPEN_ID);
            expect(mockReplace).toHaveBeenCalledWith('/(tabs)/');
        });

        it('denies access and does not activate when the user is not a member', async () => {
            const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
            mockUseAuth.mockReturnValue({ user: { uid: 'outsider', preferredTournamentId: null } });
            mockGetAllTournaments.mockResolvedValue([]);
            mockGetTournament.mockResolvedValue(makeTournament()); // memberIds only has USER_UID

            renderProvider();
            await flush();

            await act(async () => {
                await latestCtx.setActiveTournamentById(OPEN_ID);
            });

            expect(alertSpy).toHaveBeenCalledWith('Access denied', 'You are not a member of that tournament');
            expect(latestCtx.activeTournament).toBeNull();
            alertSpy.mockRestore();
        });

        it('shows an error when the tournament does not exist', async () => {
            const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
            mockUseAuth.mockReturnValue({ user: { uid: USER_UID, preferredTournamentId: null } });
            mockGetAllTournaments.mockResolvedValue([]);
            mockGetTournament.mockResolvedValue(null);

            renderProvider();
            await flush();

            await act(async () => {
                await latestCtx.setActiveTournamentById('missing-id');
            });

            expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to select tournament');
            alertSpy.mockRestore();
        });
    });

    describe('activateTournament', () => {
        it('navigates by default', async () => {
            mockUseAuth.mockReturnValue({ user: { uid: USER_UID, preferredTournamentId: null } });
            mockGetAllTournaments.mockResolvedValue([]);

            renderProvider();
            await flush();
            mockReplace.mockClear();

            await act(async () => {
                await latestCtx.activateTournament(makeTournament());
            });

            expect(mockReplace).toHaveBeenCalledWith('/(tabs)/');
        });

        it('skips navigation when navigate: false is passed', async () => {
            mockUseAuth.mockReturnValue({ user: { uid: USER_UID, preferredTournamentId: null } });
            mockGetAllTournaments.mockResolvedValue([]);

            renderProvider();
            await flush();
            mockReplace.mockClear();

            await act(async () => {
                await latestCtx.activateTournament(makeTournament(), { navigate: false });
            });

            expect(mockReplace).not.toHaveBeenCalled();
            expect(latestCtx.activeTournament?.id).toBe(OPEN_ID);
        });
    });

    it('resets state when the user signs out after being signed in', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: USER_UID, preferredTournamentId: null } });
        mockGetAllTournaments.mockResolvedValue([makeTournament()]);

        const { rerender } = renderProvider();
        await flush();
        expect(latestCtx.activeTournament).not.toBeNull();

        mockUseAuth.mockReturnValue({ user: null });
        rerender(
            <TournamentProvider>
                <Probe />
            </TournamentProvider>
        );
        await flush();

        expect(latestCtx.activeTournament).toBeNull();
        expect(latestCtx.tournaments).toEqual([]);
    });
});
