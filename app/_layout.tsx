import { Stack, usePathname } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TextInput } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from '../context/AuthContext';
import { UserPrefsProvider } from '../context/UserPrefsContext';
import { MenuPrefetchProvider } from '../context/MenuPrefetchContext';
import { AIAssistantProvider } from '../context/AIAssistantContext';
import { DisclaimerProvider } from '../context/DisclaimerContext';
import { AIAssistantPanel } from '../components/AIAssistantPanel';
import { OnboardingFlow } from '../components/onboarding/OnboardingFlow';
import { initSentry, addNavigationBreadcrumb } from '../utils/sentry';

// Initialize Sentry on app start
initSentry();

// Lock font sizes to prevent iOS Dynamic Type from scaling text
// Using maxFontSizeMultiplier of 1.0 ensures fonts stay at designed sizes
// This prevents layout issues when users have large accessibility font settings
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.maxFontSizeMultiplier = 1.0;

(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.0;

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
        <DisclaimerProvider>
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
                  {/* Onboarding flow - feature tour then legal disclaimer */}
                  <OnboardingFlow />
                </View>
              </NavigationTracker>
            </AIAssistantProvider>
          </MenuPrefetchProvider>
        </DisclaimerProvider>
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
