import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { TournamentInvitePanel } from '../../components/TournamentInvitePanel';
import { LeaderboardCard } from '../../components/LeaderboardCard';
import { ENABLE_CLAYS_SCORING, ENABLE_IMPROVED_DATA_VIEWS } from '../../constants/featureFlags';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { useTournamentAccess } from '../../hooks/useTournamentAccess';
import { claysLeaderboardService, leaderboardService, tournamentService } from '../../services/firestore';
import { ClaysMemberStats, Tournament, User } from '../../types';
import { CLAYS_ROLLING_MONTHS } from '../../utils/claysScoring';
import { isLegacyCoreFourTournament } from '../../utils/tournamentMembership';
import { getTournamentHomeRoute, TOURNAMENT_ACTIVITY_LABELS } from '../../utils/tournamentNavigation';
import { canUserAccessTournament } from '../../utils/tournamentVisibility';

export default function TournamentDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { setActiveTournamentById } = useTournament();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<User[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [claysLeaderboard, setClaysLeaderboard] = useState<ClaysMemberStats[]>([]);

  const reload = async () => {
    if (!id) return;
    const t = await tournamentService.getTournament(id as string);
    setTournament(t);
    const members = await tournamentService.getTournamentMembers(id as string);
    setPlayers(members);
    const lb = await leaderboardService.getLeaderboard(id as string);
    setLeaderboard(lb);
    if (ENABLE_CLAYS_SCORING && t && !isLegacyCoreFourTournament(t.id, t.tournamentId)) {
      const claysLb = await claysLeaderboardService.getClaysLeaderboard(id as string);
      setClaysLeaderboard(claysLb);
    } else {
      setClaysLeaderboard([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const t = await tournamentService.getTournament(id as string);
        if (!t) {
          setTournament(null);
          return;
        }
        if (!user || !canUserAccessTournament(t, user.uid)) {
          setTournament(t);
          setPlayers([]);
          setLeaderboard([]);
          return;
        }
        await reload();
        if (t.memberIds?.includes(user.uid)) {
          setActiveTournamentById(id as string);
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load tournament');
      } finally {
        setLoading(false);
      }
    })();
    // Deliberately keyed on user?.uid (not `user`) and excludes reload/setActiveTournamentById
    // (unmemoized) to avoid re-running this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.uid]);

  const { isMember, isDraft, isCoreFourLocked, isClays, canShareLink, showClays } =
    useTournamentAccess(tournament, user?.uid);
  const hasAccess = isMember;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF6700" />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.titleLg}>Tournament not found</Text>
        </View>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.titleLg}>Private tournament</Text>
          <Text style={styles.mutedSmall}>
            Ask the organizer for the invite link, then sign in and tap join.
          </Text>
          <View style={{ height: 12 }} />
          <Button title="Back to Tournaments" onPress={() => router.push('/(tabs)/tournaments')} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titleLg}>{tournament.name}</Text>
        <Text style={styles.mutedSmall}>
          {players.length} players
          ·{' '}
          {TOURNAMENT_ACTIVITY_LABELS[
            tournament.activityType === 'clays' || tournament.activityType === 'catan'
              ? tournament.activityType
              : 'euchre'
          ]}
          {isCoreFourLocked ? ' · Core Four exclusive' : ' · open roster'}
          {isDraft ? ' · draft' : ' · active'}
        </Text>

        {canShareLink && (
          <TournamentInvitePanel
            tournamentId={String(id)}
            tournamentName={tournament.name}
            memberIds={tournament.memberIds}
            onMemberAdded={reload}
          />
        )}

        {isCoreFourLocked && (
          <Text style={[styles.mutedSmall, { marginTop: 12 }]}>
            Closed roster — no invite link. Create a new tournament to play with others.
          </Text>
        )}

        <View style={{ height: 12 }} />
        {isDraft ? (
          <>
            <Button
              title="Start Tournament"
              onPress={async () => {
                try {
                  await tournamentService.startTournament(String(id));
                  await reload();
                  Alert.alert('Tournament started', 'You can still add shooters anytime via link or email.');
                } catch (err) {
                  console.error('Failed to start tournament', err);
                  Alert.alert('Error', 'Failed to start tournament');
                }
              }}
            />
            <View style={{ height: 8 }} />
          </>
        ) : null}
        {!isClays && (
          <Button
            title="Start Game"
            onPress={() => {
              router.push({
                pathname: '/matchup',
                params: { tournamentId: String(tournament.id || id) },
              });
            }}
            variant="primary"
          />
        )}
        {showClays && (
          <>
            <View style={{ height: isClays ? 0 : 8 }} />
            <Button
              title={isClays ? 'Open clays scoring' : 'Score clays'}
              variant={isClays ? 'primary' : undefined}
              onPress={async () => {
                await setActiveTournamentById(String(id));
                router.push(getTournamentHomeRoute(tournament));
              }}
            />
          </>
        )}
        {!isClays && !isCoreFourLocked && (
          <>
            <View style={{ height: 8 }} />
            <Button
              title="Open tournament home"
              onPress={async () => {
                await setActiveTournamentById(String(id));
                router.push(getTournamentHomeRoute(tournament));
              }}
            />
          </>
        )}
        <View style={{ height: 12 }} />
        <Button title="Back to Tournaments" onPress={() => router.push('/(tabs)/tournaments')} />

        <View style={{ height: 12 }} />
        <Text style={{ fontWeight: '700' }}>Members</Text>
        {players.map(p => (
          <Text key={p.uid} style={styles.mutedSmall}>{p.displayName}</Text>
        ))}

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

        {showClays && (
          <>
            <View style={{ height: 12 }} />
            <Text style={{ fontWeight: '700' }}>Clays (last {CLAYS_ROLLING_MONTHS} months)</Text>
            {claysLeaderboard.length === 0 ? (
              <Text style={styles.mutedSmall}>No clays scores yet.</Text>
            ) : (
              claysLeaderboard.map((entry, idx) => (
                <View key={entry.userId} style={styles.claysRow}>
                  <Text style={styles.mutedSmall}>
                    {idx + 1}. {entry.displayName}
                  </Text>
                  <Text style={styles.claysPct}>
                    {entry.percentage != null ? `${entry.percentage}%` : '—'} ({entry.hits}/{entry.possible})
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8', padding: 16 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 12, maxWidth: 720, width: '100%' },
  linkBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  titleLg: { fontSize: 20, fontWeight: '800' },
  mutedSmall: { color: '#999', fontSize: 12 },
  claysRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  claysPct: { fontWeight: '700', color: '#013220', fontSize: 12 },
  centered: { alignItems: 'center', justifyContent: 'center' },
});
