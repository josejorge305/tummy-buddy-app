import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DISCLAIMER_VERSION } from '../components/legal/legalDesignSystem';

// Storage keys
const STORAGE_KEYS = {
  featureTourCompleted: '@tb_feature_tour_completed',
  onboardingAcknowledged: '@tb_legal_onboarding_ack',
  onboardingVersion: '@tb_legal_onboarding_version',
  onboardingTimestamp: '@tb_legal_onboarding_ts',
  allergenBannerDismissed: '@tb_legal_allergen_banner_dismissed',
  allergenBannerRestaurants: '@tb_legal_allergen_banner_restaurants', // JSON array of restaurant IDs shown popup
  healthCoachAcknowledged: '@tb_legal_health_coach_ack',
  healthCoachTimestamp: '@tb_legal_health_coach_ts',
} as const;

export interface DisclaimerState {
  isLoading: boolean;
  // Feature Tour (intro carousel)
  hasCompletedFeatureTour: boolean;
  // Onboarding
  hasAcknowledgedOnboarding: boolean;
  onboardingVersion: string | null;
  onboardingTimestamp: number | null;
  // Allergen banner
  isAllergenBannerDismissed: boolean;
  restaurantsShownPopup: string[]; // List of restaurant IDs that have shown the popup
  // Health Coach
  hasAcknowledgedHealthCoach: boolean;
  healthCoachTimestamp: number | null;
}

export interface DisclaimerContextValue extends DisclaimerState {
  // Feature Tour
  completeFeatureTour: () => Promise<void>;
  shouldShowFeatureTour: () => boolean;

  // Onboarding acknowledgment
  acknowledgeOnboarding: () => Promise<void>;
  shouldShowOnboardingModal: () => boolean;

  // Allergen banner
  dismissAllergenBanner: () => Promise<void>;
  resetAllergenBanner: () => Promise<void>;

  // Restaurant-specific allergen popup
  hasShownRestaurantPopup: (restaurantId: string) => boolean;
  markRestaurantPopupShown: (restaurantId: string) => Promise<void>;
  shouldShowRestaurantPopup: (restaurantId: string) => boolean;

  // Health Coach acknowledgment
  acknowledgeHealthCoach: () => Promise<void>;
  shouldShowHealthCoachModal: () => boolean;

  // Reset all (for settings/debug)
  resetAllAcknowledgments: () => Promise<void>;
}

const DisclaimerContext = createContext<DisclaimerContextValue | null>(null);

