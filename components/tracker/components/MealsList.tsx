/**
 * MealsList Component (Redesigned)
 * Section showing today's logged meals or empty state
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { MealCard } from './MealCard';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';

// Fork and knife icon for empty state
function ForkKnifeIcon({ size = 48, color = COLORS.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9Z"
        fill={color}
      />
      <Path
        d="M16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 7V6Z"
        fill={color}
      />
    </Svg>
  );
}

// Plus circle icon
function PlusCircleIcon({ size = 20, color = COLORS.textPrimary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="M12 8V16M8 12H16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

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
  // Photo analysis status
  photo_status?: 'pending_after_photo' | 'analyzing' | 'completed' | 'manual' | null;
  // Image from full_analysis.recipe_image or cache
  full_analysis?: {
    recipe_image?: string | null;
    [key: string]: any;
  } | null;
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

  // Calculate total calories for the day
  const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Today's Meals</Text>
          {meals.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{meals.length}</Text>
            </View>
          )}
        </View>
        {meals.length > 0 && (
          <Text style={styles.totalCalories}>{Math.round(totalCalories)} cal</Text>
        )}
      </View>

      {/* Meals or Empty State */}
      {meals.length === 0 ? (
        <View style={styles.emptyState}>
          {/* Icon */}
          <View style={styles.emptyIconContainer}>
            <ForkKnifeIcon size={40} color={COLORS.textMuted} />
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
              <PlusCircleIcon size={18} color={COLORS.textPrimary} />
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
              photoStatus={meal.photo_status}
              imageUrl={meal.full_analysis?.recipe_image}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  countText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  totalCalories: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
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
