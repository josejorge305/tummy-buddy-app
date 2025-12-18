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
import { AnalyzeDishResponse, analyzeDish, fetchDishImage } from '../api/api';
import { OrganImpactEntry, OrganImpactSection } from '../components/analysis/OrganImpactSection';
import { buildDishViewModel } from './utils/dishViewModel';
import { cacheDishAnalysis, getCachedDish, CachedDish } from '../utils/dishCache';
import { useUserPrefs } from '../context/UserPrefsContext';
import BrandTitle from '../components/BrandTitle';
import * as Haptics from 'expo-haptics';

const RestaurantAIIcon = require('../assets/images/REstaurant AI Icon.png');

const BG = '#020617';
const TEAL = '#14b8a6';

const COLORS = {
  safe: '#22c55e',
  caution: '#f59e0b',
  avoid: '#ef4444',
  neutral: '#6b7280',
  calories: '#f97316',
  protein: '#3b82f6',
  carbs: '#a855f7',
  fat: '#eab308',
  cardBg: '#1e293b',
  cardBorder: 'rgba(255,255,255,0.08)',
};

const ANALYSIS_LOADING_MESSAGES = [
  { icon: 'search-outline', text: 'Finding recipe match...' },
  { icon: 'list-outline', text: 'Identifying ingredients...' },
  { icon: 'warning-outline', text: 'Scanning for allergens...' },
  { icon: 'leaf-outline', text: 'Checking FODMAP levels...' },
  { icon: 'nutrition-outline', text: 'Calculating nutrition...' },
  { icon: 'fitness-outline', text: 'Analyzing body impact...' },
  { icon: 'sparkles-outline', text: 'Finalizing analysis...' },
];

