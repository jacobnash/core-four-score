import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import ProfileScreen from '../app/profile';

// Characterization tests for app/profile.tsx (complexity 23, was 0% covered).

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: mockReplace }),
}));

const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockUseTournament = jest.fn();
jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => mockUseTournament(),
}));

const mockGetUser = jest.fn();
const mockGetUserStats = jest.fn();
const mockUpdateUser = jest.fn();
jest.mock('../services/firestore', () => ({
    userService: {
        getUser: (...args: unknown[]) => mockGetUser(...args),
        getUserStats: (...args: unknown[]) => mockGetUserStats(...args),
        updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
}));

const mockShowAlert = jest.fn();
jest.mock('../utils/alert', () => ({
    showAlert: (...args: unknown[]) => mockShowAlert(...args),
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const UID = 'member-1';
const AUTH_USER = { uid: UID, displayName: 'Jacob', email: 'j@example.com' };

describe('ProfileScreen', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseTournament.mockReturnValue({ activeTournament: null });
        mockGetUserStats.mockResolvedValue({ wins: 0, gamesPlayed: 0, renegs: 0 });
    });

    it('renders nothing when there is no signed-in user', () => {
        mockUseAuth.mockReturnValue({ user: null, signOut: jest.fn() });
        mockGetUser.mockResolvedValue(null);

        const { toJSON } = render(<ProfileScreen />);

        expect(toJSON()).toBeNull();
    });

    it('shows profile info and computed win rate once loaded', async () => {
        mockUseAuth.mockReturnValue({ user: AUTH_USER, signOut: jest.fn() });
        mockGetUser.mockResolvedValue({ ...AUTH_USER, photoURL: null });
        mockGetUserStats.mockResolvedValue({ wins: 3, gamesPlayed: 4, renegs: 1 });

        render(<ProfileScreen />);
        await flush();

        expect(screen.getByText('Signed in as Jacob')).toBeTruthy();
        expect(screen.getByText('75.0%')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy(); // wins
        expect(screen.getByText('1')).toBeTruthy(); // renegs
    });

    it('shows the tournament name alongside stats when one is active', async () => {
        mockUseAuth.mockReturnValue({ user: AUTH_USER, signOut: jest.fn() });
        mockGetUser.mockResolvedValue({ ...AUTH_USER, photoURL: null });
        mockUseTournament.mockReturnValue({ activeTournament: { id: 't1', name: 'Weekend Euchre' } });

        render(<ProfileScreen />);
        await flush();

        expect(screen.getByText('Player Stats — Weekend Euchre')).toBeTruthy();
    });

    it('falls back to initials when there is no avatar photo', async () => {
        mockUseAuth.mockReturnValue({ user: AUTH_USER, signOut: jest.fn() });
        mockGetUser.mockResolvedValue({ ...AUTH_USER, photoURL: null });

        render(<ProfileScreen />);
        await flush();

        expect(screen.getByText('JA')).toBeTruthy();
    });

    it('signs out and navigates to login on success', async () => {
        const mockSignOut = jest.fn().mockResolvedValue(undefined);
        mockUseAuth.mockReturnValue({ user: AUTH_USER, signOut: mockSignOut });
        mockGetUser.mockResolvedValue({ ...AUTH_USER, photoURL: null });

        render(<ProfileScreen />);
        await flush();

        fireEvent.press(screen.getByText('Sign Out'));
        await flush();

        expect(mockSignOut).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });

    it('shows an alert when sign-out fails', async () => {
        const mockSignOut = jest.fn().mockRejectedValue(new Error('network error'));
        mockUseAuth.mockReturnValue({ user: AUTH_USER, signOut: mockSignOut });
        mockGetUser.mockResolvedValue({ ...AUTH_USER, photoURL: null });

        render(<ProfileScreen />);
        await flush();

        fireEvent.press(screen.getByText('Sign Out'));
        await flush();

        expect(mockShowAlert).toHaveBeenCalledWith('Sign out failed', 'network error');
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it('saves edited name/photo and refreshes the profile', async () => {
        mockUseAuth.mockReturnValue({ user: AUTH_USER, signOut: jest.fn() });
        mockGetUser.mockResolvedValueOnce({ ...AUTH_USER, photoURL: null });
        mockUpdateUser.mockResolvedValue(undefined);

        render(<ProfileScreen />);
        await flush();

        fireEvent.changeText(screen.getByPlaceholderText('Full name'), 'Jacob Nash');
        mockGetUser.mockResolvedValueOnce({ ...AUTH_USER, displayName: 'Jacob Nash', photoURL: null });

        fireEvent.press(screen.getByText('Save'));
        await flush();

        expect(mockUpdateUser).toHaveBeenCalledWith(UID, 'Jacob Nash', '');
        expect(screen.getByText('Signed in as Jacob Nash')).toBeTruthy();
    });
});
