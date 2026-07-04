import { CORE_FOUR_MEMBER_IDS } from '../constants/coreFour';
import {
    assertTournamentAcceptsInvites,
    canAddMemberToTournament,
    isLegacyCoreFourTournament,
    tournamentAcceptsInvites,
    validateTournamentMemberIds,
} from '../utils/tournamentMembership';

jest.mock('../services/firebase', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(() => ({})),
    doc: jest.fn((db: any, collectionName: string, id?: string) => ({ _collection: collectionName, _id: id })),
    getDoc: jest.fn(async () => ({ exists: () => false })),
    getDocs: jest.fn(async () => ({ docs: [] })),
    setDoc: jest.fn(async () => undefined),
    updateDoc: jest.fn(async () => undefined),
    arrayUnion: jest.fn((...args: unknown[]) => args),
    arrayRemove: jest.fn((...args: unknown[]) => args),
    Timestamp: { now: () => ({}) },
}));

import { tournamentService } from '../services/tournamentService';

describe('tournamentMembership', () => {
    it('detects the legacy Core Four tournament', () => {
        expect(isLegacyCoreFourTournament('the-core-four')).toBe(true);
        expect(isLegacyCoreFourTournament('weekend-123')).toBe(false);
    });

    it('Core Four tournament never accepts invites', () => {
        expect(tournamentAcceptsInvites('the-core-four')).toBe(false);
        expect(() => assertTournamentAcceptsInvites('the-core-four')).toThrow(/no one can be invited/i);
    });

    it('allows only Core Four members on the legacy tournament roster check', () => {
        expect(canAddMemberToTournament('the-core-four', 'the-core-four', CORE_FOUR_MEMBER_IDS[0])).toBe(true);
        expect(canAddMemberToTournament('the-core-four', 'the-core-four', 'random-new-user')).toBe(false);
        expect(canAddMemberToTournament('camp-weekend-1', 'camp-weekend-1', 'random-new-user')).toBe(true);
    });

    it('rejects invalid member lists for Core Four tournament', () => {
        const result = validateTournamentMemberIds('the-core-four', 'the-core-four', [
            CORE_FOUR_MEMBER_IDS[0],
            'new-player',
        ]);
        expect(result.ok).toBe(false);
    });

    it('allows any members on open tournaments', () => {
        const result = validateTournamentMemberIds('camp-night-1', 'camp-night-1', [
            'user-a',
            'user-b',
            'user-c',
            'user-d',
        ]);
        expect(result.ok).toBe(true);
    });
});

describe('tournamentService membership guards', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('blocks all invites to the Core Four tournament including from members', async () => {
        const { getDoc } = require('firebase/firestore');
        const coreFourDoc = {
            exists: () => true,
            id: 'the-core-four',
            data: () => ({
                name: 'The Core Four',
                memberIds: [...CORE_FOUR_MEMBER_IDS],
                inviteIds: [],
                status: 'draft',
            }),
        };
        getDoc.mockResolvedValueOnce(coreFourDoc);
        await expect(tournamentService.inviteUser('the-core-four', 'outsider-uid')).rejects.toThrow(
            /no one can be invited/i
        );

        getDoc.mockResolvedValueOnce(coreFourDoc);
        await expect(
            tournamentService.inviteUser('the-core-four', CORE_FOUR_MEMBER_IDS[0])
        ).rejects.toThrow(/no one can be invited/i);
    });

    it('allows inviting outsiders to open tournaments', async () => {
        const { getDoc } = require('firebase/firestore');
        getDoc.mockResolvedValueOnce({
            exists: () => true,
            id: 'camp-weekend-99',
            data: () => ({
                name: 'Camp Weekend',
                memberIds: [CORE_FOUR_MEMBER_IDS[0]],
                inviteIds: [],
                status: 'draft',
            }),
        });

        const { updateDoc } = require('firebase/firestore');
        await tournamentService.inviteUser('camp-weekend-99', 'outsider-uid');
        expect(updateDoc).toHaveBeenCalled();
    });
});
