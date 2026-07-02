import {
    CORE_FOUR_MEMBER_IDS,
    LEGACY_CORE_FOUR_TOURNAMENT_IDS,
} from '../constants/coreFour';

const coreFourSet = new Set<string>(CORE_FOUR_MEMBER_IDS);
const legacyCoreFourTournamentSet = new Set<string>(LEGACY_CORE_FOUR_TOURNAMENT_IDS);

export function isCoreFourMember(uid: string): boolean {
    return coreFourSet.has(uid);
}

export function isLegacyCoreFourTournament(tournamentId?: string | null, tournamentDocId?: string | null): boolean {
    if (!tournamentId && !tournamentDocId) return false;
    return (
        (tournamentId != null && legacyCoreFourTournamentSet.has(tournamentId)) ||
        (tournamentDocId != null && legacyCoreFourTournamentSet.has(tournamentDocId))
    );
}

/** Whether a uid may join or be invited to this tournament. */
export function canAddMemberToTournament(
    tournamentId: string,
    tournamentDocId: string | undefined,
    uid: string
): boolean {
    if (!isLegacyCoreFourTournament(tournamentId, tournamentDocId)) return true;
    return isCoreFourMember(uid);
}

export function validateTournamentMemberIds(
    tournamentId: string,
    tournamentDocId: string | undefined,
    memberIds: string[]
): { ok: true } | { ok: false; message: string } {
    if (!isLegacyCoreFourTournament(tournamentId, tournamentDocId)) {
        return { ok: true };
    }

    const invalid = memberIds.filter(uid => !isCoreFourMember(uid));
    if (invalid.length > 0) {
        return {
            ok: false,
            message: 'The Core Four tournament is locked to the original four players. Create a new tournament for larger groups.',
        };
    }

    return { ok: true };
}

/** Minimum players for a standard 4-seat euchre table. */
export const MIN_EUCHRE_TOURNAMENT_PLAYERS = 4;
