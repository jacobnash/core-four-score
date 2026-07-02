import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTournament } from '../contexts/TournamentContext';

/** Send users to the tournament picker only after startup when no tournament is active. */
export function useRedirectToTournamentsIfNeeded() {
    const { user } = useAuth();
    const { activeTournament, startupReady } = useTournament();

    useEffect(() => {
        if (!user || !startupReady) return;
        if (!activeTournament) {
            router.replace('/(tabs)/tournaments');
        }
    }, [activeTournament, user, startupReady]);
}
