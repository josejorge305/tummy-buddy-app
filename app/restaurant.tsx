import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  AnalyzeDishResponse,
  BatchDishInput,
  analyzeDish,
  fetchMenuFast,
  fetchMenuWithRetry,
  getBatchStatus,
  getMealsForDate,
  logMeal,
  pollBatchUntilComplete,
  pollOrgansStatus,
  priorityAnalysis,
  startBatchAnalysis,
  LoggedMeal,
} from '../api/api';
import { fetchPlaceDetails } from '../api/places';
import { useMenuPrefetch } from '../context/MenuPrefetchContext';
import { useUserPrefs } from '../context/UserPrefsContext';
import { useSetAIContext, useAIAssistant, MenuItem } from '../context/AIAssistantContext';
import { useDisclaimer } from '../context/DisclaimerContext';
import { AllergenBanner, RestaurantAllergenPopup } from '../components/legal';
import { buildDishViewModel } from '../utils/dishViewModel';
import PortionSheet, { PortionData, CourseType } from '../components/PortionSheet';
import { MealLogModal, MealLogData } from '../components/MealLogModal';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LAST_RESTAURANT_KEY = '@restaurant_ai_last_restaurant';

const BG = '#020617';
const TEAL = '#14b8a6';
const ORANGE = '#f97316';
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
const USER_SELECTED_ALLERGENS: string[] = []; // TODO: wire from user profile/preferences
const PREFETCH_ANALYSIS_LIMIT = 0;

// Design system colors - teal-only palette for severity (matching dish.tsx redesign)
const COLORS = {
  brandTeal: '#14b8a6', // Primary teal
  brandTealLight: '#2dd4bf', // Lighter teal variant
  neutral: '#6b7280', // Gray
  calories: '#f97316', // Orange for calories only
  protein: '#3b82f6', // Blue
  carbs: '#a855f7', // Purple
  fat: '#eab308', // Yellow
  cardBg: '#1e293b', // Slate 800
  cardBorder: 'rgba(255,255,255,0.08)',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  tagBg: 'rgba(30, 41, 59, 0.5)',
  tagBorder: '#475569',
};

// Dish analysis loading messages
const ANALYSIS_LOADING_MESSAGES = [
  { icon: 'search-outline', text: 'Finding recipe match...' },
  { icon: 'list-outline', text: 'Identifying ingredients...' },
  { icon: 'warning-outline', text: 'Scanning for allergens...' },
  { icon: 'leaf-outline', text: 'Checking FODMAP levels...' },
  { icon: 'nutrition-outline', text: 'Calculating nutrition...' },
  { icon: 'fitness-outline', text: 'Analyzing body impact...' },
  { icon: 'sparkles-outline', text: 'Finalizing analysis...' },
];

// Inline dish analysis loading component
function DishAnalysisLoader({ dishName }: { dishName: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  // Pulsing animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Cycle through messages every 3 seconds
  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ANALYSIS_LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(messageTimer);
  }, []);

  // Track elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentMessage = ANALYSIS_LOADING_MESSAGES[messageIndex];
  const showLongWait = elapsedSeconds > 20;

  return (
    <View style={analysisLoaderStyles.container}>
      {/* Loader row */}
      <View style={analysisLoaderStyles.loaderRow}>
        <View style={analysisLoaderStyles.spinnerWrapper}>
          <Animated.View style={[analysisLoaderStyles.spinnerGlow, { opacity: pulseAnim }]} />
          <ActivityIndicator size="small" color={TEAL} />
        </View>
        <View style={analysisLoaderStyles.messageArea}>
          <View style={analysisLoaderStyles.messageRow}>
            <Ionicons name={currentMessage.icon as any} size={14} color={TEAL} />
            <Text style={analysisLoaderStyles.messageText}>{currentMessage.text}</Text>
          </View>
          {elapsedSeconds > 5 && (
            <Text style={analysisLoaderStyles.elapsedText}>{elapsedSeconds}s</Text>
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View style={analysisLoaderStyles.progressBar}>
        <Animated.View
          style={[
            analysisLoaderStyles.progressFill,
            {
              width: `${Math.min(
                ((messageIndex + 1) / ANALYSIS_LOADING_MESSAGES.length) * 100,
                95
              )}%`,
            },
          ]}
        />
      </View>

      {/* Long wait message */}
      {showLongWait && (
        <Text style={analysisLoaderStyles.longWaitText}>
          This dish requires deeper analysis - hang tight!
        </Text>
      )}
    </View>
  );
}

// Styles for dish analysis loader
const analysisLoaderStyles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  spinnerWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  spinnerGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 184, 166, 0.3)',
  },
  messageArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  elapsedText: {
    fontSize: 12,
    color: '#64748b',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: TEAL,
    borderRadius: 2,
  },
  longWaitText: {
    marginTop: 12,
    fontSize: 13,
    color: '#f59e0b',
    fontStyle: 'italic',
  },
});

// Sample menu items for discovery animation
const DISCOVERY_MENU_ITEMS = [
  { name: 'House Special Tacos', category: 'Tacos' },
  { name: 'Grilled Chicken Burrito', category: 'Burritos' },
  { name: 'Carne Asada Fajitas', category: 'Fajitas' },
  { name: 'Vegetable Quesadilla', category: 'Appetizers' },
  { name: 'Fresh Horchata', category: 'Drinks' },
  { name: 'Churros con Chocolate', category: 'Desserts' },
  { name: 'Guacamole Fresco', category: 'Sides' },
  { name: 'Queso Fundido', category: 'Appetizers' },
  { name: 'Fish Tacos', category: 'Tacos' },
  { name: 'Veggie Burrito Bowl', category: 'Bowls' },
];

// Loading phases for the progress indicator
const LOADING_PHASES = [
  { name: 'Locating', description: 'Finding menu source' },
  { name: 'Reading', description: 'Extracting dishes' },
  { name: 'Analyzing', description: 'Mapping ingredients' },
  { name: 'Optimizing', description: 'Building your experience' },
];

