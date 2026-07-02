import { router } from 'expo-router';
import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { tournamentService, userService } from '../services/firestore';
import { Tournament } from '../types';
import { resolveAutoSelectTournament } from '../utils/tournamentSelection';
import { useAuth } from './AuthContext';

interface TournamentContextType {
    tournaments: Tournament[];
    /** True while the current user's tournaments are being fetched. */
    loading: boolean;
    /** True once tournament startup logic has finished for the signed-in user. */
    startupReady: boolean;
    activeTournament: Tournament | null;
    loadTournaments: () => Promise<void>;
    setActiveTournamentById: (id: string) => Promise<void>;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const useTournament = () => {
    const ctx = useContext(TournamentContext);
    if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
    return ctx;
};

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
    const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'done'>('idle');
    const activeTournamentRef = useRef<Tournament | null>(null);
    const startupNavHandledRef = useRef(false);

    activeTournamentRef.current = activeTournament;

    const startupReady = !user || fetchState === 'done';
    const loading = !!user && fetchState === 'loading';

    const loadTournaments = async () => {
        if (!user) {
            setFetchState('idle');
            return;
        }

        setFetchState('loading');
        try {
            const all = await tournamentService.getAllTournaments();
            const mine = all.filter(t => t.memberIds?.includes(user.uid));
            setTournaments(mine);

            let selected: Tournament | null = null;
            if (!activeTournamentRef.current) {
                selected = resolveAutoSelectTournament(mine, user.preferredTournamentId);
                if (selected) {
                    setActiveTournament(selected);
                    activeTournamentRef.current = selected;
                    if (!user.preferredTournamentId && user.uid) {
                        userService.setPreferredTournament(user.uid, selected.id).catch(persistErr => {
                            console.warn('Failed to persist preferred tournament', persistErr);
                        });
                    }
                }
            } else {
                selected = activeTournamentRef.current;
            }

            if (!startupNavHandledRef.current) {
                startupNavHandledRef.current = true;
                if (selected) {
                    router.replace('/');
                } else if (mine.length !== 1) {
                    router.replace('/(tabs)/tournaments');
                }
            }
        } catch (err) {
            console.error('Failed to load tournaments', err);
            Alert.alert('Error', 'Failed to load tournaments');
        } finally {
            setFetchState('done');
        }
    };

    const setActiveTournamentById = async (id: string) => {
        try {
            const t = await tournamentService.getTournament(id);
            if (!t) throw new Error('Tournament not found');
            if (!t.memberIds.includes(user?.uid || '')) {
                Alert.alert('Access denied', 'You are not a member of that tournament');
                return;
            }
            setActiveTournament(t);
            activeTournamentRef.current = t;
            if (user?.uid) {
                try {
                    await userService.setPreferredTournament(user.uid, t.id);
                    await userService.setLastActiveTournament(user.uid, t.id);
                } catch (persistErr) {
                    console.warn('Failed to persist preferred/last active tournament', persistErr);
                }
            }
            router.replace('/');
        } catch (err) {
            console.error('Failed to set active tournament', err);
            Alert.alert('Error', 'Failed to select tournament');
        }
    };

    useLayoutEffect(() => {
        if (user) {
            startupNavHandledRef.current = false;
            loadTournaments();
        } else {
            setTournaments([]);
            setActiveTournament(null);
            activeTournamentRef.current = null;
            startupNavHandledRef.current = false;
            setFetchState('idle');
        }
    }, [user?.uid]);

    return (
        <TournamentContext.Provider
            value={{
                tournaments,
                loading,
                startupReady,
                activeTournament,
                loadTournaments,
                setActiveTournamentById,
            }}
        >
            {children}
        </TournamentContext.Provider>
    );
};

export default TournamentContext;
