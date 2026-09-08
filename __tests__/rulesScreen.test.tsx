import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import RulesScreen from '../app/(tabs)/rules';
import { Tournament } from '../types';

// Characterization tests for app/(tabs)/rules.tsx (complexity 27, was 0% covered).
// Scoped to the access-derivation gates (canBulkAddRules / canProposeRules / draft /
// Core Four lock) this file's Stage 2.1 migration touches — not the full rule-list /
// approval-voting logic, which is a separate concern from the shared access hook.

const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockUseTournament = jest.fn();
jest.mock('../contexts/TournamentContext', () => ({
    useTournament: () => mockUseTournament(),
}));

jest.mock('../services/firebase', () => ({
    getDb: () => ({}),
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(() => ({})),
    doc: jest.fn(() => ({})),
    getDocs: jest.fn().mockResolvedValue({ docs: [] }),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteField: jest.fn(),
}));

jest.mock('../services/firestore', () => ({
    userService: { getUser: jest.fn().mockResolvedValue(null) },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const OPEN_TOURNAMENT_ID = 'weekend-euchre-123';
const CORE_FOUR_TOURNAMENT_ID = 'the-core-four';
const MEMBER_UID = 'member-1';

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
        ...overrides,
    };
}

describe('RulesScreen', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows a select-tournament prompt when no tournament is active', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockUseTournament.mockReturnValue({ activeTournament: null, loading: false });

        render(<RulesScreen />);
        await flush();

        expect(screen.getByText(/Select a tournament/)).toBeTruthy();
    });

    it('shows Bulk Add and Propose Rule for a member of a draft, open-roster tournament', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockUseTournament.mockReturnValue({
            activeTournament: makeTournament({ status: 'draft' }),
            loading: false,
        });

        render(<RulesScreen />);
        await flush();

        expect(screen.getByText('Bulk Add')).toBeTruthy();
        expect(screen.getByText('Propose Rule')).toBeTruthy();
    });

    it('hides Bulk Add (but keeps Propose Rule) once the tournament is active', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockUseTournament.mockReturnValue({
            activeTournament: makeTournament({ status: 'active' }),
            loading: false,
        });

        render(<RulesScreen />);
        await flush();

        expect(screen.queryByText('Bulk Add')).toBeNull();
        expect(screen.getByText('Propose Rule')).toBeTruthy();
    });

    it('hides both actions for a non-member', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: 'someone-else' } });
        mockUseTournament.mockReturnValue({
            activeTournament: makeTournament({ status: 'draft' }),
            loading: false,
        });

        render(<RulesScreen />);
        await flush();

        expect(screen.queryByText('Bulk Add')).toBeNull();
        expect(screen.queryByText('Propose Rule')).toBeNull();
    });

    it('hides Bulk Add for the locked legacy Core Four tournament even in draft', async () => {
        mockUseAuth.mockReturnValue({ user: { uid: MEMBER_UID } });
        mockUseTournament.mockReturnValue({
            activeTournament: makeTournament({
                id: CORE_FOUR_TOURNAMENT_ID,
                tournamentId: CORE_FOUR_TOURNAMENT_ID,
                status: 'draft',
            }),
            loading: false,
        });

        render(<RulesScreen />);
        await flush();

        expect(screen.queryByText('Bulk Add')).toBeNull();
        expect(screen.getByText('Propose Rule')).toBeTruthy();
    });
});
