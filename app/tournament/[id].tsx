import { router, useLocalSearchParams } from 'expo-router';
import Fuse from 'fuse.js';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { LeaderboardCard } from '../../components/LeaderboardCard';
import { ENABLE_IMPROVED_DATA_VIEWS } from '../../constants/featureFlags';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { leaderboardService, tournamentService, userService } from '../../services/firestore';
import { Tournament, User } from '../../types';
import { isLegacyCoreFourTournament } from '../../utils/tournamentMembership';

export default function TournamentDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { setActiveTournamentById } = useTournament();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<User[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviting, setInviting] = useState(false);

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
        await reload();
        const users = await userService.getAllUsers();
        setAllUsers(users);
        const t = await tournamentService.getTournament(id as string);
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

  const isMember = user && tournament?.memberIds.includes(user.uid);
  const isDraft = tournament?.status !== 'active';
  const isCoreFourLocked = isLegacyCoreFourTournament(tournament?.id, tournament?.tournamentId);
  const canManageMembers = isMember && isDraft && !isCoreFourLocked;

  const inviteCandidates = useMemo(() => {
    const memberSet = new Set(tournament?.memberIds || []);
    const inviteSet = new Set(tournament?.inviteIds || []);
    const pool = allUsers.filter(u => !memberSet.has(u.uid) && !inviteSet.has(u.uid));
    const fuse = new Fuse(pool, { keys: ['displayName', 'email'], threshold: 0.4 });
    const q = inviteSearch.trim();
    if (!q) return pool.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return fuse.search(q).map(r => r.item);
  }, [allUsers, tournament, inviteSearch]);

  const invitePlayer = async (uid: string) => {
    if (!id) return;
    setInviting(true);
    try {
      await tournamentService.inviteUser(String(id), uid);
      await reload();
      Alert.alert('Invited', 'Player invited — they can accept from the Tournaments tab.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to invite player');
    } finally {
      setInviting(false);
    }
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
        <Text style={styles.mutedSmall}>
          {players.length} players
          {isCoreFourLocked ? ' · Core Four exclusive' : ''}
          {tournament.status === 'active' ? ' · roster locked' : ' · draft — invite players'}
        </Text>

        <View style={{ height: 12 }} />
        {isDraft ? (
          <>
            <Button title="Start Tournament" onPress={async () => {
              try {
                await tournamentService.startTournament(String(id));
                await reload();
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

        {canManageMembers && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '700' }}>Invite players</Text>
            <Text style={styles.mutedSmall}>Anyone who has signed in can be invited.</Text>
            <TextInput
              placeholder="Search name or email"
              value={inviteSearch}
              onChangeText={setInviteSearch}
              style={styles.input}
            />
            <FlatList
              data={inviteCandidates.slice(0, 20)}
              keyExtractor={u => u.uid}
              style={{ maxHeight: 200, marginTop: 8 }}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>{item.displayName}</Text>
                    <Text style={styles.mutedSmall}>{item.email}</Text>
                  </View>
                  <Button title="Invite" onPress={() => invitePlayer(item.uid)} disabled={inviting} />
                </View>
              )}
            />
          </View>
        )}

        {isCoreFourLocked && (
          <Text style={[styles.mutedSmall, { marginTop: 12 }]}>
            This is the original deer-camp group. New players should create or join a separate tournament.
          </Text>
        )}

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
  titleLg: { fontSize: 20, fontWeight: '800' },
  mutedSmall: { color: '#999', fontSize: 12 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#EEE',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
});
