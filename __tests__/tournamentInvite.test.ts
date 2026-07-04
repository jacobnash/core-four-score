import {
    buildTournamentInviteUrl,
    parseJoinPath,
    sanitizePostLoginPath,
} from '../utils/tournamentInvite';

describe('tournamentInvite', () => {
    test('buildTournamentInviteUrl encodes tournament id', () => {
        expect(buildTournamentInviteUrl('camp-weekend-123')).toContain('/join/camp-weekend-123');
    });

    test('sanitizePostLoginPath allows join paths only', () => {
        expect(sanitizePostLoginPath('/join/camp-1')).toBe('/join/camp-1');
        expect(sanitizePostLoginPath('/(tabs)/tournaments')).toBeNull();
        expect(sanitizePostLoginPath('/join/../admin')).toBeNull();
    });

    test('parseJoinPath extracts id', () => {
        expect(parseJoinPath('/join/lake-house-open')).toBe('lake-house-open');
        expect(parseJoinPath('/join/foo%20bar')).toBe('foo bar');
    });
});

describe('tournamentService.joinViaInviteLink', () => {
    jest.mock('../services/firebase', () => ({ db: {} }));

    jest.mock('firebase/firestore', () => ({
        collection: jest.fn(() => ({})),
        doc: jest.fn((db: any, collectionName: string, id?: string) => ({ _collection: collectionName, _id: id })),
        getDoc: jest.fn(),
        getDocs: jest.fn(async () => ({ docs: [] })),
        setDoc: jest.fn(async () => undefined),
        updateDoc: jest.fn(async () => undefined),
        arrayUnion: jest.fn((...args: unknown[]) => args),
        arrayRemove: jest.fn((...args: unknown[]) => args),
        Timestamp: { now: () => ({}) },
    }));

    const { tournamentService } = require('../services/tournamentService');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns already_member without writes', async () => {
        const { getDoc } = require('firebase/firestore');
        getDoc.mockResolvedValueOnce({
            exists: () => true,
            id: 'camp-1',
            data: () => ({
                name: 'Camp',
                memberIds: ['u1'],
                inviteIds: [],
                status: 'draft',
            }),
        });

        const result = await tournamentService.joinViaInviteLink('camp-1', 'u1');
        expect(result).toBe('already_member');
        const { updateDoc } = require('firebase/firestore');
        expect(updateDoc).not.toHaveBeenCalled();
    });

    it('accepts existing invite', async () => {
        const { getDoc, updateDoc } = require('firebase/firestore');
        const tournamentDoc = {
            exists: () => true,
            id: 'camp-1',
            data: () => ({
                name: 'Camp',
                memberIds: ['u1'],
                inviteIds: ['u2'],
                status: 'draft',
            }),
        };
        getDoc.mockResolvedValue(tournamentDoc);

        const result = await tournamentService.joinViaInviteLink('camp-1', 'u2');
        expect(result).toBe('joined');
        expect(updateDoc).toHaveBeenCalled();
    });

    it('blocks Core Four tournament', async () => {
        const { getDoc } = require('firebase/firestore');
        getDoc.mockResolvedValueOnce({
            exists: () => true,
            id: 'the-core-four',
            data: () => ({
                name: 'The Core Four',
                memberIds: ['c1', 'c2', 'c3', 'c4'],
                inviteIds: [],
                status: 'draft',
            }),
        });

        await expect(tournamentService.joinViaInviteLink('the-core-four', 'u99')).rejects.toThrow(
            /no one can be invited/i
        );
    });
});
