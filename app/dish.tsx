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
  Modal,
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

// Unified Design System
const DESIGN = {
  // Colors - simplified palette
  colors: {
    primary: '#14b8a6',      // Teal - main accent
    background: '#020617',   // Dark blue-black
    card: '#1e293b',         // Slate card background
    cardDark: '#0f172a',     // Darker card variant
    text: '#ffffff',         // Primary text
    textSecondary: '#9ca3af', // Secondary text
    textMuted: '#64748b',    // Muted text
    border: 'rgba(255,255,255,0.08)',
    // Semantic colors
    safe: '#22c55e',
    caution: '#f59e0b',
    danger: '#ef4444',
  },
  // Typography - consistent scale
  type: {
    h1: { fontSize: 24, fontWeight: '700' as const, color: '#ffffff' },
    h2: { fontSize: 18, fontWeight: '700' as const, color: '#ffffff' },
    h3: { fontSize: 16, fontWeight: '600' as const, color: '#ffffff' },
    body: { fontSize: 15, fontWeight: '400' as const, color: '#d1d5db', lineHeight: 22 },
    bodySmall: { fontSize: 14, fontWeight: '400' as const, color: '#9ca3af', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400' as const, color: '#64748b' },
    label: { fontSize: 11, fontWeight: '600' as const, color: '#9ca3af', textTransform: 'uppercase' as const },
    link: { fontSize: 14, fontWeight: '500' as const, color: '#14b8a6' },
  },
  // Spacing
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  // Border radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 999,
  },
};

// Loading messages for dish analysis
const ANALYSIS_LOADING_MESSAGES = [
  { icon: 'search-outline', text: 'Finding recipe match...' },
  { icon: 'list-outline', text: 'Identifying ingredients...' },
  { icon: 'warning-outline', text: 'Scanning for allergens...' },
  { icon: 'leaf-outline', text: 'Checking FODMAP levels...' },
  { icon: 'nutrition-outline', text: 'Calculating nutrition...' },
  { icon: 'fitness-outline', text: 'Analyzing body impact...' },
  { icon: 'sparkles-outline', text: 'Finalizing analysis...' },
];

// Loading messages for photo analysis
const PHOTO_ANALYSIS_LOADING_MESSAGES = [
  { icon: 'eye-outline', text: 'Recognizing your dish...' },
  { icon: 'fast-food-outline', text: 'Identifying what you\'re eating...' },
  { icon: 'search-outline', text: 'Finding recipe match...' },
  { icon: 'warning-outline', text: 'Scanning for allergens...' },
  { icon: 'nutrition-outline', text: 'Calculating nutrition...' },
  { icon: 'fitness-outline', text: 'Analyzing body impact...' },
  { icon: 'sparkles-outline', text: 'Finalizing analysis...' },
];

// Truncate text helper
function truncateText(text: string, maxLength: number): { truncated: string; isTruncated: boolean } {
  if (!text || text.length <= maxLength) {
    return { truncated: text || '', isTruncated: false };
  }
  const truncated = text.substring(0, maxLength).trim();
  // Find last space to avoid cutting words
  const lastSpace = truncated.lastIndexOf(' ');
  return {
    truncated: (lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated) + '...',
    isTruncated: true,
  };
}

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
        <LinearGradient colors={['#0f172a', BG]} style={styles.heroGradientBg}>
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
          <ActivityIndicator size="large" color={TEAL} />
        </View>

        <View style={styles.messageRow}>
          <Ionicons name={currentMessage.icon as any} size={18} color={TEAL} />
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

