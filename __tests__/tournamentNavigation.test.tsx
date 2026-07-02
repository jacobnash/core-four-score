import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { resolveAutoSelectTournament } from '../utils/tournamentSelection';
import { Tournament } from '../types';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
    router: {
        replace: (...args: unknown[]) => mockReplace(...args),
        push: jest.fn(),
    },
}));

const mockUseAuth = jest.fn();
const mockUseTournament = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => mockUseTournament(),
}));

const { useRedirectToTournamentsIfNeeded } = require('../hooks/useRedirectToTournamentsIfNeeded');

function RedirectProbe() {
    useRedirectToTournamentsIfNeeded();
    return null;
}

describe('useRedirectToTournamentsIfNeeded', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false });
    });

    it('does not redirect while tournament startup is in progress', async () => {
        mockUseTournament.mockReturnValue({
            activeTournament: null,
            loading: true,
            startupReady: false,
        });

        render(<RedirectProbe />);

        await waitFor(() => {
            expect(mockReplace).not.toHaveBeenCalled();
        });
    });

    it('does not redirect when an active tournament is set', async () => {
        mockUseTournament.mockReturnValue({
            activeTournament: { id: 't1' },
            loading: false,
            startupReady: true,
        });

        render(<RedirectProbe />);

        await waitFor(() => {
            expect(mockReplace).not.toHaveBeenCalled();
        });
    });

    it('redirects to tournaments after startup when no tournament is active', async () => {
        mockUseTournament.mockReturnValue({
            activeTournament: null,
            loading: false,
            startupReady: true,
        });

        render(<RedirectProbe />);

        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tournaments');
        });
    });

    it('does not redirect when user is signed out', async () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });
        mockUseTournament.mockReturnValue({
            activeTournament: null,
            loading: false,
            startupReady: true,
        });

        render(<RedirectProbe />);

        await waitFor(() => {
            expect(mockReplace).not.toHaveBeenCalled();
        });
    });
});

describe('resolveAutoSelectTournament startup scenarios', () => {
    const t1: Tournament = {
        id: 't1',
        name: 'Weekend',
        memberIds: ['u1'],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const t2: Tournament = {
        id: 't2',
        name: 'Holiday',
        memberIds: ['u1'],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    it('opens OpeLand for a single-tournament user', () => {
        expect(resolveAutoSelectTournament([t1])).toEqual(t1);
    });

    it('opens OpeLand when preferred tournament is set among many', () => {
        expect(resolveAutoSelectTournament([t1, t2], 't2')).toEqual(t2);
    });

    it('requires tournament picker when multiple tournaments and no preference', () => {
        expect(resolveAutoSelectTournament([t1, t2])).toBeNull();
    });
});
