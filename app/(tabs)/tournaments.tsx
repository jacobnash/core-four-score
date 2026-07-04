import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { InviteLinkButton } from '../../components/InviteLinkButton';
import { isLegacyCoreFourTournament } from '../../utils/tournamentMembership';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { tournamentService } from '../../services/firestore';

function isPreferredTournament(
  tournamentId: string,
  tournamentDocId?: string,
  preferredTournamentId?: string | null
) {
  if (!preferredTournamentId) return false;
  return preferredTournamentId === tournamentId || preferredTournamentId === tournamentDocId;
}

export default function TournamentsScreen() {
  const { user } = useAuth();
  const {
    tournaments,
    loading,
    loadTournaments,
    setActiveTournamentById,
    activeTournament,
  } = useTournament();

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState<{ id: string; name: string } | null>(null);

  const createTournament = async () => {
    if (!user) return;
    const tname = name.trim();
    if (!tname) {
      Alert.alert('Name required', 'Please add a name for the tournament');
      return;
    }
    setCreating(true);
    try {
      const t = await tournamentService.createTournament(tname, [user.uid], user.uid);
      try {
        await setActiveTournamentById(t.id);
      } catch (activateErr) {
        console.warn('Activation failed after create', activateErr);
      }
      await loadTournaments();
      setName('');
      setCreateMode(false);
      setCreatedInviteLink({ id: t.id, name: t.name });
    } catch (err: any) {
      console.error('Failed to create tournament', err);
      Alert.alert('Error', err?.message || 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titleMd}>🏆🎯 Tournaments</Text>
        <Text style={styles.mutedSmall}>
          Create a tournament, share the link, and friends sign in to join. ⭐ marks your default tournament.
        </Text>
        <View style={{ height: 12 }} />

        <View style={{ marginBottom: 12 }}>
          <Button title={createMode ? 'Cancel' : 'Create Tournament'} onPress={() => setCreateMode(m => !m)} variant="primary" />
        </View>

        {createMode && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: '700' }}>Tournament Name</Text>
            <TextInput
              placeholder="My Weekend Tournament"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <Text style={[styles.mutedSmall, { marginTop: 8 }]}>
              You&apos;ll get a share link to send your group. They sign in once, tap join, and they&apos;re in.
            </Text>
            <View style={{ height: 12 }} />
            <Button title="Create Tournament" onPress={createTournament} variant="primary" isLoading={creating} />
          </View>
        )}

        {createdInviteLink && (
          <View style={[styles.inviteBox, { marginBottom: 12 }]}>
            <Text style={{ fontWeight: '700' }}>Share this link</Text>
            <Text style={styles.mutedSmall}>
              Send to your group for &quot;{createdInviteLink.name}&quot;
            </Text>
            <InviteLinkButton
              tournamentId={createdInviteLink.id}
              tournamentName={createdInviteLink.name}
              variant="primary"
              showUrl
            />
            <View style={{ height: 8 }} />
            <Button title="Done" onPress={() => setCreatedInviteLink(null)} />
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="small" color="#FF6700" />
        ) : tournaments.length === 0 ? (
          <View style={{ paddingTop: 12 }}>
            <Text style={styles.muted}>You are not part of any tournaments.</Text>
          </View>
        ) : (
          <FlatList
            data={tournaments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const preferred = isPreferredTournament(item.id, item.tournamentId, user?.preferredTournamentId);
              const isActive = activeTournament?.id === item.id;
              const isCoreFour = isLegacyCoreFourTournament(item.id, item.tournamentId);
              const isDraft = item.status !== 'active';
              const canShare = !isCoreFour && isDraft;
              return (
                <View style={styles.tourBlock}>
                  <View style={styles.tourRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tourName}>
                        {preferred ? '⭐ ' : ''}{item.name}
                      </Text>
                      <Text style={styles.mutedSmall}>
                        {item.memberIds.length} players
                        {isCoreFour ? ' · Core Four exclusive' : ''}
                        {preferred ? ' · default' : ''}
                        {isActive ? ' · active' : isDraft ? ' · draft' : ''}
                      </Text>
                    </View>
                    <Button
                      title={isActive ? 'Continue' : preferred ? 'Start' : 'Select'}
                      onPress={() => setActiveTournamentById(item.id)}
                    />
                    <View style={{ width: 8 }} />
                    <Button title="Details" onPress={() => router.push(`/tournament/${item.id}`)} />
                  </View>
                  {canShare && (
                    <InviteLinkButton
                      tournamentId={item.id}
                      tournamentName={item.name}
                      compact
                      showUrl
                    />
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8', padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    maxWidth: 720,
    width: '100%',
  },
  titleMd: { fontSize: 18, fontWeight: '700' },
  mutedSmall: { color: '#999', fontSize: 12 },
  muted: { color: '#666' },
  input: {
    borderWidth: 1,
    borderColor: '#EEE',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  tourBlock: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tourRow: { flexDirection: 'row', alignItems: 'center' },
  tourName: { fontWeight: '700' },
  inviteBox: {
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
});
