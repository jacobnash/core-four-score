import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../../components/Button';
import { showAlert } from '../../utils/alert';
import { TournamentInvitePanel } from '../../components/TournamentInvitePanel';
import { isLegacyCoreFourTournament } from '../../utils/tournamentMembership';
import {
    TOURNAMENT_ACTIVITY_EMOJI,
    TOURNAMENT_ACTIVITY_LABELS,
    getTournamentHomeRoute,
} from '../../utils/tournamentNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { tournamentService } from '../../services/firestore';
import { TournamentActivityType } from '../../types';

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
        activateTournament,
        activeTournament,
    } = useTournament();

    const [name, setName] = useState('');
    const [activityType, setActivityType] = useState<TournamentActivityType>('euchre');
    const [creating, setCreating] = useState(false);
    const [createMode, setCreateMode] = useState(false);
    const [createdInviteLink, setCreatedInviteLink] = useState<{ id: string; name: string } | null>(
        null
    );
    const [createError, setCreateError] = useState<string | null>(null);

    const createTournament = async () => {
        setCreateError(null);
        if (!user?.uid) {
            const msg = 'Sign in again to create a tournament.';
            setCreateError(msg);
            showAlert('Sign in required', msg);
            return;
        }
        const tname = name.trim();
        if (!tname) {
            const msg = 'Add a name for the tournament first.';
            setCreateError(msg);
            return;
        }
        setCreating(true);
        try {
            if (__DEV__) console.log('[create] writing tournament', { tname, activityType, uid: user.uid });
            const t = await tournamentService.createTournament(
                tname,
                [user.uid],
                user.uid,
                [],
                activityType
            );
            if (__DEV__) console.log('[create] success', t.id);
            await activateTournament(t, { navigate: false });
            await loadTournaments();
            setName('');
            setCreateMode(false);
            setCreatedInviteLink({ id: t.id, name: t.name });
        } catch (err: unknown) {
            console.error('Failed to create tournament', err);
            const msg = err instanceof Error ? err.message : 'Failed to create tournament';
            setCreateError(msg);
            showAlert('Could not create tournament', msg);
        } finally {
            setCreating(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.card}>
                <Text style={styles.titleMd}>🏆🎯 Tournaments</Text>
                <Text style={styles.mutedSmall}>
                    Create a tournament, share the link, and friends sign in to join. ⭐ marks your
                    default tournament.
                </Text>
                <View style={{ height: 12 }} />

                <View style={{ marginBottom: 12 }}>
                    <Button
                        title={createMode ? 'Cancel' : '+ New Tournament'}
                        onPress={() => {
                            setCreateMode(m => !m);
                            setCreateError(null);
                        }}
                        variant="primary"
                    />
                </View>

                {createMode && (
                    <View style={styles.createForm}>
                        <Text style={{ fontWeight: '700' }}>Tournament Name</Text>
                        <TextInput
                            placeholder="My Weekend Tournament"
                            value={name}
                            onChangeText={text => {
                                setName(text);
                                if (createError) setCreateError(null);
                            }}
                            style={styles.input}
                            autoFocus
                        />
                        <Text style={{ fontWeight: '700', marginTop: 12 }}>Type</Text>
                        <View style={styles.typeRow}>
                            {(['euchre', 'clays', 'catan'] as TournamentActivityType[]).map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeChip, activityType === type && styles.typeChipActive]}
                                    onPress={() => setActivityType(type)}
                                >
                                    <Text
                                        style={[
                                            styles.typeChipText,
                                            activityType === type && styles.typeChipTextActive,
                                        ]}
                                    >
                                        {TOURNAMENT_ACTIVITY_EMOJI[type]} {TOURNAMENT_ACTIVITY_LABELS[type]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={[styles.mutedSmall, { marginTop: 8 }]}>
                            {activityType === 'clays'
                                ? 'Opens the Clays tab for scoring when selected.'
                                : activityType === 'catan'
                                  ? 'Opens the Catan tab for game recording and the board randomizer.'
                                  : 'Opens the Tournament home for euchre games when selected.'}
                        </Text>
                        {createError ? (
                            <Text style={styles.createError}>{createError}</Text>
                        ) : null}
                        <View style={{ height: 12 }} />
                        <Button
                            title={creating ? 'Creating…' : 'Create Tournament'}
                            onPress={createTournament}
                            variant="primary"
                            isLoading={creating}
                        />
                    </View>
                )}

                {createdInviteLink && (
                    <View style={[styles.inviteBox, { marginBottom: 12 }]}>
                        <Text style={{ fontWeight: '700' }}>Tournament created</Text>
                        <Text style={styles.mutedSmall}>
                            &quot;{createdInviteLink.name}&quot; is ready — invite your group below.
                        </Text>
                        <TournamentInvitePanel
                            tournamentId={createdInviteLink.id}
                            tournamentName={createdInviteLink.name}
                            memberIds={user ? [user.uid] : []}
                            onMemberAdded={loadTournaments}
                        />
                        <View style={{ height: 8 }} />
                        <Button
                            title="Go to tournament"
                            onPress={() => {
                                setCreatedInviteLink(null);
                                if (activeTournament) {
                                    router.replace(getTournamentHomeRoute(activeTournament));
                                }
                            }}
                        />
                        <View style={{ height: 8 }} />
                        <Button title="Stay here" variant="secondary" onPress={() => setCreatedInviteLink(null)} />
                    </View>
                )}

                {loading ? (
                    <ActivityIndicator size="small" color="#FF6700" />
                ) : tournaments.length === 0 ? (
                    <View style={{ paddingTop: 12 }}>
                        <Text style={styles.muted}>You are not part of any tournaments.</Text>
                    </View>
                ) : (
                    tournaments.map(item => {
                        const preferred = isPreferredTournament(
                            item.id,
                            item.tournamentId,
                            user?.preferredTournamentId
                        );
                        const isActive = activeTournament?.id === item.id;
                        const isCoreFour = isLegacyCoreFourTournament(item.id, item.tournamentId);
                        const isDraft = item.status !== 'active';
                        const canInvite = !isCoreFour;
                        return (
                            <View key={item.id} style={styles.tourBlock}>
                                <View style={styles.tourRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.tourName}>
                                            {preferred ? '⭐ ' : ''}
                                            {item.name}
                                        </Text>
                                        <Text style={styles.mutedSmall}>
                                            {item.memberIds.length} players ·{' '}
                                            {TOURNAMENT_ACTIVITY_LABELS[
                                                item.activityType === 'clays' || item.activityType === 'catan'
                                                    ? item.activityType
                                                    : 'euchre'
                                            ]}
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
                                    <Button
                                        title="Details"
                                        onPress={() => router.push(`/tournament/${item.id}`)}
                                    />
                                </View>
                                {canInvite && (
                                    <TournamentInvitePanel
                                        tournamentId={item.id}
                                        tournamentName={item.name}
                                        memberIds={item.memberIds}
                                        compact
                                        onMemberAdded={loadTournaments}
                                    />
                                )}
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F8' },
    content: { padding: 16, paddingBottom: 32 },
    card: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        maxWidth: 720,
        width: '100%',
        alignSelf: 'center',
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
    typeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    typeChip: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#F0F0F0',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    typeChipActive: { backgroundColor: '#013220', borderColor: '#013220' },
    typeChipText: { fontWeight: '600', color: '#333' },
    typeChipTextActive: { color: '#F5F5DC' },
    inviteBox: {
        backgroundColor: '#FFF8F0',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    createForm: {
        marginBottom: 12,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#EEE',
    },
    createError: {
        marginTop: 10,
        color: '#C04A0C',
        fontSize: 13,
        fontWeight: '600',
    },
});
