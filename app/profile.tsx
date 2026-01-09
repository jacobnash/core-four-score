import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/firestore';
import { webBoxShadow } from '../utils/shadow';

export default function ProfileScreen() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<any | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            setLoading(true);
            const data = await userService.getUser(user.uid);
            setProfile(data);
            setLoading(false);
        };
        load();
    }, [user]);

    if (!user) return null;

    if (loading || !profile) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FF6700" />
            </View>
        );
    }

    const { stats } = profile;
    const winPct = stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) : '0.0';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {profile.photoURL ? (
                    <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}><Text style={styles.initials}>{profile.displayName?.slice(0, 2).toUpperCase()}</Text></View>
                )}
                <View style={styles.headerInfo}>
                    <Text style={styles.name}>{profile.displayName}</Text>
                    <Text style={styles.email}>{profile.email}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.title}>Player Stats</Text>
                <View style={styles.row}>
                    <View style={styles.statCol}>
                        <Text style={styles.statNum}>{stats.wins}</Text>
                        <Text style={styles.statLabel}>Wins</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={styles.statNum}>{stats.gamesPlayed}</Text>
                        <Text style={styles.statLabel}>Games</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={styles.statNum}>{winPct}%</Text>
                        <Text style={styles.statLabel}>Win Rate</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={styles.statNum}>{stats.renegs}</Text>
                        <Text style={styles.statLabel}>Renegs</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

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
});
