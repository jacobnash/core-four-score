import { Tournament } from '../types';

/**
 * Pick a tournament to auto-select on startup.
 * Returns a tournament when the user has a valid preferred tournament or only one tournament.
 * Returns null when the user must choose among multiple tournaments.
 */
export function resolveAutoSelectTournament(
    tournaments: Tournament[],
    preferredTournamentId?: string | null
): Tournament | null {
    if (tournaments.length === 0) return null;

    if (preferredTournamentId) {
        const preferred = tournaments.find(
            t => t.id === preferredTournamentId || t.tournamentId === preferredTournamentId
        );
        if (preferred) return preferred;
    }

    if (tournaments.length === 1) return tournaments[0];

    return null;
}
