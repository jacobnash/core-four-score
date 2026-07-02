import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { MatchupSlotMachine } from '../components/MatchupSlotMachine';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/firestore';
import { pickMatchupPlayerIds } from '../utils/matchup';
import { webBoxShadow } from '../utils/shadow';

export default function MatchupScreen() {
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const tournamentId = typeof params.tournamentId === 'string' ? params.tournamentId : '';

    const [loading, setLoading] = useState(true);
    const [playerIds, setPlayerIds] = useState<string[]>([]);
    const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
    const [team1, setTeam1] = useState<string[]>([]);
    const [team2, setTeam2] = useState<string[]>([]);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        (async () => {
            if (!tournamentId) {
                setLoading(false);
                return;
            }
            try {
                const members = await tournamentService.getTournamentMembers(tournamentId);
                if (members.length < 2) {
                    Alert.alert('Not enough players', 'Need at least 2 tournament members.');
                    router.back();
                    return;
                }
                const picked = pickMatchupPlayerIds(members.map(m => m.uid));
                const names: Record<string, string> = {};
                members.forEach(m => { names[m.uid] = m.displayName; });
                setPlayerIds(picked);
                setPlayerNames(names);
            } catch (err) {
                console.error('Failed to load matchup players', err);
                Alert.alert('Error', 'Could not load players.');
                router.back();
            } finally {
                setLoading(false);
            }
        })();
    }, [tournamentId]);

    const handleSpinComplete = useCallback((t1: string[], t2: string[]) => {
        setTeam1(t1);
        setTeam2(t2);
        setReady(true);
    }, []);

    const startGame = () => {
        if (!ready || team1.length === 0 || team2.length === 0) {
            Alert.alert('Spin first', 'Pull the lever to deal teams before starting.');
            return;
        }
        router.push({
            pathname: '/game',
            params: {
                team1: JSON.stringify(team1),
                team2: JSON.stringify(team2),
                playerNames: JSON.stringify(playerNames),
                tournamentId,
            },
        });
    };

    if (!user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text>Please sign in to start a matchup.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#FF6700" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.title}>Today's Matchup</Text>
                    <Text style={styles.subtitle}>
                        Pull the lever — the slots spin a few times, then lock in your teams.
                    </Text>

                    <MatchupSlotMachine
                        playerIds={playerIds}
                        playerNames={playerNames}
                        onComplete={handleSpinComplete}
                        autoSpin
                    />

                    {ready && (
                        <View style={styles.resultBox}>
                            <Text style={styles.resultTitle}>Final deal</Text>
                            <Text style={styles.resultTeam}>
                                🟠 {team1.map(id => playerNames[id] || id).join(' & ')}
                            </Text>
                            <Text style={styles.vs}>vs</Text>
                            <Text style={styles.resultTeam}>
                                🟢 {team2.map(id => playerNames[id] || id).join(' & ')}
                            </Text>
                        </View>
                    )}
                </View>

                <Button
                    title="▶️ Start Game With This Deal"
                    onPress={startGame}
                    size="lg"
                    variant="primary"
                    disabled={!ready}
                />
                <View style={{ height: 8 }} />
                <Button title="Cancel" onPress={() => router.back()} size="md" variant="secondary" />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F8' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 48, gap: 12 },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        ...(Platform.OS === 'web'
            ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
            }),
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    resultBox: {
        marginTop: 16,
        backgroundColor: '#F7F8F9',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
    },
    resultTitle: {
        fontWeight: '800',
        color: '#013220',
        marginBottom: 8,
    },
    resultTeam: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    vs: {
        fontWeight: '800',
        color: '#B8860B',
        marginVertical: 4,
    },
});
