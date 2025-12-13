import { Stack } from 'expo-router';
import { UserPrefsProvider } from '../context/UserPrefsContext';
import { MenuPrefetchProvider } from '../context/MenuPrefetchContext';

export default function RootLayout() {
  return (
    <UserPrefsProvider>
      <MenuPrefetchProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </MenuPrefetchProvider>
    </UserPrefsProvider>
  );
}
