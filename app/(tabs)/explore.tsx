/**
 * Tracker Screen (Redesigned)
 * Main daily tracking view with nutrition progress, meals, and weekly overview
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useUserPrefs } from '../../context/UserPrefsContext';
import { useRouter } from 'expo-router';
import { LoggedMeal } from '../../api/api';
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

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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

// Floating Action Button
function FAB({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <AnimatedTouchable
      style={[styles.fab, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fabGradient}
      >
        <Ionicons name="add" size={28} color={COLORS.textPrimary} />
      </LinearGradient>
    </AnimatedTouchable>
  );
}

export default function TummyTracker() {
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

  const [refreshing, setRefreshing] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [editingMeal, setEditingMeal] = useState<LoggedMeal | null>(null);
  const [showPortionSheet, setShowPortionSheet] = useState(false);

  // Get water glasses from tracker data
  const waterGlasses = todayTracker?.water?.total_glasses || 0;
  const waterTargetGlasses = todayTracker?.water?.target_glasses || 8;

  // Load tracker data on mount
  useEffect(() => {
    loadDailyTracker();
    loadWeeklyTracker();
  }, []);

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
              Alert.alert('Error', 'Failed to remove meal. Please try again.');
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
      Alert.alert('Error', result.error || 'Failed to update portion.');
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

  // Calculate organ scores from today's data with trends
  const organImpacts = summary?.organ_scores || {};
  const organScores = Object.entries(organImpacts)
    .filter(([, score]) => typeof score === 'number')
    .map(([organ, score]) => ({
      name: organ.charAt(0).toUpperCase() + organ.slice(1),
      score: Math.round(50 + (score as number) * 2), // Normalize to 0-100
      trend: (score as number) > 0 ? 'up' : (score as number) < 0 ? 'down' : 'stable',
      trendPercent: Math.abs(Math.round((score as number) * 4)),
    }))
    .slice(0, 6) as Array<{
      name: string;
      score: number;
      trend: 'up' | 'down' | 'stable';
      trendPercent: number;
    }>;

  // Convert to new organ health format for OrganHealthSection
  type OrganStatus = 'excellent' | 'good' | 'moderate' | 'attention';
  const organHealthData = organScores.map((organ) => {
    const status: OrganStatus =
      organ.score >= 80 ? 'excellent' :
      organ.score >= 60 ? 'good' :
      organ.score >= 40 ? 'moderate' : 'attention';

    return {
      name: organ.name,
      score: organ.score,
      status,
      factors: [
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

        {/* AI Assistant Panel */}
        <View style={styles.section}>
          <AIAssistantPanel
            insight={aiInsight.insight}
            suggestion={aiInsight.suggestion}
            onAskTummy={() => router.push('/' as any)}
          />
        </View>

        {/* Organ Health Section */}
        {organHealthData.length > 0 && (
          <View style={styles.section}>
            <OrganHealthSection
              organs={organHealthData}
              avgScore={avgOrganScore}
              priorityInsight={
                organHealthData.find(o => o.status === 'attention' || o.status === 'moderate')
                  ? `Focus on ${organHealthData.find(o => o.status === 'attention' || o.status === 'moderate')?.name.toLowerCase()} support today`
                  : undefined
              }
            />
          </View>
        )}

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

        {/* Bottom padding for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Loading Overlay */}
      {isTrackerLoading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}

      {/* FAB */}
      <FAB onPress={() => setShowQuickLog(true)} />

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
  fab: {
    position: 'absolute',
    right: SPACING.xl,
    bottom: 100,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
