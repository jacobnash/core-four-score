import { renderHook } from '@testing-library/react-native';
import { useTournamentAccess } from '../hooks/useTournamentAccess';
import { Tournament } from '../types';

const OPEN_TOURNAMENT_ID = 'weekend-euchre-123';
const CORE_FOUR_TOURNAMENT_ID = 'the-core-four';
const MEMBER_UID = 'member-1';
const OUTSIDER_UID = 'outsider-1';

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

describe('useTournamentAccess', () => {
    it('returns all-false defaults for no tournament / no user', () => {
        const { result } = renderHook(() => useTournamentAccess(null, null));
        expect(result.current).toEqual({
            isMember: false,
            isDraft: true,
            isCoreFourLocked: false,
            isClays: false,
            isCatan: false,
            canShareLink: false,
            showClays: false,
            showCatan: false,
        });
    });

    it('identifies a member of an active, open-roster euchre tournament', () => {
        const t = makeTournament();
        const { result } = renderHook(() => useTournamentAccess(t, MEMBER_UID));

        expect(result.current.isMember).toBe(true);
        expect(result.current.isDraft).toBe(false);
        expect(result.current.isCoreFourLocked).toBe(false);
        expect(result.current.isClays).toBe(false);
        expect(result.current.canShareLink).toBe(true);
    });

    it('is not a member for an outsider uid', () => {
        const t = makeTournament();
        const { result } = renderHook(() => useTournamentAccess(t, OUTSIDER_UID));

        expect(result.current.isMember).toBe(false);
        expect(result.current.canShareLink).toBe(false);
    });

    it('flags draft status', () => {
        const t = makeTournament({ status: 'draft' });
        const { result } = renderHook(() => useTournamentAccess(t, MEMBER_UID));

        expect(result.current.isDraft).toBe(true);
    });

    it('locks the roster and disables sharing for the legacy Core Four tournament', () => {
        const t = makeTournament({ id: CORE_FOUR_TOURNAMENT_ID, tournamentId: CORE_FOUR_TOURNAMENT_ID });
        const { result } = renderHook(() => useTournamentAccess(t, MEMBER_UID));

        expect(result.current.isCoreFourLocked).toBe(true);
        expect(result.current.canShareLink).toBe(false);
        expect(result.current.showClays).toBe(false);
    });

    it('identifies a clays tournament and enables showClays for a member', () => {
        const t = makeTournament({ activityType: 'clays' });
        const { result } = renderHook(() => useTournamentAccess(t, MEMBER_UID));

        expect(result.current.isClays).toBe(true);
        expect(result.current.showClays).toBe(true);
    });

    it('never shows clays for the locked legacy tournament even if activityType is clays', () => {
        const t = makeTournament({
            id: CORE_FOUR_TOURNAMENT_ID,
            tournamentId: CORE_FOUR_TOURNAMENT_ID,
            activityType: 'clays',
        });
        const { result } = renderHook(() => useTournamentAccess(t, MEMBER_UID));

        expect(result.current.showClays).toBe(false);
    });

    it('identifies a catan tournament and enables showCatan for a member', () => {
        const t = makeTournament({ activityType: 'catan' });
        const { result } = renderHook(() => useTournamentAccess(t, MEMBER_UID));

        expect(result.current.isCatan).toBe(true);
        expect(result.current.showCatan).toBe(true);
    });

    it('never shows catan for the locked legacy tournament even if activityType is catan', () => {
        const t = makeTournament({
            id: CORE_FOUR_TOURNAMENT_ID,
            tournamentId: CORE_FOUR_TOURNAMENT_ID,
            activityType: 'catan',
        });
        const { result } = renderHook(() => useTournamentAccess(t, MEMBER_UID));

        expect(result.current.showCatan).toBe(false);
    });
});
