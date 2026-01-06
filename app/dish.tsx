import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
// Note: useSafeAreaInsets removed - using inline action buttons instead of sticky footer
import { AnalyzeDishResponse, analyzeDish, fetchDishImage, pollOrgansStatus, pollAllergensStatus } from '../api/api';
import { buildDishViewModel, DishOrganLine } from '../utils/dishViewModel';
import { cacheDishAnalysis, getCachedDish } from '../utils/dishCache';
import { recordCacheHit, recordCacheMiss, recordCacheStore, logMetrics } from '../utils/cacheMetrics';
import { useUserPrefs } from '../context/UserPrefsContext';
import BrandTitle from '../components/BrandTitle';
import * as Haptics from 'expo-haptics';
import { MealLogModal, MealLogData } from '../components/MealLogModal';
import { PortionMode } from '../components/PortionSheet';
import { logMeal, getMealsForDate } from '../api/api';
import { logDebug, logWarn, logError } from '../utils/logger';
import { showErrorAlert } from '../utils/errorMessages';

// Import components
import {
  COLORS,
  SPACING,
  DishHeader,
  NutritionSection,
  // New v3 modules
  AllergensModule,
  DigestiveImpactModule,
  LongTermHealthModule,
  InlineActionButtons,
} from '../components/dish';
import type { AllergenWithSource, FodmapCategory, OrganImpact } from '../components/dish';

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
  const { selectedAllergens = [], logMealAction, userId, loadDailyTracker } = useUserPrefs();

  const dishName = params.dishName as string;
  const restaurantName = params.restaurantName as string | undefined;
  const restaurantAddress = params.restaurantAddress as string | undefined;
  const placeId = params.placeId as string | undefined;
  const rawImageUrl = params.imageUrl as string | undefined;
  const imageUrl = rawImageUrl ? decodeURIComponent(rawImageUrl) : undefined;
  const fromPhoto = params.fromPhoto === 'true';

  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalyzeDishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedImageUrl, setFetchedImageUrl] = useState<string | null>(null);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [mealLogged, setMealLogged] = useState(false);
  const [organsLoading, setOrgansLoading] = useState(false);
  const [allergensLoading, setAllergensLoading] = useState(false);
  const [showMealLogModal, setShowMealLogModal] = useState(false);

  // Note: Bottom sheet modals removed - using expandable modules now

  useEffect(() => {
    loadDishAnalysis();
    // Note: imageUrl is included because photo analysis uses the same placeholder dishName
    // ("Photo Analysis") for all photos, so we need to re-trigger when the image changes
  }, [dishName, imageUrl]);

  // Helper function to redirect to likely-recipe screen with all data
  const redirectToLikelyRecipe = useCallback((analysisData: AnalyzeDishResponse, finalImageUrl: string) => {
    const vm = buildDishViewModel(analysisData, selectedAllergens, { name: dishName });

    router.replace({
      pathname: '/likely-recipe',
      params: {
        dishName: analysisData.dishName || dishName || 'Unknown Dish',
        imageUrl: finalImageUrl ? encodeURIComponent(finalImageUrl) : '',
        likelyRecipe: analysisData.likely_recipe ? JSON.stringify(analysisData.likely_recipe) : '',
        fullRecipe: analysisData.full_recipe ? JSON.stringify(analysisData.full_recipe) : '',
        nutrition: analysisData.nutrition_summary ? JSON.stringify(analysisData.nutrition_summary) : '',
        nutritionInsights: analysisData.nutrition_insights ? JSON.stringify(analysisData.nutrition_insights) : '',
        nutritionSourceLabel: vm?.nutritionSourceLabel || '',
        allergens: analysisData.allergen_flags ? JSON.stringify(analysisData.allergen_flags) : '[]',
        allergenSummary: analysisData.allergen_summary || '',
        fodmap: analysisData.fodmap_flags ? JSON.stringify(analysisData.fodmap_flags) : '',
        fodmapSummary: analysisData.fodmap_summary || '',
        organs: analysisData.organs ? JSON.stringify(analysisData.organs) : '',
        nutritionSource: analysisData.nutrition_source || '',
        restaurantName: restaurantName || '',
        restaurantAddress: restaurantAddress || '',
      },
    });
  }, [dishName, restaurantName, restaurantAddress, selectedAllergens, router]);

  // Fetch dish image if not already available - returns the image URL
  const fetchImageIfNeeded = async (currentImageUrl: string | null | undefined): Promise<string | null> => {
    if (currentImageUrl) return currentImageUrl;
    try {
      const imageResult = await fetchDishImage(dishName);
      if (imageResult.ok && imageResult.image) {
        setFetchedImageUrl(imageResult.image);
        return imageResult.image;
      }
    } catch (e) {
      logDebug('Failed to fetch dish image:', e);
    }
    return null;
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
      setAnalysis(null); // Reset analysis to prevent showing stale data from previous photo
      setMealLogged(false); // Reset meal logged state for new analysis

      if (!fromPhoto) {
        const cached = await getCachedDish(dishName, placeId);
        if (cached && cached.analysis) {
          recordCacheHit(dishName);
          logMetrics(); // Log current stats

          // Determine final image URL - fetch if needed
          let finalImageUrl = imageUrl || cached.imageUrl || cached.analysis.recipe_image || '';
          if (!finalImageUrl) {
            const fetchedImage = await fetchImageIfNeeded(null);
            if (fetchedImage) {
              finalImageUrl = fetchedImage;
            }
          }

          // Redirect directly with the image URL (don't rely on state/useEffect)
          setAnalysis(cached.analysis);
          setIsLoading(false);
          redirectToLikelyRecipe(cached.analysis, finalImageUrl);
          return;
        }
        recordCacheMiss(dishName);
      }

      const result = await analyzeDish({
        dishName,
        restaurantName: restaurantName || null,
        placeId: placeId || null,
        source: fromPhoto ? 'photo_analysis' : 'standalone_dish_search',
        imageUrl: imageUrl || null,
        fullRecipe: true,
        skip_organs: true,
        skip_allergens: true,
        // Note: full recipe loads synchronously by default (backend skipFullRecipe=false)
      });

      if (result.ok) {
        const correctedDishName = result.dishName || dishName;
        const cacheImageUrl = imageUrl || result.recipe_image || undefined;

        // Start organs polling in background if organs are pending
        if (result.organs_pending && result.organs_poll_key) {
          setOrgansLoading(true);
          pollOrgansStatus(result.organs_poll_key)
            .then(async (organsResult) => {
              if (organsResult.ok && organsResult.ready && organsResult.organs) {
                // Update analysis with organs data
                setAnalysis((prev) => prev ? {
                  ...prev,
                  organs: organsResult.organs,
                  organs_pending: false,
                  organs_poll_key: undefined,
                } : prev);
                // Update cache with organs data
                try {
                  await cacheDishAnalysis(correctedDishName, { ...result, organs: organsResult.organs, organs_pending: false }, {
                    restaurantName,
                    restaurantAddress,
                    placeId,
                    imageUrl: cacheImageUrl,
                    source: restaurantName ? 'restaurant' : 'standalone',
                  });
                } catch (cacheError) {
                  logError('Failed to cache organs update:', cacheError);
                }
              }
            })
            .catch((e) => {
              logError('Organs polling error:', e);
            })
            .finally(() => {
              setOrgansLoading(false);
            });
        }

        // Start allergens polling in background if allergens are pending
        if (result.allergens_pending && result.allergens_poll_key) {
          setAllergensLoading(true);
          pollAllergensStatus(result.allergens_poll_key)
            .then(async (allergensResult) => {
              if (allergensResult.ok && allergensResult.ready) {
                // Update analysis with detailed allergen data
                setAnalysis((prev) => prev ? {
                  ...prev,
                  allergen_flags: allergensResult.allergen_flags || prev.allergen_flags,
                  fodmap_flags: allergensResult.fodmap_flags || prev.fodmap_flags,
                  lactose_flags: allergensResult.lactose_flags || prev.lactose_flags,
                  lifestyle_tags: allergensResult.lifestyle_tags || prev.lifestyle_tags,
                  lifestyle_checks: allergensResult.lifestyle_checks || prev.lifestyle_checks,
                  allergen_breakdown: allergensResult.allergen_breakdown || prev.allergen_breakdown,
                  allergens_pending: false,
                  allergens_poll_key: undefined,
                } : prev);
                // Update cache with allergen data
                try {
                  await cacheDishAnalysis(correctedDishName, {
                    ...result,
                    allergen_flags: allergensResult.allergen_flags || result.allergen_flags,
                    fodmap_flags: allergensResult.fodmap_flags || result.fodmap_flags,
                    lactose_flags: allergensResult.lactose_flags || result.lactose_flags,
                    lifestyle_tags: allergensResult.lifestyle_tags || result.lifestyle_tags,
                    lifestyle_checks: allergensResult.lifestyle_checks || result.lifestyle_checks,
                    allergen_breakdown: allergensResult.allergen_breakdown || result.allergen_breakdown,
                    allergens_pending: false,
                  }, {
                    restaurantName,
                    restaurantAddress,
                    placeId,
                    imageUrl: cacheImageUrl,
                    source: restaurantName ? 'restaurant' : 'standalone',
                  });
                } catch (cacheError) {
                  logError('Failed to cache allergens update:', cacheError);
                }
              }
            })
            .catch((e) => {
              logError('Allergens polling error:', e);
            })
            .finally(() => {
              setAllergensLoading(false);
            });
        }

        // Fetch image if not available from route params or analysis response
        // This must complete BEFORE redirect so the recipe card shows the image
        let finalImageUrl = imageUrl || result.recipe_image || '';
        if (!finalImageUrl) {
          const fetchedImage = await fetchImageIfNeeded(null);
          if (fetchedImage) {
            finalImageUrl = fetchedImage;
          }
        }

        await cacheDishAnalysis(correctedDishName, result, {
          restaurantName,
          restaurantAddress,
          placeId,
          imageUrl: finalImageUrl || undefined,
          source: restaurantName ? 'restaurant' : 'standalone',
        });
        recordCacheStore(correctedDishName);

        // Set state and redirect directly with the final image URL
        setAnalysis(result);
        setIsLoading(false);
        redirectToLikelyRecipe(result, finalImageUrl);
      } else {
        setError(result.error || 'Analysis failed');
        setIsLoading(false);
      }
    } catch (e: any) {
      logError('Dish analysis error:', e);
      setError(e?.message || 'Failed to analyze dish');
      setIsLoading(false);
    }
  };

  const viewModel = analysis && analysis.ok ? buildDishViewModel(analysis, selectedAllergens, { name: dishName }) : null;

  // Open meal log modal instead of logging directly
  const handleLogMeal = () => {
    if (!analysis || isLoggingMeal) return;
    setShowMealLogModal(true);
  };

  // Handle meal log completion from MealLogModal
  const handleMealLogComplete = async (logData: MealLogData) => {
    if (!userId || !analysis) {
      setShowMealLogModal(false);
      return;
    }

    setIsLoggingMeal(true);

    try {
      // Build organ impacts from analysis
      const baselineOrganImpacts: Record<string, number> = {};
      if (analysis.organs?.organs) {
        for (const org of analysis.organs.organs) {
          if (org.organ && typeof org.score === 'number') {
            baselineOrganImpacts[org.organ.toLowerCase()] = org.score;
          }
        }
      }

      // Build risk flags
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

      // Use data from photo analysis if available, otherwise fall back to recipe data
      const usePhotoAnalysisData = logData.usePhotoAnalysis && logData.analysis;
      const effectiveAnalysis = usePhotoAnalysisData ? logData.analysis! : analysis;

      // Get baseline (full serving) values from analysis
      // Note: NutritionSummary uses snake_case (protein_g), but photo analysis creates camelCase (proteinG)
      const ns = effectiveAnalysis.nutrition_summary as any;
      const baselineCalories = ns?.energyKcal || 0;
      const baselineProtein = ns?.protein_g ?? ns?.proteinG ?? 0;
      const baselineCarbs = ns?.carbs_g ?? ns?.carbsG ?? 0;
      const baselineFat = ns?.fat_g ?? ns?.fatG ?? 0;
      const baselineFiber = ns?.fiber_g ?? ns?.fiberG ?? 0;
      const baselineSugar = ns?.sugar_g ?? ns?.sugarG ?? 0;
      const baselineSodium = ns?.sodium_mg ?? ns?.sodiumMg ?? 0;

      // Calculate portion multiplier from percent
      const portionMultiplier = logData.portionPercent / 100;

      // Determine photo status
      let photoStatus: 'pending_after_photo' | 'analyzing' | 'completed' | 'manual' | null = null;
      if (logData.usePhotoAnalysis) {
        if (logData.afterPhotoPending) {
          photoStatus = 'pending_after_photo';
        } else if (logData.photoAnalysis) {
          photoStatus = 'completed';
        }
      } else {
        photoStatus = 'manual';
      }

      // Call logMeal API
      await logMeal(userId, {
        dish_name: effectiveAnalysis.dishName || dishName,
        dish_id: `${dishName}-${Date.now()}`,
        restaurant_name: restaurantName,
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
        baseline_organ_impacts: Object.keys(baselineOrganImpacts).length > 0 ? baselineOrganImpacts : undefined,
        calories: Math.round(baselineCalories * portionMultiplier),
        protein_g: Math.round(baselineProtein * portionMultiplier),
        carbs_g: Math.round(baselineCarbs * portionMultiplier),
        fat_g: Math.round(baselineFat * portionMultiplier),
        fiber_g: Math.round(baselineFiber * portionMultiplier),
        sugar_g: Math.round(baselineSugar * portionMultiplier),
        sodium_mg: Math.round(baselineSodium * portionMultiplier),
        risk_flags: riskFlags.length > 0 ? riskFlags : undefined,
        organ_impacts: Object.keys(baselineOrganImpacts).length > 0 ? baselineOrganImpacts : undefined,
        full_analysis: effectiveAnalysis,
        // Photo analysis fields
        photo_status: photoStatus,
        before_photo_url: logData.beforePhotoUrl,
        after_photo_url: logData.afterPhotoUrl,
      });

      setMealLogged(true);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      // Reload tracker
      loadDailyTracker();

      const scaledCalories = Math.round(baselineCalories * portionMultiplier);
      const portionLabel = logData.sharedWithCount
        ? `Shared (${logData.sharedWithCount})`
        : `${logData.portionPercent}%`;

      Alert.alert(
        'Meal Logged!',
        `${analysis.dishName || dishName} (${portionLabel}) added to tracker.${scaledCalories ? `\n+${scaledCalories} cal` : ''}`,
        [
          { text: 'View Tracker', onPress: () => router.push('/(tabs)/explore' as any) },
          { text: 'OK' },
        ]
      );
    } catch (e: any) {
      showErrorAlert('meal', 'default');
    }

    setIsLoggingMeal(false);
    setShowMealLogModal(false);
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
        nutritionInsights: analysis?.nutrition_insights ? JSON.stringify(analysis.nutrition_insights) : '',
        nutritionSourceLabel: viewModel?.nutritionSourceLabel || '',
        allergens: analysis?.allergen_flags ? JSON.stringify(analysis.allergen_flags) : '[]',
        allergenSummary: analysis?.allergen_summary || '',
        fodmap: analysis?.fodmap_flags ? JSON.stringify(analysis.fodmap_flags) : '',
        fodmapSummary: analysis?.fodmap_summary || '',
        organs: analysis?.organs ? JSON.stringify(analysis.organs) : '',
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

  // Build allergen data for the new AllergensModule
  const allergensWithSource: AllergenWithSource[] = (analysis?.allergen_flags || []).map(flag => {
    // Find source from likely_recipe ingredients if available
    let source: string | null = null;
    if (analysis?.likely_recipe?.ingredients) {
      const ingredients = analysis.likely_recipe.ingredients as Array<{ name?: string; ingredient?: string }>;
      const matchingIngredients = ingredients
        .filter(ing => {
          const ingName = (ing.name || ing.ingredient || '').toLowerCase();
          return ingName.includes(flag.kind.toLowerCase());
        })
        .map(ing => ing.name || ing.ingredient)
        .filter(Boolean);
      if (matchingIngredients.length > 0) {
        source = matchingIngredients.join(', ');
      }
    }
    // Use the message from the flag if no ingredient match
    if (!source && flag.message) {
      source = flag.message;
    }
    // Capitalize allergen name for display
    const displayName = flag.kind.charAt(0).toUpperCase() + flag.kind.slice(1);
    return {
      name: displayName,
      present: flag.present,
      source,
      isUserAllergen: viewModel?.allergens?.some(a =>
        a.name.toLowerCase() === flag.kind.toLowerCase() && a.isUserAllergen
      ) || false,
    };
  });

  // Build FODMAP categories for DigestiveImpactModule
  const fodmapCategories: FodmapCategory[] = [];
  if (viewModel?.fodmapPills && viewModel.fodmapPills.length > 0) {
    // Group fodmap triggers - for now, create a single "Triggers" category
    // In the future, this could be expanded to show individual FODMAP types
    fodmapCategories.push({
      name: 'Triggers',
      level: (viewModel.fodmapLevel as 'high' | 'moderate' | 'low') || 'low',
      sources: viewModel.fodmapPills.join(', '),
    });
  }

  // Build organ impacts for LongTermHealthModule (deduplicated - one concern per organ)
  const organImpacts: OrganImpact[] = organLines
    .filter(line => line.severity !== 'neutral' && line.severity !== 'low')
    .map(line => ({
      organName: line.organLabel,
      level: line.severity === 'medium' ? 'moderate' : line.severity as 'high' | 'moderate' | 'low' | 'beneficial',
      concern: line.sentence || `${line.severity === 'high' ? 'Significant' : 'Moderate'} impact on ${line.organLabel.toLowerCase()}`,
    }));

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

  // READY STATE - New simplified layout with three expandable modules
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
        contentContainerStyle={styles.scrollContent}
      >
        {/* ZONE 1: DishHeader - hero image, dish name, description (with see more), price */}
        <DishHeader
          imageUrl={dishImageUrl}
          dishName={analysis?.dishName || dishName}
          description={
            analysis?.full_recipe?.full_recipe?.description ||
            analysis?.full_recipe?.full_recipe?.introduction ||
            null
          }
          price={price}
          restaurantName={restaurantName}
        />

        {viewModel && (
          <>
            {/* ZONE 2: NutritionSection - Macros bar (kcal in teal, rest white) */}
            {activeNutrition && (
              <NutritionSection
                nutrition={activeNutrition}
                insights={viewModel.nutritionInsights}
                sourceLabel={viewModel.nutritionSourceLabel}
              />
            )}

            {/* MODULE 1: Allergens - tags always visible, smart sentence on expand */}
            <AllergensModule
              allergens={allergensWithSource}
              smartSentence={analysis?.allergen_summary || viewModel?.allergenSentence}
              loading={allergensLoading}
            />

            {/* MODULE 2: Digestive Impact - FODMAP breakdown */}
            <DigestiveImpactModule
              level={viewModel.fodmapLevel as 'high' | 'medium' | 'moderate' | 'low' | null}
              categories={fodmapCategories}
              explanation={viewModel.fodmapSentence}
            />

            {/* MODULE 3: Long-term Health - Organ impacts (deduplicated) */}
            <LongTermHealthModule
              overallLevel={bodyImpactLevel === 'medium' ? 'moderate' : bodyImpactLevel}
              organImpacts={organImpacts}
              loading={organsLoading}
            />

            {/* INGREDIENTS SECTION - Two-tone styling */}
            {analysis?.likely_recipe?.ingredients && analysis.likely_recipe.ingredients.length > 0 && (
              <View style={styles.ingredientsSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="list-outline" size={20} color={COLORS.brandTeal} />
                  <Text style={styles.sectionHeaderText}>Ingredients</Text>
                  <Text style={styles.sectionBadge}>{analysis.likely_recipe.ingredients.length} items</Text>
                </View>
                <View style={styles.ingredientsList}>
                  {(analysis.likely_recipe.ingredients as Array<{ name?: string; ingredient?: string; amount?: string; quantity?: string }>).slice(0, 8).map((ing, idx) => {
                    const ingName = ing.name || ing.ingredient || '';
                    const amount = ing.amount || ing.quantity || '';
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.ingredientRow,
                          idx % 2 === 0 ? styles.ingredientRowEven : styles.ingredientRowOdd
                        ]}
                      >
                        <Text style={styles.ingredientBullet}>•</Text>
                        {amount ? (
                          <Text style={styles.ingredientText}>
                            <Text style={styles.ingredientAmount}>{amount}</Text> {ingName}
                          </Text>
                        ) : (
                          <Text style={styles.ingredientText}>{ingName}</Text>
                        )}
                      </View>
                    );
                  })}
                  {analysis.likely_recipe.ingredients.length > 8 && (
                    <TouchableOpacity onPress={handleViewRecipe} style={styles.viewMoreIngredients}>
                      <Text style={styles.viewMoreText}>
                        +{analysis.likely_recipe.ingredients.length - 8} more ingredients
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={COLORS.brandTeal} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* WINE PAIRING SECTION */}
            {analysis?.full_recipe?.full_recipe?.wine_pairing && (
              <View style={styles.winePairingSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="wine-outline" size={20} color="#c084fc" />
                  <Text style={styles.sectionHeaderText}>Wine Pairing</Text>
                </View>
                <View style={styles.winePairingCard}>
                  <Ionicons name="wine" size={24} color="#c084fc" />
                  <Text style={styles.winePairingText}>
                    {analysis.full_recipe.full_recipe.wine_pairing}
                  </Text>
                </View>
              </View>
            )}

            {/* STORAGE SECTION */}
            {analysis?.full_recipe?.full_recipe?.storage && (
              <View style={styles.storageSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="snow-outline" size={20} color="#38bdf8" />
                  <Text style={styles.sectionHeaderText}>Storage</Text>
                </View>
                <View style={styles.storageCard}>
                  <Ionicons name="cube-outline" size={24} color="#38bdf8" />
                  <Text style={styles.storageText}>
                    {analysis.full_recipe.full_recipe.storage}
                  </Text>
                </View>
              </View>
            )}

            {/* ACTION BUTTONS - Inline, only shown when analysis complete */}
            <InlineActionButtons
              isAnalysisLoading={false}
              onLogMeal={handleLogMeal}
              onViewRecipe={handleViewRecipe}
              isLoggingMeal={isLoggingMeal}
              mealLogged={mealLogged}
              hasRecipe={!!analysis?.likely_recipe}
            />
          </>
        )}
      </ScrollView>

      {/* MealLogModal for meal logging with photo analysis option */}
      <MealLogModal
        visible={showMealLogModal}
        onClose={() => setShowMealLogModal(false)}
        onLogComplete={handleMealLogComplete}
        dishName={analysis?.dishName || dishName}
        dishId={`${dishName}-${Date.now()}`}
        restaurantName={restaurantName}
        analysis={analysis || undefined}
        userId={userId || ''}
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
  // Ingredients Section - Two-tone styling
  ingredientsSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.cardSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ingredientsList: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.cardSurface,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  ingredientRowEven: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
  },
  ingredientRowOdd: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  ingredientBullet: {
    fontSize: 14,
    color: COLORS.brandTeal,
    marginRight: SPACING.sm,
    fontWeight: '600',
  },
  ingredientText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  ingredientAmount: {
    fontWeight: '600',
    color: COLORS.brandTeal,
  },
  viewMoreIngredients: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 4,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.brandTeal,
  },
  // Wine Pairing Section
  winePairingSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  winePairingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  winePairingText: {
    flex: 1,
    fontSize: 14,
    color: '#e9d5ff',
    lineHeight: 20,
  },
  // Storage Section
  storageSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  storageText: {
    flex: 1,
    fontSize: 14,
    color: '#bae6fd',
    lineHeight: 20,
  },
});
