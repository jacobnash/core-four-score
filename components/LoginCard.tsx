import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Button } from './Button';

interface LoginCardProps {
  onSignIn: () => void;
  loading?: boolean;
}

export function LoginCard({ onSignIn, loading = false }: LoginCardProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.centered}>
          <View style={styles.authCard}>
            <Text style={styles.eyebrow}>Deer Camp Edition</Text>
            <Text style={styles.titleLg}>🦌 The Core Four Score</Text>
            <Text style={styles.body}>Track your Euchre glory and shame.</Text>
            <View style={{ height: 12 }} />
            <Button
              title="Sign In with Google"
              onPress={onSignIn}
              size="lg"
              variant="primary"
              disabled={loading}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  authCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleLg: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
});
