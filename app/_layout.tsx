import { Stack } from 'expo-router';
import { UserPrefsProvider } from '../context/UserPrefsContext';

export default function RootLayout() {
  return (
    <UserPrefsProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </UserPrefsProvider>
  );
}
