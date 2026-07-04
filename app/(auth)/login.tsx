import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { LoginCard } from '../../components/LoginCard';
import { DEV_PLAYERS, MOCK_DEV_PLAYERS } from '../../constants/devConfig';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizePostLoginPath } from '../../utils/tournamentInvite';

export default function LoginScreen() {
  const { loading, signInWithGoogle, signInAsDevUser, isEmulator, user } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  useEffect(() => {
    if (loading || !user) return;
    const dest = sanitizePostLoginPath(typeof returnTo === 'string' ? returnTo : null);
    if (dest) {
      router.replace(dest as '/join/[id]');
    } else {
      router.replace('/(tabs)');
    }
  }, [user, loading, returnTo]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF6700" />
          <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
        </View>
      ) : (
        <LoginCard
          onSignIn={signInWithGoogle}
          isEmulator={isEmulator}
          devPlayers={isEmulator ? [...DEV_PLAYERS] : []}
          mockDevPlayers={isEmulator ? [...MOCK_DEV_PLAYERS] : []}
          onDevSignIn={signInAsDevUser}
        />
      )}
    </View>
  );
}
