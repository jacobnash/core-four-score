import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
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
          title: 'The Lodge',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Shake the Hat',
          tabBarIcon: ({ color }) => <TabBarIcon name="random" color={color} />,
        }}
      />
    </Tabs>
  );
}
