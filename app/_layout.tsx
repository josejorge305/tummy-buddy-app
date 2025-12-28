import { Stack, usePathname } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { UserPrefsProvider } from '../context/UserPrefsContext';
import { MenuPrefetchProvider } from '../context/MenuPrefetchContext';
import * as Sentry from '@sentry/react-native';
import { initSentry, addNavigationBreadcrumb } from '../utils/sentry';

// Initialize Sentry on app start
initSentry();

// Navigation tracking component
function NavigationTracker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (previousPathname.current && previousPathname.current !== pathname) {
      addNavigationBreadcrumb(previousPathname.current, pathname);
    }
    previousPathname.current = pathname;
  }, [pathname]);

  return <>{children}</>;
}

function RootLayoutContent() {
  return (
    <UserPrefsProvider>
      <MenuPrefetchProvider>
        <NavigationTracker>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
        </NavigationTracker>
      </MenuPrefetchProvider>
    </UserPrefsProvider>
  );
}

// Wrap with Sentry error boundary
export default Sentry.wrap(RootLayoutContent);
