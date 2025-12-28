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

// Tracker components
import {
  DailySummaryCard,
  OrganScoresRow,
  WaterTracker,
  MealsList,
  WeeklyOverview,
  QuickLogModal,
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
      {/* TEST BANNER - Remove after verifying */}
      <View style={{ backgroundColor: '#FF0000', padding: 10, marginBottom: 10, borderRadius: 8 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center' }}>🚀 NEW REDESIGNED VERSION 🚀</Text>
      </View>
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
    deleteMealAction,
  } = useUserPrefs();

  const [refreshing, setRefreshing] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);

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
    .slice(0, 2) as Array<{
      name: string;
      score: number;
      trend: 'up' | 'down' | 'stable';
      trendPercent: number;
    }>;

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

  const handleWaterChange = (glasses: number) => {
    setWaterGlasses(glasses);
    // TODO: Persist water intake to backend
  };

  const handleLogFirstMeal = () => {
    router.push('/' as any);
  };

  const handleMealPress = (meal: any) => {
    // Navigate to meal details or show options
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

        {/* Organ Health Scores */}
        {organScores.length > 0 && (
          <View style={styles.section}>
            <OrganScoresRow organs={organScores} />
          </View>
        )}

        {/* Water Tracker */}
        <View style={styles.section}>
          <WaterTracker
            glasses={waterGlasses}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgGradientEnd,
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  streakText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.success,
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
