import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { LeaderboardCard } from '../../components/LeaderboardCard';
import { ENABLE_IMPROVED_DATA_VIEWS } from '../../constants/featureFlags';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { leaderboardService, tournamentService } from '../../services/firestore';

export default function TournamentDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { setActiveTournamentById } = useTournament();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [tournament, setTournament] = useState<any | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const t = await tournamentService.getTournament(id as string);
        setTournament(t);
        const members = await tournamentService.getTournamentMembers(id as string);
        setPlayers(members);
        const lb = await leaderboardService.getLeaderboard(id as string);
        setLeaderboard(lb);
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
        {tournament?.status !== 'active' ? (
          <>
            <Button title="Start Tournament" onPress={async () => {
              try {
                await tournamentService.startTournament(String(id));
                const t2 = await tournamentService.getTournament(String(id));
                setTournament(t2);
                Alert.alert('Tournament Started', 'Membership is now frozen.');
              } catch (err) {
                console.error('Failed to start tournament', err);
                Alert.alert('Error', 'Failed to start tournament');
              }
            }} />
            <View style={{ height: 8 }} />
          </>
        ) : null}
        <Button title="Start Game" onPress={() => {
          router.push({
            pathname: '/matchup',
            params: { tournamentId: String(tournament.id || id) },
          });
        }} variant="primary" />
        <View style={{ height: 12 }} />
        <Button title="Back to Tournaments" onPress={() => router.push('/(tabs)/tournaments')} />

        <View style={{ height: 12 }} />
        <Text style={{ fontWeight: '700' }}>Leaderboard</Text>
        {leaderboard.length === 0 ? (
          <View style={{ paddingVertical: 12 }}>
            <Text style={styles.mutedSmall}>No games yet for this tournament.</Text>
          </View>
        ) : (
          leaderboard.map((entry, idx) => (
            <LeaderboardCard
              key={entry.userId}
              entry={entry}
              rank={idx + 1}
              variant={ENABLE_IMPROVED_DATA_VIEWS ? 'compact' : 'default'}
            />
          ))
        )}
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
