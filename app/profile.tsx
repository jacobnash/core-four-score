import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useTournament } from '../contexts/TournamentContext';
import { userService } from '../services/firestore';
import { webBoxShadow } from '../utils/shadow';

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const { activeTournament } = useTournament();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<any | null>(null);
    const [stats, setStats] = useState<any | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingPhoto, setEditingPhoto] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            setLoading(true);
            const tournamentId = activeTournament?.id;
            const [data, dynamicStats] = await Promise.all([
                userService.getUser(user.uid),
                userService.getUserStats(user.uid, tournamentId)
            ]);
            setProfile(data);
            setEditingName(data?.displayName || '');
            setEditingPhoto(data?.photoURL || '');
            setStats(dynamicStats);
            setLoading(false);
        };
        load();
    }, [user, activeTournament?.id]);

    if (!user) return null;

    if (loading || !profile) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FF6700" />
            </View>
        );
    }

    const effectiveStats = stats || profile?.stats || { wins: 0, gamesPlayed: 0, renegs: 0 };
    const winPct = effectiveStats.gamesPlayed > 0 ? ((effectiveStats.wins / effectiveStats.gamesPlayed) * 100).toFixed(1) : '0.0';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {(editingPhoto || profile.photoURL) ? (
                    <Image source={{ uri: editingPhoto || profile.photoURL }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}><Text style={styles.initials}>{profile.displayName?.slice(0, 2).toUpperCase()}</Text></View>
                )}
                <View style={styles.headerInfo}>
                    <Text style={styles.name}>{profile.displayName}</Text>
                    <Text style={styles.email}>{profile.email}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.title}>
                    Player Stats{activeTournament ? ` — ${activeTournament.name}` : ''}
                </Text>
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
            </View>
            <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Edit Profile</Text>
                <TextInput value={editingName} onChangeText={setEditingName} placeholder="Full name" style={styles.input} />
                <TextInput value={editingPhoto} onChangeText={setEditingPhoto} placeholder="Photo URL" style={styles.input} />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
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
                            }
                            setSaving(false);
                        }}
                        variant="primary"
                        size="sm"
                    />
                    <Button
                        title="Sign Out"
                        onPress={async () => {
                            if (typeof signOut === 'function') {
                                try {
                                    await signOut();
                                } catch (err) {
                                    console.error('Sign out failed', err);
                                }
                            }
                            try { router.replace('/'); } catch (e) { }
                        }}
                        variant="danger"
                        size="sm"
                    />
                </View>
            </View>
        </View>
    );
}

export const options = {
    headerShown: true,
    headerBackVisible: true,
    headerStyle: { backgroundColor: '#013220' },
    headerTintColor: '#F5F5DC',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F8',
        padding: 16,
    },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar: { width: 72, height: 72, borderRadius: 36, marginRight: 12 },
    avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEE', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
    initials: { fontSize: 18, fontWeight: '700' },
    headerInfo: {},
    name: { fontSize: 18, fontWeight: '800' },
    email: { color: '#666', marginTop: 4 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) } : { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }) },
    title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    statCol: { alignItems: 'center', flex: 1 },
    statNum: { fontSize: 20, fontWeight: '800', color: '#FF6700' },
    statLabel: { color: '#666', marginTop: 4 }
    ,
    input: { backgroundColor: '#FFF', padding: 8, borderRadius: 8, marginTop: 6 }
});
