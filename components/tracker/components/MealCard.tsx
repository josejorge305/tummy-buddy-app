/**
 * MealCard Component
 * Individual meal item card with emoji, name, time, and health score
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';
import { getScoreColor, getMealEmoji, formatTime } from '../utils/scoreHelpers';

interface MealCardProps {
  id: number;
  name: string;
  time: string | number;
  calories: number;
  healthScore?: number;
  mealType?: string | null;
  restaurantName?: string | null;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function MealCard({
  id,
  name,
  time,
  calories,
  healthScore,
  mealType,
  restaurantName,
  onPress,
  onLongPress,
}: MealCardProps) {
  const emoji = getMealEmoji(mealType, name);
  const scoreColor = healthScore ? getScoreColor(healthScore) : COLORS.primary;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Emoji Icon */}
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* Meal Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta}>
          {formatTime(time)} · {Math.round(calories)} cal
          {restaurantName ? ` · ${restaurantName}` : ''}
        </Text>
      </View>

      {/* Health Score Badge */}
      {healthScore !== undefined && (
        <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}20` }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {Math.round(healthScore)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  meta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 44,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});
