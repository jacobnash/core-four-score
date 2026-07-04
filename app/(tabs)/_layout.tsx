import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// Simple emoji icon component for tabs
function TabBarIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 24, color }}>{emoji}</Text>;
}

export default function TabLayout() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6700', // brand-orange
        tabBarInactiveTintColor: '#F5F5DC', // cream
        tabBarStyle: {
          backgroundColor: '#013220', // forest-green
          borderTopColor: '#FF6700',
          borderTopWidth: 2,
          height: 70,
          paddingBottom: 12,
        },
        headerShown: useClientOnlyValue(false, true),
        headerStyle: {
          backgroundColor: '#013220',
        },
        headerRight: () => (
          <TouchableOpacity style={{ marginRight: 12 }} onPress={() => router.push('/profile')}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFDFAA', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '700' }}>{user?.displayName?.slice(0, 2).toUpperCase() || 'ME'}</Text>
              </View>
            )}
          </TouchableOpacity>
        ),
        headerTintColor: '#F5F5DC',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Ope'Land",
          tabBarIcon: ({ color }) => <TabBarIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <TabBarIcon emoji="📈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: 'Rules',
          tabBarIcon: ({ color }) => <TabBarIcon emoji="📜" color={color} />,
          href: user ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ color }) => <TabBarIcon emoji="🎲" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{
          title: 'Tournaments',
          tabBarIcon: ({ color }) => <TabBarIcon emoji="🏆" color={color} />,
        }}
      />
    </Tabs>
  );
}
