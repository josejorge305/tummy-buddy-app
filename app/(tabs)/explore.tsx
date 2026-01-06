/**
 * Tracker Screen (Redesigned)
 * Main daily tracking view with nutrition progress, meals, and weekly overview
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  AppState,
  AppStateStatus,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useUserPrefs } from '../../context/UserPrefsContext';
import { useSetAIContext, useAIAssistant } from '../../context/AIAssistantContext';
import { useRouter } from 'expo-router';
import { LoggedMeal, getTodayDate } from '../../api/api';
import { logDebug } from '../../utils/logger';
import { showErrorAlert } from '../../utils/errorMessages';
import PortionSheet, { PortionData, getPortionDisplayLabel } from '../../components/PortionSheet';

// Tracker components
import {
  DailySummaryCard,
  OrganScoresRow,
  OrganHealthSection,
  WaterTracker,
  MealsList,
  WeeklyOverview,
  QuickLogModal,
  AIAssistantPanel,
  generateAIInsight,
  COLORS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  formatDateHeader,
} from '../../components/tracker';

// Header component with date, title, and streak
function TrackerHeader({ streak }: { streak: number }) {
  const today = new Date();
  const dateString = formatDateHeader(today);

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.dateText}>{dateString}</Text>
        <Text style={styles.title}>Daily Tracker</Text>
      </View>
      {streak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {streak} day streak</Text>
        </View>
      )}
    </View>
  );
}

export default function DailyTracker() {
  const router = useRouter();
  const {
    profile,
    targets,
    todayTracker,
    weeklyData,
    isTrackerLoading,
    loadDailyTracker,
    loadWeeklyTracker,
    updateMealPortionAction,
    deleteMealAction,
    setWaterGlassesAction,
  } = useUserPrefs();

  // Set AI context for tracker screen
  useSetAIContext({
    screen: 'tracker',
    placeId: null,
    restaurantName: null,
    dishId: null,
    dishName: null,
  });

  // Get AI assistant panel controls
  const { openPanel: openAIPanel } = useAIAssistant();

  const [refreshing, setRefreshing] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [editingMeal, setEditingMeal] = useState<LoggedMeal | null>(null);
  const [showPortionSheet, setShowPortionSheet] = useState(false);
  const [isOrgansExpanded, setIsOrgansExpanded] = useState(false);

  // Get water glasses from tracker data
  const waterGlasses = todayTracker?.water?.total_glasses || 0;
  const waterTargetGlasses = todayTracker?.water?.target_glasses || 8;

  // Track the last loaded date for midnight reset detection
  const lastLoadedDateRef = useRef<string>(getTodayDate());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // AppState monitoring - reload tracker when app returns to foreground
  // This handles the case where user leaves app open overnight
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      logDebug('[DailyTracker] AppState change:', appStateRef.current, '->', nextAppState);

      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground - check if date changed
        const currentDate = getTodayDate();
        logDebug('[DailyTracker] App foregrounded. Last loaded:', lastLoadedDateRef.current, 'Current:', currentDate);

        if (currentDate !== lastLoadedDateRef.current) {
          logDebug('[DailyTracker] Date changed! Reloading fresh data for new day.');
          lastLoadedDateRef.current = currentDate;
          loadDailyTracker();
          loadWeeklyTracker();
        } else {
          // Same day but still refresh to catch any external changes
          logDebug('[DailyTracker] Same day, refreshing tracker data.');
          loadDailyTracker();
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [loadDailyTracker, loadWeeklyTracker]);

  // Periodic date check - handles midnight transition while app is in foreground
  // Checks every 60 seconds if the date has changed
  useEffect(() => {
    const checkDateChange = () => {
      const currentDate = getTodayDate();
      if (currentDate !== lastLoadedDateRef.current) {
        logDebug('[DailyTracker] Midnight detected! Date changed from', lastLoadedDateRef.current, 'to', currentDate);
        lastLoadedDateRef.current = currentDate;
        // Reload tracker for the new day
        loadDailyTracker();
        loadWeeklyTracker();
      }
    };

    // Check immediately on mount
    checkDateChange();

    // Set up interval to check every 60 seconds
    const intervalId = setInterval(checkDateChange, 60000);

    return () => clearInterval(intervalId);
  }, [loadDailyTracker, loadWeeklyTracker]);

  // Load tracker data on mount and when userId becomes available
  useEffect(() => {
    logDebug('[DailyTracker] Loading tracker data on mount/userId change');
    lastLoadedDateRef.current = getTodayDate();
    loadDailyTracker();
    loadWeeklyTracker();
  }, [loadDailyTracker, loadWeeklyTracker]);

  // Debug: Log tracker data when it changes
  useEffect(() => {
    logDebug('[DailyTracker] todayTracker:', todayTracker ? {
      meals: todayTracker.meals?.length || 0,
      water: todayTracker.water,
      summary: todayTracker.summary
    } : 'null');
  }, [todayTracker]);

  useEffect(() => {
    logDebug('[DailyTracker] weeklyData:', weeklyData ? {
      summaries: weeklyData.summaries?.length || 0,
      weeklyAverages: weeklyData.weeklyAverages
    } : 'null');
  }, [weeklyData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDailyTracker(), loadWeeklyTracker()]);
    setRefreshing(false);
  }, [loadDailyTracker, loadWeeklyTracker]);

  const handleDeleteMeal = async (mealId: number, dishName: string) => {
    Alert.alert(
      'Remove Meal',
      `Remove "${dishName}" from today's log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMealAction(mealId);
            if (!success) {
              showErrorAlert('meal', 'delete_failed');
            }
          },
        },
      ]
    );
  };

  // Handle portion pill tap to edit
  const handleEditPortion = (meal: LoggedMeal) => {
    setEditingMeal(meal);
    setShowPortionSheet(true);
  };

  // Handle portion update confirmation
  const handlePortionConfirm = async (portionData: PortionData) => {
    if (!editingMeal) return;

    setShowPortionSheet(false);

    const result = await updateMealPortionAction(editingMeal.id, {
      portion_percent: portionData.portionPercent,
      portion_multiplier: portionData.portionMultiplier,
      shared_with_count: portionData.sharedWithCount,
      leftovers_saved: portionData.leftoversSaved,
      portion_mode: portionData.portionMode,
    });

    if (!result.success) {
      showErrorAlert('meal', 'update_failed');
    }

    setEditingMeal(null);
  };

  // Close portion sheet
  const handleClosePortionSheet = () => {
    setShowPortionSheet(false);
    setEditingMeal(null);
  };

  // Calculate data from context
  const summary = todayTracker?.summary;
  const meals = todayTracker?.meals || [];
  const userTargets = targets || todayTracker?.targets;

  const caloriesConsumed = summary?.total_calories || 0;
  const caloriesTarget = userTargets?.calories || 2000;

  const proteinConsumed = summary?.total_protein_g || 0;
  const proteinTarget = userTargets?.protein_g || 100;

  const carbsConsumed = summary?.total_carbs_g || 0;
  const carbsTarget = userTargets?.carbs_g || 250;

  const fatConsumed = summary?.total_fat_g || 0;
  const fatTarget = userTargets?.fat_g || 65;

  const fiberConsumed = summary?.total_fiber_g || 0;
  const fiberTarget = userTargets?.fiber_g || 25;

  // Calculate streak
  const streak = (weeklyData?.summaries || []).filter(s => s.meal_count > 0).length;

  // Default organs to always show in tracker (baseline at 50/100)
  const DEFAULT_ORGANS = ['heart', 'liver', 'gut', 'kidneys', 'brain', 'stomach'];

  // Calculate organ scores from today's data with trends
  const organImpacts = summary?.organ_scores || {};

  // Build organ scores - use data if available, otherwise show defaults at baseline
  const hasOrganData = Object.keys(organImpacts).length > 0;
  const organScores = hasOrganData
    ? Object.entries(organImpacts)
        .filter(([, score]) => typeof score === 'number')
        .map(([organ, score]) => ({
          name: organ.charAt(0).toUpperCase() + organ.slice(1),
          score: Math.round(50 + (score as number) * 2), // Normalize to 0-100
          trend: (score as number) > 0 ? 'up' : (score as number) < 0 ? 'down' : 'stable',
          trendPercent: Math.abs(Math.round((score as number) * 4)),
        }))
        .slice(0, 6)
    : DEFAULT_ORGANS.map(organ => ({
        name: organ.charAt(0).toUpperCase() + organ.slice(1),
        score: 50, // Baseline score
        trend: 'stable' as const,
        trendPercent: 0,
      })) as Array<{
      name: string;
      score: number;
      trend: 'up' | 'down' | 'stable';
      trendPercent: number;
    }>;

  // Helper to generate organ-specific factors based on nutrition data
  const getOrganFactors = (organName: string): Array<{name: string; positive: boolean}> => {
    const factors: Array<{name: string; positive: boolean}> = [];
    const lowerName = organName.toLowerCase();

    // Sodium impact (kidneys, heart)
    if (lowerName === 'kidneys' || lowerName === 'heart') {
      const sodiumConsumed = summary?.total_sodium_mg || 0;
      const sodiumTarget = userTargets?.sodium_mg || 2300;
      if (sodiumConsumed < sodiumTarget * 0.7) {
        factors.push({ name: 'Low sodium', positive: true });
      } else if (sodiumConsumed > sodiumTarget) {
        factors.push({ name: 'High sodium', positive: false });
      }
    }

    // Fiber impact (gut, stomach)
    if (lowerName === 'gut' || lowerName === 'stomach') {
      if (fiberConsumed >= fiberTarget * 0.8) {
        factors.push({ name: 'Good fiber', positive: true });
      } else if (fiberConsumed < fiberTarget * 0.3) {
        factors.push({ name: 'Very low fiber', positive: false });
      } else if (fiberConsumed < fiberTarget * 0.5) {
        factors.push({ name: 'Low fiber', positive: false });
      }
    }

    // Protein impact (liver, metabolic)
    if (lowerName === 'liver' || lowerName === 'metabolic') {
      if (proteinConsumed >= proteinTarget * 0.8) {
        factors.push({ name: 'Good protein', positive: true });
      } else if (proteinConsumed < proteinTarget * 0.3) {
        factors.push({ name: 'Low protein', positive: false });
      }
    }

    // Fat impact (liver, heart)
    if (lowerName === 'liver' || lowerName === 'heart') {
      const fatPercent = fatTarget > 0 ? fatConsumed / fatTarget : 0;
      if (fatPercent >= 0.4 && fatPercent <= 0.8) {
        factors.push({ name: 'Moderate fat', positive: true });
      } else if (fatPercent > 1.2) {
        factors.push({ name: 'High fat', positive: false });
      }
    }

    // Sugar impact (liver, metabolic)
    if (lowerName === 'liver' || lowerName === 'metabolic') {
      const sugarConsumed = summary?.total_sugar_g || 0;
      const sugarTarget = userTargets?.sugar_g || 50;
      if (sugarConsumed < sugarTarget * 0.5) {
        factors.push({ name: 'Low sugar', positive: true });
      } else if (sugarConsumed > sugarTarget) {
        factors.push({ name: 'High sugar', positive: false });
      }
    }

    // Water impact (kidneys, brain, skin)
    if (lowerName === 'kidneys' || lowerName === 'brain' || lowerName === 'skin') {
      if (waterGlasses >= 6) {
        factors.push({ name: 'Good hydration', positive: true });
      } else if (waterGlasses < 3) {
        factors.push({ name: 'Low water', positive: false });
      }
    }

    // Brain specific - omega-3, antioxidants proxy
    if (lowerName === 'brain') {
      // Use fat as proxy for potential omega-3 intake
      if (fatConsumed >= fatTarget * 0.5) {
        factors.push({ name: 'Good glucose', positive: true });
      } else {
        factors.push({ name: 'Low omega-3', positive: false });
      }
    }

    // Gut specific - prebiotics proxy
    if (lowerName === 'gut') {
      if (fiberConsumed < fiberTarget * 0.4) {
        factors.push({ name: 'Low prebiotics', positive: false });
      }
      // Check if eating mostly processed foods (high calories, low fiber)
      if (caloriesConsumed > 500 && fiberConsumed < 5) {
        factors.push({ name: 'Processed foods', positive: false });
      }
    }

    // Stomach specific - balanced pH
    if (lowerName === 'stomach') {
      if (fiberConsumed >= fiberTarget * 0.5 && proteinConsumed >= proteinTarget * 0.5) {
        factors.push({ name: 'Balanced pH', positive: true });
      }
    }

    // Return up to 3 factors, prioritize negatives for attention
    const negatives = factors.filter(f => !f.positive);
    const positives = factors.filter(f => f.positive);
    return [...negatives.slice(0, 2), ...positives.slice(0, 3 - negatives.length)].slice(0, 3);
  };

  // Convert to new organ health format for OrganHealthSection
  type OrganStatus = 'excellent' | 'good' | 'moderate' | 'attention';
  const organHealthData = organScores.map((organ) => {
    const status: OrganStatus =
      organ.score >= 80 ? 'excellent' :
      organ.score >= 60 ? 'good' :
      organ.score >= 40 ? 'moderate' : 'attention';

    // Get nutritional factors for this organ
    const nutritionFactors = getOrganFactors(organ.name);

    return {
      name: organ.name,
      score: organ.score,
      status,
      factors: nutritionFactors.length > 0 ? nutritionFactors : [
        {
          name: organ.trend === 'up' ? 'Improving' : organ.trend === 'down' ? 'Declining' : 'Stable',
          positive: organ.trend !== 'down',
        },
      ],
    };
  });

  const avgOrganScore = organScores.length > 0
    ? Math.round(organScores.reduce((sum, o) => sum + o.score, 0) / organScores.length)
    : 0;

  // Generate AI insight
  const aiInsight = generateAIInsight({
    calories: { current: caloriesConsumed, target: caloriesTarget },
    organScores: organScores,
    waterGlasses: waterGlasses,
    meals: meals.length,
  });

  // Calculate weekly chart data
  const weeklyChartData = (weeklyData?.summaries || []).map((s) => {
    const score = s.meal_count > 0
      ? Math.round(Math.min(100, (s.total_calories / (userTargets?.calories || 2000)) * 100))
      : null;
    return {
      date: s.date,
      score,
      logged: s.meal_count > 0,
    };
  });

  // Calculate average score for the week
  const avgScore = weeklyData?.weeklyAverages
    ? Math.round((weeklyData.weeklyAverages.avg_calories / (userTargets?.calories || 2000)) * 100)
    : undefined;

  const handleWaterChange = async (glasses: number) => {
    // Persist water intake to backend
    await setWaterGlassesAction(glasses);
  };

  const handleLogFirstMeal = () => {
    router.push('/' as any);
  };

  const handleMealPress = (meal: any) => {
    // Check if this meal has a pending after photo
    if (meal.photo_status === 'pending_after_photo') {
      // Show prompt to take after photo
      Alert.alert(
        'Take After Photo',
        `Ready to complete your meal log for "${meal.dish_name}"?\n\nTake a photo of what's left on your plate to calculate how much you actually ate.`,
        [
          { text: 'Not Yet', style: 'cancel' },
          {
            text: 'Take Photo',
            onPress: () => {
              // Navigate to after photo capture
              // We'll pass the meal data to complete the analysis
              router.push({
                pathname: '/after-photo-capture',
                params: {
                  mealId: String(meal.id),
                  dishName: meal.dish_name,
                  beforePhotoUrl: meal.before_photo_url || '',
                  baselineCalories: String(meal.baseline_calories || meal.calories || 0),
                },
              });
            },
          },
          {
            text: 'Mark Complete Manually',
            onPress: () => handleEditPortion(meal),
          },
        ]
      );
      return;
    }

    // Navigate to recipe card with dish info from full_analysis or cache
    const analysis = meal.full_analysis;

    if (analysis) {
      // Build params from full_analysis data
      const params: Record<string, string> = {
        dishName: meal.dish_name || '',
      };

      // Add image URL if available
      if (analysis.recipe_image) {
        params.imageUrl = encodeURIComponent(analysis.recipe_image);
      }

      // Add likely recipe data
      if (analysis.likely_recipe) {
        params.likelyRecipe = JSON.stringify(analysis.likely_recipe);
      }

      // Add full recipe data
      if (analysis.full_recipe) {
        params.fullRecipe = JSON.stringify(analysis.full_recipe);
      }

      // Add nutrition data
      if (analysis.nutrition_summary) {
        params.nutrition = JSON.stringify(analysis.nutrition_summary);
      }

      // Add nutrition insights
      if (analysis.nutrition_insights) {
        params.nutritionInsights = JSON.stringify(analysis.nutrition_insights);
      }

      // Add allergen data
      if (analysis.allergen_flags) {
        params.allergens = JSON.stringify(analysis.allergen_flags);
      }
      if (analysis.allergen_summary) {
        params.allergenSummary = analysis.allergen_summary;
      }

      // Add FODMAP data
      if (analysis.fodmap) {
        params.fodmap = JSON.stringify(analysis.fodmap);
      }
      if (analysis.fodmap_summary) {
        params.fodmapSummary = analysis.fodmap_summary;
      }

      // Add organ data
      if (analysis.organs) {
        params.organs = JSON.stringify(analysis.organs);
      }

      // Add restaurant name if available
      if (meal.restaurant_name) {
        params.restaurantName = meal.restaurant_name;
      }

      router.push({ pathname: '/likely-recipe', params });
    } else {
      // Fallback: open portion sheet if no full_analysis available
      handleEditPortion(meal);
    }
  };

  const handleMealLongPress = (meal: any) => {
    handleDeleteMeal(meal.id, meal.dish_name);
  };

  const toggleOrgansExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOrgansExpanded(!isOrgansExpanded);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <TrackerHeader streak={streak} />

        {/* Daily Summary Card */}
        <DailySummaryCard
          calories={{ current: caloriesConsumed, target: caloriesTarget }}
          macros={{
            protein: { current: proteinConsumed, target: proteinTarget },
            carbs: { current: carbsConsumed, target: carbsTarget },
            fat: { current: fatConsumed, target: fatTarget },
            fiber: { current: fiberConsumed, target: fiberTarget },
          }}
          fiberAlert={fiberConsumed < fiberTarget * 0.5}
        />

        {/* AI Health Coach Panel */}
        <View style={styles.section}>
          <AIAssistantPanel
            insight={aiInsight.insight}
            suggestion={aiInsight.suggestion}
            onAskCoach={openAIPanel}
          />
        </View>

        {/* Water Tracker */}
        <View style={styles.section}>
          <WaterTracker
            glasses={waterGlasses}
            totalGlasses={waterTargetGlasses}
            onGlassPress={handleWaterChange}
          />
        </View>

        {/* Meals Today */}
        <View style={styles.section}>
          <MealsList
            meals={meals}
            onMealPress={handleMealPress}
            onMealLongPress={handleMealLongPress}
            onLogFirstMeal={handleLogFirstMeal}
          />
        </View>

        {/* Expandable Organ Health Section */}
        {organHealthData.length > 0 && (
          <View style={styles.section}>
            {/* Expandable Header */}
            <TouchableOpacity
              style={styles.expandableHeader}
              onPress={toggleOrgansExpanded}
              activeOpacity={0.7}
            >
              <View style={styles.expandableHeaderLeft}>
                <Text style={styles.expandableSectionTitle}>Organ Health</Text>
                <View style={styles.avgScoreBadge}>
                  <Text style={[
                    styles.avgScoreBadgeText,
                    { color: avgOrganScore >= 70 ? COLORS.primary : avgOrganScore >= 50 ? COLORS.moderate : COLORS.attention }
                  ]}>
                    {Math.round(avgOrganScore)}/100
                  </Text>
                </View>
              </View>
              <Ionicons
                name={isOrgansExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {/* Expanded Content */}
            {isOrgansExpanded && (
              <View style={styles.expandableContent}>
                <OrganHealthSection
                  organs={organHealthData}
                  avgScore={avgOrganScore}
                  priorityInsight={
                    !hasOrganData
                      ? 'Log a meal to see how your food choices affect your organs'
                      : organHealthData.find(o => o.status === 'attention' || o.status === 'moderate')
                        ? `Focus on ${organHealthData.find(o => o.status === 'attention' || o.status === 'moderate')?.name.toLowerCase()} support today`
                        : undefined
                  }
                />
              </View>
            )}
          </View>
        )}

        {/* Weekly Overview */}
        <View style={styles.section}>
          <WeeklyOverview
            weekData={weeklyChartData}
            averageScore={avgScore}
          />
        </View>

        {/* Daily Insight */}
        {summary?.daily_insight && (
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightIcon}>💡</Text>
              <Text style={styles.insightTitle}>Daily Insight</Text>
            </View>
            <Text style={styles.insightText}>{summary.daily_insight}</Text>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Loading Overlay */}
      {isTrackerLoading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}

      {/* Quick Log Modal */}
      <QuickLogModal
        visible={showQuickLog}
        onClose={() => setShowQuickLog(false)}
        onScanFood={() => {
          // TODO: Implement scan food
          router.push('/' as any);
        }}
        onSearch={() => {
          router.push('/' as any);
        }}
        onBarcode={() => {
          // TODO: Implement barcode scanner
          Alert.alert('Coming Soon', 'Barcode scanning will be available soon!');
        }}
        onFavorites={() => {
          // TODO: Implement favorites
          Alert.alert('Coming Soon', 'Favorites will be available soon!');
        }}
      />

      {/* Portion Sheet for editing meal portions */}
      <PortionSheet
        visible={showPortionSheet}
        onClose={handleClosePortionSheet}
        onConfirm={handlePortionConfirm}
        initialPortionPercent={editingMeal?.portion_percent ?? 100}
        initialSharedWithCount={editingMeal?.shared_with_count ?? null}
        initialLeftoversSaved={editingMeal?.leftovers_saved ?? false}
        dishName={editingMeal?.dish_name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  streakBadge: {
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },
  streakText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  section: {
    marginTop: SPACING.lg,
  },
  insightCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  insightIcon: {
    fontSize: 18,
  },
  insightTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  insightText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Expandable section styles
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  expandableSectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  avgScoreBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  avgScoreBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  expandableContent: {
    marginTop: SPACING.md,
  },
});
