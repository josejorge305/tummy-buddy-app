import { Stack, usePathname } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from '../context/AuthContext';
import { UserPrefsProvider } from '../context/UserPrefsContext';
import { MenuPrefetchProvider } from '../context/MenuPrefetchContext';
import { AIAssistantProvider } from '../context/AIAssistantContext';
import { AIAssistantPanel } from '../components/AIAssistantPanel';
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
    <AuthProvider>
      <UserPrefsProvider>
        <MenuPrefetchProvider>
          <AIAssistantProvider>
            <NavigationTracker>
              <View style={styles.container}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                />
                {/* AI Assistant Panel - persists across all pages */}
                <AIAssistantPanel />
              </View>
            </NavigationTracker>
          </AIAssistantProvider>
        </MenuPrefetchProvider>
      </UserPrefsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// Wrap with Sentry error boundary
export default Sentry.wrap(RootLayoutContent);
