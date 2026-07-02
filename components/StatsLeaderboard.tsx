import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MemberStats } from '../utils/playerStats';
import { LeaderboardCard } from './LeaderboardCard';

interface StatsLeaderboardProps {
    stats: MemberStats[];
    currentUserId?: string;
}

export function StatsLeaderboard({ stats, currentUserId }: StatsLeaderboardProps) {
    if (stats.length === 0) return null;

    return (
        <View style={styles.wrap}>
            <Text style={styles.heading}>Season Standings</Text>
            {stats.map((entry, idx) => (
                <View
                    key={entry.uid}
                    style={entry.uid === currentUserId ? styles.youRow : undefined}
                >
                    <LeaderboardCard
                        variant="compact"
                        rank={idx + 1}
                        entry={{
                            userId: entry.uid,
                            displayName: entry.displayName,
                            photoURL: entry.photoURL,
                            wins: entry.wins,
                            winPercentage: entry.winPercentage,
                            totalRenegs: entry.renegs,
                            gamesPlayed: entry.gamesPlayed,
                        }}
                    />
                    {entry.winStreak >= 2 && (
                        <Text style={styles.streakBadge}>🔥 {entry.winStreak} win streak</Text>
                    )}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginBottom: 4,
    },
    heading: {
        fontSize: 16,
        fontWeight: '800',
        color: '#013220',
        marginBottom: 8,
    },
    youRow: {
        backgroundColor: '#FFF9F0',
        borderRadius: 10,
        marginBottom: 2,
    },
    streakBadge: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FF6700',
        textAlign: 'right',
        paddingRight: 8,
        paddingBottom: 6,
        marginTop: -4,
    },
});
