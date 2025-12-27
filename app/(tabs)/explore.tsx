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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserPrefs } from '../../context/UserPrefsContext';
import { useRouter } from 'expo-router';

// App-wide theme colors
const TEAL = '#14b8a6';
const BG = '#020617';

type WeeklyPoint = {
  label: string;
  score: number;
  date: string;
};

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function CircleProgress({ percent, size = 56, label }: { percent: number; size?: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const ringColor =
    clamped >= 85 ? TEAL : clamped >= 65 ? '#fbbf24' : clamped >= 45 ? '#f97316' : '#ef4444';

  return (
    <View style={styles.circleContainer}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
          },
        ]}
      >
        <Text style={styles.circleText}>{clamped}</Text>
      </View>
      {label && <Text style={[styles.subtle, { marginTop: 6 }]}>{label}</Text>}
    </View>
  );
}

function MacroBar({
  label,
  current,
  target,
  unit = 'g',
  color = TEAL,
}: {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: string;
}) {
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const isOver = current > target;

  return (
    <View style={styles.macroBar}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={[styles.macroValue, isOver && styles.macroValueOver]}>
          {Math.round(current)}{unit} / {target}{unit}
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View
          style={[
            styles.macroFill,
            {
              width: `${Math.min(100, percent)}%`,
              backgroundColor: isOver ? '#ef4444' : color,
            },
          ]}
        />
      </View>
    </View>
  );
}