function DishLoadingScreen({ dishName, imageUrl }: { dishName: string; imageUrl?: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

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
      setMessageIndex((prev) => (prev + 1) % ANALYSIS_LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(messageTimer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentMessage = ANALYSIS_LOADING_MESSAGES[messageIndex];
  const showLongWait = elapsedSeconds > 15;

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['#0f172a', BG]}
          style={styles.heroGradientBg}
        >
          <View style={styles.heroIconContainer}>
            <View style={styles.heroIconGlow} />
            <Image source={RestaurantAIIcon} style={styles.heroIcon} resizeMode="contain" />
          </View>
        </LinearGradient>
      </View>

      <View style={styles.loadingContent}>
        <BrandTitle size="large" showIcon={false} />

        <View style={styles.loaderBox}>
          <Animated.View
            style={[styles.spinnerGlow, { opacity: pulseAnim }]}
          />
          <ActivityIndicator size="large" color={TEAL} />
        </View>

        <View style={styles.messageRow}>
          <Ionicons
            name={currentMessage.icon as any}
            size={18}
            color={TEAL}
          />
          <Text style={styles.messageText}>{currentMessage.text}</Text>
        </View>

        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(
                  ((messageIndex + 1) / ANALYSIS_LOADING_MESSAGES.length) * 100,
                  95
                )}%`,
              },
            ]}
          />
        </View>

        {elapsedSeconds > 5 && (
          <Text style={styles.elapsedText}>{elapsedSeconds}s</Text>
        )}

        {showLongWait && (
          <Text style={styles.longWaitText}>
            This dish requires deeper analysis - hang tight!
          </Text>
        )}
      </View>
    </View>
  );
}

function getAllergenPillColors(present: string, isUserAllergen?: boolean) {
  if (isUserAllergen) {
    return { bg: 'rgba(239, 68, 68, 0.25)', border: '#ef4444', text: '#fca5a5' };
  }
  if (present === 'yes') {
    return { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#fcd34d' };
  }
  if (present === 'maybe') {
    return { bg: 'rgba(107, 114, 128, 0.2)', border: '#6b7280', text: '#9ca3af' };
  }
  return { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', text: '#86efac' };
}

export default function DishScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { selectedAllergens = [], logMealAction } = useUserPrefs();

  const dishName = params.dishName as string;
  const restaurantName = params.restaurantName as string | undefined;
  const restaurantAddress = params.restaurantAddress as string | undefined;
  const placeId = params.placeId as string | undefined;
  const imageUrl = params.imageUrl as string | undefined;
  const fromCache = params.fromCache === 'true';

  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalyzeDishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedImageUrl, setFetchedImageUrl] = useState<string | null>(null);
  const [imageProvider, setImageProvider] = useState<string | null>(null);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [mealLogged, setMealLogged] = useState(false);

  const [showAllergenDetails, setShowAllergenDetails] = useState(true);
  const [showFodmapDetails, setShowFodmapDetails] = useState(true);
  const [showNutritionNumbers, setShowNutritionNumbers] = useState(true);
  const [showOrganImpactDetails, setShowOrganImpactDetails] = useState(true);
  const [showOrganDetails, setShowOrganDetails] = useState(false);
  const [showDietTags, setShowDietTags] = useState(true);
  const [focusedComponentIndex, setFocusedComponentIndex] = useState<number | null>(null);

  useEffect(() => {
    loadDishAnalysis();
  }, [dishName]);

  const fetchImageIfNeeded = async (currentImageUrl: string | null | undefined) => {
    if (currentImageUrl) return;

    try {
      console.log('Fetching dish image for:', dishName);
      const imageResult = await fetchDishImage(dishName);
      if (imageResult.ok && imageResult.image) {
        console.log('Got dish image from:', imageResult.provider);
        setFetchedImageUrl(imageResult.image);
        setImageProvider(imageResult.provider || null);
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
      setImageProvider(null);

      const cached = await getCachedDish(dishName, placeId);
      if (cached && cached.analysis) {
        console.log('Using cached dish analysis:', dishName);
        setAnalysis(cached.analysis);
        setIsLoading(false);

        const cachedImage = cached.imageUrl || cached.analysis.recipe_image;
        if (!imageUrl && !cachedImage) {
          fetchImageIfNeeded(null);
        }
        return;
      }

      const result = await analyzeDish({
        dishName,
        restaurantName: restaurantName || null,
        placeId: placeId || null,
        source: 'standalone_dish_search',
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
          Alert.alert(
            'Already Logged',
            'This dish was already logged today. Your daily totals remain unchanged.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Meal Logged!',
            `${analysis.dishName || dishName} has been added to your tracker.`,
            [
              { text: 'View Tracker', onPress: () => router.push('/(tabs)/explore' as any) },
              { text: 'OK' },
            ]
          );
        }
      } else {
        Alert.alert('Error', 'Failed to log meal. Please try again.');
      }
    } catch (e) {
      console.error('Log meal error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoggingMeal(false);
    }
  };

  const organLines = viewModel?.organLines || [];
  const organOverallLevel: 'high' | 'medium' | 'low' | null = organLines.length
    ? organLines.some((l: any) => l.severity === 'high')
      ? 'high'
      : organLines.some((l: any) => l.severity === 'medium')
      ? 'medium'
      : 'low'
    : null;

  const organSummary: string | null = (() => {
    if (!organLines || organLines.length === 0) return null;
    const withSentences = organLines.filter(
      (l: any) => l.sentence && l.sentence.length > 20 && l.severity !== 'neutral'
    );
    if (withSentences.length === 0) {
      return 'Overall low organ impact; most organs stay neutral or mildly supported by this plate.';
    }
    const highMed = withSentences.filter(
      (l: any) => l.severity === 'high' || l.severity === 'medium'
    );
    const low = withSentences.filter((l: any) => l.severity === 'low');
    const selected = [...highMed, ...low.slice(0, Math.max(0, 5 - highMed.length))].slice(0, 5);
    const paragraph = selected
      .map((l: any) => {
        const s = (l.sentence || '').trim().replace(/\.+$/, '');
        return s + '.';
      })
      .join(' ');
    return paragraph || 'Overall low organ impact; most organs stay neutral or mildly supported by this plate.';
  })();

  const activeNutrition = viewModel?.nutrition || null;

  const dishImageUrl = imageUrl || analysis?.recipe_image || fetchedImageUrl || null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <DishLoadingScreen dishName={dishName} imageUrl={imageUrl} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {dishName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {dishImageUrl && (
          <View style={styles.dishImageContainer}>
            <Image source={{ uri: dishImageUrl }} style={styles.dishImage} />
            <LinearGradient
              colors={['transparent', BG]}
              style={styles.dishImageGradient}
            />
          </View>
        )}

        <View style={styles.dishCard}>
          <Text style={styles.dishName}>
            {analysis?.dishName || dishName}
          </Text>

          {analysis?.spell_correction && (
            <View style={styles.spellCorrectionBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={styles.spellCorrectionText}>
                Corrected from "{analysis.spell_correction.original}"
              </Text>
            </View>
          )}

          {restaurantName && (
            <View style={styles.restaurantBadge}>
              <Ionicons name="restaurant-outline" size={14} color={TEAL} />
              <View style={styles.restaurantBadgeText}>
                <Text style={styles.restaurantName}>{restaurantName}</Text>
                {restaurantAddress && (
                  <Text style={styles.restaurantAddress} numberOfLines={1}>
                    {restaurantAddress}
                  </Text>
                )}
              </View>
            </View>
          )}

          {viewModel?.nutritionInsights?.summary && (
            <View style={styles.healthInsightCallout}>
              <View style={styles.healthInsightIcon}>
                <Ionicons name="bulb-outline" size={16} color="#facc15" />
              </View>
              <Text style={styles.healthInsightText}>
                {viewModel.nutritionInsights.summary}
              </Text>
            </View>
          )}
        </View>

        {viewModel && (
          <>
            {viewModel.plateComponents && viewModel.plateComponents.length > 1 && (
              <View style={styles.plateComponentsSection}>
                <Text style={styles.plateComponentsLabel}>Analyze by component:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.plateComponentPillsRow}
                >
                  <TouchableOpacity
                    onPress={() => setFocusedComponentIndex(null)}
                    style={[
                      styles.plateComponentPill,
                      focusedComponentIndex === null && styles.plateComponentPillActive,
                    ]}
                  >
                    <Ionicons
                      name="restaurant"
                      size={14}
                      color={focusedComponentIndex === null ? '#fff' : '#9ca3af'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.plateComponentPillText,
                        focusedComponentIndex === null && styles.plateComponentPillTextActive,
                      ]}
                    >
                      Whole Plate
                    </Text>
                  </TouchableOpacity>
                  {viewModel.plateComponents.map((comp, idx) => (
                    <TouchableOpacity
                      key={`plate-comp-${idx}`}
                      onPress={() => setFocusedComponentIndex(idx)}
                      style={[
                        styles.plateComponentPill,
                        focusedComponentIndex === idx && styles.plateComponentPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.plateComponentPillText,
                          focusedComponentIndex === idx && styles.plateComponentPillTextActive,
                        ]}
                      >
                        {comp.component}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.analysisCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="warning-outline" size={18} color={COLORS.caution} />
                <Text style={styles.cardTitle}>Allergens</Text>
              </View>
              <View style={styles.pillRow}>
                {viewModel.allergens.length === 0 && (
                  <View style={[styles.coloredPill, { backgroundColor: COLORS.safe, borderColor: COLORS.safe }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.coloredPillText}>None detected</Text>
                  </View>
                )}
                {viewModel.allergens.map((pill, idx) => {
                  const pillColors = getAllergenPillColors(pill.present || 'yes', pill.isUserAllergen);
                  return (
                    <View
                      key={`${pill.name}-${idx}`}
                      style={[
                        styles.coloredPill,
                        { backgroundColor: pillColors.bg, borderColor: pillColors.border },
                      ]}
                    >
                      {pill.isUserAllergen && (
                        <Ionicons name="alert-circle" size={12} color={pillColors.text} style={{ marginRight: 3 }} />
                      )}
                      <Text style={[styles.coloredPillText, { color: pillColors.text }]}>
                        {pill.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity onPress={() => setShowAllergenDetails((v) => !v)}>
                <Text style={styles.showMoreText}>
                  {showAllergenDetails ? 'Hide details' : 'Show details'}
                </Text>
              </TouchableOpacity>
              {showAllergenDetails && viewModel.allergenSentence && (
                <Text style={styles.sectionBody}>{viewModel.allergenSentence}</Text>
              )}
            </View>

            <View style={styles.analysisCard}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name="leaf-outline"
                  size={18}
                  color={
                    viewModel.fodmapLevel === 'high'
                      ? COLORS.avoid
                      : viewModel.fodmapLevel === 'medium'
                      ? COLORS.caution
                      : COLORS.safe
                  }
                />
                <Text style={styles.cardTitle}>FODMAP / IBS</Text>
              </View>
              {viewModel.fodmapLevel && (
                <View
                  style={[
                    styles.coloredPill,
                    {
                      backgroundColor:
                        viewModel.fodmapLevel === 'high'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : viewModel.fodmapLevel === 'medium'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(34, 197, 94, 0.2)',
                      borderColor:
                        viewModel.fodmapLevel === 'high'
                          ? COLORS.avoid
                          : viewModel.fodmapLevel === 'medium'
                          ? COLORS.caution
                          : COLORS.safe,
                      alignSelf: 'flex-start',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.coloredPillText,
                      {
                        color:
                          viewModel.fodmapLevel === 'high'
                            ? '#fca5a5'
                            : viewModel.fodmapLevel === 'medium'
                            ? '#fcd34d'
                            : '#86efac',
                      },
                    ]}
                  >
                    {viewModel.fodmapLevel.charAt(0).toUpperCase() + viewModel.fodmapLevel.slice(1)}
                  </Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setShowFodmapDetails((v) => !v)}>
                <Text style={styles.showMoreText}>
                  {showFodmapDetails ? 'Hide details' : 'Show details'}
                </Text>
              </TouchableOpacity>
              {showFodmapDetails && viewModel.fodmapSentence && (
                <Text style={styles.sectionBody}>{viewModel.fodmapSentence}</Text>
              )}
            </View>

            <View style={styles.analysisCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="nutrition-outline" size={18} color={COLORS.calories} />
                <Text style={[styles.cardTitle, { flex: 1 }]}>Nutrition</Text>
                {activeNutrition?.calories != null && (
                  <View
                    style={[
                      styles.levelBadgeSmall,
                      {
                        backgroundColor: 'rgba(249, 115, 22, 0.2)',
                        borderColor: COLORS.calories,
                      },
                    ]}
                  >
                    <Text style={[styles.levelBadgeSmallText, { color: '#fdba74' }]}>
                      {Math.round(activeNutrition.calories)} kcal
                    </Text>
                  </View>
                )}
              </View>
              {activeNutrition && (
                <>
                  <View style={styles.quickStatsRow}>
                    <View style={styles.quickStatItem}>
                      <Ionicons name="flame" size={16} color={COLORS.calories} />
                      <Text style={[styles.quickStatValue, { color: COLORS.calories }]}>
                        {activeNutrition.calories != null ? Math.round(activeNutrition.calories) : '--'}
                      </Text>
                      <Text style={styles.quickStatLabel}>kcal</Text>
                    </View>
                    <View style={styles.quickStatDivider} />
                    <View style={styles.quickStatItem}>
                      <Text style={[styles.quickStatValue, { color: COLORS.protein }]}>
                        {activeNutrition.protein != null ? Math.round(activeNutrition.protein) : '--'}g
                      </Text>
                      <Text style={styles.quickStatLabel}>protein</Text>
                    </View>
                    <View style={styles.quickStatDivider} />
                    <View style={styles.quickStatItem}>
                      <Text style={[styles.quickStatValue, { color: COLORS.carbs }]}>
                        {activeNutrition.carbs != null ? Math.round(activeNutrition.carbs) : '--'}g
                      </Text>
                      <Text style={styles.quickStatLabel}>carbs</Text>
                    </View>
                    <View style={styles.quickStatDivider} />
                    <View style={styles.quickStatItem}>
                      <Text style={[styles.quickStatValue, { color: COLORS.fat }]}>
                        {activeNutrition.fat != null ? Math.round(activeNutrition.fat) : '--'}g
                      </Text>
                      <Text style={styles.quickStatLabel}>fat</Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => setShowNutritionNumbers((v) => !v)}>
                    <Text style={styles.showMoreText}>
                      {showNutritionNumbers ? 'Hide nutrition numbers' : 'Show nutrition numbers'}
                    </Text>
                  </TouchableOpacity>

                  {showNutritionNumbers && (
                    <View style={styles.secondaryStatsRow}>
                      <View style={styles.secondaryStatItem}>
                        <Text style={styles.secondaryStatValue}>
                          {activeNutrition.sugar != null ? Math.round(activeNutrition.sugar) : '--'}g
                        </Text>
                        <Text style={styles.secondaryStatLabel}>sugar</Text>
                      </View>
                      <View style={styles.secondaryStatDivider} />
                      <View style={styles.secondaryStatItem}>
                        <Text style={styles.secondaryStatValue}>
                          {activeNutrition.fiber != null ? Math.round(activeNutrition.fiber) : '--'}g
                        </Text>
                        <Text style={styles.secondaryStatLabel}>fiber</Text>
                      </View>
                      <View style={styles.secondaryStatDivider} />
                      <View style={styles.secondaryStatItem}>
                        <Text style={styles.secondaryStatValue}>
                          {activeNutrition.sodium != null ? Math.round(activeNutrition.sodium) : '--'}
                        </Text>
                        <Text style={styles.secondaryStatLabel}>sodium (mg)</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>

            {organOverallLevel && (
              <View style={styles.analysisCard}>
                <TouchableOpacity
                  onPress={() => setShowOrganImpactDetails((v) => !v)}
                  style={styles.cardHeader}
                >
                  <Ionicons
                    name="body-outline"
                    size={18}
                    color={
                      organOverallLevel === 'high'
                        ? COLORS.avoid
                        : organOverallLevel === 'medium'
                        ? COLORS.caution
                        : COLORS.safe
                    }
                  />
                  <Text style={[styles.cardTitle, { flex: 1 }]}>Body Impact</Text>
                  <View
                    style={[
                      styles.levelBadgeSmall,
                      {
                        backgroundColor:
                          organOverallLevel === 'high'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : organOverallLevel === 'medium'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(34, 197, 94, 0.2)',
                        borderColor:
                          organOverallLevel === 'high'
                            ? COLORS.avoid
                            : organOverallLevel === 'medium'
                            ? COLORS.caution
                            : COLORS.safe,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelBadgeSmallText,
                        {
                          color:
                            organOverallLevel === 'high'
                              ? '#fca5a5'
                              : organOverallLevel === 'medium'
                              ? '#fcd34d'
                              : '#86efac',
                        },
                      ]}
                    >
                      {organOverallLevel === 'low'
                        ? 'Minor'
                        : organOverallLevel === 'medium'
                        ? 'Moderate'
                        : 'Concern'}
                    </Text>
                  </View>
                  <Ionicons
                    name={showOrganImpactDetails ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#9ca3af"
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>

                {showOrganImpactDetails && (
                  <>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.organCardsContainer}
                    >
                      {viewModel.organLines
                        .filter((line) => line.severity !== 'neutral')
                        .slice(0, 6)
                        .map((line, idx) => {
                          const organIcons: Record<string, string> = {
                            gut: 'fitness-outline',
                            heart: 'heart-outline',
                            liver: 'water-outline',
                            kidney: 'water-outline',
                            brain: 'bulb-outline',
                            skin: 'sparkles-outline',
                            immune: 'shield-outline',
                            metabolic: 'flash-outline',
                            eyes: 'eye-outline',
                            bones: 'barbell-outline',
                            thyroid: 'pulse-outline',
                          };
                          const iconName = organIcons[line.organKey] || 'ellipse-outline';
                          const levelColor =
                            line.severity === 'high'
                              ? COLORS.avoid
                              : line.severity === 'medium'
                              ? COLORS.caution
                              : COLORS.safe;
                          const severityLabel =
                            line.severity === 'low'
                              ? 'Minor'
                              : line.severity === 'medium'
                              ? 'Moderate'
                              : 'Concern';

                          return (
                            <View key={line.organKey || idx} style={styles.organCard}>
                              <View style={[styles.organCardIcon, { backgroundColor: `${levelColor}20` }]}>
                                <Ionicons name={iconName as any} size={20} color={levelColor} />
                              </View>
                              <Text style={styles.organCardLabel}>{line.organLabel}</Text>
                              <View style={[styles.organCardLevel, { backgroundColor: levelColor }]}>
                                <Text style={styles.organCardLevelText}>{severityLabel}</Text>
                              </View>
                            </View>
                          );
                        })}
                    </ScrollView>

                    {organSummary && <Text style={styles.sectionBody}>{organSummary}</Text>}

                    <TouchableOpacity onPress={() => setShowOrganDetails((prev) => !prev)}>
                      <Text style={styles.showMoreText}>
                        {showOrganDetails ? 'Hide organ details' : 'Show organ details'}
                      </Text>
                    </TouchableOpacity>

                    {showOrganDetails && (
                      <OrganImpactSection
                        showHeader={false}
                        showSummary={false}
                        showToggle={false}
                        impacts={viewModel.organLines
                          .filter((line) => line.severity !== 'neutral')
                          .map((line, idx) => ({
                            id: line.organKey || String(idx),
                            organId: line.organKey || 'organ',
                            label: line.organLabel,
                            level:
                              line.severity === 'high'
                                ? 'high'
                                : line.severity === 'medium'
                                ? 'medium'
                                : 'low',
                            score: typeof line.score === 'number' ? line.score : null,
                            description: line.sentence || 'Organ impact details to follow.',
                          })) as OrganImpactEntry[]}
                      />
                    )}
                  </>
                )}
              </View>
            )}

            {viewModel.dietTags && viewModel.dietTags.length > 0 && (
              <View style={styles.analysisCard}>
                <TouchableOpacity
                  onPress={() => setShowDietTags((prev) => !prev)}
                  style={styles.cardHeader}
                >
                  <Ionicons name="leaf" size={18} color={COLORS.safe} />
                  <Text style={[styles.cardTitle, { flex: 1 }]}>Diet & Lifestyle</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{viewModel.dietTags.length}</Text>
                  </View>
                  <Ionicons
                    name={showDietTags ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#9ca3af"
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>

                {showDietTags && (
                  <View style={styles.dietTagsRow}>
                    {viewModel.dietTags.map((label: any) => (
                      <View
                        key={(label as any)?.id || (label as any)?.code || String(label)}
                        style={styles.dietTagChip}
                      >
                        <Text style={styles.dietTagText}>
                          {(label as any)?.label || (label as any)?.name || String(label)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.stickyActionBar}>
        <View style={styles.stickyActionButtons}>
          <TouchableOpacity
            style={[
              styles.stickyPrimaryButton,
              mealLogged && styles.stickyPrimaryButtonLogged,
              isLoggingMeal && styles.stickyPrimaryButtonDisabled,
            ]}
            onPress={handleLogMeal}
            disabled={isLoggingMeal || !analysis}
          >
            {isLoggingMeal ? (
              <ActivityIndicator size="small" color="#020617" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons
                name={mealLogged ? 'checkmark-circle' : 'add-circle'}
                size={18}
                color="#020617"
                style={{ marginRight: 6 }}
              />
            )}
            <Text style={styles.stickyPrimaryButtonText}>
              {mealLogged ? 'Logged!' : isLoggingMeal ? 'Logging...' : 'Log Meal'}
            </Text>
          </TouchableOpacity>

          {analysis?.likely_recipe && (
            <TouchableOpacity
              style={styles.stickySecondaryButton}
              onPress={() => {
                const recipeImageUrl = dishImageUrl || analysis?.recipe_image || '';
                router.push({
                  pathname: '/likely-recipe',
                  params: {
                    dishName: dishName || 'Unknown Dish',
                    imageUrl: recipeImageUrl,
                    likelyRecipe: analysis?.likely_recipe
                      ? JSON.stringify(analysis.likely_recipe)
                      : '',
                    fullRecipe: analysis?.full_recipe
                      ? JSON.stringify(analysis.full_recipe)
                      : '',
                    nutrition: analysis?.nutrition_summary
                      ? JSON.stringify(analysis.nutrition_summary)
                      : '',
                    allergens: analysis?.allergen_flags
                      ? JSON.stringify(analysis.allergen_flags)
                      : '[]',
                    fodmap: analysis?.fodmap_flags
                      ? JSON.stringify(analysis.fodmap_flags)
                      : '',
                    nutritionSource: analysis?.nutrition_source || '',
                  },
                });
              }}
            >
              <Ionicons name="restaurant-outline" size={14} color={TEAL} style={{ marginRight: 5 }} />
              <Text style={styles.stickySecondaryButtonText}>Recipe</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
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
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
  },
  heroSection: {
    height: 220,
  },
  heroGradientBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
  },
  heroIcon: {
    width: 120,
    height: 120,
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  loadingDishName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 32,
  },
  loaderBox: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  spinnerGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(20, 184, 166, 0.3)',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: TEAL,
    borderRadius: 2,
  },
  elapsedText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  longWaitText: {
    fontSize: 14,
    color: '#f59e0b',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: TEAL,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020617',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  dishImageContainer: {
    height: 200,
    marginHorizontal: -16,
    marginBottom: 16,
    position: 'relative',
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  dishImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  dishCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dishName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  spellCorrectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    gap: 6,
  },
  spellCorrectionText: {
    fontSize: 12,
    color: '#86efac',
    fontStyle: 'italic',
  },
  restaurantBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  restaurantBadgeText: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  restaurantAddress: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  healthInsightCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  healthInsightIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthInsightText: {
    flex: 1,
    fontSize: 13,
    color: '#fcd34d',
    lineHeight: 18,
  },
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
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
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
  showMoreText: {
    fontSize: 13,
    color: TEAL,
    fontWeight: '500',
    marginTop: 4,
  },
  sectionBody: {
    fontSize: 13,
    color: '#d1d5db',
    lineHeight: 20,
    marginTop: 8,
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
  secondaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  secondaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  secondaryStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryStatLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  secondaryStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#374151',
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
  plateComponentsSection: {
    marginBottom: 16,
  },
  plateComponentsLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
  },
  plateComponentPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  plateComponentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
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
  stickyActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  stickyActionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  stickyPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: TEAL,
  },
  stickyPrimaryButtonLogged: {
    backgroundColor: '#22c55e',
  },
  stickyPrimaryButtonDisabled: {
    opacity: 0.7,
  },
  stickyPrimaryButtonText: {
    fontSize: 15,
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
});
