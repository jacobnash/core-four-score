import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { tournamentService } from '../../services/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { useTournament } from '../../contexts/TournamentContext';

export default function TournamentDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { setActiveTournamentById } = useTournament();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [tournament, setTournament] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const t = await tournamentService.getTournament(id as string);
        setTournament(t);
        const members = await tournamentService.getTournamentMembers(id as string);
        setPlayers(members);
        // If user navigated directly to this route, make it active if allowed
        if (t && user && t.memberIds?.includes(user.uid)) {
          setActiveTournamentById(id as string);
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load tournament');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const startGame = async () => {
    if (!tournament) return;
    if (players.length < 2) {
      Alert.alert('Not enough players', 'Need at least 2 players to start a game');
      return;
    }

    // choose up to 4 players
    let picked = players.map(p => p.uid);
    if (picked.length > 4) {
      picked = [...picked].sort(() => Math.random() - 0.5).slice(0, 4);
    }

    while (picked.length < 4 && players.length >= 2) {
      // duplicate logic from home
      const remaining = players.map(p => p.uid).filter(id => !picked.includes(id));
      if (remaining.length === 0) break;
      picked.push(remaining.shift()!);
    }

    const shuffled = [...picked].sort(() => Math.random() - 0.5);
    const team1 = shuffled.slice(0, 2);
    const team2 = shuffled.slice(2, 4);

    const playerNames: Record<string, string> = {};
    players.forEach(m => (playerNames[m.uid] = m.displayName));

    router.push({ pathname: '/game', params: { team1: JSON.stringify(team1), team2: JSON.stringify(team2), playerNames: JSON.stringify(playerNames) } });
  };

  if (loading) return (
    <View style={[styles.container, styles.centered]}>
      <ActivityIndicator size="large" color="#FF6700" />
    </View>
  );

  if (!tournament) return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titleLg}>Tournament not found</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titleLg}>{tournament.name}</Text>
        <Text style={styles.mutedSmall}>{players.length} players</Text>

        <View style={{ height: 12 }} />
        <Button title="Start Game" onPress={startGame} variant="primary" />
        <View style={{ height: 12 }} />
        <Button title="Back to Tournaments" onPress={() => router.push('/(tabs)/tournaments')} />

        <View style={{ height: 12 }} />
        <Text style={{ fontWeight: '700' }}>Players</Text>
        <FlatList
          data={players}
          keyExtractor={p => p.uid}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 8 }}>
              <Text style={{ fontWeight: '700' }}>{item.displayName}</Text>
              <Text style={styles.mutedSmall}>{item.email}</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8', padding: 16 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 12, maxWidth: 720, width: '100%' },
  titleLg: { fontSize: 20, fontWeight: '800' },
  mutedSmall: { color: '#999', fontSize: 12 },
  centered: { alignItems: 'center', justifyContent: 'center' },
});
