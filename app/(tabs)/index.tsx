import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
      <View className="flex-1 bg-forest-green items-center justify-center">
        <ActivityIndicator size="large" color="#FF6700" />
        <Text className="text-cream mt-4 text-lg">Loading...</Text>
      </View>
    );
  }

  // Not Authenticated
  if (!user) {
    return (
      <View className="flex-1 bg-forest-green items-center justify-center p-6">
        <Text className="text-4xl font-bold text-cream mb-4 text-center">
          🦌 The Core Four Score
        </Text>
        <Text className="text-xl text-cream mb-8 text-center">
          Deer Camp Edition
        </Text>
        <Text className="text-base text-cream opacity-80 mb-8 text-center">
          Track your Euchre glory and shame
        </Text>
        <Button
          title="Sign In with Google"
          onPress={signInWithGoogle}
          size="lg"
          variant="primary"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-forest-green">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6700"
          />
        }
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-cream mb-2">
            🦌 The Lodge
          </Text>
          <Text className="text-base text-cream opacity-80">
            Welcome back, {user.displayName}!
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Button
            title="🎲 START NEW GAME"
            onPress={() => {
              // TODO: Navigate to game screen
              console.log('Start new game');
            }}
            size="lg"
            variant="primary"
            className="mb-3"
          />
          <Button
            title="🎩 Shake the Hat"
            onPress={() => router.push('/two')}
            size="md"
            variant="secondary"
          />
        </View>

        {/* Leaderboard */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-cream mb-4">
            📊 Leaderboard
          </Text>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#FF6700" />
          ) : leaderboard.length === 0 ? (
            <View className="bg-forest-green border-2 border-cream rounded-lg p-6 items-center">
              <Text className="text-cream text-center text-lg">
                No games played yet!
              </Text>
              <Text className="text-cream opacity-80 text-center mt-2">
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
          className="mb-8"
        />
      </ScrollView>
    </View>
  );
}
