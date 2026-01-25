import Fuse from 'fuse.js';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { tournamentService, userService } from '../../services/firestore';

export default function TournamentsScreen(props: { initialUsers?: any[] } = {}) {
  const { user } = useAuth();
  const { tournaments, loading, loadTournaments, setActiveTournamentById } = useTournament();

  const [users, setUsers] = useState<any[]>(props.initialUsers ?? []);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    if (props.initialUsers) {
      const initial: Record<string, boolean> = {};
      props.initialUsers.forEach((u: any) => (initial[u.uid] = u.uid === user?.uid));
      return initial;
    }
    return {};
  });
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTournaments();
  }, [user]);

  useEffect(() => {
    if (props.initialUsers) return; // already initialized synchronously in tests
    (async () => {
      try {
        const all = await userService.getAllUsers();
        setUsers(all);
        const initial: Record<string, boolean> = {};
        all.forEach(u => (initial[u.uid] = u.uid === user?.uid));
        setSelected(initial);
      } catch (err) {
        console.error('Failed to load users', err);
      }
    })();
  }, [user]);

  // Fuse instance for fuzzy search
  const fuse = React.useMemo(() => {
    return new Fuse(users, {
      keys: ['displayName', 'email', 'uid'],
      threshold: 0.4,
    });
  }, [users]);

  const toggle = (uid: string) => setSelected(s => ({ ...s, [uid]: !s[uid] }));

  const createTournament = async () => {
    if (!user) return;
    const tname = name.trim();
    if (!tname) {
      Alert.alert('Name required', 'Please add a name for the tournament');
      return;
    }
    const memberIds = Object.keys(selected).filter(k => selected[k]);
    if (!memberIds.includes(user.uid)) memberIds.push(user.uid);
    if (memberIds.length < 2) {
      Alert.alert('Need players', 'Select at least 2 players');
      return;
    }
    setCreating(true);
    try {
      const t = await tournamentService.createTournament(tname, memberIds, user.uid);
      // Try to activate; if it fails we'll still show success and refresh the list
      try {
        await setActiveTournamentById(t.id);
      } catch (activateErr) {
        console.warn('Activation failed after create', activateErr);
      }
      await loadTournaments();
      setName('');
      setCreateMode(false);
      Alert.alert('Tournament created', `Created "${t.name}" with ${memberIds.length} players.`);
    } catch (err) {
      console.error('Failed to create tournament', err);
      Alert.alert('Error', 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titleMd}>🏆🎯 Tournaments</Text>
        <Text style={styles.mutedSmall}>Create a tournament and pick players below.</Text>
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

            <Text style={{ fontWeight: '700', marginTop: 8 }}>Players</Text>
            <Text style={styles.mutedSmall}>Search by name or email; tap to add or remove players</Text>
            <View style={{ height: 8 }} />

            <TextInput
              placeholder="Search name or email"
              value={search}
              onChangeText={setSearch}
              style={styles.input}
            />

            <View style={{ height: 8 }} />
            <FlatList
              data={(() => {
                const q = search.trim();
                if (!q) {
                  return users.filter(u => user && u.uid === user.uid);
                }
                const results = fuse.search(q);
                return results.map(r => r.item);
              })()}
              keyExtractor={u => u.uid}
              style={{ maxHeight: 240 }}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>{item.displayName}</Text>
                    <Text style={styles.mutedSmall}>{item.email}</Text>
                  </View>
                  <Button title={selected[item.uid] ? 'Remove' : 'Add'} onPress={() => toggle(item.uid)} />
                </View>
              )}
            />

            {/* Selected users list */}
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: '700' }}>Selected Players</Text>
              {Object.keys(selected).filter(k => selected[k]).length === 0 ? (
                <Text style={styles.mutedSmall}>No players added yet.</Text>
              ) : (
                <FlatList
                  data={Object.keys(selected).filter(k => selected[k]).map(uid => users.find(u => u.uid === uid)).filter(Boolean)}
                  keyExtractor={u => (u as any).uid}
                  renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700' }}>{(item as any).displayName}</Text>
                        <Text style={styles.mutedSmall}>{(item as any).email}</Text>
                      </View>
                      <Button title="Remove" onPress={() => toggle((item as any).uid)} />
                    </View>
                  )}
                />
              )}
            </View>
            <View style={{ height: 8 }} />
            <Button title="Create Tournament" onPress={createTournament} variant="primary" isLoading={creating} />
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
            renderItem={({ item }) => (
              <View style={styles.tourRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tourName}>{item.name}</Text>
                  <Text style={styles.mutedSmall}>{item.memberIds.length} players</Text>
                </View>
                <Button title="Select" onPress={() => setActiveTournamentById(item.id)} />
              </View>
            )}
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
  tourRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  tourName: { fontWeight: '700' },
});