function BarChart({ data }: { data: WeeklyPoint[] }) {
  const max = Math.max(...data.map((d) => d.score), 100);

  return (
    <View style={styles.barChart}>
      {data.map((d, index) => {
        const heightPct = Math.max(8, (d.score / max) * 100);
        const barColor = d.score >= 80 ? TEAL : d.score >= 60 ? '#fbbf24' : '#f97316';
        return (
          <View key={`${d.label}-${index}`} style={styles.barItem}>
            <View style={[styles.bar, { height: `${heightPct}%`, backgroundColor: barColor }]} />
            <Text style={styles.barLabel}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function formatTime(timestamp: string | number): string {
  // Handle both Unix timestamp (number) and ISO date string
  const date = typeof timestamp === 'number'
    ? new Date(timestamp * 1000)
    : new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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

  // Calculate progress percentages
  const summary = todayTracker?.summary;
  const meals = todayTracker?.meals || [];
  const userTargets = targets || todayTracker?.targets;

  const caloriesConsumed = summary?.total_calories || 0;
  const caloriesTarget = userTargets?.calories || 2000;
  const caloriesPercent = Math.round((caloriesConsumed / caloriesTarget) * 100);

  const proteinConsumed = summary?.total_protein_g || 0;
  const proteinTarget = userTargets?.protein_g || 100;

  const carbsConsumed = summary?.total_carbs_g || 0;
  const carbsTarget = userTargets?.carbs_g || 250;

  const fatConsumed = summary?.total_fat_g || 0;
  const fatTarget = userTargets?.fat_g || 65;

  const fiberConsumed = summary?.total_fiber_g || 0;
  const fiberTarget = userTargets?.fiber_g || 25;

  const sodiumConsumed = summary?.total_sodium_mg || 0;
  const sodiumLimit = userTargets?.sodium_mg || 2300;

  // Weekly chart data
  const weeklyChartData: WeeklyPoint[] = (weeklyData?.summaries || []).map((s) => {
    const dayLabel = new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
    // Calculate a "tummy score" based on how well they hit targets
    const score = s.meal_count > 0
      ? Math.round(Math.min(100, (s.total_calories / (userTargets?.calories || 2000)) * 100))
      : 0;
    return { label: dayLabel, score, date: s.date };
  });

  // Fill in missing days with zeros
  while (weeklyChartData.length < 7) {
    weeklyChartData.unshift({ label: '-', score: 0, date: '' });
  }

  // Organ impacts from today
  const organImpacts = summary?.organ_scores || {};
  const topOrgans = Object.entries(organImpacts)
    .sort(([, a], [, b]) => Math.abs(b as number) - Math.abs(a as number))
    .slice(0, 3)
    .map(([organ, score]) => ({
      organ: organ.charAt(0).toUpperCase() + organ.slice(1),
      score: Math.round(50 + (score as number) * 2), // Normalize to 0-100 scale
    }));

  // Calculate streak (simplified - count consecutive days with meals)
  const streak = (weeklyData?.summaries || []).filter(s => s.meal_count > 0).length;

  // Weekly averages
  const weeklyAvg = weeklyData?.weeklyAverages;

  const hasProfile = profile && profile.weight_kg;
  const hasData = meals.length > 0 || (summary && summary.meal_count > 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={TEAL}
            colors={[TEAL]}
          />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Tummy Tracker</Text>
            <Text style={styles.subtitle}>
              {hasProfile
                ? 'Track your daily nutrition and organ health.'
                : 'Set up your profile to personalize targets.'}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PRO</Text>
          </View>
        </View>

        {/* Profile Setup Prompt */}
        {!hasProfile && (
          <Card>
            <View style={styles.setupPrompt}>
              <Ionicons name="person-circle-outline" size={40} color="#888" />
              <Text style={styles.setupTitle}>Complete Your Profile</Text>
              <Text style={styles.setupText}>
                Add your body metrics to get personalized calorie and macro targets.
              </Text>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={() => router.push('/profile' as any)}
              >
                <Text style={styles.setupButtonText}>Set Up Profile</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Today's Overview Card */}
        <Card>
          <Text style={styles.sectionTitle}>Today&apos;s Overview</Text>
          <View style={styles.rowBetween}>
            <View style={styles.centered}>
              <Text style={styles.tummyScore}>{caloriesPercent}%</Text>
              <Text style={styles.subtle}>of daily goal</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.subtle}>
                Calories: {caloriesConsumed.toLocaleString()} / {caloriesTarget.toLocaleString()}
              </Text>
              <Text style={styles.subtle}>Meals: {meals.length}</Text>
              {streak > 0 && <Text style={styles.subtle}>Streak: {streak} days</Text>}
            </View>
          </View>

          {/* Macro Progress Bars */}
          <View style={styles.macrosSection}>
            <MacroBar label="Protein" current={proteinConsumed} target={proteinTarget} color="#3b82f6" />
            <MacroBar label="Carbs" current={carbsConsumed} target={carbsTarget} color="#f59e0b" />
            <MacroBar label="Fat" current={fatConsumed} target={fatTarget} color="#ef4444" />
            <MacroBar label="Fiber" current={fiberConsumed} target={fiberTarget} color={TEAL} />
          </View>
        </Card>

        {/* Organ Health Pillars */}
        {topOrgans.length > 0 && (
          <View style={[styles.rowBetween, { marginTop: 12 }]}>
            {topOrgans.map((pillar) => (
              <CircleProgress
                key={pillar.organ}
                percent={pillar.score}
                label={pillar.organ}
              />
            ))}
          </View>
        )}

        {/* Insight Card */}
        {summary?.daily_insight && (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Insight</Text>
            <Text style={[styles.subtle, { fontStyle: 'italic', marginTop: 4 }]}>
              {summary.daily_insight}
            </Text>
          </Card>
        )}

        {/* Meals Today Card */}
        <Card style={{ marginTop: 16 }}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Meals Today</Text>
            {meals.length > 0 && (
              <Text style={styles.mealCount}>{meals.length} logged</Text>
            )}
          </View>

          {meals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={32} color="#444" />
              <Text style={styles.emptyText}>No meals logged yet</Text>
              <Text style={styles.emptyHint}>
                Analyze a dish and tap &quot;Log Meal&quot; to track it here.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 10, gap: 10 }}>
              {meals.map((meal) => {
                const organScores = meal.organ_impacts
                  ? Object.entries(meal.organ_impacts)
                      .filter(([, v]) => typeof v === 'number')
                      .slice(0, 2)
                      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${(v as number) > 0 ? '+' : ''}${v}`)
                      .join(' · ')
                  : '';

                return (
                  <TouchableOpacity
                    key={meal.id}
                    style={styles.mealCard}
                    onLongPress={() => handleDeleteMeal(meal.id, meal.dish_name)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealName}>{meal.dish_name}</Text>
                      <Text style={styles.mealMeta}>
                        {formatTime(meal.logged_at)}
                        {meal.calories ? ` · ${meal.calories} cal` : ''}
                        {organScores ? ` · ${organScores}` : ''}
                      </Text>
                      {meal.restaurant_name && (
                        <Text style={styles.mealRestaurant}>{meal.restaurant_name}</Text>
                      )}
                    </View>
                    {meal.risk_flags && meal.risk_flags.length > 0 ? (
                      <View style={styles.mealWarning}>
                        <Ionicons name="warning" size={16} color="#f59e0b" />
                      </View>
                    ) : (
                      <Text style={styles.mealTag}>Logged</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {/* This Week Card */}
        <Card style={{ marginTop: 16, marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>This Week</Text>
          {weeklyAvg && (
            <Text style={[styles.subtle, { marginTop: 4 }]}>
              Avg: {Math.round(weeklyAvg.avg_calories)} cal · {Math.round(weeklyAvg.avg_protein_g)}g protein
            </Text>
          )}
          <BarChart data={weeklyChartData} />
          {weeklyAvg && weeklyAvg.days_logged > 0 && (
            <Text style={[styles.subtle, { marginTop: 8 }]}>
              {weeklyAvg.days_logged} days tracked this week
            </Text>
          )}
        </Card>

        {/* Sodium Warning */}
        {sodiumConsumed > sodiumLimit && (
          <Card style={{ marginBottom: 24, backgroundColor: '#ef444422', borderColor: '#ef4444' }}>
            <View style={styles.warningRow}>
              <Ionicons name="warning" size={20} color="#ef4444" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.warningTitle}>High Sodium</Text>
                <Text style={styles.warningText}>
                  You&apos;ve consumed {Math.round(sodiumConsumed)}mg of {sodiumLimit}mg limit.
                </Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Loading Overlay */}
      {isTrackerLoading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={TEAL} size="large" />
        </View>
      )}

      {/* FAB - Navigate to Home to search dishes */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => router.push('/' as any)}
      >
        <Ionicons name="add" size={22} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fefefe',
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderWidth: 1,
    borderColor: TEAL,
  },
  badgeText: {
    color: TEAL,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#111219',
    borderWidth: 1,
    borderColor: '#1f2230',
    padding: 16,
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fefefe',
  },
  mealCount: {
    color: '#888',
    fontSize: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleContainer: {
    alignItems: 'center',
  },
  tummyScore: {
    fontSize: 40,
    fontWeight: '800',
    color: TEAL,
  },
  subtle: {
    color: '#e5e7eb',
    opacity: 0.7,
    fontSize: 13,
  },
  circle: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
  },
  circleText: {
    color: '#fefefe',
    fontWeight: '700',
  },
  macrosSection: {
    marginTop: 16,
    gap: 12,
  },
  macroBar: {
    gap: 4,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
  },
  macroValue: {
    color: '#888',
    fontSize: 12,
  },
  macroValueOver: {
    color: '#ef4444',
  },
  macroTrack: {
    height: 6,
    backgroundColor: '#1a1c25',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  emptyHint: {
    color: '#555',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  mealCard: {
    backgroundColor: '#1a1c25',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealName: {
    color: '#fefefe',
    fontWeight: '600',
    fontSize: 14,
  },
  mealMeta: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  mealRestaurant: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  mealTag: {
    color: TEAL,
    fontSize: 12,
    fontWeight: '700',
  },
  mealWarning: {
    padding: 4,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 6,
    height: 120,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    borderRadius: 6,
    backgroundColor: TEAL,
  },
  barLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 6,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningTitle: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 14,
  },
  warningText: {
    color: '#ef444499',
    fontSize: 12,
    marginTop: 2,
  },
  setupPrompt: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  setupTitle: {
    color: '#fefefe',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  setupText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  setupButton: {
    backgroundColor: TEAL,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  setupButtonText: {
    color: '#020617',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    backgroundColor: TEAL,
    borderRadius: 999,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
