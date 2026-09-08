import { useEffect } from 'react';
import { router } from 'expo-router';
import { useTournament } from '../contexts/TournamentContext';
import { getTournamentHomeRoute, isClaysTournament } from '../utils/tournamentNavigation';

type TournamentTab = 'tournament' | 'clays';

/** Keep the visible tab aligned with the active tournament's activity type. */
export function useTournamentHomeRedirect(currentTab: TournamentTab): void {
    const { activeTournament, startupReady } = useTournament();

    useEffect(() => {
        if (!startupReady || !activeTournament) return;

        const home = getTournamentHomeRoute(activeTournament);
        const wantsClays = isClaysTournament(activeTournament);

        if (wantsClays && currentTab === 'tournament') {
            router.replace(home);
        } else if (!wantsClays && currentTab === 'clays') {
            router.replace(home);
        }
    }, [activeTournament, startupReady, currentTab]);
}
