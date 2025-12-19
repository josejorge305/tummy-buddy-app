import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnalyzeDishResponse, analyzeDish, fetchDishImage } from '../api/api';
import { buildDishViewModel, DishOrganLine } from './utils/dishViewModel';
import { cacheDishAnalysis, getCachedDish } from '../utils/dishCache';
import { useUserPrefs } from '../context/UserPrefsContext';
import BrandTitle from '../components/BrandTitle';
import * as Haptics from 'expo-haptics';

// Import new components
import {
  COLORS,
  SPACING,
  DishHeader,
  StatusChipsRow,
  ComponentSelector,
  FodmapCard,
  AllergensCard,
  BodyImpactCard,
  NutritionCard,
  StickyActionFooter,
  getFooterHeight,
} from '../components/dish';

const RestaurantAIIcon = require('../assets/images/REstaurant AI Icon.png');

// Loading messages for dish analysis - UNCHANGED
const ANALYSIS_LOADING_MESSAGES = [
  { icon: 'search-outline', text: 'Finding recipe match...' },
  { icon: 'list-outline', text: 'Identifying ingredients...' },
  { icon: 'warning-outline', text: 'Scanning for allergens...' },
  { icon: 'leaf-outline', text: 'Checking FODMAP levels...' },
  { icon: 'nutrition-outline', text: 'Calculating nutrition...' },
  { icon: 'fitness-outline', text: 'Analyzing body impact...' },
  { icon: 'sparkles-outline', text: 'Finalizing analysis...' },
];

// Loading messages for photo analysis - UNCHANGED
const PHOTO_ANALYSIS_LOADING_MESSAGES = [
  { icon: 'eye-outline', text: 'Recognizing your dish...' },
  { icon: 'fast-food-outline', text: 'Identifying what you\'re eating...' },
  { icon: 'search-outline', text: 'Finding recipe match...' },
  { icon: 'warning-outline', text: 'Scanning for allergens...' },
  { icon: 'nutrition-outline', text: 'Calculating nutrition...' },
  { icon: 'fitness-outline', text: 'Analyzing body impact...' },
  { icon: 'sparkles-outline', text: 'Finalizing analysis...' },
];

