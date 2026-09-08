import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useTournament } from '../contexts/TournamentContext';
import { userService } from '../services/firestore';
import { showAlert } from '../utils/alert';
import { webBoxShadow } from '../utils/shadow';

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const { activeTournament } = useTournament();
    const router = useRouter();
    const [profileLoading, setProfileLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [profile, setProfile] = useState<any | null>(null);
    const [stats, setStats] = useState<any | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingPhoto, setEditingPhoto] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return;
            setProfileLoading(true);
            try {
                const data = await userService.getUser(user.uid);
                setProfile(data);
                setEditingName(data?.displayName || '');
                setEditingPhoto(data?.photoURL || '');
            } catch (err) {
                console.error('Failed to load profile', err);
            } finally {
                setProfileLoading(false);
            }
        };
        loadProfile();
        // Deliberately keyed on user?.uid, not `user` itself, to avoid re-running on every
        // context re-render where `user` gets a new object identity but the same uid.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]);

    useEffect(() => {
        const loadStats = async () => {
            if (!user) return;
            setStatsLoading(true);
            try {
                const dynamicStats = await userService.getUserStats(user.uid, activeTournament?.id);
                setStats(dynamicStats);
            } catch (err) {
                console.error('Failed to load stats', err);
            } finally {
                setStatsLoading(false);
            }
        };
        loadStats();
        // Deliberately keyed on user?.uid, not `user` itself, to avoid re-running on every
        // context re-render where `user` gets a new object identity but the same uid.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid, activeTournament?.id]);

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await signOut();
            router.replace('/(auth)/login');
        } catch (err) {
            console.error('Sign out failed', err);
            showAlert('Sign out failed', err instanceof Error ? err.message : 'Try again');
        } finally {
            setSigningOut(false);
        }
    };

    if (!user) return null;

    if (profileLoading && !profile) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FF6700" />
                <Text style={styles.loadingText}>Loading profile…</Text>
            </View>
        );
    }

    const displayProfile = profile || user;
    const effectiveStats = stats || displayProfile?.stats || { wins: 0, gamesPlayed: 0, renegs: 0 };
    const winPct =
        effectiveStats.gamesPlayed > 0
            ? ((effectiveStats.wins / effectiveStats.gamesPlayed) * 100).toFixed(1)
            : '0.0';
    const avatarUri = editingPhoto || displayProfile.photoURL;
    const showAvatarImage =
        avatarUri && typeof avatarUri === 'string' && !avatarUri.startsWith('data:image');

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.signOutRow}>
                <Text style={styles.signedInAs}>
                    Signed in as {displayProfile.displayName || user.displayName}
                </Text>
                <Button
                    title={signingOut ? 'Signing out…' : 'Sign Out'}
                    onPress={handleSignOut}
                    variant="danger"
                    isLoading={signingOut}
                />
            </View>

            <View style={styles.header}>
                {showAvatarImage ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.initials}>
                            {displayProfile.displayName?.slice(0, 2).toUpperCase() || 'ME'}
                        </Text>
                    </View>
                )}
                <View style={styles.headerInfo}>
                    <Text style={styles.name}>{displayProfile.displayName}</Text>
                    <Text style={styles.email}>{displayProfile.email}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.title}>
                    Player Stats{activeTournament ? ` — ${activeTournament.name}` : ''}
                </Text>
                {statsLoading ? (
                    <ActivityIndicator size="small" color="#FF6700" style={{ marginVertical: 12 }} />
                ) : (
                    <View style={styles.row}>
                        <View style={styles.statCol}>
                            <Text style={styles.statNum}>{effectiveStats.wins}</Text>
                            <Text style={styles.statLabel}>Wins</Text>
                        </View>
                        <View style={styles.statCol}>
                            <Text style={styles.statNum}>{effectiveStats.gamesPlayed}</Text>
                            <Text style={styles.statLabel}>Games</Text>
                        </View>
                        <View style={styles.statCol}>
                            <Text style={styles.statNum}>{winPct}%</Text>
                            <Text style={styles.statLabel}>Win Rate</Text>
                        </View>
                        <View style={styles.statCol}>
                            <Text style={styles.statNum}>{effectiveStats.renegs}</Text>
                            <Text style={styles.statLabel}>Renegs</Text>
                        </View>
                    </View>
                )}
            </View>

            <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Edit Profile</Text>
                <TextInput
                    value={editingName}
                    onChangeText={setEditingName}
                    placeholder="Full name"
                    style={styles.input}
                />
                <TextInput
                    value={editingPhoto}
                    onChangeText={setEditingPhoto}
                    placeholder="Photo URL"
                    style={styles.input}
                />
                <View style={{ marginTop: 8 }}>
                    <Button
                        title={saving ? 'Saving...' : 'Save'}
                        onPress={async () => {
                            if (!user) return;
                            setSaving(true);
                            try {
                                await userService.updateUser(user.uid, editingName, editingPhoto);
                                const refreshed = await userService.getUser(user.uid);
                                setProfile(refreshed);
                            } catch (err) {
                                console.error('Failed to update profile', err);
                                showAlert('Save failed', 'Could not update profile');
                            }
                            setSaving(false);
                        }}
                        variant="primary"
                    />
                </View>
            </View>
        </ScrollView>
    );
}

export const options = {
    headerShown: true,
    headerBackVisible: true,
    headerStyle: { backgroundColor: '#013220' },
    headerTintColor: '#F5F5DC',
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F8' },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 12, color: '#666' },
    signOutRow: {
        marginBottom: 16,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#EEE',
        gap: 10,
    },
    signedInAs: { fontWeight: '600', color: '#333' },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar: { width: 72, height: 72, borderRadius: 36, marginRight: 12 },
    avatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#EEE',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: { fontSize: 18, fontWeight: '700' },
    headerInfo: {},
    name: { fontSize: 18, fontWeight: '800' },
    email: { color: '#666', marginTop: 4 },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        ...(Platform.OS === 'web'
            ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) }
            : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
              }),
    },
    title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    statCol: { alignItems: 'center', flex: 1 },
    statNum: { fontSize: 20, fontWeight: '800', color: '#FF6700' },
    statLabel: { color: '#666', marginTop: 4 },
    input: { backgroundColor: '#FFF', padding: 8, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: '#EEE' },
});
