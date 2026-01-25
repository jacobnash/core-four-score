import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform, RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Button } from '../../components/Button';
import { LeaderboardCard } from '../../components/LeaderboardCard';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { leaderboardService, tournamentService } from '../../services/firestore';
import { LeaderboardEntry } from '../../types';
import { webBoxShadow } from '../../utils/shadow';

export default function HomeScreen() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [showHeader, setShowHeader] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { activeTournament } = useTournament();
  // If no active tournament, send user to tournaments selection
  useEffect(() => {
    if (!activeTournament && user) {
      router.replace('/(tabs)/tournaments');
    }
  }, [activeTournament, user]);

  const TOURNAMENT_ID = activeTournament?.id || '';

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await leaderboardService.getLeaderboard(TOURNAMENT_ID);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user && TOURNAMENT_ID) {
      loadLeaderboard();
    }
    // Show header for ~5 seconds when user is present
    let t: number | undefined;
    if (user) {
      setShowHeader(true);
      t = setTimeout(() => setShowHeader(false), 5000) as unknown as number;
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [user]);

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
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.centered}>
            <View style={styles.authCard}>
              <Text style={styles.eyebrow}>Deer Camp Edition</Text>
              <Text style={styles.titleLg}>🦌 The Core Four Score</Text>
              <Text style={styles.body}>Track your Euchre glory and shame.</Text>
              <View style={{ height: 12 }} />
              <Button
                title="Sign In with Google"
                onPress={signInWithGoogle}
                size="lg"
                variant="primary"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6700"
          />
        }
      >
        {showHeader && (
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.eyebrow}>Deer Camp Edition</Text>
                <Text style={styles.titleLg}>🦌 Ope'Land</Text>
                <Text style={styles.welcome}>Welcome back, {user.displayName}!</Text>
              </View>

              {/* Profile button moved to header */}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.card}>
          <View style={{ height: 8 }} />
          <Button
            title="🎲 START NEW GAME"
            onPress={async () => {
              if (!TOURNAMENT_ID) {
                Alert.alert('No tournament selected', 'Please select a tournament first.');
                router.push('/(tabs)/tournaments');
                return;
              }

              try {
                const members = await tournamentService.getTournamentMembers(TOURNAMENT_ID);
                if (!members || members.length < 2) {
                  Alert.alert('Not enough players', 'Need at least 2 tournament members to start a game.');
                  return;
                }

                // Pick up to 4 players. If more than 4, randomly select 4.
                let picked = members.map(m => m.uid);
                if (picked.length > 4) {
                  const shuffled = [...picked].sort(() => Math.random() - 0.5);
                  picked = shuffled.slice(0, 4);
                }

                // If fewer than 4 but >=2, try to fill from members (already picked from members so this is just a fallback)
                if (picked.length < 4) {
                  const remaining = members.map(m => m.uid).filter(id => !picked.includes(id));
                  while (picked.length < 4 && remaining.length > 0) {
                    picked.push(remaining.shift()!);
                  }
                }

                // Shuffle into teams
                const shuffled = [...picked].sort(() => Math.random() - 0.5);
                const team1 = shuffled.slice(0, 2);
                const team2 = shuffled.slice(2, 4);

                const playerNames: Record<string, string> = {};
                members.forEach(m => (playerNames[m.uid] = m.displayName));

                router.push({
                  pathname: '/game',
                  params: {
                    team1: JSON.stringify(team1),
                    team2: JSON.stringify(team2),
                    playerNames: JSON.stringify(playerNames),
                    tournamentId: TOURNAMENT_ID,
                  },
                });
              } catch (err) {
                console.error('Failed to start new game:', err);
                Alert.alert('Error', 'Failed to start game.');
              }
            }}
            size="lg"
            variant="primary"
          />
          <View style={{ height: 8 }} />
          <Button
            title="🏆 Tournaments"
            onPress={() => router.push('/(tabs)/tournaments')}
            size="md"
          />
        </View>

        {/* Leaderboard */}
        <View style={styles.card}>
          <View style={styles.leaderHeader}>
            <Text style={styles.titleMd}>📊 Leaderboard</Text>
            <Text style={styles.mutedSmall}>Auto-refresh when you pull</Text>
          </View>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#FF6700" />
          ) : leaderboard.length === 0 ? (
            <View style={[styles.card, styles.centered]}>
              <Text style={styles.titleLg}>No games played yet!</Text>
              <Text style={styles.muted}>Start a game to see stats</Text>
            </View>
          ) : (
            leaderboard.map((entry, index) => (
              <LeaderboardCard
                key={entry.userId}
                entry={entry}
                rank={index + 1}
              />
            ))
          )}
        </View>

        {/* Sign Out moved to Profile page */}
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
  authCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    width: '100%',
    maxWidth: 560,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    }),
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'center',
  },
  userBox: {
    alignItems: 'flex-end',
  },
  userInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8F9',
    padding: 8,
    borderRadius: 999,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFDFAA',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '700',
  },
  userMeta: {
    alignItems: 'flex-end',
  },
  userName: {
    fontWeight: '700',
  },
  userEmail: {
    color: '#666',
    fontSize: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  titleLg: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  welcome: {
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  body: {
    color: '#666',
    marginTop: 6,
  },
  muted: {
    color: '#666',
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
  leaderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleMd: {
    fontSize: 18,
    fontWeight: '700',
  },
  mutedSmall: {
    color: '#999',
    fontSize: 12,
  }
});