// UNCHANGED: DishLoadingScreen component - keeping exact same design/behavior
function DishLoadingScreen({ dishName, imageUrl, fromPhoto }: { dishName: string; imageUrl?: string; fromPhoto?: boolean }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  const loadingMessages = fromPhoto ? PHOTO_ANALYSIS_LOADING_MESSAGES : ANALYSIS_LOADING_MESSAGES;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 3000);
    return () => clearInterval(messageTimer);
  }, [loadingMessages.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentMessage = loadingMessages[messageIndex];
  const showLongWait = elapsedSeconds > 15;

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.heroSection}>
        <LinearGradient colors={['#0f172a', COLORS.background]} style={styles.heroGradientBg}>
          <View style={styles.heroIconContainer}>
            <View style={styles.heroIconGlow} />
            <Image source={RestaurantAIIcon} style={styles.heroIcon} resizeMode="contain" />
          </View>
        </LinearGradient>
      </View>

      <View style={styles.loadingContent}>
        <BrandTitle size="large" showIcon={false} />

        <View style={styles.loaderBox}>
          <Animated.View style={[styles.spinnerGlow, { opacity: pulseAnim }]} />
          <ActivityIndicator size="large" color={COLORS.brandTeal} />
        </View>

        <View style={styles.messageRow}>
          <Ionicons name={currentMessage.icon as any} size={18} color={COLORS.brandTeal} />
          <Text style={styles.messageText}>{currentMessage.text}</Text>
        </View>

        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${Math.min(((messageIndex + 1) / loadingMessages.length) * 100, 95)}%` },
            ]}
          />
        </View>

        {elapsedSeconds > 5 && <Text style={styles.elapsedText}>{elapsedSeconds}s</Text>}
        {showLongWait && (
          <Text style={styles.longWaitText}>This dish requires deeper analysis - hang tight!</Text>
        )}
      </View>
    </View>
  );
}

// Get overall body impact level from organ lines
function getOverallBodyImpactLevel(organLines: DishOrganLine[]): 'high' | 'medium' | 'low' | null {
  if (!organLines || organLines.length === 0) return null;
  const nonNeutral = organLines.filter(o => o.severity !== 'neutral');
  if (nonNeutral.length === 0) return null;
  if (nonNeutral.some(o => o.severity === 'high')) return 'high';
  if (nonNeutral.some(o => o.severity === 'medium')) return 'medium';
  return 'low';
}

export default function DishScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { selectedAllergens = [], logMealAction } = useUserPrefs();

  const dishName = params.dishName as string;
  const restaurantName = params.restaurantName as string | undefined;
  const restaurantAddress = params.restaurantAddress as string | undefined;
  const placeId = params.placeId as string | undefined;
  const imageUrl = params.imageUrl as string | undefined;
  const fromPhoto = params.fromPhoto === 'true';

  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalyzeDishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedImageUrl, setFetchedImageUrl] = useState<string | null>(null);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [mealLogged, setMealLogged] = useState(false);

  // Component selector state
  const [selectedComponentIndex, setSelectedComponentIndex] = useState<number | null>(null);

  useEffect(() => {
    loadDishAnalysis();
  }, [dishName]);

  const fetchImageIfNeeded = async (currentImageUrl: string | null | undefined) => {
    if (currentImageUrl) return;
    try {
      const imageResult = await fetchDishImage(dishName);
      if (imageResult.ok && imageResult.image) {
        setFetchedImageUrl(imageResult.image);
      }
    } catch (e) {
      console.log('Failed to fetch dish image:', e);
    }
  };

  const loadDishAnalysis = async () => {
    if (!dishName) {
      setError('No dish name provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setFetchedImageUrl(null);

      if (!fromPhoto) {
        const cached = await getCachedDish(dishName, placeId);
        if (cached && cached.analysis) {
          setAnalysis(cached.analysis);
          setIsLoading(false);
          const cachedImage = cached.imageUrl || cached.analysis.recipe_image;
          if (!imageUrl && !cachedImage) {
            fetchImageIfNeeded(null);
          }
          return;
        }
      }

      const result = await analyzeDish({
        dishName,
        restaurantName: restaurantName || null,
        placeId: placeId || null,
        source: fromPhoto ? 'photo_analysis' : 'standalone_dish_search',
        imageUrl: imageUrl || null,
        fullRecipe: true,
      });

      if (result.ok) {
        setAnalysis(result);
        const correctedDishName = result.dishName || dishName;
        const cacheImageUrl = imageUrl || result.recipe_image || undefined;
        await cacheDishAnalysis(correctedDishName, result, {
          restaurantName,
          restaurantAddress,
          placeId,
          imageUrl: cacheImageUrl,
          source: restaurantName ? 'restaurant' : 'standalone',
        });
        if (!imageUrl && !result.recipe_image) {
          fetchImageIfNeeded(null);
        }
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (e: any) {
      console.error('Dish analysis error:', e);
      setError(e?.message || 'Failed to analyze dish');
    } finally {
      setIsLoading(false);
    }
  };

  const viewModel = analysis && analysis.ok ? buildDishViewModel(analysis, selectedAllergens) : null;

  const handleLogMeal = async () => {
    if (!analysis || isLoggingMeal) return;

    setIsLoggingMeal(true);
    try {
      const organImpacts: Record<string, number> = {};
      if (analysis.organs?.organs) {
        for (const org of analysis.organs.organs) {
          if (org.organ && typeof org.score === 'number') {
            organImpacts[org.organ.toLowerCase()] = org.score;
          }
        }
      }

      const riskFlags: string[] = [];
      if (analysis.allergen_flags) {
        for (const flag of analysis.allergen_flags) {
          if (flag.present === 'yes') {
            riskFlags.push(`allergen_${flag.kind}`);
          }
        }
      }
      if (analysis.fodmap_flags?.level === 'high') {
        riskFlags.push('high_fodmap');
      }
      if (analysis.nutrition_summary?.sodium_mg && analysis.nutrition_summary.sodium_mg > 1000) {
        riskFlags.push('high_sodium');
      }

      const result = await logMealAction({
        dish_name: analysis.dishName || dishName,
        dish_id: `${dishName}-${Date.now()}`,
        restaurant_name: restaurantName,
        calories: analysis.nutrition_summary?.energyKcal || undefined,
        protein_g: analysis.nutrition_summary?.protein_g || undefined,
        carbs_g: analysis.nutrition_summary?.carbs_g || undefined,
        fat_g: analysis.nutrition_summary?.fat_g || undefined,
        fiber_g: analysis.nutrition_summary?.fiber_g || undefined,
        sugar_g: analysis.nutrition_summary?.sugar_g || undefined,
        sodium_mg: analysis.nutrition_summary?.sodium_mg || undefined,
        organ_impacts: Object.keys(organImpacts).length > 0 ? organImpacts : undefined,
        risk_flags: riskFlags.length > 0 ? riskFlags : undefined,
        full_analysis: analysis,
      });

      if (result.success) {
        setMealLogged(true);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}

        if (result.duplicate) {
          Alert.alert('Already Logged', 'This dish was already logged today.', [{ text: 'OK' }]);
        } else {
          Alert.alert(
            'Meal Logged!',
            `${analysis.dishName || dishName} added to tracker.${analysis.nutrition_summary?.energyKcal ? `\n+${Math.round(analysis.nutrition_summary.energyKcal)} cal` : ''}`,
            [
              { text: 'View Tracker', onPress: () => router.push('/(tabs)/explore' as any) },
              { text: 'OK' },
            ]
          );
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to log meal.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setIsLoggingMeal(false);
    }
  };

  const handleViewRecipe = () => {
    const dishImageUrl = imageUrl || analysis?.recipe_image || fetchedImageUrl || '';
    router.push({
      pathname: '/likely-recipe',
      params: {
        dishName: dishName || 'Unknown Dish',
        imageUrl: dishImageUrl,
        likelyRecipe: analysis?.likely_recipe ? JSON.stringify(analysis.likely_recipe) : '',
        fullRecipe: analysis?.full_recipe ? JSON.stringify(analysis.full_recipe) : '',
        nutrition: analysis?.nutrition_summary ? JSON.stringify(analysis.nutrition_summary) : '',
        allergens: analysis?.allergen_flags ? JSON.stringify(analysis.allergen_flags) : '[]',
        fodmap: analysis?.fodmap_flags ? JSON.stringify(analysis.fodmap_flags) : '',
        nutritionSource: analysis?.nutrition_source || '',
      },
    });
  };

  // Derived data
  const organLines = viewModel?.organLines || [];
  const bodyImpactLevel = getOverallBodyImpactLevel(organLines);
  const activeNutrition = viewModel?.nutrition || null;
  const dishImageUrl = imageUrl || analysis?.recipe_image || fetchedImageUrl || null;
  const price = analysis?.likely_recipe?.price;

  // Build plate components for selector
  const plateComponents = viewModel?.plateComponents?.map((pc, idx) => ({
    id: String(idx),
    name: pc.component,
    role: pc.role,
  })) || [];

  // Calculate scroll padding
  const footerPadding = getFooterHeight(insets.bottom);

  // LOADING STATE - Show analyzing UI (UNCHANGED)
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <DishLoadingScreen dishName={dishName} imageUrl={imageUrl} fromPhoto={fromPhoto} />
      </SafeAreaView>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.severityHigh} />
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDishAnalysis}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // READY STATE - Show full analysis with new layout
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{dishName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPadding }]}
      >
        {/* A) DishHeader: hero image, dish name, description, price */}
        <DishHeader
          imageUrl={dishImageUrl}
          dishName={analysis?.dishName || dishName}
          description={analysis?.likely_recipe?.description}
          price={price}
          restaurantName={restaurantName}
        />

        {viewModel && (
          <>
            {/* C) StatusChipsRow - horizontal scrollable */}
            <StatusChipsRow
              fodmapLevel={viewModel.fodmapLevel as 'high' | 'medium' | 'low' | null}
              allergens={viewModel.allergens}
              calories={activeNutrition?.calories}
              bodyImpactLevel={bodyImpactLevel}
            />

            {/* D) Component Selector - Whole Plate | Component... */}
            <ComponentSelector
              components={plateComponents}
              selectedIndex={selectedComponentIndex}
              onSelect={setSelectedComponentIndex}
            />

            {/* Accordion Cards Section */}
            <View style={styles.cardsSection}>
              {/* FODMAP / IBS Card */}
              {viewModel.fodmapLevel && (
                <FodmapCard
                  level={viewModel.fodmapLevel as 'high' | 'medium' | 'low'}
                  sentence={viewModel.fodmapSentence}
                  triggerIngredients={viewModel.fodmapPills}
                />
              )}

              {/* Allergens Card */}
              <AllergensCard
                allergens={viewModel.allergens}
                sentence={viewModel.allergenSentence}
              />

              {/* Body Impact Card (Organs) */}
              <BodyImpactCard
                organLines={organLines.map(line => ({
                  organKey: line.organKey,
                  organLabel: line.organLabel,
                  severity: line.severity,
                  score: line.score,
                  sentence: line.sentence,
                }))}
              />

              {/* Nutrition Card */}
              {activeNutrition && (
                <NutritionCard
                  nutrition={activeNutrition}
                  insight={viewModel.nutritionInsights?.summary}
                  sourceLabel={viewModel.nutritionSourceLabel}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky Action Footer - Only shown when analysis is ready */}
      <StickyActionFooter
        onLogMeal={handleLogMeal}
        onViewRecipe={handleViewRecipe}
        isLoggingMeal={isLoggingMeal}
        mealLogged={mealLogged}
        hasRecipe={!!analysis?.likely_recipe}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  cardsSection: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  // Loading styles - UNCHANGED
  loadingContainer: { flex: 1 },
  heroSection: { height: 220 },
  heroGradientBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroIconContainer: { alignItems: 'center', justifyContent: 'center' },
  heroIconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(24, 214, 198, 0.15)',
  },
  heroIcon: { width: 120, height: 120 },
  loadingContent: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 24 },
  loaderBox: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  spinnerGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(24, 214, 198, 0.3)',
  },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  messageText: { fontSize: 16, fontWeight: '500', color: '#e2e8f0' },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.cardSurface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.brandTeal, borderRadius: 2 },
  elapsedText: { fontSize: 14, color: COLORS.textMuted, marginBottom: 8 },
  longWaitText: { fontSize: 14, color: COLORS.severityModerate, fontStyle: 'italic', textAlign: 'center' },
  // Error styles
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: COLORS.brandTeal, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  retryButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.background },
  backButton: { paddingHorizontal: 24, paddingVertical: 12 },
  backButtonText: { fontSize: 16, color: COLORS.textSecondary },
});