// Animated loading screen component
function MenuLoadingScreen({
  restaurantName,
  restaurantAddress,
  heroImageUrl,
}: {
  restaurantName?: string;
  restaurantAddress?: string;
  heroImageUrl?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [discoveredItems, setDiscoveredItems] = useState<typeof DISCOVERY_MENU_ITEMS>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Pulsing animation for the live indicator dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Spinning animation for the scanner
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [spinAnim]);

  // Progress animation (0-100 over ~20 seconds)
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 0.5;
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, []);

  // Update phase based on progress
  useEffect(() => {
    const newPhase = Math.min(Math.floor(progress / 25), 3);
    setCurrentPhase(newPhase);
  }, [progress]);

  // Discover items progressively
  useEffect(() => {
    const itemInterval = setInterval(() => {
      setDiscoveredItems((prev) => {
        if (prev.length >= DISCOVERY_MENU_ITEMS.length) return prev;
        return [...prev, DISCOVERY_MENU_ITEMS[prev.length]];
      });
    }, 1200);

    return () => clearInterval(itemInterval);
  }, []);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Benefits list
  const benefits = [
    { title: 'Smart Recommendations', desc: 'Dishes matched to your preferences' },
    { title: 'Ingredient Breakdown', desc: 'Full lists for allergies & diets' },
    { title: 'Instant Access', desc: 'Fast loading for all future visits' },
  ];

  return (
    <View style={loadingStyles.container}>
      {/* Subtle gradient overlay */}
      <View style={loadingStyles.gradientOverlay} />

      <ScrollView
        style={loadingStyles.scrollView}
        contentContainerStyle={loadingStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView>
          {/* Pioneer Badge */}
          <View style={loadingStyles.pioneerBadge}>
            <View style={loadingStyles.pioneerIconContainer}>
              <Ionicons name="trophy-outline" size={24} color="#d4af37" />
            </View>
            <View style={loadingStyles.pioneerTextContainer}>
              <Text style={loadingStyles.pioneerTitle}>YOU&apos;RE A PIONEER</Text>
              <Text style={loadingStyles.pioneerDescription}>
                First to unlock this restaurant. This takes about 2 minutes once — after you, it
                loads instantly for everyone.
              </Text>
            </View>
          </View>

          {/* Restaurant Card */}
          <View style={loadingStyles.restaurantCard}>
            {heroImageUrl ? (
              <ImageBackground
                source={{ uri: heroImageUrl }}
                style={loadingStyles.heroImage}
                imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
              >
                <View style={loadingStyles.heroOverlay}>
                  <Text style={loadingStyles.heroName} numberOfLines={2}>
                    {restaurantName || 'Loading restaurant...'}
                  </Text>
                  {restaurantAddress ? (
                    <Text style={loadingStyles.heroAddress} numberOfLines={1}>
                      {restaurantAddress}
                    </Text>
                  ) : null}
                </View>
              </ImageBackground>
            ) : (
              <View style={loadingStyles.heroPlaceholder}>
                <Ionicons name="restaurant" size={28} color={TEAL} />
                <Text style={loadingStyles.heroNameNoImage} numberOfLines={2}>
                  {restaurantName || 'Loading restaurant...'}
                </Text>
                {restaurantAddress ? (
                  <Text style={loadingStyles.heroAddressNoImage} numberOfLines={1}>
                    {restaurantAddress}
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          {/* Live Discovery Feed */}
          <View style={loadingStyles.discoveryFeed}>
            <View style={loadingStyles.discoveryHeader}>
              <View style={loadingStyles.discoveryHeaderLeft}>
                <Animated.View style={[loadingStyles.liveDot, { opacity: pulseAnim }]} />
                <Text style={loadingStyles.discoveryTitle}>Discovering menu</Text>
              </View>
              <Text style={loadingStyles.itemCount}>{discoveredItems.length} items found</Text>
            </View>

            {/* Scrolling items list */}
            <View style={loadingStyles.itemsList}>
              {/* Fade overlay at top */}
              <View style={loadingStyles.fadeOverlay} />

              {discoveredItems.slice(-5).map((item, index) => {
                const isLatest = index === discoveredItems.slice(-5).length - 1;
                const opacity = 1 - (discoveredItems.slice(-5).length - 1 - index) * 0.2;
                return (
                  <View
                    key={item.name}
                    style={[
                      loadingStyles.discoveredItem,
                      isLatest && loadingStyles.discoveredItemLatest,
                      { opacity },
                    ]}
                  >
                    <Text style={loadingStyles.itemName}>{item.name}</Text>
                    <Text style={loadingStyles.itemCategory}>{item.category}</Text>
                  </View>
                );
              })}

              {/* Scanning indicator */}
              {discoveredItems.length < DISCOVERY_MENU_ITEMS.length && (
                <View style={loadingStyles.scanningRow}>
                  <Animated.View
                    style={[
                      loadingStyles.spinner,
                      { transform: [{ rotate: spinInterpolate }] },
                    ]}
                  />
                  <Text style={loadingStyles.scanningText}>Scanning...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress Section */}
          <View style={loadingStyles.progressSection}>
            {/* Progress bar */}
            <View style={loadingStyles.progressBarContainer}>
              <View style={[loadingStyles.progressBarFill, { width: `${progress}%` }]}>
                <View style={loadingStyles.progressDot} />
              </View>
            </View>

            {/* Phase indicators - horizontal timeline */}
            <View style={loadingStyles.phasesContainer}>
              {/* Connecting line */}
              <View style={loadingStyles.connectingLine} />

              {LOADING_PHASES.map((phase, index) => (
                <View key={index} style={loadingStyles.phaseItem}>
                  <View
                    style={[
                      loadingStyles.phaseCircle,
                      index <= currentPhase && loadingStyles.phaseCircleActive,
                    ]}
                  >
                    {index < currentPhase && (
                      <Ionicons name="checkmark" size={10} color="#0a0a0a" />
                    )}
                    {index === currentPhase && <View style={loadingStyles.phaseInnerDot} />}
                  </View>
                  <Text
                    style={[
                      loadingStyles.phaseLabel,
                      index <= currentPhase && loadingStyles.phaseLabelActive,
                    ]}
                  >
                    {phase.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* What you're unlocking */}
          <View style={loadingStyles.benefitsCard}>
            <Text style={loadingStyles.benefitsTitle}>WHAT YOU&apos;RE UNLOCKING</Text>
            <View style={loadingStyles.benefitsList}>
              {benefits.map((item, index) => (
                <View key={index} style={loadingStyles.benefitItem}>
                  <View style={loadingStyles.benefitIcon}>
                    <Ionicons name="checkmark" size={16} color="#00b4a0" />
                  </View>
                  <View style={loadingStyles.benefitTextContainer}>
                    <Text style={loadingStyles.benefitTitle}>{item.title}</Text>
                    <Text style={loadingStyles.benefitDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Tip */}
          <Text style={loadingStyles.tipText}>
            Tip: Check &quot;Likely Recipe&quot; on any dish to see estimated ingredients
          </Text>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

// Separate StyleSheet for loading screen to avoid conflicts
const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: -25,
    right: -25,
    height: '40%',
    backgroundColor: 'transparent',
    // Simulating radial gradient with a subtle teal tint at top
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    opacity: 0.08,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Pioneer Badge
  pioneerBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderRadius: 14,
    padding: 18,
    marginTop: 12,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  pioneerIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pioneerTextContainer: {
    flex: 1,
  },
  pioneerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d4af37',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pioneerDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 21,
  },

  // Restaurant Card
  restaurantCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 28,
  },
  heroImage: {
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    padding: 20,
    paddingTop: 24,
    backgroundColor: 'transparent',
    // Gradient simulation with dark overlay
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -40 },
    shadowOpacity: 0.95,
    shadowRadius: 20,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  heroAddress: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  heroPlaceholder: {
    height: 140,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  heroNameNoImage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 12,
    textAlign: 'center',
  },
  heroAddressNoImage: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
    textAlign: 'center',
  },

  // Discovery Feed
  discoveryFeed: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  discoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  discoveryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    backgroundColor: '#00b4a0',
    borderRadius: 4,
    shadowColor: '#00b4a0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  discoveryTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.2,
  },
  itemCount: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  itemsList: {
    position: 'relative',
    maxHeight: 160,
    overflow: 'hidden',
  },
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    zIndex: 1,
  },
  discoveredItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  discoveredItemLatest: {
    backgroundColor: 'rgba(0, 180, 160, 0.08)',
  },
  itemName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
  },
  itemCategory: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  spinner: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderTopColor: '#00b4a0',
    borderRadius: 7,
  },
  scanningText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.3)',
  },

  // Progress Section
  progressSection: {
    marginBottom: 28,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    overflow: 'visible',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00b4a0',
    borderRadius: 10,
    position: 'relative',
  },
  progressDot: {
    position: 'absolute',
    right: -3,
    top: -1.5,
    width: 6,
    height: 6,
    backgroundColor: '#00b4a0',
    borderRadius: 3,
    shadowColor: '#00b4a0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  phasesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },
  connectingLine: {
    position: 'absolute',
    top: 11,
    left: 40,
    right: 40,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  phaseItem: {
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  phaseCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseCircleActive: {
    backgroundColor: '#00b4a0',
    borderColor: '#00b4a0',
  },
  phaseInnerDot: {
    width: 6,
    height: 6,
    backgroundColor: '#0a0a0a',
    borderRadius: 3,
  },
  phaseLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  phaseLabelActive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Benefits Card
  benefitsCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
  },
  benefitsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
    marginBottom: 16,
  },
  benefitsList: {
    gap: 14,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0, 180, 160, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    lineHeight: 18,
  },

  // Tip
  tipText: {
    marginTop: 24,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

// Get allergen pill color - teal-only design (all allergens use same teal styling)
const getAllergenPillColors = (_present: string, _isUserAllergen: boolean) => {
  // Teal-only design: all allergens use the same styling regardless of severity
  return {
    bg: 'rgba(20, 184, 166, 0.15)',
    border: COLORS.brandTeal,
    text: COLORS.brandTealLight,
  };
};

const getSeverityChipStyle = (severity: string) => {
  const s = (severity || '').toLowerCase();
  if (s.includes('generally safe') || s === 'safe') {
    return { backgroundColor: '#16a34a' };
  }
  if (s.includes('caution')) {
    return { backgroundColor: '#f59e0b' };
  }
  if (s.includes('avoid') || s === 'unsafe') {
    return { backgroundColor: '#ef4444' };
  }
  return { backgroundColor: '#4b5563' };
};

const getFodmapLevelBorderColor = (level?: string | null) => {
  const s = (level || '').toLowerCase();

  if (s === 'high') {
    return 'rgba(248, 113, 113, 0.9)';
  }
  if (s === 'medium') {
    return 'rgba(250, 204, 21, 0.9)';
  }
  if (s === 'low') {
    return 'rgba(34, 197, 94, 0.9)';
  }

  return '#4b5563';
};

type MenuResponse = {
  restaurant?: {
    id?: string | number;
    name?: string;
    address?: string;
    imageUrl?: string | null;
    imageRef?: string | null;
  };
  sections?: Array<{
    id?: string | number;
    name?: string;
    items?: Array<MenuItem>;
  }>;
};

type MenuItem = {
  id?: string | number;
  name?: string;
  description?: string;
  menuDescription?: string;
  subtitle?: string;
  shortDescription?: string;
  rawDescription?: string;
  priceText?: string;
  restaurantCalories?: number | null;
  imageUrl?: string | null;
  [key: string]: any;
};

function buildPhotoUrl(photoRef?: string | null) {
  if (!photoRef) return null;
  const params = new URLSearchParams({
    maxwidth: '1200',
    photoreference: photoRef,
    key: GOOGLE_API_KEY || '',
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

export default function RestaurantScreen() {
  const router = useRouter();
  const { placeId, restaurantName, address, lat, lng } = useLocalSearchParams();
  const { selectedAllergens, userId, loadDailyTracker } = useUserPrefs();
  const { getPrefetchedMenu, isMenuReady, getPrefetchStatus } = useMenuPrefetch();
  const { shouldShowRestaurantPopup, markRestaurantPopupShown } = useDisclaimer();

  // Extract route params early (needed by callbacks)
  const placeIdValue = Array.isArray(placeId) ? placeId[0] : placeId;
  const restaurantNameValue = Array.isArray(restaurantName) ? restaurantName[0] : restaurantName;
  const addressValue = Array.isArray(address) ? address[0] : address;
  const latValueRaw = Array.isArray(lat) ? lat[0] : lat;
  const lngValueRaw = Array.isArray(lng) ? lng[0] : lng;
  const latValue = latValueRaw ?? undefined;
  const lngValue = lngValueRaw ?? undefined;

  // Get AI assistant context setter
  const { setPageContext } = useAIAssistant();

  // Set AI context for this page (basic info first)
  useSetAIContext({
    screen: 'restaurant',
    restaurantId: placeIdValue || null,
    restaurantName: restaurantNameValue || null,
    dishId: null,
    dishName: null,
  });

  // Update AI context with menu items when menu loads
  React.useEffect(() => {
    if (menu?.sections && menu.sections.length > 0) {
      // Extract all menu items for AI context
      const allItems: MenuItem[] = [];
      for (const section of menu.sections) {
        for (const item of section.items || []) {
          allItems.push({
            name: item.name,
            description: item.description || item.menuDescription || undefined,
            section: section.name || section.title,
            price: item.priceText || (item.rawPrice ? `$${item.rawPrice.toFixed(2)}` : undefined),
            calories: item.restaurantCalories || null,
          });
        }
      }
      // Update the AI context with menu items
      setPageContext({
        menuItems: allItems,
      });
    }
  }, [menu, setPageContext]);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const itemLayouts = useRef<Record<string, number>>({});
  const lastViewedItemId = useRef<string | null>(null);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [restaurant, setRestaurant] = useState<MenuResponse['restaurant'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [analysisByItemId, setAnalysisByItemId] = useState<
    Record<string, AnalyzeDishResponse | null>
  >({});
  const [analysisLoadingByItemId, setAnalysisLoadingByItemId] = useState<Record<string, boolean>>(
    {}
  );
  const [googlePhotoRef, setGooglePhotoRef] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');

  // Batch analysis state
  const [batchId, setBatchId] = useState<string | null>(null);
  const [jobIdByItemId, setJobIdByItemId] = useState<Record<string, string>>({});
  const batchPollingRef = useRef<boolean>(false);

  // Quick Log state
  const [showPortionSheet, setShowPortionSheet] = useState(false);
  const [portionSheetDish, setPortionSheetDish] = useState<{
    itemId: string;
    name: string;
    section: string;
    analysis: AnalyzeDishResponse | null;
  } | null>(null);
  const [todayLoggedMeals, setTodayLoggedMeals] = useState<LoggedMeal[]>([]);
  const [loggedToast, setLoggedToast] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [showAllergenPopup, setShowAllergenPopup] = useState(false);

  // Meal Log Modal state (new photo analysis flow)
  const [showMealLogModal, setShowMealLogModal] = useState(false);
  const [mealLogDish, setMealLogDish] = useState<{
    itemId: string;
    name: string;
    section: string;
    analysis: AnalyzeDishResponse | null;
  } | null>(null);

  // Category navigation state
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isCategoryNavSticky, setIsCategoryNavSticky] = useState(false);
  const sectionRefs = useRef<Record<string, number>>({});
  const categoryNavRef = useRef<ScrollView>(null);
  const categoryNavPositionRef = useRef<number>(0);
  const categoryButtonRefs = useRef<Record<string, number>>({});

  // Get today's date in ISO format for checking logged meals
  const getTodayISO = () => new Date().toISOString().split('T')[0];

  // Fetch today's logged meals to show "✓ Logged" state
  useEffect(() => {
    async function fetchTodayMeals() {
      if (!userId) return;
      try {
        const meals = await getMealsForDate(userId, getTodayISO());
        setTodayLoggedMeals(meals);
      } catch (err) {
        console.error('Error fetching today meals:', err);
      }
    }
    fetchTodayMeals();
  }, [userId]);

  // Check if a dish is logged today (by name match)
  const getLoggedMealForDish = useCallback(
    (dishName: string): LoggedMeal | undefined => {
      const normalizedName = (dishName || '').toLowerCase().trim();
      return todayLoggedMeals.find(
        (m) => (m.dish_name || '').toLowerCase().trim() === normalizedName
      );
    },
    [todayLoggedMeals]
  );

  // Detect course type for smart portion defaults
  const detectCourseType = useCallback((dishName: string, section: string): CourseType => {
    const name = (dishName || '').toLowerCase();
    const sec = (section || '').toLowerCase();

    if (sec.includes('appetizer') || sec.includes('starter') || name.includes('appetizer')) {
      return 'appetizer';
    }
    if (sec.includes('dessert') || name.includes('dessert') || name.includes('cake') || name.includes('ice cream')) {
      return 'dessert';
    }
    if (sec.includes('drink') || sec.includes('beverage') || name.includes('smoothie') || name.includes('shake')) {
      return 'drink';
    }
    if (sec.includes('side') || name.includes('side')) {
      return 'side';
    }
    return 'entree';
  }, []);

  // Handle opening meal log modal for a dish (new photo analysis flow)
  const handleQuickLog = useCallback(
    async (itemId: string, item: any, sectionName: string) => {
      let analysis = analysisByItemId[itemId] || null;

      // If organs are pending, fetch them now before showing modal
      if (analysis && analysis.organs_pending && analysis.organs_poll_key) {
        console.log('[handleQuickLog] Fetching pending organs for:', item?.name);
        try {
          const organsResult = await pollOrgansStatus(analysis.organs_poll_key, undefined, 1500, 10);
          if (organsResult.ok && organsResult.ready && organsResult.organs) {
            // Merge organs into analysis
            analysis = {
              ...analysis,
              organs: organsResult.organs,
              organs_pending: false,
            };
            // Update the cache
            setAnalysisByItemId((prev) => ({ ...prev, [itemId]: analysis }));
            console.log('[handleQuickLog] Organs fetched successfully:', organsResult.organs?.organs?.length, 'organs');
          }
        } catch (e) {
          console.warn('[handleQuickLog] Failed to fetch organs:', e);
        }
      }

      // Show the new MealLogModal with photo analysis option
      setMealLogDish({
        itemId,
        name: item?.name || '',
        section: sectionName,
        analysis,
      });
      setShowMealLogModal(true);
    },
    [analysisByItemId]
  );

  // Handle meal log completion from MealLogModal
  const handleMealLogComplete = useCallback(
    async (logData: MealLogData) => {
      if (!userId || !mealLogDish) {
        setShowMealLogModal(false);
        return;
      }

      setIsLogging(true);

      try {
        const { name, section, analysis } = mealLogDish;
        const restName = restaurant?.name || restaurantNameValue || '';

        // Get baseline nutrition from analysis or use zeros
        const ns = analysis?.nutrition_summary;
        const baselineCalories = ns?.calories || 0;
        const baselineProtein = ns?.protein_g || 0;
        const baselineCarbs = ns?.carbs_g || 0;
        const baselineFat = ns?.fat_g || 0;
        const baselineFiber = ns?.fiber_g || 0;
        const baselineSugar = ns?.sugar_g || 0;
        const baselineSodium = ns?.sodium_mg || 0;

        // Calculate consumed values based on portion
        const portionMultiplier = logData.portionPercent / 100;

        // Get risk flags from allergens
        const riskFlags: string[] = [];
        if (analysis?.allergen_flags) {
          analysis.allergen_flags.forEach((af: any) => {
            if (af.present === 'yes' || af.present === 'likely') {
              riskFlags.push(af.kind);
            }
          });
        }

        // Prepare organ impacts
        const baselineOrgans: Record<string, number> = {};
        if (analysis?.organs?.organs) {
          analysis.organs.organs.forEach((o: any) => {
            baselineOrgans[o.organ] = o.score;
          });
        }

        // Call logMeal API with photo status if using photo analysis
        await logMeal(userId, {
          dish_name: name,
          dish_id: mealLogDish.itemId,
          restaurant_name: restName,
          portion_factor: portionMultiplier,
          portion_percent: logData.portionPercent,
          portion_multiplier: portionMultiplier,
          shared_with_count: logData.sharedWithCount,
          leftovers_saved: logData.leftoversSaved,
          portion_mode: logData.portionMode,
          baseline_calories: baselineCalories,
          baseline_protein_g: baselineProtein,
          baseline_carbs_g: baselineCarbs,
          baseline_fat_g: baselineFat,
          baseline_fiber_g: baselineFiber,
          baseline_sugar_g: baselineSugar,
          baseline_sodium_mg: baselineSodium,
          baseline_organ_impacts: baselineOrgans,
          calories: Math.round(baselineCalories * portionMultiplier),
          protein_g: Math.round(baselineProtein * portionMultiplier),
          carbs_g: Math.round(baselineCarbs * portionMultiplier),
          fat_g: Math.round(baselineFat * portionMultiplier),
          fiber_g: Math.round(baselineFiber * portionMultiplier),
          sugar_g: Math.round(baselineSugar * portionMultiplier),
          sodium_mg: Math.round(baselineSodium * portionMultiplier),
          risk_flags: riskFlags.length > 0 ? riskFlags : undefined,
          full_analysis: analysis,
        });

        // Refresh today's meals
        const updatedMeals = await getMealsForDate(userId, getTodayISO());
        setTodayLoggedMeals(updatedMeals);

        // Show toast
        setLoggedToast(true);
        setTimeout(() => setLoggedToast(false), 2500);

        // Reload tracker
        loadDailyTracker();
      } catch (err) {
        console.error('[handleMealLogComplete] Error logging meal:', err);
      }

      setIsLogging(false);
      setShowMealLogModal(false);
      setMealLogDish(null);
    },
    [userId, mealLogDish, restaurant?.name, restaurantNameValue, loadDailyTracker]
  );

  // Handle opening portion sheet for a dish (legacy, still used for editing)
  const handleOpenPortionSheet = useCallback(
    async (itemId: string, item: any, sectionName: string) => {
      let analysis = analysisByItemId[itemId] || null;

      // If organs are pending, fetch them now before showing portion sheet
      if (analysis && analysis.organs_pending && analysis.organs_poll_key) {
        console.log('[handleOpenPortionSheet] Fetching pending organs for:', item?.name);
        try {
          const organsResult = await pollOrgansStatus(analysis.organs_poll_key, undefined, 1500, 10);
          if (organsResult.ok && organsResult.ready && organsResult.organs) {
            // Merge organs into analysis
            analysis = {
              ...analysis,
              organs: organsResult.organs,
              organs_pending: false,
            };
            // Update the cache
            setAnalysisByItemId((prev) => ({ ...prev, [itemId]: analysis }));
            console.log('[handleOpenPortionSheet] Organs fetched successfully:', organsResult.organs?.organs?.length, 'organs');
          }
        } catch (e) {
          console.warn('[handleOpenPortionSheet] Failed to fetch organs:', e);
        }
      }

      setPortionSheetDish({
        itemId,
        name: item?.name || '',
        section: sectionName,
        analysis,
      });
      setShowPortionSheet(true);
    },
    [analysisByItemId]
  );

  // Handle meal logging with portion data
  const handlePortionConfirm = useCallback(
    async (portionData: PortionData) => {
      if (!userId || !portionSheetDish) {
        setShowPortionSheet(false);
        return;
      }

      setIsLogging(true);

      try {
        const { name, section, analysis } = portionSheetDish;
        const restName = restaurant?.name || restaurantNameValue || '';

        // Get baseline nutrition from analysis or use zeros
        const ns = analysis?.nutrition_summary;
        const baselineCalories = ns?.energyKcal || 0;
        const baselineProtein = ns?.protein_g || 0;
        const baselineCarbs = ns?.carbs_g || 0;
        const baselineFat = ns?.fat_g || 0;
        const baselineFiber = ns?.fiber_g || 0;
        const baselineSugar = ns?.sugar_g || 0;
        const baselineSodium = ns?.sodium_mg || 0;

        // Get organ impacts as object
        const baselineOrganImpacts: Record<string, number> = {};
        console.log('[handlePortionConfirm] analysis.organs:', JSON.stringify(analysis?.organs));
        if (analysis?.organs?.organs) {
          analysis.organs.organs.forEach((o: any) => {
            if (o.organ && typeof o.score === 'number') {
              baselineOrganImpacts[o.organ] = o.score;
            }
          });
        }
        console.log('[handlePortionConfirm] baselineOrganImpacts:', JSON.stringify(baselineOrganImpacts));

        const multiplier = portionData.portionMultiplier;

        await logMeal(userId, {
          dish_name: name,
          restaurant_name: restName || null,
          meal_type: 'lunch',
          // Portion data
          portion_percent: portionData.portionPercent,
          portion_multiplier: multiplier,
          shared_with_count: portionData.sharedWithCount,
          leftovers_saved: portionData.leftoversSaved,
          portion_mode: portionData.portionMode,
          // Baseline values
          baseline_calories: baselineCalories,
          baseline_protein_g: baselineProtein,
          baseline_carbs_g: baselineCarbs,
          baseline_fat_g: baselineFat,
          baseline_fiber_g: baselineFiber,
          baseline_sugar_g: baselineSugar,
          baseline_sodium_mg: baselineSodium,
          baseline_organ_impacts: baselineOrganImpacts,
          // Consumed values (scaled)
          calories: Math.round(baselineCalories * multiplier),
          protein_g: Math.round(baselineProtein * multiplier * 10) / 10,
          carbs_g: Math.round(baselineCarbs * multiplier * 10) / 10,
          fat_g: Math.round(baselineFat * multiplier * 10) / 10,
          fiber_g: Math.round(baselineFiber * multiplier * 10) / 10,
          sugar_g: Math.round(baselineSugar * multiplier * 10) / 10,
          sodium_mg: Math.round(baselineSodium * multiplier),
          // Include organ_impacts for backend to store (this is what backend expects)
          organ_impacts: baselineOrganImpacts,
          // Include nutrition_summary for backend fallback
          nutrition_summary: ns || undefined,
          // Include organ_levels for backend fallback
          organ_levels: baselineOrganImpacts,
          // Include full analysis for R2 storage (enables viewing meal details later)
          full_analysis: analysis || undefined,
        } as any);

        setShowPortionSheet(false);
        setLoggedToast(true);

        // Refresh today's meals to update "Logged" state
        const meals = await getMealsForDate(userId, getTodayISO());
        setTodayLoggedMeals(meals);

        // Also refresh the daily tracker context so tracker screen shows the new meal
        loadDailyTracker();

        // Hide toast after 2 seconds
        setTimeout(() => setLoggedToast(false), 2000);
      } catch (err) {
        console.error('Error logging meal:', err);
      } finally {
        setIsLogging(false);
      }
    },
    [userId, portionSheetDish, restaurant, restaurantNameValue, loadDailyTracker]
  );

  useEffect(() => {
    async function loadMenu() {
      setError(null);
      setLoading(true);
      try {
        let data: any = null;

        // FAST PATH: Use fetchMenuFast first - it's the fastest (~10-30s)
        const searchAddress = addressValue || restaurantNameValue || '';
        if (restaurantNameValue && searchAddress) {
          console.log(
            '[RestaurantScreen] Using fetchMenuFast (FAST PATH) with:',
            restaurantNameValue,
            searchAddress
          );
          data = await fetchMenuFast(restaurantNameValue, searchAddress, 50);
        }

        // Check if menu fetch returned a validation error (wrong restaurant) or HTTP error
        if (data && !data.ok && data.error) {
          const errorMsg = data.error.toLowerCase();
          // Check for validation-related errors or "not on platform" errors
          if (
            errorMsg.includes('no matching restaurant') ||
            errorMsg.includes('no restaurants found') ||
            errorMsg.includes('validation') ||
            errorMsg.includes('not found') ||
            errorMsg.includes('unavailable') ||
            errorMsg.includes('http 404')
          ) {
            console.log('[RestaurantScreen] Restaurant not available:', data.error);
            setError(
              `We don't have access to "${restaurantNameValue || 'this restaurant'}" at this location. Try a different restaurant nearby.`
            );
            setLoading(false);
            return;
          }
        }

        // Fall back to fetchMenuWithRetry only if fast method fails (but not for validation errors)
        if ((!data || !data.ok) && placeIdValue) {
          console.log('[RestaurantScreen] fetchMenuFast failed, using fetchMenuWithRetry fallback');
          data = await fetchMenuWithRetry(placeIdValue);

          // Check validation errors from fallback too
          if (data && !data.ok && data.error) {
            const errorMsg = data.error.toLowerCase();
            if (
              errorMsg.includes('no matching restaurant') ||
              errorMsg.includes('no restaurants found') ||
              errorMsg.includes('validation') ||
              errorMsg.includes('not found') ||
              errorMsg.includes('unavailable') ||
              errorMsg.includes('http 404')
            ) {
              console.log('[RestaurantScreen] Restaurant not available (fallback):', data.error);
              setError(
                `We don't have access to "${restaurantNameValue || 'this restaurant'}" at this location. Try a different restaurant nearby.`
              );
              setLoading(false);
              return;
            }
          }
        }

        console.log('MENU RAW DATA:', JSON.stringify(data, null, 2).slice(0, 500));
        const normalizedSections = Array.isArray((data as any)?.sections)
          ? (data as any).sections.map((section: any) => ({
              ...section,
              items: Array.isArray(section?.items)
                ? section.items.map((item: any) => ({
                    ...item,
                    description: item?.description ?? item?.menuDescription ?? '',
                    menuDescription: item?.menuDescription ?? item?.description ?? '',
                    imageUrl: item?.imageUrl ?? null,
                  }))
                : [],
            }))
          : [];

        console.log('MENU NORMALIZED SECTIONS LENGTH:', normalizedSections.length);
        setMenu({
          ...(data as any),
          sections: normalizedSections,
        });
        setRestaurant((data as any)?.restaurant ?? null);
      } catch (e: any) {
        console.log('MENU ERROR:', e);
        setError("We couldn't load this menu right now. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    if (placeIdValue) {
      loadMenu();
    } else {
      setError("We couldn't load this menu right now. Please try again.");
      setLoading(false);
    }
  }, [
    placeIdValue,
    restaurantNameValue,
    addressValue,
    latValue,
    lngValue,
    getPrefetchedMenu,
    getPrefetchStatus,
  ]);

  // Show allergen popup on first visit to this restaurant
  useEffect(() => {
    if (!loading && menu && placeIdValue && shouldShowRestaurantPopup(placeIdValue)) {
      // Small delay so the menu renders first
      const timer = setTimeout(() => setShowAllergenPopup(true), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, menu, placeIdValue, shouldShowRestaurantPopup]);

  // Fetch Google Places photo reference for restaurant hero image
  useEffect(() => {
    async function fetchGooglePhoto() {
      if (!placeIdValue) return;
      try {
        console.log('[RestaurantScreen] Fetching Google photo for placeId:', placeIdValue);
        const details = await fetchPlaceDetails(placeIdValue);
        if (details.photoRef) {
          console.log(
            '[RestaurantScreen] Got Google photo ref:',
            details.photoRef.slice(0, 50) + '...'
          );
          setGooglePhotoRef(details.photoRef);
        }
      } catch (e: any) {
        console.log('[RestaurantScreen] Failed to fetch Google photo:', e?.message);
        // Non-critical - hero image will fall back to item image or no image
      }
    }
    fetchGooglePhoto();
  }, [placeIdValue]);

  // Save restaurant to cache for the Restaurant tab
  useEffect(() => {
    async function saveToCache() {
      if (!placeIdValue || !restaurantNameValue) return;
      try {
        const latStr = latValue as string | undefined;
        const lngStr = lngValue as string | undefined;
        const cachedRestaurant = {
          placeId: placeIdValue,
          name: restaurantNameValue,
          address: addressValue || '',
          lat: latStr ? parseFloat(latStr) : undefined,
          lng: lngStr ? parseFloat(lngStr) : undefined,
          visitedAt: Date.now(),
        };
        await AsyncStorage.setItem(LAST_RESTAURANT_KEY, JSON.stringify(cachedRestaurant));
        console.log('[RestaurantScreen] Saved restaurant to cache:', restaurantNameValue);
      } catch (e) {
        console.log('[RestaurantScreen] Failed to save restaurant to cache:', e);
      }
    }
    saveToCache();
  }, [placeIdValue, restaurantNameValue, addressValue, latValue, lngValue]);

  // Start batch analysis when menu loads
  useEffect(() => {
    if (!menu || !menu.sections || menu.sections.length === 0) return;
    if (batchPollingRef.current) return; // Already started

    const restName = restaurant?.name || restaurantNameValue || '';
    if (!restName) return;

    // Collect all dishes for batch analysis
    const dishes: (BatchDishInput & { itemId: string })[] = [];
    for (const section of menu.sections) {
      const sectionName = section.name || '';
      const items = Array.isArray(section.items) ? section.items : [];
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const itemId = `${section.id || section.name || 'section'}-${
          item?.id || item?.name || index
        }`;
        const descriptionText =
          item?.menuDescription ??
          item?.description ??
          item?.subtitle ??
          item?.shortDescription ??
          item?.rawDescription ??
          '';

        dishes.push({
          itemId,
          dishName: item?.name || '',
          description: descriptionText,
          section: sectionName,
          imageUrl: item?.imageUrl ?? null,
          priceText: item?.priceText || '',
          restaurantCalories: item?.restaurantCalories ?? null,
        });
      }
    }

    if (dishes.length === 0) return;

    console.log('[RestaurantScreen] Starting batch analysis for', dishes.length, 'dishes');
    batchPollingRef.current = true;

    // Start batch analysis
    startBatchAnalysis(
      restName,
      dishes.map((d) => ({
        dishName: d.dishName,
        description: d.description,
        section: d.section,
        imageUrl: d.imageUrl,
        priceText: d.priceText,
        restaurantCalories: d.restaurantCalories,
      })),
      5 // concurrency
    )
      .then((batchRes) => {
        if (!batchRes.ok) {
          console.log('[RestaurantScreen] Batch analysis failed, will use on-demand analysis');
          return;
        }

        setBatchId(batchRes.batchId);

        // Map job IDs to item IDs
        const jobMap: Record<string, string> = {};
        const initialResults: Record<string, AnalyzeDishResponse | null> = {};

        batchRes.jobs.forEach((job, idx) => {
          const dish = dishes.find((d) => d.dishName === job.dishName) || dishes[idx];
          if (dish) {
            jobMap[dish.itemId] = job.jobId;
            // If already completed or cached, store the result
            // Backend returns status "cached" for KV-cached dishes, "completed" for newly processed
            if ((job.status === 'completed' || job.status === 'cached') && job.result) {
              console.log('[RestaurantScreen] Cached result for:', job.dishName,
                'hasOrgans:', !!job.result?.organs,
                'organsPending:', job.result?.organs_pending);
              initialResults[dish.itemId] = job.result;
            }
          }
        });

        setJobIdByItemId(jobMap);
        if (Object.keys(initialResults).length > 0) {
          setAnalysisByItemId((prev) => ({ ...prev, ...initialResults }));
        }

        console.log(
          '[RestaurantScreen] Batch started, cached results:',
          Object.keys(initialResults).length
        );

        // Start polling for remaining results
        if (batchRes.status !== 'completed') {
          pollBatchUntilComplete(
            batchRes.batchId,
            (jobId, dishName, result) => {
              // Find the itemId for this job
              const itemId = Object.keys(jobMap).find((id) => jobMap[id] === jobId);
              if (itemId) {
                console.log('[RestaurantScreen] Batch result received for:', dishName,
                  'hasOrgans:', !!result?.organs,
                  'organsPending:', result?.organs_pending);
                setAnalysisByItemId((prev) => ({ ...prev, [itemId]: result }));
                setAnalysisLoadingByItemId((prev) => ({ ...prev, [itemId]: false }));
              }
            },
            1500, // poll interval
            80 // max attempts (2 min)
          ).then(() => {
            console.log('[RestaurantScreen] Batch polling complete');
          });
        }
      })
      .catch((err) => {
        console.error('[RestaurantScreen] Batch analysis error:', err);
      });

    return () => {
      batchPollingRef.current = false;
    };
  }, [menu, restaurant, restaurantNameValue]);

  const runAnalysisForItem = async ({
    itemId,
    item,
    sectionName,
    descriptionText,
  }: {
    itemId: string;
    item: any;
    sectionName?: string;
    descriptionText: string;
  }): Promise<AnalyzeDishResponse | null> => {
    setAnalysisLoadingByItemId((prev) => ({ ...prev, [itemId]: true }));

    try {
      const result = await analyzeDish({
        dishName: item?.name,
        restaurantName: restaurant?.name || restaurantNameValue || null,
        // Send both menuDescription and description so the backend can rely on either
        menuDescription: descriptionText,
        description: descriptionText,
        menuSection: sectionName || '',
        priceText: item?.priceText || '',
        placeId: placeIdValue || null,
        source: 'edamam_recipe_card',
        restaurantCalories: item?.restaurantCalories,
        imageUrl: item?.imageUrl ?? null,
        fullRecipe: true,
      });

      setAnalysisByItemId((prev) => ({
        ...prev,
        [itemId]: result,
      }));
      return result;
    } catch (err) {
      console.error('Error calling analyzeDish', err);
      const errorResult = {
        ok: false,
        error: 'Analysis failed',
      } as AnalyzeDishResponse;
      setAnalysisByItemId((prev) => ({
        ...prev,
        [itemId]: errorResult,
      }));
      return errorResult;
    } finally {
      setAnalysisLoadingByItemId((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Scroll to last viewed item when returning from recipe page
  useFocusEffect(
    useCallback(() => {
      if (lastViewedItemId.current && itemLayouts.current[lastViewedItemId.current] !== undefined) {
        // Small delay to ensure layout is ready
        setTimeout(() => {
          const yOffset = itemLayouts.current[lastViewedItemId.current!];
          scrollViewRef.current?.scrollTo({ y: yOffset - 100, animated: true });
        }, 100);
      }
    }, [])
  );

  // Navigate to recipe page (when dish is already analyzed)
  const navigateToRecipe = (itemId: string, item: any, analysis: AnalyzeDishResponse) => {
    lastViewedItemId.current = itemId;
    const recipeImageUrl = item?.imageUrl || analysis?.recipe_image || '';
    router.push({
      pathname: '/likely-recipe',
      params: {
        dishName: item?.name || 'Unknown Dish',
        imageUrl: recipeImageUrl,
        likelyRecipe: analysis?.likely_recipe ? JSON.stringify(analysis.likely_recipe) : '',
        fullRecipe: analysis?.full_recipe ? JSON.stringify(analysis.full_recipe) : '',
        nutrition: analysis?.nutrition_summary ? JSON.stringify(analysis.nutrition_summary) : '',
        nutritionInsights: analysis?.nutrition_insights
          ? JSON.stringify(analysis.nutrition_insights)
          : '',
        allergens: analysis?.allergen_flags ? JSON.stringify(analysis.allergen_flags) : '[]',
        allergenSummary: analysis?.allergen_summary || '',
        fodmap: analysis?.fodmap_flags ? JSON.stringify(analysis.fodmap_flags) : '',
        fodmapSummary: analysis?.fodmap_summary || '',
        organs: analysis?.organs ? JSON.stringify(analysis.organs) : '',
        nutritionSource: analysis?.nutrition_source || '',
      },
    });
  };

  // Handle "Show Analysis" button press
  const handleShowAnalysis = async (itemId: string, item: any, sectionName?: string) => {
    if (!itemId) return;

    const existingAnalysis = analysisByItemId[itemId];
    const isLoading = analysisLoadingByItemId[itemId];

    // Check if we have complete analysis with full_recipe data
    const hasFullRecipe = existingAnalysis?.ok && existingAnalysis?.full_recipe;

    // If we have complete analysis with full_recipe, navigate directly
    if (hasFullRecipe) {
      navigateToRecipe(itemId, item, existingAnalysis);
      return;
    }

    // If already loading, do nothing
    if (isLoading) return;

    const descriptionText =
      item?.menuDescription ??
      item?.description ??
      item?.subtitle ??
      item?.shortDescription ??
      item?.rawDescription ??
      '';

    setExpandedItemId(itemId);
    setAnalysisLoadingByItemId((prev) => ({ ...prev, [itemId]: true }));

    // Check if we have a batch job for this item - use priority fetch
    const jobId = jobIdByItemId[itemId];
    if (jobId && batchId) {
      console.log('[RestaurantScreen] Using priority analysis for:', item?.name);
      try {
        const priorityRes = await priorityAnalysis(jobId, {
          dishName: item?.name || '',
          description: descriptionText,
          section: sectionName || '',
          imageUrl: item?.imageUrl ?? null,
          priceText: item?.priceText || '',
          restaurantCalories: item?.restaurantCalories ?? null,
          restaurantName: restaurant?.name || restaurantNameValue || '',
        });

        if (priorityRes.ok && priorityRes.status === 'completed' && priorityRes.result) {
          setAnalysisByItemId((prev) => ({ ...prev, [itemId]: priorityRes.result! }));
          setAnalysisLoadingByItemId((prev) => ({ ...prev, [itemId]: false }));
          setExpandedItemId(null);
          navigateToRecipe(itemId, item, priorityRes.result);
          return;
        }
        // If priority didn't return result, fall through to regular analysis
      } catch (err) {
        console.log('[RestaurantScreen] Priority analysis failed, falling back:', err);
      }
    }

    // Fall back to direct analysis - ensures we get full_recipe data with wine pairing, storage tips, etc.
    const result = await runAnalysisForItem({
      itemId,
      item,
      sectionName,
      descriptionText,
    });

    // After analysis completes, navigate to recipe if successful
    if (result && result.ok) {
      setExpandedItemId(null); // Collapse the loader
      navigateToRecipe(itemId, item, result);
    } else {
      setAnalysisLoadingByItemId((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Hero image priority: Google photo ref (fetched from place details) > menu API imageRef > menu API imageUrl
  const heroUrl =
    buildPhotoUrl(googlePhotoRef) ||
    buildPhotoUrl(restaurant?.imageRef) ||
    restaurant?.imageUrl ||
    undefined;

  // Filter menu sections/items based on search query
  const filteredSections = useMemo(() => {
    if (!menuSearch.trim()) return menu?.sections || [];
    const query = menuSearch.toLowerCase();
    return (menu?.sections || [])
      .map((section) => ({
        ...section,
        items: section.items?.filter(
          (item: any) =>
            item.name?.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query)
        ),
      }))
      .filter((section) => section.items && section.items.length > 0);
  }, [menu?.sections, menuSearch]);

  // Get category names from filtered sections
  const categoryNames = useMemo(() => {
    return filteredSections.map((section) => section.name || 'Menu').filter(Boolean);
  }, [filteredSections]);

  // Set initial active category when sections load
  useEffect(() => {
    if (categoryNames.length > 0 && !activeCategory) {
      setActiveCategory(categoryNames[0]);
    }
  }, [categoryNames, activeCategory]);

  // Handle scroll to detect active category and sticky state
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = event.nativeEvent.contentOffset.y;

      // Check if category nav should be sticky (when scrolled past its position)
      const shouldBeSticky = scrollY > categoryNavPositionRef.current - 10;
      if (shouldBeSticky !== isCategoryNavSticky) {
        setIsCategoryNavSticky(shouldBeSticky);
      }

      // Find which section is currently in view
      const sectionPositions = Object.entries(sectionRefs.current)
        .map(([name, position]) => ({ name, position }))
        .sort((a, b) => a.position - b.position);

      // Find the section that's closest to (or just above) the current scroll position
      // Account for sticky header offset (~120px for header + search + category nav)
      const headerOffset = 120;
      let currentSection = sectionPositions[0]?.name;

      for (const section of sectionPositions) {
        if (section.position <= scrollY + headerOffset + 50) {
          currentSection = section.name;
        } else {
          break;
        }
      }

      if (currentSection && currentSection !== activeCategory) {
        setActiveCategory(currentSection);

        // Auto-scroll the category nav to show active category
        const buttonX = categoryButtonRefs.current[currentSection];
        if (buttonX !== undefined && categoryNavRef.current) {
          const screenWidth = Dimensions.get('window').width;
          const scrollToX = Math.max(0, buttonX - screenWidth / 2 + 60);
          categoryNavRef.current.scrollTo({ x: scrollToX, animated: true });
        }
      }
    },
    [isCategoryNavSticky, activeCategory]
  );

  // Scroll to section when category is tapped
  const scrollToSection = useCallback(
    (sectionName: string) => {
      const sectionY = sectionRefs.current[sectionName];
      if (sectionY !== undefined && scrollViewRef.current) {
        // Account for sticky header offset
        const headerOffset = isCategoryNavSticky ? 100 : 60;
        scrollViewRef.current.scrollTo({
          y: sectionY - headerOffset,
          animated: true,
        });
        setActiveCategory(sectionName);
      }
    },
    [isCategoryNavSticky]
  );

  if (loading) {
    // Compute early hero URL from available sources (googlePhotoRef may be set from a parallel fetch)
    const earlyHeroUrl =
      buildPhotoUrl(googlePhotoRef) ||
      buildPhotoUrl(restaurant?.imageRef) ||
      restaurant?.imageUrl ||
      undefined;
    return (
      <MenuLoadingScreen
        restaurantName={restaurantNameValue || undefined}
        restaurantAddress={addressValue || undefined}
        heroImageUrl={earlyHeroUrl}
      />
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>🍽️</Text>
          <Text style={styles.errorTitle}>Restaurant Not Available</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.errorButtonText}>← Search Different Restaurant</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!menu?.sections || menu.sections.length === 0) {
    const src = (menu as any)?.source || 'unknown';
    const backendError = (menu as any)?.error || (menu as any)?.uberDebug?.error || null;

    console.log('MENU EMPTY SECTIONS DEBUG:', {
      source: src,
      backendError,
      ok: (menu as any)?.ok,
    });

    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          {backendError
            ? `We couldn’t load this menu (${src}): ${backendError}`
            : 'No menu found for this restaurant.'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <TouchableOpacity style={styles.backRow} onPress={() => router.push('/')}>
            <Text style={styles.backText}>← Back to home</Text>
          </TouchableOpacity>

          {restaurant && (
            <View style={{ marginTop: 12, marginBottom: 8, marginHorizontal: -16 }}>
              <View
                style={{
                  overflow: 'hidden',
                }}
              >
                {heroUrl ? (
                  <ImageBackground
                    source={{ uri: heroUrl }}
                    style={{ height: 220, justifyContent: 'flex-end' }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                        backgroundColor: 'rgba(0,0,0,0.35)',
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 24,
                          fontWeight: '700',
                        }}
                      >
                        {restaurant.name || restaurantNameValue || menu.restaurant?.name}
                      </Text>
                      <Text
                        style={{
                          color: '#f0f0f0',
                          fontSize: 14,
                          marginTop: 4,
                        }}
                        numberOfLines={1}
                      >
                        {restaurant.address || addressValue || menu.restaurant?.address}
                      </Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={{ padding: 16 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#ffffff' }}>
                      {restaurant.name || restaurantNameValue || menu.restaurant?.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                      {restaurant.address || addressValue || menu.restaurant?.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Menu Search Bar */}
          <View style={styles.menuSearchContainer}>
            <Ionicons name="search" size={18} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.menuSearchInput}
              placeholder="Search menu items..."
              placeholderTextColor="#666"
              value={menuSearch}
              onChangeText={setMenuSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {menuSearch ? (
              <TouchableOpacity
                onPress={() => setMenuSearch('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Allergen Disclaimer Banner */}
          <AllergenBanner style={{ marginHorizontal: 0, marginTop: 8 }} />

          {/* Category Navigation Bar */}
          {categoryNames.length > 0 && (
            <View
              style={styles.categoryNavWrapper}
              onLayout={(e: LayoutChangeEvent) => {
                categoryNavPositionRef.current = e.nativeEvent.layout.y;
              }}
            >
              <ScrollView
                ref={categoryNavRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryNavContent}
              >
                {categoryNames.map((category, index) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryPill,
                      activeCategory === category && styles.categoryPillActive,
                    ]}
                    onPress={() => scrollToSection(category)}
                    onLayout={(e: LayoutChangeEvent) => {
                      categoryButtonRefs.current[category] = e.nativeEvent.layout.x;
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        activeCategory === category && styles.categoryPillTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {menuSearch && filteredSections.length === 0 && (
            <Text style={styles.noResultsText}>No items found for &quot;{menuSearch}&quot;</Text>
          )}

          {filteredSections.map((section) => (
            <View
              key={section.id || section.name}
              style={{ marginTop: 16 }}
              onLayout={(e: LayoutChangeEvent) => {
                if (section.name) {
                  sectionRefs.current[section.name] = e.nativeEvent.layout.y;
                }
              }}
            >
              {section.name ? <Text style={styles.sectionTitle}>{section.name}</Text> : null}

              {section.items?.map((item: any, index: number) => {
                // Always include section in itemId to ensure uniqueness across menu sections
                const itemId = `${section.id || section.name || 'section'}-${
                  item?.id || item?.name || index
                }`;
                const isExpanded = expandedItemId === itemId;

                const analysis = analysisByItemId[itemId];
                const isAnalysisLoading = !!analysisLoadingByItemId[itemId];
                const viewModel =
                  analysis && analysis.ok ? buildDishViewModel(analysis, selectedAllergens) : null;
                const organLines = viewModel?.organLines || [];

                const organOverallLevel: 'high' | 'medium' | 'low' | null = organLines.length
                  ? organLines.some((l: any) => l.severity === 'high')
                    ? 'high'
                    : organLines.some((l: any) => l.severity === 'medium')
                    ? 'medium'
                    : 'low'
                  : null;

                const organSummary: string | null = (() => {
                  if (!organLines || organLines.length === 0) {
                    return null;
                  }

                  // Build comprehensive summary from all organ sentences
                  // Filter to organs with non-neutral severity or meaningful sentences
                  const withSentences = organLines.filter(
                    (l: any) => l.sentence && l.sentence.length > 20 && l.severity !== 'neutral'
                  );

                  if (withSentences.length === 0) {
                    return 'Overall low organ impact; most organs stay neutral or mildly supported by this plate.';
                  }

                  // Prioritize high/medium, then take some low
                  const highMed = withSentences.filter(
                    (l: any) => l.severity === 'high' || l.severity === 'medium'
                  );
                  const low = withSentences.filter((l: any) => l.severity === 'low');

                  // Take all high/medium + up to 2 low, max 5 total
                  const selected = [
                    ...highMed,
                    ...low.slice(0, Math.max(0, 5 - highMed.length)),
                  ].slice(0, 5);

                  // Combine sentences into a paragraph
                  const paragraph = selected
                    .map((l: any) => {
                      const s = (l.sentence || '').trim().replace(/\.+$/, '');
                      return s + '.';
                    })
                    .join(' ');

                  return (
                    paragraph ||
                    'Overall low organ impact; most organs stay neutral or mildly supported by this plate.'
                  );
                })();

                const totalCaloriesForPlate =
                  viewModel?.nutrition && typeof viewModel.nutrition.calories === 'number'
                    ? Math.round(viewModel.nutrition.calories)
                    : null;
                // Use generated_description from analysis as fallback when Uber Eats has no description
                // Use || instead of ?? to treat empty strings as falsy
                const descriptionText =
                  item?.menuDescription ||
                  item?.description ||
                  analysis?.generated_description ||
                  item?.subtitle ||
                  item?.shortDescription ||
                  item?.rawDescription ||
                  '';

                if (item?.name && item.name.toLowerCase().includes('egg mcmuffin')) {
                  console.log('DEBUG MENU ITEM – Egg McMuffin', item, Object.keys(item || {}));
                }

                // DEBUG: Log generated_description usage (check for falsy values including empty strings)
                if (analysis?.generated_description && !item?.description?.trim() && !item?.menuDescription?.trim()) {
                  console.log('[DESC DEBUG]', item?.name, 'using generated_description:', analysis.generated_description?.substring(0, 50));
                }

                // Check if this dish is logged today
                const loggedMeal = getLoggedMealForDish(item?.name || '');
                const isLoggedToday = !!loggedMeal;

                return (
                  <View
                    key={itemId}
                    style={styles.card}
                    onLayout={(e) => {
                      itemLayouts.current[itemId] = e.nativeEvent.layout.y;
                    }}
                  >
                    {/* Image with +Log overlay - only show Log button when analysis is ready or already logged */}
                    {item?.imageUrl ? (
                      <View style={styles.imageContainer}>
                        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                        {/* Quick Log overlay button - only show if analysis exists or meal is logged */}
                        {(analysis?.ok || isLoggedToday) && (
                          <TouchableOpacity
                            style={[
                              styles.quickLogOverlay,
                              isLoggedToday && styles.quickLogOverlayLogged,
                            ]}
                            onPress={() => handleQuickLog(itemId, item, section.name || '')}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Ionicons
                              name={isLoggedToday ? 'checkmark-circle' : 'add'}
                              size={16}
                              color={isLoggedToday ? '#22c55e' : TEAL}
                            />
                            <Text
                              style={[
                                styles.quickLogText,
                                isLoggedToday && styles.quickLogTextLogged,
                              ]}
                            >
                              {isLoggedToday
                                ? `${loggedMeal?.portion_percent || 100}%`
                                : 'Log'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      /* No image - show log button in card header area only if analysis exists or logged */
                      (analysis?.ok || isLoggedToday) && (
                        <TouchableOpacity
                          style={[
                            styles.quickLogNoImage,
                            isLoggedToday && styles.quickLogOverlayLogged,
                          ]}
                          onPress={() => handleQuickLog(itemId, item, section.name || '')}
                        >
                          <Ionicons
                            name={isLoggedToday ? 'checkmark-circle' : 'add'}
                            size={16}
                            color={isLoggedToday ? '#22c55e' : TEAL}
                          />
                          <Text
                            style={[
                              styles.quickLogText,
                              isLoggedToday && styles.quickLogTextLogged,
                            ]}
                          >
                            {isLoggedToday
                              ? `${loggedMeal?.portion_percent || 100}%`
                              : 'Log'}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}

                    <Text style={styles.itemName} numberOfLines={2}>
                      {item?.name}
                    </Text>

                    {descriptionText ? (
                      <View>
                        <Text
                          style={styles.dishDescription}
                          numberOfLines={expandedDescriptions[itemId] ? undefined : 3}
                        >
                          {descriptionText}
                        </Text>
                        {descriptionText.length > 120 && !expandedDescriptions[itemId] && (
                          <TouchableOpacity
                            onPress={() =>
                              setExpandedDescriptions((prev) => ({ ...prev, [itemId]: true }))
                            }
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.seeMoreText}>see more</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : null}

                    {/* Allergen & FODMAP pills - shown when dish has been analyzed */}
                    {analysis?.ok && (
                      <View style={styles.inlineWarningBadges}>
                        {/* Allergen badges - use allergen_flags directly for consistency with recipe card */}
                        {(analysis.allergen_flags || [])
                          .filter((a) => a.present === 'yes' || a.present === 'maybe')
                          .map((allergen, idx) => (
                            <View
                              key={`inline-allergen-${idx}`}
                              style={[
                                styles.inlineAllergenPill,
                                {
                                  backgroundColor:
                                    allergen.present === 'maybe'
                                      ? 'rgba(250, 204, 21, 0.15)'
                                      : 'rgba(239, 68, 68, 0.15)',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.inlineAllergenPillText,
                                  {
                                    color: allergen.present === 'maybe' ? '#facc15' : '#ef4444',
                                  },
                                ]}
                              >
                                {allergen.kind.charAt(0).toUpperCase() + allergen.kind.slice(1)}
                              </Text>
                            </View>
                          ))}
                        {/* FODMAP badge - use fodmap_flags directly for consistency */}
                        {analysis.fodmap_flags &&
                          (analysis.fodmap_flags.level === 'high' ||
                            analysis.fodmap_flags.level === 'medium') && (
                            <View style={styles.inlineBadgeTeal}>
                              <Text style={styles.inlineBadgeTextTeal}>
                                {analysis.fodmap_flags.level === 'high' ? 'High' : 'Mod'} FODMAP
                              </Text>
                            </View>
                          )}
                      </View>
                    )}

                    {/* Inline Nutrition Facts - shown when dish has been analyzed */}
                    {analysis?.ok && analysis.nutrition_summary && (
                      <View style={styles.inlineNutritionRow}>
                        <View style={styles.inlineNutritionItem}>
                          <Text style={styles.inlineNutritionValue}>
                            {Math.round(analysis.nutrition_summary.energyKcal || 0)}
                          </Text>
                          <Text style={styles.inlineNutritionLabel}>kcal</Text>
                        </View>
                        <View style={styles.inlineNutritionDivider} />
                        <View style={styles.inlineNutritionItem}>
                          <Text style={styles.inlineNutritionValue}>
                            {Math.round(analysis.nutrition_summary.protein_g || 0)}g
                          </Text>
                          <Text style={styles.inlineNutritionLabel}>Protein</Text>
                        </View>
                        <View style={styles.inlineNutritionDivider} />
                        <View style={styles.inlineNutritionItem}>
                          <Text style={styles.inlineNutritionValue}>
                            {Math.round(analysis.nutrition_summary.carbs_g || 0)}g
                          </Text>
                          <Text style={styles.inlineNutritionLabel}>Carbs</Text>
                        </View>
                        <View style={styles.inlineNutritionDivider} />
                        <View style={styles.inlineNutritionItem}>
                          <Text style={styles.inlineNutritionValue}>
                            {Math.round(analysis.nutrition_summary.fat_g || 0)}g
                          </Text>
                          <Text style={styles.inlineNutritionLabel}>Fat</Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => handleShowAnalysis(String(itemId), item, section.name || '')}
                    >
                      <Text style={styles.showMoreText}>
                        {isAnalysisLoading
                          ? 'Analyzing…'
                          : analysis?.ok
                            ? 'Show Digestive Impact, Recipe, Wine Pairing...'
                            : 'Show analysis'}
                      </Text>
                    </TouchableOpacity>

                    {/* Show loader only when analysis is in progress */}
                    {isExpanded && isAnalysisLoading && (
                      <View style={styles.expandedVerdictContainer}>
                        <DishAnalysisLoader dishName={item?.name || 'this dish'} />
                      </View>
                    )}

                    {/* Show error message if analysis failed */}
                    {isExpanded && !isAnalysisLoading && analysis && !analysis.ok && (
                      <View style={styles.expandedVerdictContainer}>
                        <Text style={styles.verdictBodyText}>
                          Analysis failed. Tap &quot;Show analysis&quot; to try again.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Sticky Category Navigation - appears when scrolled */}
        {isCategoryNavSticky && categoryNames.length > 0 && (
          <View style={styles.stickyCategoryNav}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={80} tint="dark" style={styles.stickyCategoryBlur}>
                {/* Sticky Search Bar */}
                <View style={styles.stickySearchContainer}>
                  <Ionicons name="search" size={18} color="#666" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.menuSearchInput}
                    placeholder="Search menu items..."
                    placeholderTextColor="#666"
                    value={menuSearch}
                    onChangeText={setMenuSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {menuSearch ? (
                    <TouchableOpacity
                      onPress={() => setMenuSearch('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#666" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryNavContent}
                >
                  {categoryNames.map((category) => (
                    <TouchableOpacity
                      key={`sticky-${category}`}
                      style={[
                        styles.categoryPill,
                        activeCategory === category && styles.categoryPillActive,
                      ]}
                      onPress={() => scrollToSection(category)}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          activeCategory === category && styles.categoryPillTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </BlurView>
            ) : (
              <View style={styles.stickyCategoryAndroid}>
                {/* Sticky Search Bar */}
                <View style={styles.stickySearchContainer}>
                  <Ionicons name="search" size={18} color="#666" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.menuSearchInput}
                    placeholder="Search menu items..."
                    placeholderTextColor="#666"
                    value={menuSearch}
                    onChangeText={setMenuSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {menuSearch ? (
                    <TouchableOpacity
                      onPress={() => setMenuSearch('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#666" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryNavContent}
                >
                  {categoryNames.map((category) => (
                    <TouchableOpacity
                      key={`sticky-${category}`}
                      style={[
                        styles.categoryPill,
                        activeCategory === category && styles.categoryPillActive,
                      ]}
                      onPress={() => scrollToSection(category)}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          activeCategory === category && styles.categoryPillTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/')}>
            <Ionicons name="home" size={22} color="#ffffff" />
            <Text style={styles.bottomNavText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Ionicons name="bar-chart-outline" size={22} color="#ffffff" />
            <Text style={styles.bottomNavText}>Tracker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle" size={22} color="#ffffff" />
            <Text style={styles.bottomNavText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast notification */}
      {loggedToast && (
        <View style={styles.logToast}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={styles.logToastText}>Logged to Tracker</Text>
        </View>
      )}

      {/* Portion Sheet (legacy, for editing existing meals) */}
      <PortionSheet
        visible={showPortionSheet}
        onClose={() => setShowPortionSheet(false)}
        onConfirm={handlePortionConfirm}
        courseType={
          portionSheetDish
            ? detectCourseType(portionSheetDish.name, portionSheetDish.section)
            : 'entree'
        }
        dishName={portionSheetDish?.name}
        initialPortionPercent={
          portionSheetDish
            ? getLoggedMealForDish(portionSheetDish.name)?.portion_percent
            : undefined
        }
      />

      {/* Meal Log Modal (new photo analysis flow) */}
      <MealLogModal
        visible={showMealLogModal}
        onClose={() => {
          setShowMealLogModal(false);
          setMealLogDish(null);
        }}
        onLogComplete={handleMealLogComplete}
        dishName={mealLogDish?.name || ''}
        dishId={mealLogDish?.itemId}
        restaurantName={restaurant?.name || restaurantNameValue || ''}
        analysis={mealLogDish?.analysis || undefined}
        userId={userId || ''}
      />

      {/* Restaurant Allergen Popup - shows once per restaurant */}
      <RestaurantAllergenPopup
        restaurantId={placeIdValue || ''}
        restaurantName={restaurantNameValue || restaurant?.name || 'this restaurant'}
        visible={showAllergenPopup}
        onDismiss={() => setShowAllergenPopup(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 140,
  },
  backRow: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEAL,
  },
  headerName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerAddress: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#020819',
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  imageWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  itemImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  heartButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 22, // xl - dish names
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 28,
  },
  itemPrice: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#d1d5db',
  },
  dishDescription: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.75)',
  },
  seeMoreText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.brandTeal,
  },
  healthInsightCallout: {
    flexDirection: 'row',
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#facc15',
  },
  healthInsightIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  healthInsightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
  },
  inlineWarningBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  inlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  inlineBadgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  inlineBadgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  inlineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fcd34d',
  },
  showMoreText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: TEAL,
  },
  verdictTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  verdictText: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
  verdictBodyText: {
    marginTop: 8,
    fontSize: 13,
    color: '#9ca3af',
  },
  buttonRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#020617',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: TEAL,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: TEAL,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: BG,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: TEAL,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  expandedVerdictContainer: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#111827',
  },
  tbHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  sectionTextCol: {
    flex: 1,
  },
  chipContainer: {
    alignItems: 'flex-end',
  },
  sectionBody: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.82)',
    letterSpacing: 0,
  },
  sectionBlock: {
    marginTop: 10,
    marginBottom: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    color: '#020617',
    fontWeight: '800',
    overflow: 'hidden',
  },
  allergenPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 2,
  },
  allergenPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    marginRight: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  allergenPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  allergenPillUser: {
    backgroundColor: '#F97373',
    borderColor: '#F97373',
  },
  allergenPillOther: {
    backgroundColor: '#4b5563',
  },
  allergenPillNeutral: {
    backgroundColor: '#374151',
  },
  allergenPillSelected: {
    backgroundColor: '#F97373',
    borderColor: '#F97373',
  },
  allergenPillTextSelected: {
    color: '#0B1120',
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 4,
  },
  fodmapLevelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#6B7280',
    marginTop: 4,
    marginBottom: 4,
  },
  fodmapLevelText: {
    color: '#F9FAFB',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  fodmapPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4B5563',
    marginRight: 8,
    marginBottom: 8,
  },
  fodmapPillText: {
    color: '#E5E7EB',
    fontSize: 13,
  },
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    color: '#020617',
  },
  nutritionSection: {
    marginTop: 10,
  },
  plateComponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  plateComponentMain: {
    flex: 1,
    marginRight: 8,
  },
  plateComponentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  plateComponentMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  plateComponentMacros: {
    alignItems: 'flex-end',
  },
  plateComponentMacro: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e5e7eb',
  },
  plateComponentAllergens: {
    marginTop: 4,
  },
  plateComponentPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 2,
  },
  plateComponentsSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  plateComponentsLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
    fontWeight: '500',
  },
  plateComponentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginRight: 8,
  },
  plateComponentPillActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  plateComponentPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d1d5db',
  },
  plateComponentPillTextActive: {
    color: '#ffffff',
  },
  plateComponentRoleText: {
    fontSize: 11,
    color: '#6b7280',
  },
  plateComponentFodmapText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  focusChipsRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  focusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 6,
  },
  focusChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  focusChipText: {
    fontSize: 12,
    color: '#cccccc',
  },
  focusChipTextActive: {
    color: '#000000',
  },
  focusChipsContent: {
    paddingHorizontal: 4,
  },
  focusHint: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
  },
  sideFodmapWarningText: {
    fontSize: 11,
    color: '#f0c36a',
    marginTop: 4,
  },
  nutritionGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  nutritionTile: {
    width: '48%',
    backgroundColor: '#020819',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  nutritionValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  nutritionUnavailable: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  dietTagsSection: {
    marginTop: 12,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  collapsibleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  dietTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dietTagChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: 6,
    marginBottom: 6,
  },
  dietTagText: {
    fontSize: 12,
    color: '#ffffff',
  },
  dietTagsEmptyText: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
  },
  allergenDisclaimer: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  nutritionDisclaimer: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  lifestyleDisclaimer: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  nutritionInsightsBox: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  nutritionSourceLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  nutritionInsightsSummary: {
    marginTop: 8,
    marginBottom: 12,
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  nutritionInsightsHighlight: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 2,
  },
  nutritionInsightsCaution: {
    color: '#fbbf24',
    fontSize: 12,
    marginTop: 4,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#050509',
    borderTopWidth: 1,
    borderTopColor: '#1f2230',
  },
  bottomNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomNavText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  menuSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
  },
  menuSearchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  noResultsText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  // New design system styles
  analysisCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  coloredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  coloredPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  levelBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  levelBadgeSmallText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Quick stats for nutrition
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  quickStatLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  quickStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#374151',
  },
  // Horizontal organ cards
  organCardsContainer: {
    paddingVertical: 8,
    gap: 10,
  },
  organCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
    marginRight: 10,
  },
  organCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  organCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  organCardLevel: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  organCardLevelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Sticky Action Bar styles
  stickyActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 60, // Above the bottom nav
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
    alignItems: 'center',
  },
  stickyActionDishName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
    textAlign: 'center',
  },
  stickyActionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  stickyPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: TEAL,
  },
  stickyPrimaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#020617',
  },
  stickySecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: TEAL,
    backgroundColor: 'transparent',
  },
  stickySecondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEAL,
  },
  // NEW: Teal-only inline badge styles
  inlineBadgeTeal: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.brandTeal,
  },
  inlineBadgeTextTeal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.brandTealLight,
  },
  // Allergen pills matching recipe page styling
  inlineAllergenPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inlineAllergenPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Inline nutrition facts row (compact version for dish cards)
  inlineNutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  inlineNutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  inlineNutritionValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inlineNutritionLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  inlineNutritionDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // NEW: Module wrapper styles for expandable cards
  moduleWrapper: {
    marginTop: 12,
  },
  // NEW: Nutrition module styles
  nutritionModuleWrapper: {
    marginTop: 12,
  },
  nutritionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  macroValueTeal: {
    color: COLORS.brandTeal,
  },
  macroLabelTeal: {
    color: COLORS.brandTeal,
  },
  macroDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.cardBorder,
  },
  // NEW: Inline action button styles
  inlineActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: COLORS.brandTeal,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    backgroundColor: 'transparent',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.brandTealLight,
  },
  // Quick Log overlay styles
  imageContainer: {
    position: 'relative',
  },
  quickLogOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.5)',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  quickLogOverlayLogged: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  quickLogText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEAL,
  },
  quickLogTextLogged: {
    color: '#22c55e',
  },
  quickLogNoImage: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.5)',
    marginBottom: 8,
  },
  logToast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  logToastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  // Category Navigation Styles
  categoryNavWrapper: {
    marginTop: 12,
    marginBottom: 4,
    marginHorizontal: -16,
  },
  categoryNavContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: '#2dd4bf',
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  categoryPillTextActive: {
    color: '#0f172a',
  },
  stickyCategoryNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  stickyCategoryBlur: {
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingBottom: 4,
  },
  stickyCategoryAndroid: {
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
  },
  stickySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
});
