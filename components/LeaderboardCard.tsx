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

    return (
        <View className="bg-forest-green rounded-lg p-4 mb-3 flex-row items-center border-2 border-cream">
            {/* Rank Badge */}
            <View className="w-12 items-center">
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
                    <Text className="text-sm text-cream opacity-80">
                        {entry.gamesPlayed} games played
                    </Text>
                </View>
            </View>

            {/* Stats */}
            <View className="items-end">
                <Text className="text-2xl font-bold text-brand-orange">{entry.wins}</Text>
                <Text className="text-xs text-cream opacity-80">wins</Text>
                <Text className="text-sm text-cream mt-1">
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
