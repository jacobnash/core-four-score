import { Tournament } from '../types';

export function isTournamentMember(tournament: Pick<Tournament, 'memberIds'>, uid: string): boolean {
    return tournament.memberIds?.includes(uid) ?? false;
}

export function isTournamentInvited(tournament: Pick<Tournament, 'inviteIds'>, uid: string): boolean {
    return tournament.inviteIds?.includes(uid) ?? false;
}

/** Member or has a pending invite — may open tournament detail (limited for invite-only). */
export function canUserAccessTournament(
    tournament: Pick<Tournament, 'memberIds' | 'inviteIds'>,
    uid: string | null | undefined
): boolean {
    if (!uid) return false;
    return isTournamentMember(tournament, uid) || isTournamentInvited(tournament, uid);
}

/** Tournaments shown on the main "My tournaments" list. */
export function filterMemberTournaments(tournaments: Tournament[], uid: string): Tournament[] {
    return tournaments.filter(t => isTournamentMember(t, uid));
}

/** Pending invites only — excludes tournaments the user already belongs to. */
export function filterInvitedTournaments(tournaments: Tournament[], uid: string): Tournament[] {
    return tournaments.filter(
        t => isTournamentInvited(t, uid) && !isTournamentMember(t, uid)
    );
}

export function partitionTournamentsForUser(
    tournaments: Tournament[],
    uid: string
): { memberTournaments: Tournament[]; invitedTournaments: Tournament[] } {
    return {
        memberTournaments: filterMemberTournaments(tournaments, uid),
        invitedTournaments: filterInvitedTournaments(tournaments, uid),
    };
}

/** IDs of tournaments a user must never see in lists or detail (unless member/invited). */
export function findLeakedTournamentIds(
    allTournaments: Tournament[],
    uid: string,
    visibleTournamentIds: string[]
): string[] {
    const allowed = new Set<string>();
    for (const t of allTournaments) {
        if (canUserAccessTournament(t, uid)) {
            allowed.add(t.id);
        }
    }
    return visibleTournamentIds.filter(id => !allowed.has(id));
}
