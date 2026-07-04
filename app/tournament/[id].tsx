import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { InviteLinkButton } from '../../components/InviteLinkButton';
import { LeaderboardCard } from '../../components/LeaderboardCard';
import { ENABLE_IMPROVED_DATA_VIEWS } from '../../constants/featureFlags';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { leaderboardService, tournamentService } from '../../services/firestore';
import { Tournament, User } from '../../types';
import { isLegacyCoreFourTournament } from '../../utils/tournamentMembership';
import { canUserAccessTournament, isTournamentMember } from '../../utils/tournamentVisibility';

export default function TournamentDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { setActiveTournamentById } = useTournament();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<User[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const reload = async () => {
    if (!id) return;
    const t = await tournamentService.getTournament(id as string);
    setTournament(t);
    const members = await tournamentService.getTournamentMembers(id as string);
    setPlayers(members);
    const lb = await leaderboardService.getLeaderboard(id as string);
    setLeaderboard(lb);
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
  }, [id, user?.uid]);

  const isMember = !!(user && tournament && isTournamentMember(tournament, user.uid));
  const hasAccess = isMember;
  const isDraft = tournament?.status !== 'active';
  const isCoreFourLocked = isLegacyCoreFourTournament(tournament?.id, tournament?.tournamentId);
  const canShareLink = isMember && isDraft && !isCoreFourLocked;

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
          {isCoreFourLocked ? ' · Core Four exclusive' : ''}
          {tournament.status === 'active' ? ' · roster locked' : ' · draft'}
        </Text>

        {canShareLink && (
          <View style={styles.linkBox}>
            <Text style={{ fontWeight: '700' }}>Share link to invite players</Text>
            <InviteLinkButton
              tournamentId={String(id)}
              tournamentName={tournament.name}
              variant="primary"
              showUrl
            />
          </View>
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
                  Alert.alert('Tournament started', 'Roster is locked. Share the link before starting next time.');
                } catch (err) {
                  console.error('Failed to start tournament', err);
                  Alert.alert('Error', 'Failed to start tournament');
                }
              }}
            />
            <View style={{ height: 8 }} />
          </>
        ) : null}
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
  centered: { alignItems: 'center', justifyContent: 'center' },
});
