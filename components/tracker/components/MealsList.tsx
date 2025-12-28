/**
 * MealsList Component
 * Section showing today's logged meals or empty state
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MealCard } from './MealCard';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';

interface Meal {
  id: number;
  dish_name: string;
  logged_at: string | number;
  calories?: number | null;
  meal_type?: string | null;
  restaurant_name?: string | null;
  organ_impacts?: Record<string, number> | null;
  risk_flags?: string[] | null;
  portion_percent?: number | null;
  shared_with_count?: number | null;
}

interface MealsListProps {
  meals: Meal[];
  onMealPress?: (meal: Meal) => void;
  onMealLongPress?: (meal: Meal) => void;
  onLogFirstMeal?: () => void;
}

export function MealsList({
  meals,
  onMealPress,
  onMealLongPress,
  onLogFirstMeal,
}: MealsListProps) {
  // Calculate a simple health score from organ impacts
  const getHealthScore = (meal: Meal): number | undefined => {
    if (!meal.organ_impacts) return undefined;
    const scores = Object.values(meal.organ_impacts).filter((v): v is number => typeof v === 'number');
    if (scores.length === 0) return undefined;
    const avgImpact = scores.reduce((a, b) => a + b, 0) / scores.length;
    // Convert impact (-25 to +25) to score (0-100)
    return Math.round(50 + avgImpact * 2);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Meals Today</Text>
        {meals.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{meals.length}</Text>
          </View>
        )}
      </View>

      {/* Meals or Empty State */}
      {meals.length === 0 ? (
        <View style={styles.emptyState}>
          {/* Illustration placeholder */}
          <View style={styles.illustrationContainer}>
            <Text style={styles.illustrationEmoji}>🍽️</Text>
            <View style={styles.sparkle1}>
              <Text style={styles.sparkleEmoji}>✨</Text>
            </View>
            <View style={styles.sparkle2}>
              <Text style={styles.sparkleEmoji}>✨</Text>
            </View>
          </View>

          <Text style={styles.emptyTitle}>No meals logged yet</Text>
          <Text style={styles.emptySubtitle}>
            Start tracking your nutrition by logging your first meal
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onLogFirstMeal}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.textPrimary} />
              <Text style={styles.ctaText}>Log Your First Meal</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mealsList}>
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              id={meal.id}
              name={meal.dish_name}
              time={meal.logged_at}
              calories={meal.calories || 0}
              healthScore={getHealthScore(meal)}
              mealType={meal.meal_type}
              restaurantName={meal.restaurant_name}
              portionPercent={meal.portion_percent}
              sharedWithCount={meal.shared_with_count}
              onPress={() => onMealPress?.(meal)}
              onLongPress={() => onMealLongPress?.(meal)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  countText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  illustrationContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  illustrationEmoji: {
    fontSize: 64,
  },
  sparkle1: {
    position: 'absolute',
    top: -8,
    right: -16,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 0,
    left: -20,
  },
  sparkleEmoji: {
    fontSize: 20,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  ctaButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  ctaText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  mealsList: {
    gap: SPACING.sm,
  },
});
