import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { LoginCard } from '../../components/LoginCard';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const { loading, signInWithGoogle } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF6700" />
          <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
        </View>
      ) : (
        <LoginCard onSignIn={signInWithGoogle} />
      )}
    </View>
  );
}