export function DisclaimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DisclaimerState>({
    isLoading: true,
    hasCompletedFeatureTour: false,
    hasAcknowledgedOnboarding: false,
    onboardingVersion: null,
    onboardingTimestamp: null,
    isAllergenBannerDismissed: false,
    restaurantsShownPopup: [],
    hasAcknowledgedHealthCoach: false,
    healthCoachTimestamp: null,
  });

  // Load stored state on mount
  useEffect(() => {
    loadStoredState();
  }, []);

  const loadStoredState = async () => {
    try {
      const [
        featureTourCompleted,
        onboardingAck,
        onboardingVersion,
        onboardingTs,
        bannerDismissed,
        restaurantsJson,
        healthCoachAck,
        healthCoachTs,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.featureTourCompleted),
        AsyncStorage.getItem(STORAGE_KEYS.onboardingAcknowledged),
        AsyncStorage.getItem(STORAGE_KEYS.onboardingVersion),
        AsyncStorage.getItem(STORAGE_KEYS.onboardingTimestamp),
        AsyncStorage.getItem(STORAGE_KEYS.allergenBannerDismissed),
        AsyncStorage.getItem(STORAGE_KEYS.allergenBannerRestaurants),
        AsyncStorage.getItem(STORAGE_KEYS.healthCoachAcknowledged),
        AsyncStorage.getItem(STORAGE_KEYS.healthCoachTimestamp),
      ]);

      // Parse restaurants array
      let restaurants: string[] = [];
      if (restaurantsJson) {
        try {
          restaurants = JSON.parse(restaurantsJson);
        } catch {
          restaurants = [];
        }
      }

      // Check if onboarding version matches current version
      const hasValidOnboarding = onboardingAck === 'true' && onboardingVersion === DISCLAIMER_VERSION;

      setState({
        isLoading: false,
        hasCompletedFeatureTour: featureTourCompleted === 'true',
        hasAcknowledgedOnboarding: hasValidOnboarding,
        onboardingVersion: onboardingVersion,
        onboardingTimestamp: onboardingTs ? parseInt(onboardingTs, 10) : null,
        isAllergenBannerDismissed: bannerDismissed === 'true',
        restaurantsShownPopup: restaurants,
        hasAcknowledgedHealthCoach: healthCoachAck === 'true',
        healthCoachTimestamp: healthCoachTs ? parseInt(healthCoachTs, 10) : null,
      });
    } catch (e) {
      if (__DEV__) console.error('[DisclaimerContext] Error loading state:', e);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // ========== Feature Tour ==========
  const completeFeatureTour = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.featureTourCompleted, 'true');
      setState(prev => ({ ...prev, hasCompletedFeatureTour: true }));
      if (__DEV__) console.log('[DisclaimerContext] Feature tour completed');
    } catch (e) {
      if (__DEV__) console.error('[DisclaimerContext] Error completing feature tour:', e);
    }
  }, []);

  const shouldShowFeatureTour = useCallback((): boolean => {
    if (state.isLoading) return false;
    return !state.hasCompletedFeatureTour;
  }, [state.isLoading, state.hasCompletedFeatureTour]);

  // ========== Onboarding ==========
  const acknowledgeOnboarding = useCallback(async () => {
    const timestamp = Date.now();
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.onboardingAcknowledged, 'true'),
        AsyncStorage.setItem(STORAGE_KEYS.onboardingVersion, DISCLAIMER_VERSION),
        AsyncStorage.setItem(STORAGE_KEYS.onboardingTimestamp, timestamp.toString()),
      ]);
      setState(prev => ({
        ...prev,
        hasAcknowledgedOnboarding: true,
        onboardingVersion: DISCLAIMER_VERSION,
        onboardingTimestamp: timestamp,
      }));
      if (__DEV__) console.log('[DisclaimerContext] Onboarding acknowledged');
    } catch (e) {
      if (__DEV__) console.error('[DisclaimerContext] Error acknowledging onboarding:', e);
    }
  }, []);

  const shouldShowOnboardingModal = useCallback((): boolean => {
    // Show if not loading and either:
    // 1. Never acknowledged, or
    // 2. Version mismatch (disclaimer text updated)
    if (state.isLoading) return false;
    if (!state.hasAcknowledgedOnboarding) return true;
    if (state.onboardingVersion !== DISCLAIMER_VERSION) return true;
    return false;
  }, [state.isLoading, state.hasAcknowledgedOnboarding, state.onboardingVersion]);

  // ========== Allergen Banner ==========
  const dismissAllergenBanner = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.allergenBannerDismissed, 'true');
      setState(prev => ({ ...prev, isAllergenBannerDismissed: true }));
      if (__DEV__) console.log('[DisclaimerContext] Allergen banner dismissed');
    } catch (e) {
      if (__DEV__) console.error('[DisclaimerContext] Error dismissing banner:', e);
    }
  }, []);

  const resetAllergenBanner = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.allergenBannerDismissed);
      setState(prev => ({ ...prev, isAllergenBannerDismissed: false }));
    } catch (e) {
      if (__DEV__) console.error('[DisclaimerContext] Error resetting banner:', e);
    }
  }, []);

  // ========== Restaurant Popup ==========
  const hasShownRestaurantPopup = useCallback((restaurantId: string): boolean => {
    return state.restaurantsShownPopup.includes(restaurantId);
  }, [state.restaurantsShownPopup]);

  const markRestaurantPopupShown = useCallback(async (restaurantId: string) => {
    if (state.restaurantsShownPopup.includes(restaurantId)) return;

    const updated = [...state.restaurantsShownPopup, restaurantId];
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.allergenBannerRestaurants, JSON.stringify(updated));
      setState(prev => ({ ...prev, restaurantsShownPopup: updated }));
      if (__DEV__) console.log(`[DisclaimerContext] Marked restaurant popup shown: ${restaurantId}`);
    } catch (e) {
      if (__DEV__) console.error('[DisclaimerContext] Error marking restaurant popup:', e);
    }
  }, [state.restaurantsShownPopup]);

  const shouldShowRestaurantPopup = useCallback((restaurantId: string): boolean => {
    // Show popup if:
    // 1. Not loading
    // 2. Onboarding is acknowledged (don't show both at once)
    // 3. Haven't shown for this restaurant before
    if (state.isLoading) return false;
    if (!state.hasAcknowledgedOnboarding) return false;
    return !state.restaurantsShownPopup.includes(restaurantId);
  }, [state.isLoading, state.hasAcknowledgedOnboarding, state.restaurantsShownPopup]);

  // ========== Health Coach ==========
  const acknowledgeHealthCoach = useCallback(async () => {
    const timestamp = Date.now();
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.healthCoachAcknowledged, 'true'),
        AsyncStorage.setItem(STORAGE_KEYS.healthCoachTimestamp, timestamp.toString()),
      ]);
      setState(prev => ({
        ...prev,
        hasAcknowledgedHealthCoach: true,
        healthCoachTimestamp: timestamp,
      }));
      if (__DEV__) console.log('[DisclaimerContext] Health Coach acknowledged');
    } catch (e) {
      if (__DEV__) console.error('[DisclaimerContext] Error acknowledging Health Coach:', e);
    }
  }, []);

  const shouldShowHealthCoachModal = useCallback((): boolean => {
    if (state.isLoading) return false;
    return !state.hasAcknowledgedHealthCoach;
  }, [state.isLoading, state.hasAcknowledgedHealthCoach]);

  // ========== Reset All ==========
  const resetAllAcknowledgments = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.featureTourCompleted),
        AsyncStorage.removeItem(STORAGE_KEYS.onboardingAcknowledged),
        AsyncStorage.removeItem(STORAGE_KEYS.onboardingVersion),
        AsyncStorage.removeItem(STORAGE_KEYS.onboardingTimestamp),
        AsyncStorage.removeItem(STORAGE_KEYS.allergenBannerDismissed),
        AsyncStorage.removeItem(STORAGE_KEYS.allergenBannerRestaurants),
        AsyncStorage.removeItem(STORAGE_KEYS.healthCoachAcknowledged),
        AsyncStorage.removeItem(STORAGE_KEYS.healthCoachTimestamp),
      ]);
      setState({
        isLoading: false,
        hasCompletedFeatureTour: false,
        hasAcknowledgedOnboarding: false,
        onboardingVersion: null,
        onboardingTimestamp: null,
        isAllergenBannerDismissed: false,
        restaurantsShownPopup: [],
        hasAcknowledgedHealthCoach: false,
        healthCoachTimestamp: null,
      });
      if (__DEV__) console.log('[DisclaimerContext] All acknowledgments reset');
    } catch (e) {
      if (__DEV__) console.error('[DisclaimerContext] Error resetting acknowledgments:', e);
    }
  }, []);

  return (
    <DisclaimerContext.Provider
      value={{
        ...state,
        completeFeatureTour,
        shouldShowFeatureTour,
        acknowledgeOnboarding,
        shouldShowOnboardingModal,
        dismissAllergenBanner,
        resetAllergenBanner,
        hasShownRestaurantPopup,
        markRestaurantPopupShown,
        shouldShowRestaurantPopup,
        acknowledgeHealthCoach,
        shouldShowHealthCoachModal,
        resetAllAcknowledgments,
      }}
    >
      {children}
    </DisclaimerContext.Provider>
  );
}

export function useDisclaimer() {
  const context = useContext(DisclaimerContext);
  if (!context) {
    throw new Error('useDisclaimer must be used within DisclaimerProvider');
  }
  return context;
}

export default DisclaimerContext;
