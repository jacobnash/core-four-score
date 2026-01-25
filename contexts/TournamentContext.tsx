import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { tournamentService, userService } from '../services/firestore';
import { Tournament } from '../types';
import { useAuth } from './AuthContext';

interface TournamentContextType {
    tournaments: Tournament[];
    loading: boolean;
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
    const [loading, setLoading] = useState(false);

    const loadTournaments = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const all = await tournamentService.getAllTournaments();
            const mine = all.filter(t => t.memberIds?.includes(user.uid));
            setTournaments(mine);
            // Auto-select preferred tournament if available and valid
            if (!activeTournament && user.preferredTournamentId) {
                const preferred = mine.find(t => t.id === user.preferredTournamentId || t.tournamentId === user.preferredTournamentId);
                if (preferred) {
                    setActiveTournament(preferred);
                }
            }
        } catch (err) {
            console.error('Failed to load tournaments', err);
            Alert.alert('Error', 'Failed to load tournaments');
        } finally {
            setLoading(false);
        }
    };

    const setActiveTournamentById = async (id: string) => {
        try {
            const t = await tournamentService.getTournament(id);
            if (!t) throw new Error('Tournament not found');
            // Ensure current user is a member
            if (!t.memberIds.includes(user?.uid || '')) {
                Alert.alert('Access denied', 'You are not a member of that tournament');
                return;
            }
            setActiveTournament(t);
            // Persist preferred + last active tournament for this user
            if (user?.uid) {
                try {
                    await userService.setPreferredTournament(user.uid, t.id);
                    await userService.setLastActiveTournament(user.uid, t.id);
                } catch (persistErr) {
                    console.warn('Failed to persist preferred/last active tournament', persistErr);
                }
            }
            // Navigate to home (OpeLand)
            router.replace('/');
        } catch (err) {
            console.error('Failed to set active tournament', err);
            Alert.alert('Error', 'Failed to select tournament');
        }
    };

    useEffect(() => {
        if (user) {
            loadTournaments();
        } else {
            setTournaments([]);
            setActiveTournament(null);
        }
    }, [user]);

    return (
        <TournamentContext.Provider value={{ tournaments, loading, activeTournament, loadTournaments, setActiveTournamentById }}>
            {children}
        </TournamentContext.Provider>
    );
};

export default TournamentContext;
