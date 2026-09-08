import { useMemo } from 'react';
import { ENABLE_CLAYS_SCORING } from '../constants/featureFlags';
import { Tournament } from '../types';
import { isLegacyCoreFourTournament } from '../utils/tournamentMembership';
import { isClaysTournament } from '../utils/tournamentNavigation';
import { isTournamentMember } from '../utils/tournamentVisibility';

export interface TournamentAccess {
    /** Signed-in uid is on the tournament's roster. */
    isMember: boolean;
    /** Not yet started. */
    isDraft: boolean;
    /** The legacy Core Four tournament — closed roster, no invite link. */
    isCoreFourLocked: boolean;
    isClays: boolean;
    /** Member of an open (non-Core-Four) tournament — may share the invite link. */
    canShareLink: boolean;
    /** Clays scoring is on for this tournament (flag + activity type + not Core Four). */
    showClays: boolean;
}

type AccessTournament = Pick<Tournament, 'id' | 'tournamentId' | 'status' | 'memberIds' | 'activityType'>;

/**
 * Single source for the member/roster/activity-type checks every tournament screen
 * needs, built from the existing utils/tournamentMembership + tournamentVisibility +
 * tournamentNavigation primitives rather than re-deriving them per screen.
 */
export function useTournamentAccess(
    tournament: AccessTournament | null | undefined,
    uid: string | null | undefined
): TournamentAccess {
    return useMemo(() => {
        const isMember = !!(uid && tournament && isTournamentMember(tournament, uid));
        const isDraft = tournament?.status !== 'active';
        const isCoreFourLocked = isLegacyCoreFourTournament(tournament?.id, tournament?.tournamentId);
        const isClays = isClaysTournament(tournament);
        const canShareLink = isMember && !isCoreFourLocked;
        const showClays = ENABLE_CLAYS_SCORING && isClays && !isCoreFourLocked;

        return { isMember, isDraft, isCoreFourLocked, isClays, canShareLink, showClays };
    }, [tournament, uid]);
}
