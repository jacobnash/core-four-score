import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// Simple emoji icon component for tabs
function TabBarIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 24, color }}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6700', // brand-orange
        tabBarInactiveTintColor: '#F5F5DC', // cream
        tabBarStyle: {
          backgroundColor: '#013220', // forest-green
          borderTopColor: '#FF6700',
          borderTopWidth: 2,
        },
        headerShown: useClientOnlyValue(false, true),
        headerStyle: {
          backgroundColor: '#013220',
        },
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
        }}
      />
    </Tabs>
  );
}