// Detail Modal Component
function DetailModal({
  visible,
  onClose,
  title,
  icon,
  iconColor,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name={icon as any} size={20} color={iconColor} />
              <Text style={styles.modalTitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
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
  const fromPhoto = params.fromPhoto === 'true';

  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalyzeDishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedImageUrl, setFetchedImageUrl] = useState<string | null>(null);
  const [imageProvider, setImageProvider] = useState<string | null>(null);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [mealLogged, setMealLogged] = useState(false);

  // UI state
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAllergenModal, setShowAllergenModal] = useState(false);
  const [showFodmapModal, setShowFodmapModal] = useState(false);
  const [showBodyImpact, setShowBodyImpact] = useState(false);
  const [showOrganDetails, setShowOrganDetails] = useState(false);
  const [focusedComponentIndex, setFocusedComponentIndex] = useState<number | null>(null);

  useEffect(() => {
    loadDishAnalysis();
  }, [dishName]);

  const fetchImageIfNeeded = async (currentImageUrl: string | null | undefined) => {
    if (currentImageUrl) return;
    try {
      const imageResult = await fetchDishImage(dishName);
      if (imageResult.ok && imageResult.image) {
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

  // Derived data
  const organLines = viewModel?.organLines || [];
  const organOverallLevel: 'high' | 'medium' | 'low' | null = organLines.length
    ? organLines.some((l: any) => l.severity === 'high')
      ? 'high'
      : organLines.some((l: any) => l.severity === 'medium')
      ? 'medium'
      : 'low'
    : null;

  const activeNutrition = viewModel?.nutrition || null;
  const dishImageUrl = imageUrl || analysis?.recipe_image || fetchedImageUrl || null;

  // Description handling
  const rawDescription = analysis?.likely_recipe?.description || '';
  const { truncated: truncatedDesc, isTruncated: descIsTruncated } = truncateText(rawDescription, 120);

  // Price and calories for header
  const price = analysis?.likely_recipe?.price;
  const calories = activeNutrition?.calories;
  const calorieRange = analysis?.likely_recipe?.calorie_range;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <DishLoadingScreen dishName={dishName} imageUrl={imageUrl} fromPhoto={fromPhoto} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={DESIGN.colors.danger} />
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{dishName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Image */}
        {dishImageUrl && (
          <View style={styles.dishImageContainer}>
            <Image source={{ uri: dishImageUrl }} style={styles.dishImage} />
            <LinearGradient colors={['transparent', BG]} style={styles.dishImageGradient} />
            <TouchableOpacity style={styles.favoriteButton}>
              <Ionicons name="heart-outline" size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}

        {/* Main Info Card */}
        <View style={styles.mainCard}>
          {/* Dish Name */}
          <Text style={styles.dishName}>{analysis?.dishName || dishName}</Text>

          {/* Price & Calories Row */}
          <View style={styles.metaRow}>
            {price && <Text style={styles.priceText}>${price}</Text>}
            {price && (calories || calorieRange) && <Text style={styles.metaDot}>•</Text>}
            {calories ? (
              <Text style={styles.calorieText}>{Math.round(calories)} Cal</Text>
            ) : calorieRange ? (
              <Text style={styles.calorieText}>{calorieRange}</Text>
            ) : null}
          </View>

          {/* Description with truncation */}
          {rawDescription && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>
                {showFullDescription ? rawDescription : truncatedDesc}
              </Text>
              {descIsTruncated && (
                <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                  <Text style={styles.seeMoreText}>
                    {showFullDescription ? 'see less' : 'see more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Restaurant Badge */}
          {restaurantName && (
            <View style={styles.restaurantBadge}>
              <Ionicons name="restaurant-outline" size={14} color={TEAL} />
              <Text style={styles.restaurantName}>{restaurantName}</Text>
            </View>
          )}
        </View>

        {viewModel && (
          <>
            {/* Pills Row - Allergens & FODMAP (tappable for details) */}
            <View style={styles.pillsCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                {/* Allergen Pills */}
                {viewModel.allergens.length === 0 ? (
                  <TouchableOpacity style={[styles.pill, styles.pillSafe]} onPress={() => setShowAllergenModal(true)}>
                    <Ionicons name="checkmark-circle" size={14} color={DESIGN.colors.safe} />
                    <Text style={[styles.pillText, { color: DESIGN.colors.safe }]}>No allergens</Text>
                  </TouchableOpacity>
                ) : (
                  viewModel.allergens.map((allergen, idx) => (
                    <TouchableOpacity
                      key={`allergen-${idx}`}
                      style={[
                        styles.pill,
                        allergen.isUserAllergen ? styles.pillDanger : styles.pillCaution,
                      ]}
                      onPress={() => setShowAllergenModal(true)}
                    >
                      {allergen.isUserAllergen && (
                        <Ionicons name="alert-circle" size={14} color={DESIGN.colors.danger} />
                      )}
                      <Text
                        style={[
                          styles.pillText,
                          { color: allergen.isUserAllergen ? DESIGN.colors.danger : DESIGN.colors.caution },
                        ]}
                      >
                        {allergen.name}
                        {allergen.present === 'maybe' ? '?' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}

                {/* FODMAP Pill */}
                {viewModel.fodmapLevel && (
                  <TouchableOpacity
                    style={[
                      styles.pill,
                      viewModel.fodmapLevel === 'high'
                        ? styles.pillDanger
                        : viewModel.fodmapLevel === 'medium'
                        ? styles.pillCaution
                        : styles.pillSafe,
                    ]}
                    onPress={() => setShowFodmapModal(true)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color:
                            viewModel.fodmapLevel === 'high'
                              ? DESIGN.colors.danger
                              : viewModel.fodmapLevel === 'medium'
                              ? DESIGN.colors.caution
                              : DESIGN.colors.safe,
                        },
                      ]}
                    >
                      {viewModel.fodmapLevel === 'high'
                        ? 'High FODMAP'
                        : viewModel.fodmapLevel === 'medium'
                        ? 'Med FODMAP'
                        : 'Low FODMAP'}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
              <Text style={styles.pillsHint}>Tap for details</Text>
            </View>

            {/* Nutrition Card - Unified Colors */}
            {activeNutrition && (
              <View style={styles.nutritionCard}>
                <View style={styles.macroGrid}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {activeNutrition.calories != null ? Math.round(activeNutrition.calories) : '--'}
                    </Text>
                    <Text style={styles.macroLabel}>KCAL</Text>
                  </View>
                  <View style={styles.macroDivider} />
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {activeNutrition.protein != null ? Math.round(activeNutrition.protein) : '--'}g
                    </Text>
                    <Text style={styles.macroLabel}>PROTEIN</Text>
                  </View>
                  <View style={styles.macroDivider} />
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {activeNutrition.carbs != null ? Math.round(activeNutrition.carbs) : '--'}g
                    </Text>
                    <Text style={styles.macroLabel}>CARBS</Text>
                  </View>
                  <View style={styles.macroDivider} />
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {activeNutrition.fat != null ? Math.round(activeNutrition.fat) : '--'}g
                    </Text>
                    <Text style={styles.macroLabel}>FAT</Text>
                  </View>
                </View>

                {/* Secondary nutrition - collapsed by default */}
                <View style={styles.secondaryNutrition}>
                  <View style={styles.secondaryItem}>
                    <Text style={styles.secondaryValue}>
                      {activeNutrition.fiber != null ? Math.round(activeNutrition.fiber) : '--'}g
                    </Text>
                    <Text style={styles.secondaryLabel}>fiber</Text>
                  </View>
                  <View style={styles.secondaryItem}>
                    <Text style={styles.secondaryValue}>
                      {activeNutrition.sugar != null ? Math.round(activeNutrition.sugar) : '--'}g
                    </Text>
                    <Text style={styles.secondaryLabel}>sugar</Text>
                  </View>
                  <View style={styles.secondaryItem}>
                    <Text style={styles.secondaryValue}>
                      {activeNutrition.sodium != null ? Math.round(activeNutrition.sodium) : '--'}mg
                    </Text>
                    <Text style={styles.secondaryLabel}>sodium</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Body Impact - Collapsible */}
            {organOverallLevel && (
              <TouchableOpacity
                style={styles.bodyImpactCard}
                onPress={() => setShowBodyImpact(!showBodyImpact)}
                activeOpacity={0.7}
              >
                <View style={styles.bodyImpactHeader}>
                  <Ionicons name="body-outline" size={18} color={DESIGN.colors.textSecondary} />
                  <Text style={styles.bodyImpactTitle}>Body Impact</Text>
                  <View
                    style={[
                      styles.levelBadge,
                      {
                        backgroundColor:
                          organOverallLevel === 'high'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : organOverallLevel === 'medium'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(34, 197, 94, 0.2)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelBadgeText,
                        {
                          color:
                            organOverallLevel === 'high'
                              ? DESIGN.colors.danger
                              : organOverallLevel === 'medium'
                              ? DESIGN.colors.caution
                              : DESIGN.colors.safe,
                        },
                      ]}
                    >
                      {organOverallLevel === 'low' ? 'Minor' : organOverallLevel === 'medium' ? 'Moderate' : 'Concern'}
                    </Text>
                  </View>
                  <Ionicons
                    name={showBodyImpact ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={DESIGN.colors.textSecondary}
                  />
                </View>

                {showBodyImpact && (
                  <View style={styles.bodyImpactContent}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.organCardsRow}
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
                              ? DESIGN.colors.danger
                              : line.severity === 'medium'
                              ? DESIGN.colors.caution
                              : DESIGN.colors.safe;

                          return (
                            <View key={line.organKey || idx} style={styles.organMiniCard}>
                              <Ionicons name={iconName as any} size={18} color={levelColor} />
                              <Text style={styles.organMiniLabel}>{line.organLabel}</Text>
                            </View>
                          );
                        })}
                    </ScrollView>

                    <TouchableOpacity onPress={() => setShowOrganDetails(!showOrganDetails)}>
                      <Text style={styles.linkText}>
                        {showOrganDetails ? 'Hide details' : 'Show details'}
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
                              line.severity === 'high' ? 'high' : line.severity === 'medium' ? 'medium' : 'low',
                            score: typeof line.score === 'number' ? line.score : null,
                            description: line.sentence || 'Organ impact details.',
                          })) as OrganImpactEntry[]}
                      />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* AI Insight - Compact */}
            {viewModel?.nutritionInsights?.summary && (
              <View style={styles.insightCard}>
                <Ionicons name="bulb-outline" size={16} color="#facc15" />
                <Text style={styles.insightText} numberOfLines={2}>
                  {viewModel.nutritionInsights.summary}
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Action Bar */}
      <View style={styles.stickyActionBar}>
        <View style={styles.stickyActionButtons}>
          <TouchableOpacity
            style={[
              styles.stickyPrimaryButton,
              mealLogged && styles.stickyPrimaryButtonLogged,
              (isLoggingMeal || !analysis) && styles.stickyPrimaryButtonDisabled,
            ]}
            onPress={handleLogMeal}
            disabled={isLoggingMeal || !analysis}
          >
            {isLoggingMeal || !analysis ? (
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
              {!analysis ? 'Analyzing...' : mealLogged ? 'Logged!' : isLoggingMeal ? 'Logging...' : 'Log Meal'}
            </Text>
          </TouchableOpacity>

          {analysis?.likely_recipe && (
            <TouchableOpacity
              style={styles.stickySecondaryButton}
              onPress={() => {
                router.push({
                  pathname: '/likely-recipe',
                  params: {
                    dishName: dishName || 'Unknown Dish',
                    imageUrl: dishImageUrl || '',
                    likelyRecipe: analysis?.likely_recipe ? JSON.stringify(analysis.likely_recipe) : '',
                    fullRecipe: analysis?.full_recipe ? JSON.stringify(analysis.full_recipe) : '',
                    nutrition: analysis?.nutrition_summary ? JSON.stringify(analysis.nutrition_summary) : '',
                    allergens: analysis?.allergen_flags ? JSON.stringify(analysis.allergen_flags) : '[]',
                    fodmap: analysis?.fodmap_flags ? JSON.stringify(analysis.fodmap_flags) : '',
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

      {/* Allergen Detail Modal */}
      <DetailModal
        visible={showAllergenModal}
        onClose={() => setShowAllergenModal(false)}
        title="Allergen Information"
        icon="warning-outline"
        iconColor={DESIGN.colors.caution}
      >
        {viewModel?.allergens.length === 0 ? (
          <Text style={styles.modalBodyText}>No common allergens detected in this dish.</Text>
        ) : (
          <>
            <Text style={styles.modalBodyText}>
              The following allergens were detected:
            </Text>
            {viewModel?.allergens.map((allergen, idx) => (
              <View key={idx} style={styles.modalListItem}>
                <View
                  style={[
                    styles.modalListDot,
                    { backgroundColor: allergen.isUserAllergen ? DESIGN.colors.danger : DESIGN.colors.caution },
                  ]}
                />
                <Text style={styles.modalListText}>
                  <Text style={{ fontWeight: '600' }}>{allergen.name}</Text>
                  {allergen.present === 'maybe' && ' (possible)'}
                  {allergen.isUserAllergen && ' - matches your profile'}
                </Text>
              </View>
            ))}
            {viewModel?.allergenSentence && (
              <Text style={[styles.modalBodyText, { marginTop: 12 }]}>{viewModel.allergenSentence}</Text>
            )}
          </>
        )}
      </DetailModal>

      {/* FODMAP Detail Modal */}
      <DetailModal
        visible={showFodmapModal}
        onClose={() => setShowFodmapModal(false)}
        title="FODMAP / IBS Information"
        icon="leaf-outline"
        iconColor={
          viewModel?.fodmapLevel === 'high'
            ? DESIGN.colors.danger
            : viewModel?.fodmapLevel === 'medium'
            ? DESIGN.colors.caution
            : DESIGN.colors.safe
        }
      >
        <Text style={styles.modalBodyText}>
          FODMAP Level:{' '}
          <Text style={{ fontWeight: '700' }}>
            {viewModel?.fodmapLevel?.charAt(0).toUpperCase()}
            {viewModel?.fodmapLevel?.slice(1) || 'Unknown'}
          </Text>
        </Text>
        {viewModel?.fodmapSentence && (
          <Text style={[styles.modalBodyText, { marginTop: 12 }]}>{viewModel.fodmapSentence}</Text>
        )}
        <Text style={[styles.modalBodyText, { marginTop: 12, fontStyle: 'italic' }]}>
          FODMAPs are fermentable carbohydrates that can trigger digestive symptoms in people with IBS.
        </Text>
      </DetailModal>
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
    borderBottomColor: DESIGN.colors.card,
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
    color: DESIGN.colors.text,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Loading styles
  loadingContainer: { flex: 1 },
  heroSection: { height: 220 },
  heroGradientBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroIconContainer: { alignItems: 'center', justifyContent: 'center' },
  heroIconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
  },
  heroIcon: { width: 120, height: 120 },
  loadingContent: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 24 },
  loaderBox: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  spinnerGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(20, 184, 166, 0.3)',
  },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  messageText: { fontSize: 16, fontWeight: '500', color: '#e2e8f0' },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: DESIGN.colors.card,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: { height: '100%', backgroundColor: TEAL, borderRadius: 2 },
  elapsedText: { fontSize: 14, color: DESIGN.colors.textMuted, marginBottom: 8 },
  longWaitText: { fontSize: 14, color: DESIGN.colors.caution, fontStyle: 'italic', textAlign: 'center' },
  // Error styles
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: DESIGN.colors.text, marginTop: 16, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: DESIGN.colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: TEAL, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  retryButtonText: { fontSize: 16, fontWeight: '600', color: '#020617' },
  backButton: { paddingHorizontal: 24, paddingVertical: 12 },
  backButtonText: { fontSize: 16, color: DESIGN.colors.textSecondary },
  // Image
  dishImageContainer: {
    height: 220,
    position: 'relative',
  },
  dishImage: { width: '100%', height: '100%' },
  dishImageGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Main Card
  mainCard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dishName: {
    fontSize: 24,
    fontWeight: '700',
    color: DESIGN.colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN.colors.primary,
  },
  metaDot: {
    fontSize: 16,
    color: DESIGN.colors.textSecondary,
    marginHorizontal: 8,
  },
  calorieText: {
    fontSize: 16,
    fontWeight: '500',
    color: DESIGN.colors.textSecondary,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: DESIGN.colors.textSecondary,
    lineHeight: 22,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: DESIGN.colors.primary,
    marginTop: 4,
  },
  restaurantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '500',
    color: DESIGN.colors.text,
  },
  // Pills Card
  pillsCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillSafe: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  pillCaution: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pillDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillsHint: {
    fontSize: 11,
    color: DESIGN.colors.textMuted,
    marginTop: 8,
  },
  // Nutrition Card
  nutritionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: DESIGN.colors.cardDark,
    borderRadius: 16,
    padding: 16,
  },
  macroGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: DESIGN.colors.text, // Unified white color
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: DESIGN.colors.textSecondary,
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#374151',
  },
  secondaryNutrition: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  secondaryItem: {
    alignItems: 'center',
  },
  secondaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.textSecondary,
  },
  secondaryLabel: {
    fontSize: 10,
    color: DESIGN.colors.textMuted,
    marginTop: 2,
  },
  // Body Impact Card
  bodyImpactCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: DESIGN.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  bodyImpactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bodyImpactTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN.colors.text,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bodyImpactContent: {
    marginTop: 12,
  },
  organCardsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  organMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DESIGN.colors.cardDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  organMiniLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: DESIGN.colors.text,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
    color: DESIGN.colors.primary,
    marginTop: 8,
  },
  // AI Insight Card
  insightCard: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(250, 204, 21, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.2)',
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#fcd34d',
    lineHeight: 18,
  },
  // Sticky Action Bar
  stickyActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DESIGN.colors.cardDark,
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 34,
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
    backgroundColor: DESIGN.colors.safe,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: DESIGN.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalBodyText: {
    fontSize: 15,
    color: DESIGN.colors.textSecondary,
    lineHeight: 22,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  modalListDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  modalListText: {
    flex: 1,
    fontSize: 15,
    color: DESIGN.colors.text,
    lineHeight: 22,
  },
});
