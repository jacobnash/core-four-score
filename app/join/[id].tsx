import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { tournamentService } from '../../services/firestore';
import { Tournament } from '../../types';
import { isLegacyCoreFourTournament } from '../../utils/tournamentMembership';
import { canUserAccessTournament, isTournamentMember } from '../../utils/tournamentVisibility';

export default function JoinTournamentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, loading: authLoading } = useAuth();
    const { loadTournaments, setActiveTournamentById } = useTournament();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tournamentId = typeof id === 'string' ? id : '';

    useEffect(() => {
        if (!tournamentId) {
            setError('Invalid invite link');
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const t = await tournamentService.getTournament(tournamentId);
                if (!t) {
                    setError('Tournament not found');
                    return;
                }
                if (isLegacyCoreFourTournament(t.id, t.tournamentId)) {
                    setError('The Core Four tournament is private — ask Cait, Dylan, Grace, or Jacob for access.');
                    return;
                }
                setTournament(t);
            } catch (err) {
                console.error(err);
                setError('Could not load tournament');
            } finally {
                setLoading(false);
            }
        })();
    }, [tournamentId]);

    const isMember = !!(user && tournament && isTournamentMember(tournament, user.uid));
    const isDraft = tournament?.status !== 'active';
    const canJoin = !!(user && tournament && isDraft && !isMember);

    const handleJoin = async () => {
        if (!user || !tournamentId) return;
        setJoining(true);
        try {
            const result = await tournamentService.joinViaInviteLink(tournamentId, user.uid);
            await loadTournaments();
            await setActiveTournamentById(tournamentId);
            Alert.alert(
                result === 'already_member' ? 'Already joined' : 'Welcome!',
                result === 'already_member'
                    ? `You are already in "${tournament?.name}".`
                    : `You joined "${tournament?.name}".`,
                [{ text: 'OK', onPress: () => router.replace('/(tabs)/tournaments') }]
            );
        } catch (err: any) {
            Alert.alert('Could not join', err?.message || 'Failed to join tournament');
        } finally {
            setJoining(false);
        }
    };

    if (authLoading || loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#FF6700" />
            </View>
        );
    }

    if (error || !tournament) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Invite link</Text>
                    <Text style={styles.muted}>{error || 'Tournament not found'}</Text>
                    <View style={{ height: 12 }} />
                    <Button title="Go to Tournaments" onPress={() => router.replace('/(tabs)/tournaments')} />
                </View>
            </View>
        );
    }

    if (!user) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>You&apos;re invited!</Text>
                    <Text style={styles.subtitle}>{tournament.name}</Text>
                    <Text style={styles.muted}>
                        Sign in with Google to join this tournament. You only need to sign in once.
                    </Text>
                    <View style={{ height: 12 }} />
                    <Button
                        title="Sign in to join"
                        variant="primary"
                        onPress={() =>
                            router.replace(`/(auth)/login?returnTo=${encodeURIComponent(`/join/${tournamentId}`)}`)
                        }
                    />
                </View>
            </View>
        );
    }

    if (isMember) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>{tournament.name}</Text>
                    <Text style={styles.muted}>You are already a member of this tournament.</Text>
                    <View style={{ height: 12 }} />
                    <Button
                        title="Open tournament"
                        variant="primary"
                        onPress={async () => {
                            await setActiveTournamentById(tournamentId);
                            router.replace('/(tabs)/tournaments');
                        }}
                    />
                </View>
            </View>
        );
    }

    if (!isDraft) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>{tournament.name}</Text>
                    <Text style={styles.muted}>
                        This tournament has already started — the roster is locked. Ask an organizer to invite you before start next time.
                    </Text>
                    <View style={{ height: 12 }} />
                    <Button title="Go to Tournaments" onPress={() => router.replace('/(tabs)/tournaments')} />
                </View>
            </View>
        );
    }

    if (user && canUserAccessTournament(tournament, user.uid) && !isMember) {
        // Pending in-app invite — same join action
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.eyebrow}>Tournament invite</Text>
                <Text style={styles.title}>{tournament.name}</Text>
                <Text style={styles.muted}>
                    {tournament.memberIds.length} player{tournament.memberIds.length === 1 ? '' : 's'} so far · draft
                </Text>
                <Text style={[styles.muted, { marginTop: 8 }]}>
                    Join to see stats, rules, and games with this group.
                </Text>
                <View style={{ height: 16 }} />
                {canJoin && (
                    <Button title="Join tournament" variant="primary" onPress={handleJoin} isLoading={joining} />
                )}
                <View style={{ height: 8 }} />
                <Button title="Not now" onPress={() => router.replace('/(tabs)/tournaments')} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F8', padding: 16, justifyContent: 'center' },
    centered: { alignItems: 'center' },
    card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, maxWidth: 480, width: '100%', alignSelf: 'center' },
    eyebrow: { fontSize: 12, fontWeight: '700', color: '#FF6700', textTransform: 'uppercase', letterSpacing: 0.5 },
    title: { fontSize: 22, fontWeight: '800', marginTop: 4 },
    subtitle: { fontSize: 18, fontWeight: '700', marginTop: 4 },
    muted: { color: '#666', fontSize: 14, marginTop: 8, lineHeight: 20 },
});
