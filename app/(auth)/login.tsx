import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { LoginCard } from '../../components/LoginCard';
import { DEV_PLAYERS } from '../../constants/devConfig';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const { loading, signInWithGoogle, signInAsDevUser, isEmulator } = useAuth();

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
          onDevSignIn={signInAsDevUser}
        />
      )}
    </View>
  );
}
