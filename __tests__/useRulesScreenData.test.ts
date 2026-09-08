import { act, renderHook } from '@testing-library/react-native';
import { useRulesScreenData } from '../hooks/useRulesScreenData';
import { Tournament, User } from '../types';

// Unit tests for the hook extracted out of app/(tabs)/rules.tsx (PLAN.md Stage 2.2) —
// this logic was previously only reachable by rendering the full screen.

const mockGetDocs = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('../services/firebase', () => ({ getDb: () => ({}) }));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(() => ({})),
    doc: jest.fn((_db: unknown, _col: string, id: string) => ({ id })),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
    deleteField: jest.fn(() => 'DELETE_FIELD'),
}));

const mockGetUser = jest.fn();
jest.mock('../services/firestore', () => ({
    userService: { getUser: (...args: unknown[]) => mockGetUser(...args) },
}));

async function flush() {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
}

const TOURNAMENT_ID = 'weekend-euchre-123';
const MEMBER_UID = 'member-1';

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
    return {
        id: TOURNAMENT_ID,
        tournamentId: TOURNAMENT_ID,
        name: 'Weekend Euchre',
        memberIds: [MEMBER_UID, 'member-2', 'member-3'],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
        ...overrides,
    };
}

function makeUser(overrides: Partial<User> = {}): User {
    return { uid: MEMBER_UID, displayName: 'Jacob', email: 'j@example.com', stats: { wins: 0, renegs: 0, gamesPlayed: 0 }, ...overrides };
}

function ruleDoc(id: string, data: Record<string, unknown>) {
    return { id, data: () => data };
}

describe('useRulesScreenData', () => {
    beforeAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetUser.mockResolvedValue(null);
    });

    it('fetches rules scoped to the tournament, filters expired proposals, and resolves author names', async () => {
        const docs = [
            ruleDoc('house-1', { text: 'No reneg forgiveness', author: 'system', tournamentId: TOURNAMENT_ID }),
            ruleDoc('prop-1', { text: 'Winner buys beer', author: MEMBER_UID, approvals: [MEMBER_UID], tournamentId: TOURNAMENT_ID }),
            ruleDoc('expired-1', { text: 'Old idea', author: 'member-2', approvals: [], status: 'expired', tournamentId: TOURNAMENT_ID }),
            ruleDoc('other-tournament', { text: 'Unrelated', author: MEMBER_UID, tournamentId: 'some-other-id' }),
        ];
        mockGetDocs.mockResolvedValue({ docs });
        mockGetUser.mockImplementation(async (uid: string) => makeUser({ uid, displayName: `Name-${uid}` }));

        const { result } = renderHook(() => useRulesScreenData(TOURNAMENT_ID, false, makeTournament(), makeUser()));
        await flush();

        const ids = result.current.rules.map(r => r.id);
        expect(ids).toEqual(['house-1', 'prop-1']); // expired hidden, other tournament excluded, system rule sorted first
        expect(result.current.loading).toBe(false);
        expect(result.current.uidToName[MEMBER_UID]).toBe(`Name-${MEMBER_UID}`);
    });

    it('proposeRule writes a new rule doc and resets the proposal input', async () => {
        mockGetDocs.mockResolvedValue({ docs: [] });
        const { result } = renderHook(() => useRulesScreenData(TOURNAMENT_ID, false, makeTournament(), makeUser()));
        await flush();

        act(() => result.current.setProposal('Screw the dealer'));
        act(() => result.current.setModalVisible(true));

        await act(async () => {
            await result.current.proposeRule();
        });

        expect(mockSetDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ text: 'Screw the dealer', author: MEMBER_UID, approvals: [MEMBER_UID] })
        );
        expect(result.current.proposal).toBe('');
        expect(result.current.modalVisible).toBe(false);
    });

    it('does not write a rule when the proposal is blank', async () => {
        mockGetDocs.mockResolvedValue({ docs: [] });
        const { result } = renderHook(() => useRulesScreenData(TOURNAMENT_ID, false, makeTournament(), makeUser()));
        await flush();

        act(() => result.current.setProposal('   '));
        await act(async () => {
            await result.current.proposeRule();
        });

        expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('toggleApprove adds the current user to a rule\'s approvals', async () => {
        mockGetDocs.mockResolvedValue({ docs: [] });
        const { result } = renderHook(() => useRulesScreenData(TOURNAMENT_ID, false, makeTournament(), makeUser()));
        await flush();

        await act(async () => {
            await result.current.toggleApprove({
                id: 'prop-1',
                text: 'Winner buys beer',
                author: 'member-2',
                approvals: ['member-2'],
                tournamentId: TOURNAMENT_ID,
            } as any);
        });

        expect(mockUpdateDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ approvals: ['member-2', MEMBER_UID] })
        );
    });

    it('bulkAddRules is a no-op when approvals would be below the acceptance threshold', async () => {
        mockGetDocs.mockResolvedValue({ docs: [] });
        // Only 2 members -> buildBulkRuleApprovals can't reach APPROVAL_THRESHOLD (3).
        const smallTournament = makeTournament({ memberIds: [MEMBER_UID, 'member-2'] });
        const { result } = renderHook(() => useRulesScreenData(TOURNAMENT_ID, false, smallTournament, makeUser()));
        await flush();

        act(() => result.current.setBulkText('Rule one\nRule two'));
        await act(async () => {
            await result.current.bulkAddRules();
        });

        expect(mockSetDoc).not.toHaveBeenCalled();
        expect(result.current.bulkModalVisible).toBe(false); // never opened, stays closed
    });
});
