import React, { useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LeaderboardEntry } from '../types';
import { webBoxShadow } from '../utils/shadow';
import RenegListModal from './RenegListModal';

interface LeaderboardCardProps {
    entry: LeaderboardEntry;
    rank: number;
    variant?: 'default' | 'compact';
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ entry, rank, variant = 'default' }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const getRankBadge = () => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const isCompact = variant === 'compact';

    return (
        <View style={[
            isCompact ? styles.cardCompact : styles.card,
            rank === 1 ? styles.cardTop : null,
        ]}>
            <View style={styles.left}>
                <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{getRankBadge()}</Text>
                </View>

                {entry.photoURL ? (
                    <Image source={{ uri: entry.photoURL }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder} />
                )}

                <View style={styles.info}>
                    <Text style={styles.name}>{entry.displayName}</Text>
                    <Text style={styles.muted}>{entry.gamesPlayed} games</Text>
                </View>
            </View>

            <View style={styles.stats}>
                <Text style={styles.wins}>{entry.wins}</Text>
                <Text style={styles.mutedSmall}>wins</Text>
                <Text style={styles.winPct}>{entry.winPercentage.toFixed(1)}%</Text>
            </View>

            {entry.totalRenegs > 0 && (
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.renegBadge}>
                    <Text style={styles.renegText}>{entry.totalRenegs}</Text>
                </TouchableOpacity>
            )}

            <RenegListModal visible={modalVisible} userId={entry.userId} onClose={() => setModalVisible(false)} />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
        }),
    },
    cardCompact: {
        backgroundColor: 'transparent',
        paddingVertical: 10,
        paddingHorizontal: 4,
        marginBottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    cardTop: {
        borderWidth: 1,
        borderColor: '#F4C95D33',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rankBadge: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        backgroundColor: '#FFF4E6',
    },
    rankText: {
        fontSize: 18,
        fontWeight: '700',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EEE',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
    },
    muted: {
        color: '#666',
        marginTop: 4,
    },
    stats: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    wins: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FF6700',
    },
    winPct: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F4C95D',
        marginTop: 6,
    },
    mutedSmall: {
        color: '#999',
        fontSize: 12,
    },
    renegBadge: {
        marginLeft: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF6B6B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    renegText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    }
});
