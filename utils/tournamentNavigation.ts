import { ENABLE_CATAN_SCORING, ENABLE_CLAYS_SCORING } from '../constants/featureFlags';
import { Tournament, TournamentActivityType } from '../types';
import { isLegacyCoreFourTournament } from './tournamentMembership';

export const TOURNAMENT_ACTIVITY_LABELS: Record<TournamentActivityType, string> = {
    euchre: 'Euchre',
    clays: 'Clays',
    catan: 'Catan',
};

export const TOURNAMENT_ACTIVITY_EMOJI: Record<TournamentActivityType, string> = {
    euchre: '🃏',
    clays: '🎯',
    catan: '🏝️',
};

const ACTIVITY_TYPES: TournamentActivityType[] = ['euchre', 'clays', 'catan'];

/** Resolve activity type; Core Four is always euchre. */
export function resolveTournamentActivityType(
    tournament: Pick<Tournament, 'id' | 'tournamentId' | 'activityType'> | null | undefined
): TournamentActivityType {
    if (!tournament) return 'euchre';
    if (isLegacyCoreFourTournament(tournament.id, tournament.tournamentId)) return 'euchre';
    return ACTIVITY_TYPES.includes(tournament.activityType as TournamentActivityType)
        ? (tournament.activityType as TournamentActivityType)
        : 'euchre';
}

export function isClaysTournament(
    tournament: Pick<Tournament, 'id' | 'tournamentId' | 'activityType'> | null | undefined
): boolean {
    return resolveTournamentActivityType(tournament) === 'clays';
}

export function isCatanTournament(
    tournament: Pick<Tournament, 'id' | 'tournamentId' | 'activityType'> | null | undefined
): boolean {
    return resolveTournamentActivityType(tournament) === 'catan';
}

/** Default tab route after selecting or auto-loading a tournament. */
export function getTournamentHomeRoute(
    tournament: Pick<Tournament, 'id' | 'tournamentId' | 'activityType'> | null | undefined
): '/(tabs)/' | '/(tabs)/clays' | '/(tabs)/catan' {
    if (ENABLE_CLAYS_SCORING && isClaysTournament(tournament)) {
        return '/(tabs)/clays';
    }
    if (ENABLE_CATAN_SCORING && isCatanTournament(tournament)) {
        return '/(tabs)/catan';
    }
    return '/(tabs)/';
}
