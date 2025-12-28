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
  portionPercent?: number | null;
  sharedWithCount?: number | null;
  onPress?: () => void;
  onLongPress?: () => void;
}

// Get display label for portion
function getPortionLabel(portionPercent?: number | null, sharedWithCount?: number | null): string | null {
  if (!portionPercent || portionPercent === 100) return null;

  if (sharedWithCount && sharedWithCount > 1) {
    return `Split ${sharedWithCount} ways`;
  }

  if (portionPercent >= 90) return null;
  if (portionPercent >= 70) return 'Most';
  if (portionPercent >= 45) return 'Half';
  if (portionPercent >= 20) return 'Some';
  return 'Few bites';
}

export function MealCard({
  id,
  name,
  time,
  calories,
  healthScore,
  mealType,
  restaurantName,
  portionPercent,
  sharedWithCount,
  onPress,
  onLongPress,
}: MealCardProps) {
  const emoji = getMealEmoji(mealType, name);
  const scoreColor = healthScore ? getScoreColor(healthScore) : COLORS.primary;
  const portionLabel = getPortionLabel(portionPercent, sharedWithCount);

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
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {portionLabel && (
            <View style={styles.portionPill}>
              <Text style={styles.portionText}>{portionLabel}</Text>
            </View>
          )}
        </View>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  portionPill: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  portionText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '600',
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
