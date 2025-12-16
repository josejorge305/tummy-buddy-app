import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const BG = '#020617';
const TEAL = '#14b8a6';
const CARD_BG = '#0f172a';
const TEXT_PRIMARY = '#f9fafb';
const TEXT_SECONDARY = '#9ca3af';
const TEXT_MUTED = '#6b7280';

const LAST_RESTAURANT_KEY = '@restaurant_ai_last_restaurant';

type CachedRestaurant = {
  placeId: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  visitedAt: number;
};

export default function RestaurantTab() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasNoCachedRestaurant, setHasNoCachedRestaurant] = useState(false);
  const hasNavigated = useRef(false);

  // Load cached restaurant on focus and auto-navigate if exists
  useFocusEffect(
    useCallback(() => {
      // Reset navigation flag when screen gains focus
      hasNavigated.current = false;
      loadAndNavigate();
    }, [])
  );

  const loadAndNavigate = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(LAST_RESTAURANT_KEY);

      if (stored && !hasNavigated.current) {
        const parsed = JSON.parse(stored) as CachedRestaurant;
        hasNavigated.current = true;

        // Automatically navigate to the restaurant page
        router.push({
          pathname: '/restaurant',
          params: {
            placeId: parsed.placeId,
            restaurantName: parsed.name,
            address: parsed.address,
            lat: parsed.lat?.toString() || '',
            lng: parsed.lng?.toString() || '',
          },
        });
      } else if (!stored) {
        // No cached restaurant - show empty state
        setHasNoCachedRestaurant(true);
      }
    } catch (error) {
      console.error('Failed to load cached restaurant:', error);
      setHasNoCachedRestaurant(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToHome = () => {
    router.replace('/(tabs)');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </SafeAreaView>
    );
  }

  // No cached restaurant - show message to search from Home
  if (hasNoCachedRestaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="restaurant-outline" size={64} color={TEXT_MUTED} />
          </View>
          <Text style={styles.emptyTitle}>No Restaurant Selected</Text>

          {/* Search prompt box */}
          <View style={styles.searchPromptBox}>
            <Ionicons name="search-outline" size={20} color={TEAL} />
            <Text style={styles.searchPromptText}>
              Search a restaurant menu from the Home screen
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.goHomeButton, pressed && { opacity: 0.8 }]}
            onPress={handleGoToHome}
          >
            <Ionicons name="home-outline" size={20} color="#fff" />
            <Text style={styles.goHomeButtonText}>Go to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // This shouldn't normally be visible because we auto-navigate
  // But show a fallback loading state just in case
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading restaurant...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 20,
    textAlign: 'center',
  },
  searchPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  searchPromptText: {
    fontSize: 15,
    color: '#d1d5db',
    flex: 1,
    lineHeight: 22,
  },
  goHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: TEAL,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  goHomeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
