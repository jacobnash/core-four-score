import { useEffect } from 'react';
import { router } from 'expo-router';
import { useTournament } from '../contexts/TournamentContext';
import { getTournamentHomeRoute } from '../utils/tournamentNavigation';

type TournamentTab = 'tournament' | 'clays' | 'catan';

/**
 * Keep the visible tab aligned with the active tournament's activity type.
 *
 * wantsClays/wantsCatan are derived from `home` rather than from a second,
 * independent isClaysTournament()/isCatanTournament() check — those ignore
 * the ENABLE_*_SCORING flags that `home` respects. Computing them separately
 * let a clays/catan tournament with its flag off satisfy "should redirect
 * off the tournament tab" while `home` still resolved back to that same
 * tournament tab, so router.replace() targeted the screen it was already on
 * every render — an infinite loop that crashed the tournament detail page
 * in production ("Maximum update depth exceeded").
 */
export function useTournamentHomeRedirect(currentTab: TournamentTab): void {
    const { activeTournament, startupReady } = useTournament();

    useEffect(() => {
        if (!startupReady || !activeTournament) return;

        const home = getTournamentHomeRoute(activeTournament);
        const wantsClays = home === '/(tabs)/clays';
        const wantsCatan = home === '/(tabs)/catan';

        if (currentTab === 'tournament' && (wantsClays || wantsCatan)) {
            router.replace(home);
        } else if (currentTab === 'clays' && !wantsClays) {
            router.replace(home);
        } else if (currentTab === 'catan' && !wantsCatan) {
            router.replace(home);
        }
    }, [activeTournament, startupReady, currentTab]);
}
