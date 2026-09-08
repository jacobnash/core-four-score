import { ENABLE_CLAYS_SCORING } from '../constants/featureFlags';
import { Tournament, TournamentActivityType } from '../types';
import { isLegacyCoreFourTournament } from './tournamentMembership';

export const TOURNAMENT_ACTIVITY_LABELS: Record<TournamentActivityType, string> = {
    euchre: 'Euchre',
    clays: 'Clays',
};

/** Resolve activity type; Core Four is always euchre. */
export function resolveTournamentActivityType(
    tournament: Pick<Tournament, 'id' | 'tournamentId' | 'activityType'> | null | undefined
): TournamentActivityType {
    if (!tournament) return 'euchre';
    if (isLegacyCoreFourTournament(tournament.id, tournament.tournamentId)) return 'euchre';
    return tournament.activityType === 'clays' ? 'clays' : 'euchre';
}

export function isClaysTournament(
    tournament: Pick<Tournament, 'id' | 'tournamentId' | 'activityType'> | null | undefined
): boolean {
    return resolveTournamentActivityType(tournament) === 'clays';
}

/** Default tab route after selecting or auto-loading a tournament. */
export function getTournamentHomeRoute(
    tournament: Pick<Tournament, 'id' | 'tournamentId' | 'activityType'> | null | undefined
): '/(tabs)/' | '/(tabs)/clays' {
    if (ENABLE_CLAYS_SCORING && isClaysTournament(tournament)) {
        return '/(tabs)/clays';
    }
    return '/(tabs)/';
}
