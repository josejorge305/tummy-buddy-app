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

// Import components
import {
  COLORS,
  SPACING,
  DishHeader,
  StatusChipsRow,
  StickyActionFooter,
  getFooterHeight,
  DetailBottomSheet,
  FodmapSheetContent,
  AllergensSheetContent,
  BodyImpactSheetContent,
  HeadsUpSection,
  NutritionSection,
  ComponentBreakdownSheet,
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

  // Bottom sheet modal states
  const [showFodmapSheet, setShowFodmapSheet] = useState(false);
  const [showAllergensSheet, setShowAllergensSheet] = useState(false);
  const [showBodyImpactSheet, setShowBodyImpactSheet] = useState(false);
  const [showComponentBreakdown, setShowComponentBreakdown] = useState(false);
  const [showNutritionSheet, setShowNutritionSheet] = useState(false);

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
  const price = (analysis?.likely_recipe as { price?: number | string })?.price;

  // Calculate scroll padding
  const footerPadding = getFooterHeight(insets.bottom);

  // Build allergen data for sheet
  const allergenData = viewModel?.allergens?.map(a => ({
    kind: a.name,
    present: ((a as { present?: string }).present || (a.isUserAllergen ? 'yes' : 'no')) as 'yes' | 'no' | 'maybe',
    detail: null as string | null,
  })) || [];

  // Check if there are fixable issues (allergens or high FODMAP that can be avoided by skipping components)
  const hasUserAllergens = viewModel?.allergens?.some(a => a.isUserAllergen) || false;
  const hasHighFodmap = viewModel?.fodmapLevel === 'high';
  const hasFixableIssues = hasUserAllergens || hasHighFodmap;

  // Build plate components for component breakdown
  const plateComponentsForSheet = viewModel?.plateComponents?.map((pc, idx) => {
    // Determine if this component is safe based on allergens
    const componentAllergen = viewModel?.componentAllergens?.find(ca => ca.component === pc.component);
    const hasAllergenIssue = componentAllergen?.allergenPills?.some(p =>
      viewModel?.allergens?.some(a => a.name === p.name && a.isUserAllergen)
    ) || false;
    const hasFodmapIssue = componentAllergen?.fodmapLevel === 'high';

    return {
      id: String(idx),
      name: pc.component,
      role: pc.role,
      shareRatio: pc.shareRatio,
      calories: pc.energyKcal,
      protein: pc.protein_g,
      carbs: pc.carbs_g,
      fat: pc.fat_g,
      allergens: componentAllergen?.allergenPills?.map(p => p.name) || [],
      fodmapLevel: componentAllergen?.fodmapLevel as 'high' | 'medium' | 'low' | undefined,
      isSafe: !hasAllergenIssue && !hasFodmapIssue,
    };
  }) || [];

  // Count safe components
  const safeComponentCount = plateComponentsForSheet.filter(c => c.isSafe).length;
  const totalComponentCount = plateComponentsForSheet.length;

  // Get allergen and fodmap summaries from API
  const allergenSummary = analysis?.allergen_summary || viewModel?.allergenSentence;
  const fodmapSummary = analysis?.fodmap_summary || viewModel?.fodmapSentence;

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

  // ALL CLEAR STATE - No concerns for this user
  const isAllClear = !hasUserAllergens && !hasHighFodmap && bodyImpactLevel !== 'high';

  // READY STATE - New simplified layout
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
        {/* ZONE 1: DishHeader - hero image, dish name, description (with see more), price */}
        <DishHeader
          imageUrl={dishImageUrl}
          dishName={analysis?.dishName || dishName}
          description={(analysis?.likely_recipe as { description?: string })?.description}
          price={price}
          restaurantName={restaurantName}
        />

        {viewModel && (
          <>
            {/* ZONE 1b: StatusChipsRow - tappable chips that open bottom sheets */}
            <StatusChipsRow
              fodmapLevel={viewModel.fodmapLevel as 'high' | 'medium' | 'low' | null}
              allergens={viewModel.allergens}
              calories={activeNutrition?.calories}
              bodyImpactLevel={bodyImpactLevel}
              onFodmapPress={() => setShowFodmapSheet(true)}
              onAllergensPress={() => setShowAllergensSheet(true)}
              onBodyImpactPress={() => setShowBodyImpactSheet(true)}
            />

            {/* ZONE 2: Heads Up Section - Only shown if there are concerns */}
            {!isAllClear && (
              <HeadsUpSection
                allergenSummary={hasUserAllergens ? allergenSummary : null}
                fodmapSummary={hasHighFodmap ? fodmapSummary : null}
                hasFixableIssues={hasFixableIssues && totalComponentCount > 1}
                safeComponentCount={safeComponentCount}
                totalComponentCount={totalComponentCount}
                onCanIStillEatThis={() => setShowComponentBreakdown(true)}
              />
            )}

            {/* ALL CLEAR message - Only shown if no concerns */}
            {isAllClear && (
              <View style={styles.allClearSection}>
                <View style={styles.allClearHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.severityLow} />
                  <Text style={styles.allClearTitle}>Looks good for you!</Text>
                </View>
                <Text style={styles.allClearText}>
                  No allergens or sensitivities detected based on your profile.
                </Text>
              </View>
            )}

            {/* ZONE 3: Nutrition Section */}
            {activeNutrition && (
              <NutritionSection
                nutrition={activeNutrition}
                insights={viewModel.nutritionInsights}
                sourceLabel={viewModel.nutritionSourceLabel}
                onSeeFullBreakdown={() => setShowNutritionSheet(true)}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Sticky Action Footer */}
      <StickyActionFooter
        onLogMeal={handleLogMeal}
        onViewRecipe={handleViewRecipe}
        isLoggingMeal={isLoggingMeal}
        mealLogged={mealLogged}
        hasRecipe={!!analysis?.likely_recipe}
      />

      {/* FODMAP Bottom Sheet */}
      <DetailBottomSheet
        visible={showFodmapSheet}
        onClose={() => setShowFodmapSheet(false)}
        title="FODMAP / IBS"
        icon="leaf-outline"
        severity={viewModel?.fodmapLevel === 'high' ? 'high' : viewModel?.fodmapLevel === 'medium' ? 'moderate' : 'low'}
      >
        <FodmapSheetContent
          level={(viewModel?.fodmapLevel as 'high' | 'medium' | 'low') || 'low'}
          sentence={viewModel?.fodmapSentence}
          triggerIngredients={viewModel?.fodmapPills}
        />
      </DetailBottomSheet>

      {/* Allergens Bottom Sheet */}
      <DetailBottomSheet
        visible={showAllergensSheet}
        onClose={() => setShowAllergensSheet(false)}
        title="Allergens"
        icon="warning-outline"
        severity={allergenData.some(a => a.present === 'yes') ? 'high' : allergenData.length > 0 ? 'moderate' : 'low'}
      >
        <AllergensSheetContent
          allergens={allergenData}
          sentence={viewModel?.allergenSentence}
        />
      </DetailBottomSheet>

      {/* Body Impact Bottom Sheet */}
      <DetailBottomSheet
        visible={showBodyImpactSheet}
        onClose={() => setShowBodyImpactSheet(false)}
        title="Body Impact"
        icon="body-outline"
        severity={bodyImpactLevel === 'high' ? 'high' : bodyImpactLevel === 'medium' ? 'moderate' : 'low'}
      >
        <BodyImpactSheetContent
          organLines={organLines.map(line => ({
            organKey: line.organKey,
            organLabel: line.organLabel,
            severity: line.severity,
            score: line.score ?? 0,
            sentence: line.sentence ?? undefined,
          }))}
        />
      </DetailBottomSheet>

      {/* Nutrition Full Breakdown Bottom Sheet */}
      <DetailBottomSheet
        visible={showNutritionSheet}
        onClose={() => setShowNutritionSheet(false)}
        title="Nutrition Details"
        icon="nutrition-outline"
      >
        <View style={styles.nutritionSheetContent}>
          {/* Macros */}
          <View style={styles.nutritionGroup}>
            <Text style={styles.nutritionGroupTitle}>Macronutrients</Text>
            <View style={styles.nutritionGrid}>
              <NutritionRow label="Calories" value={activeNutrition?.calories} unit="kcal" />
              <NutritionRow label="Protein" value={activeNutrition?.protein} unit="g" />
              <NutritionRow label="Carbs" value={activeNutrition?.carbs} unit="g" />
              <NutritionRow label="Fat" value={activeNutrition?.fat} unit="g" />
            </View>
          </View>

          {/* Other nutrients */}
          <View style={styles.nutritionGroup}>
            <Text style={styles.nutritionGroupTitle}>Other Nutrients</Text>
            <View style={styles.nutritionGrid}>
              <NutritionRow label="Fiber" value={activeNutrition?.fiber} unit="g" />
              <NutritionRow label="Sugar" value={activeNutrition?.sugar} unit="g" />
              <NutritionRow label="Sodium" value={activeNutrition?.sodium} unit="mg" />
            </View>
          </View>

          {/* Highlights */}
          {viewModel?.nutritionInsights?.highlights && viewModel.nutritionInsights.highlights.length > 0 && (
            <View style={styles.nutritionGroup}>
              <Text style={styles.nutritionGroupTitle}>Highlights</Text>
              {viewModel.nutritionInsights.highlights.map((highlight, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.severityLow} />
                  <Text style={styles.bulletText}>{highlight}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Cautions */}
          {viewModel?.nutritionInsights?.cautions && viewModel.nutritionInsights.cautions.length > 0 && (
            <View style={styles.nutritionGroup}>
              <Text style={styles.nutritionGroupTitle}>Cautions</Text>
              {viewModel.nutritionInsights.cautions.map((caution, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.severityModerate} />
                  <Text style={styles.bulletText}>{caution}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Source */}
          {viewModel?.nutritionSourceLabel && (
            <Text style={styles.nutritionSource}>Source: {viewModel.nutritionSourceLabel}</Text>
          )}
        </View>
      </DetailBottomSheet>

      {/* Component Breakdown Sheet */}
      <ComponentBreakdownSheet
        visible={showComponentBreakdown}
        onClose={() => setShowComponentBreakdown(false)}
        components={plateComponentsForSheet}
        suggestion={
          hasUserAllergens && hasHighFodmap
            ? "Skip components with allergens and high FODMAP to make this dish safer for you."
            : hasUserAllergens
            ? "Skip components containing your allergens to make this dish safer for you."
            : hasHighFodmap
            ? "Skip high FODMAP components to reduce digestive stress."
            : undefined
        }
      />
    </SafeAreaView>
  );
}

// Helper component for nutrition rows
function NutritionRow({ label, value, unit }: { label: string; value?: number | null; unit: string }) {
  return (
    <View style={styles.nutritionRow}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>
        {value != null ? `${Math.round(value)} ${unit}` : '--'}
      </Text>
    </View>
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
  // All Clear section
  allClearSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: 'rgba(53,194,126,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(53,194,126,0.2)',
  },
  allClearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  allClearTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.severityLow,
  },
  allClearText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  // Nutrition sheet content
  nutritionSheetContent: {
    padding: SPACING.lg,
  },
  nutritionGroup: {
    marginBottom: SPACING.lg,
  },
  nutritionGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutritionGrid: {
    gap: SPACING.sm,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  nutritionLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  nutritionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  nutritionSource: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
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
