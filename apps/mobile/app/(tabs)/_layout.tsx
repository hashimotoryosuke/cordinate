import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const colors = {
  primary: '#1A1A1A',
  accent: '#C9A84C',
  background: '#FAFAFA',
  border: '#E4E4E7',
  mutedText: '#71717A',
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: colors.primary,
        },
      }}
    >
      <Tabs.Screen
        name="closet"
        options={{
          title: 'クローゼット',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
