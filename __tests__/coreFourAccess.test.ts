import { CORE_FOUR_MEMBER_IDS, CORE_FOUR_TOURNAMENT_ID } from '../constants/coreFour';
import { Tournament } from '../types';
import { canAddMemberToTournament, isCoreFourMember, tournamentAcceptsInvites } from '../utils/tournamentMembership';
import { resolveAutoSelectTournament } from '../utils/tournamentSelection';
import {
    canUserAccessTournament,
    filterMemberTournaments,
    partitionTournamentsForUser,
} from '../utils/tournamentVisibility';
import { resolveRuleTournamentId, ruleBelongsToTournament } from '../utils/rules';

/** Production-shaped legacy tournament document (from July 2026 backup). */
function legacyCoreFourTournament(): Tournament {
    return {
        id: CORE_FOUR_TOURNAMENT_ID,
        tournamentId: CORE_FOUR_TOURNAMENT_ID,
        name: 'The Core Four',
        memberIds: [...CORE_FOUR_MEMBER_IDS],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

describe('Core Four access guarantees', () => {
    const legacy = legacyCoreFourTournament();

    describe.each([
        ['Cait', CORE_FOUR_MEMBER_IDS[0]],
        ['Dylan', CORE_FOUR_MEMBER_IDS[1]],
        ['Grace', CORE_FOUR_MEMBER_IDS[2]],
        ['Jacob', CORE_FOUR_MEMBER_IDS[3]],
    ])('%s (%s)', (_name, uid) => {
        it('is recognized as a Core Four member', () => {
            expect(isCoreFourMember(uid)).toBe(true);
        });

        it('can be added to the legacy tournament (lock does not block them)', () => {
            expect(canAddMemberToTournament(CORE_FOUR_TOURNAMENT_ID, CORE_FOUR_TOURNAMENT_ID, uid)).toBe(true);
        });

        it('sees the-core-four in their tournament list', () => {
            const { memberTournaments } = partitionTournamentsForUser([legacy], uid);
            expect(memberTournaments.map(t => t.id)).toContain(CORE_FOUR_TOURNAMENT_ID);
        });

        it('can access tournament detail (member, not blocked)', () => {
            expect(canUserAccessTournament(legacy, uid)).toBe(true);
        });

        it('auto-selects the-core-four when it is their only tournament', () => {
            const mine = filterMemberTournaments([legacy], uid);
            expect(resolveAutoSelectTournament(mine)).toEqual(legacy);
        });

        it('still auto-selects the-core-four when they also join other tournaments', () => {
            const other: Tournament = {
                id: 'weekend-camp',
                name: 'Weekend',
                memberIds: [uid, 'friend-1', 'friend-2', 'friend-3'],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const mine = filterMemberTournaments([legacy, other], uid);
            expect(resolveAutoSelectTournament(mine, CORE_FOUR_TOURNAMENT_ID)).toEqual(legacy);
        });
    });

    it('legacy rules without tournamentId still belong to Core Four', () => {
        const legacyRule = { author: 'system', approvals: [] };
        expect(resolveRuleTournamentId(legacyRule)).toBe(CORE_FOUR_TOURNAMENT_ID);
        expect(ruleBelongsToTournament(legacyRule, CORE_FOUR_TOURNAMENT_ID)).toBe(true);
    });

    it('outsiders cannot join the-core-four but Core Four can stay', () => {
        expect(tournamentAcceptsInvites(CORE_FOUR_TOURNAMENT_ID)).toBe(false);
        expect(canAddMemberToTournament(CORE_FOUR_TOURNAMENT_ID, CORE_FOUR_TOURNAMENT_ID, 'new-user')).toBe(false);
        for (const uid of CORE_FOUR_MEMBER_IDS) {
            expect(canAddMemberToTournament(CORE_FOUR_TOURNAMENT_ID, CORE_FOUR_TOURNAMENT_ID, uid)).toBe(true);
        }
    });

    it('visibility filter never hides the-core-four from any Core Four member', () => {
        for (const uid of CORE_FOUR_MEMBER_IDS) {
            const visible = filterMemberTournaments([legacy], uid);
            expect(visible).toHaveLength(1);
            expect(visible[0].id).toBe(CORE_FOUR_TOURNAMENT_ID);
        }
    });
});
