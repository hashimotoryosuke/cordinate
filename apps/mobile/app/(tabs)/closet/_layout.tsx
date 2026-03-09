import { Stack } from 'expo-router'

const colors = {
  primary: '#1A1A1A',
  background: '#FAFAFA',
  border: '#E4E4E7',
}

export default function ClosetLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: colors.primary,
        },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ headerShown: false }} />
    </Stack>
  )
}
