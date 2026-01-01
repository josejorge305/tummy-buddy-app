import { Stack, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { UserPrefsProvider } from '../context/UserPrefsContext';
import { MenuPrefetchProvider } from '../context/MenuPrefetchContext';
import * as Sentry from '@sentry/react-native';
import { initSentry, addNavigationBreadcrumb } from '../utils/sentry';

// Initialize Sentry on app start
initSentry();

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Chef hat icon for the floating button
function ChefHatIcon({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4C10.35 4 9 5.35 9 7C9 7.35 9.07 7.69 9.19 8H6C4.35 8 3 9.35 3 11C3 12.3 3.84 13.41 5 13.82V18C5 19.1 5.9 20 7 20H17C18.1 20 19 19.1 19 18V13.82C20.16 13.41 21 12.3 21 11C21 9.35 19.65 8 18 8H14.81C14.93 7.69 15 7.35 15 7C15 5.35 13.65 4 12 4Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M9 16H15"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Floating Ask AI Button component
function AskAIButton() {
  const router = useRouter();
  const pathname = usePathname();
  const scale = useSharedValue(1);

  // All hooks must be called before any conditional returns
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );
    router.push('/ai-chat');
  };

  // Hide on the AI chat screen itself
  if (pathname === '/ai-chat') {
    return null;
  }

  return (
    <AnimatedTouchable
      style={[styles.askAIButton, animatedStyle]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#00D4AA', '#00B4D8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.askAIGradient}
      >
        <ChefHatIcon size={26} color="#FFFFFF" />
      </LinearGradient>
    </AnimatedTouchable>
  );
}

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
          <View style={styles.container}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <AskAIButton />
          </View>
        </NavigationTracker>
      </MenuPrefetchProvider>
    </UserPrefsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  askAIButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  askAIGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Wrap with Sentry error boundary
export default Sentry.wrap(RootLayoutContent);
