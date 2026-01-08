import React from 'react';
import { Image, Text, View } from 'react-native';
import { LeaderboardEntry } from '../types';

interface LeaderboardCardProps {
    entry: LeaderboardEntry;
    rank: number;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ entry, rank }) => {
    const getRankBadge = () => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const cardAccent = rank === 1
        ? 'border-2 border-gold/60 shadow-card-strong'
        : 'border border-cream/30 shadow-card';
    const badgeBg = rank <= 3 ? 'bg-gold/30 border-gold/70' : 'bg-forest-green border-cream/40';

    return (
        <View className={`card mb-3 flex-row items-center ${cardAccent}`}>
            {/* Rank Badge */}
            <View className={`w-12 h-12 items-center justify-center rounded-xl border ${badgeBg}`}>
                <Text className="text-xl font-bold text-cream">{getRankBadge()}</Text>
            </View>

            {/* Player Info */}
            <View className="flex-1 flex-row items-center">
                {entry.photoURL && (
                    <Image
                        source={{ uri: entry.photoURL }}
                        className="w-12 h-12 rounded-full mr-3"
                    />
                )}
                <View className="flex-1">
                    <Text className="text-lg font-bold text-cream">{entry.displayName}</Text>
                    <Text className="text-sm text-cream/80">{entry.gamesPlayed} games played</Text>
                    <View className="mt-1 flex-row gap-2">
                        <View className="chip">
                            <Text className="text-xs text-gold font-semibold">W {entry.wins}</Text>
                        </View>
                        <View className="chip-ghost">
                            <Text className="text-xs text-cream/80">GP {entry.gamesPlayed}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Stats */}
            <View className="items-end">
                <Text className="text-2xl font-bold text-brand-orange">{entry.wins}</Text>
                <Text className="text-xs text-cream opacity-80">wins</Text>
                <Text className="text-sm text-gold mt-1 font-semibold">
                    {entry.winPercentage.toFixed(1)}%
                </Text>
            </View>

            {/* Renegs (Wall of Shame indicator) */}
            {entry.totalRenegs > 0 && (
                <View className="ml-3 bg-red-600 rounded-full w-8 h-8 items-center justify-center">
                    <Text className="text-cream font-bold text-xs">{entry.totalRenegs}</Text>
                </View>
            )}
        </View>
    );
};
