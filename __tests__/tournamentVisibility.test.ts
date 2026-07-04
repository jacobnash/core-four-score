import { CORE_FOUR_MEMBER_IDS } from '../constants/coreFour';
import { Tournament } from '../types';
import {
    canUserAccessTournament,
    filterInvitedTournaments,
    filterMemberTournaments,
    findLeakedTournamentIds,
    isTournamentInvited,
    isTournamentMember,
    partitionTournamentsForUser,
} from '../utils/tournamentVisibility';

const { MOCK_TOURNAMENTS, CORE_FOUR_UIDS, MOCK_PLAYERS } = require('../scripts/dev/mock-multiplayer-data');

function mockTournament(
    id: string,
    memberIds: string[],
    inviteIds: string[] = [],
    overrides: Partial<Tournament> = {}
): Tournament {
    return {
        id,
        tournamentId: id,
        name: id,
        memberIds,
        inviteIds,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
        ...overrides,
    };
}

function tournamentsFromMockData(): Tournament[] {
    return MOCK_TOURNAMENTS.map((t: { id: string; data: Record<string, unknown> }) =>
        mockTournament(
            t.id,
            t.data.memberIds as string[],
            (t.data.inviteIds as string[]) || [],
            { name: t.data.name as string, status: t.data.status as Tournament['status'] }
        )
    );
}

