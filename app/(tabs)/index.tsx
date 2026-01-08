import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native';
import { Button } from '../../components/Button';
import { LeaderboardCard } from '../../components/LeaderboardCard';
import { useAuth } from '../../contexts/AuthContext';
import { leaderboardService } from '../../services/firestore';
import { LeaderboardEntry } from '../../types';

export default function HomeScreen() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // TODO: Replace with actual tournament ID
  const TOURNAMENT_ID = 'default-tournament';

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await leaderboardService.getLeaderboard(TOURNAMENT_ID);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      loadLeaderboard();
    }
  }, [user]);

  // Auth Loading State
  if (authLoading) {
    return (
      <View className="flex-1 section-bg items-center justify-center">
        <ActivityIndicator size="large" color="#FF6700" />
        <Text className="text-cream mt-4 text-lg">Loading...</Text>
      </View>
    );
  }

  // Not Authenticated
  if (!user) {
    return (
      <View className="flex-1 section-bg overflow-hidden">
        <View pointerEvents="none" className="absolute inset-0">
          <View className="absolute -right-16 -top-16 w-52 h-52 rounded-full bg-brand-orange/18" />
          <View className="absolute -left-20 bottom-8 w-72 h-72 rounded-full bg-cream/10" />
        </View>

        <View className="flex-1 items-center justify-center p-6">
          <View className="w-full card-strong p-6 shadow-card-strong">
            <Text className="eyebrow text-center mb-2">Deer Camp Edition</Text>
            <Text className="title-lg text-center mb-3">🦌 The Core Four Score</Text>
            <Text className="body text-center mb-6">
              Track your Euchre glory and shame.
            </Text>
            <Button
              title="Sign In with Google"
              onPress={signInWithGoogle}
              size="lg"
              variant="primary"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 section-bg overflow-hidden">
      <View pointerEvents="none" className="absolute inset-0">
        <View className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-brand-orange/18" />
        <View className="absolute -left-16 bottom-10 w-64 h-64 rounded-full bg-cream/10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 64, gap: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6700"
          />
        }
      >
        {/* Header */}
        <View className="card-strong p-5 shadow-card-strong">
          <View className="flex-row justify-between items-start gap-4">
            <View className="flex-1 gap-1">
              <Text className="eyebrow">Deer Camp Edition</Text>
              <Text className="title-lg mb-1">🦌 The Lodge</Text>
              <Text className="body-dim">
                Welcome back, {user.displayName}!
              </Text>
            </View>

            <View className="items-end">
              <View className="flex-row items-center gap-3 glass-overlay rounded-pill px-3 py-2 shadow-card">
                {user.photoURL ? (
                  <Image
                    source={{ uri: user.photoURL }}
                    className="w-10 h-10 rounded-full border border-gold/40"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-gold/20 border border-gold/40 items-center justify-center">
                    <Text className="text-sm font-bold text-cream">
                      {user.displayName?.slice(0, 2)?.toUpperCase() || 'YOU'}
                    </Text>
                  </View>
                )}
                <View className="items-end">
                  <Text className="text-sm font-semibold text-cream">{user.displayName}</Text>
                  <Text className="text-xs text-cream/70">{user.email}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="card p-4 gap-3">
          <Text className="eyebrow">Jump into the action</Text>
          <Button
            title="🎲 START NEW GAME"
            onPress={() => router.push('/game')}
            size="lg"
            variant="primary"
          />
          <Button
            title="🎩 Shake the Hat"
            onPress={() => router.push('/shake-the-hat')}
            size="md"
            variant="secondary"
          />
        </View>

        {/* Leaderboard */}
        <View className="card p-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="title-md">📊 Leaderboard</Text>
            <Text className="text-xs text-cream/70">Auto-refresh when you pull</Text>
          </View>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#FF6700" />
          ) : leaderboard.length === 0 ? (
            <View className="card-plain p-6 items-center">
              <Text className="text-cream text-center text-lg">
                No games played yet!
              </Text>
              <Text className="text-cream/80 text-center mt-2">
                Start a game to see stats
              </Text>
            </View>
          ) : (
            leaderboard.map((entry, index) => (
              <LeaderboardCard
                key={entry.userId}
                entry={entry}
                rank={index + 1}
              />
            ))
          )}
        </View>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          onPress={signOut}
          variant="danger"
          size="sm"
        />
      </ScrollView>
    </View>
  );
}
