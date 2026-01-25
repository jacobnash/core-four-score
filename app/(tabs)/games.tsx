import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { gameService, tournamentService } from '../../services/firestore';
import { Game, Team, User } from '../../types';
import { webBoxShadow } from '../../utils/shadow';

export default function GamesScreen() {
    const { user, loading: authLoading } = useAuth();
    const { activeTournament } = useTournament();

    const TOURNAMENT_ID = activeTournament?.id || '';

    const [games, setGames] = useState<Game[]>([]);
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // If no active tournament, send user to tournaments selection
    useEffect(() => {
        if (!activeTournament && user) {
            router.replace('/(tabs)/tournaments');
        }
    }, [activeTournament, user]);

    const nameMap = useMemo(() => {
        const m: Record<string, string> = {};
        members.forEach(u => { m[u.uid] = u.displayName; });
        return m;
    }, [members]);

    const resolveWinningTeam = (teams: Team[]): Team | null => {
        if (!Array.isArray(teams) || teams.length === 0) return null;
        const flagged = teams.find(t => t.isWinner);
        if (flagged) return flagged;
        const numeric = teams.filter(t => typeof t.score === 'number');
        if (numeric.length < 2) return null;
        const max = Math.max(...numeric.map(t => t.score));
        const maxTeams = numeric.filter(t => t.score === max);
        return maxTeams.length === 1 ? maxTeams[0] : null; // tie => null
    };

    const loadData = async () => {
        if (!user || !TOURNAMENT_ID) return;
        try {
            setLoading(true);
            const [gamesList, memberList] = await Promise.all([
                gameService.getGames(TOURNAMENT_ID, 50),
                tournamentService.getTournamentMembers(TOURNAMENT_ID)
            ]);
            setGames(gamesList);
            setMembers(memberList);
        } catch (err) {
            console.error('Failed to load games:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    useEffect(() => {
        if (user && TOURNAMENT_ID) {
            loadData();
        }
    }, [user, TOURNAMENT_ID]);

    // Auth Loading State
    if (authLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#FF6700" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    // Not Authenticated
    if (!user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.muted}>Please sign in to view games.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6700" />
                }
            >
                <View style={styles.headerCard}>
                    <Text style={styles.titleLg}>🎲 Recent Games</Text>
                    <Text style={styles.mutedSmall}>{activeTournament?.name || 'Tournament'}</Text>
                </View>

                <View style={styles.card}>
                    {loading && !refreshing ? (
                        <ActivityIndicator size="large" color="#FF6700" />
                    ) : games.length === 0 ? (
                        <View style={[styles.centered, { paddingVertical: 16 }]}>
                            <Text style={styles.titleMd}>No games recorded yet</Text>
                            <Text style={styles.muted}>Start a game to see history</Text>
                        </View>
                    ) : (
                        games.map((g) => {
                            const winTeam = resolveWinningTeam(g.teams);
                            const winners = winTeam?.playerIds?.map(id => nameMap[id] || 'Unknown').join(' & ') || 'Unknown';
                            const where = (g.location || '').trim() || 'Unknown Location';
                            const when = g.timestamp ? new Date(g.timestamp).toLocaleString() : 'Unknown time';
                            const scores = g.teams.map(t => `${t.score ?? '?'}`).join('–');
                            return (
                                <View key={g.id} style={styles.listItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemTitle}>{when}</Text>
                                        <Text style={styles.itemSub}>📍 {where}</Text>
                                        <Text style={styles.itemSub}>🏆 {winners}</Text>
                                    </View>
                                    <View style={styles.scoreBadge}>
                                        <Text style={styles.scoreText}>{scores}</Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F8',
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 16,
        paddingBottom: 64,
        gap: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#333',
    },
    headerCard: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
        }),
    },
    card: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
        }),
    },
    titleLg: {
        fontSize: 22,
        fontWeight: '800',
    },
    titleMd: {
        fontSize: 18,
        fontWeight: '700',
    },
    muted: {
        color: '#666',
    },
    mutedSmall: {
        color: '#999',
        fontSize: 12,
        marginTop: 4,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomColor: '#eee',
        borderBottomWidth: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    itemSub: {
        color: '#666',
        marginTop: 2,
    },
    scoreBadge: {
        backgroundColor: '#013220',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    scoreText: {
        color: '#F5F5DC',
        fontWeight: '700',
    },
});