describe('tournamentVisibility', () => {
    const allMock = tournamentsFromMockData();
    const coreFourTournament = mockTournament('the-core-four', [...CORE_FOUR_MEMBER_IDS]);

    describe('isTournamentMember / isTournamentInvited', () => {
        it('identifies members and invitees', () => {
            const t = mockTournament('t1', ['u1', 'u2'], ['u3']);
            expect(isTournamentMember(t, 'u1')).toBe(true);
            expect(isTournamentMember(t, 'u3')).toBe(false);
            expect(isTournamentInvited(t, 'u3')).toBe(true);
            expect(isTournamentInvited(t, 'u1')).toBe(false);
        });
    });

    describe('canUserAccessTournament', () => {
        it('allows members and invited users only', () => {
            const t = mockTournament('t1', ['u1'], ['u2']);
            expect(canUserAccessTournament(t, 'u1')).toBe(true);
            expect(canUserAccessTournament(t, 'u2')).toBe(true);
            expect(canUserAccessTournament(t, 'u3')).toBe(false);
            expect(canUserAccessTournament(t, null)).toBe(false);
        });
    });

    describe('filterMemberTournaments', () => {
        it('returns only tournaments where uid is in memberIds', () => {
            const uid = MOCK_PLAYERS[0].uid; // alex
            const member = filterMemberTournaments(allMock, uid);
            const ids = member.map(t => t.id).sort();
            expect(ids).toEqual(['deer-camp-alumni-2026', 'friday-progressive-8', 'speed-night-6']);
        });

        it('Core Four members see the-core-four when in dataset', () => {
            const jacob = CORE_FOUR_UIDS.jacob;
            const all = [...allMock, coreFourTournament];
            const member = filterMemberTournaments(all, jacob);
            expect(member.map(t => t.id)).toContain('the-core-four');
        });

        it('quinn is member of two tournaments only', () => {
            const quinn = MOCK_PLAYERS.find((p: { uid: string }) => p.uid === 'mock-dev-quinn')!.uid;
            const member = filterMemberTournaments(allMock, quinn);
            expect(member.map(t => t.id).sort()).toEqual(['friday-progressive-8', 'lake-house-open']);
        });
    });

    describe('filterInvitedTournaments', () => {
        it('returns pending invites excluding already-joined', () => {
            const jacob = CORE_FOUR_UIDS.jacob;
            const invited = filterInvitedTournaments(allMock, jacob);
            expect(invited.map(t => t.id)).toEqual(['lake-house-open']);
        });

        it('returns speed-night invite for Dylan without listing as member tourney', () => {
            const dylan = CORE_FOUR_UIDS.dylan;
            const invited = filterInvitedTournaments(allMock, dylan);
            expect(invited.map(t => t.id)).toEqual(['speed-night-6']);
            const member = filterMemberTournaments(allMock, dylan);
            expect(member.map(t => t.id)).not.toContain('speed-night-6');
        });

        it('does not duplicate member tournaments as invites', () => {
            const alex = MOCK_PLAYERS[0].uid;
            const invited = filterInvitedTournaments(allMock, alex);
            const memberIds = new Set(filterMemberTournaments(allMock, alex).map(t => t.id));
            for (const t of invited) {
                expect(memberIds.has(t.id)).toBe(false);
            }
        });
    });

    describe('partitionTournamentsForUser — every mock player', () => {
        const allPlayers = [
            ...Object.values(CORE_FOUR_UIDS).map((uid: string) => ({ uid, label: uid })),
            ...MOCK_PLAYERS.map((p: { uid: string; displayName: string }) => ({
                uid: p.uid,
                label: p.displayName,
            })),
        ];

        it.each(allPlayers.map((p: { uid: string; label: string }) => [p.label, p.uid]))(
            '%s sees no leaked tournaments in member + invite lists',
            (_label, uid) => {
                const { memberTournaments, invitedTournaments } = partitionTournamentsForUser(allMock, uid);
                const visibleIds = [
                    ...memberTournaments.map(t => t.id),
                    ...invitedTournaments.map(t => t.id),
                ];
                const leaked = findLeakedTournamentIds(allMock, uid, visibleIds);
                expect(leaked).toEqual([]);

                for (const t of allMock) {
                    const shouldSee =
                        isTournamentMember(t, uid) ||
                        (isTournamentInvited(t, uid) && !isTournamentMember(t, uid));
                    const inList = visibleIds.includes(t.id);
                    expect(inList).toBe(shouldSee);
                }
            }
        );
    });

    describe('cross-player isolation', () => {
        it('Taylor is member of lake-house and friday progressive only', () => {
            const taylor = MOCK_PLAYERS.find((p: { uid: string }) => p.uid === 'mock-dev-taylor')!.uid;
            expect(canUserAccessTournament(
                allMock.find((t: Tournament) => t.id === 'lake-house-open')!,
                taylor
            )).toBe(true);
            expect(canUserAccessTournament(
                allMock.find((t: Tournament) => t.id === 'deer-camp-alumni-2026')!,
                taylor
            )).toBe(false);
        });

        it('Casey cannot see Deer Camp Alumni', () => {
            const casey = MOCK_PLAYERS.find((p: { uid: string }) => p.uid === 'mock-dev-casey')!.uid;
            const deerCamp = allMock.find((t: Tournament) => t.id === 'deer-camp-alumni-2026')!;
            expect(canUserAccessTournament(deerCamp, casey)).toBe(false);
        });

        it('Cait cannot see Friday Progressive', () => {
            const cait = CORE_FOUR_UIDS.cait;
            const friday = allMock.find((t: Tournament) => t.id === 'friday-progressive-8')!;
            expect(canUserAccessTournament(friday, cait)).toBe(false);
        });

        it('Morgan cannot see Speed Night unless invited', () => {
            const morgan = MOCK_PLAYERS.find((p: { uid: string }) => p.uid === 'mock-dev-morgan')!.uid;
            const speed = allMock.find((t: Tournament) => t.id === 'speed-night-6')!;
            expect(isTournamentMember(speed, morgan)).toBe(true);
            expect(isTournamentInvited(speed, morgan)).toBe(false);
        });

        it('Riley cannot access tournaments they are not part of', () => {
            const riley = MOCK_PLAYERS.find((p: { uid: string }) => p.uid === 'mock-dev-riley')!.uid;
            const inaccessible = allMock.filter(
                (t: Tournament) => !canUserAccessTournament(t, riley)
            );
            expect(inaccessible.map((t: Tournament) => t.id)).toEqual(['lake-house-open']);
        });
    });
});
