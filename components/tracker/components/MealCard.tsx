/**
 * MealCard Component (Redesigned)
 * Individual meal item card with dish image, name, time, and health score
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';
import { getScoreColor, formatTime } from '../utils/scoreHelpers';

// Fallback icon when no dish image is available
const RestaurantAIIcon = require('../../../assets/images/REstaurant AI Icon.png');

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
  imageUrl?: string | null;
  onPress?: () => void;
  onLongPress?: () => void;
}

// Chef hat icon for homemade meals
function ChefHatIcon({ size = 24, color = COLORS.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4C10.35 4 9 5.35 9 7C9 7.35 9.07 7.69 9.19 8H6C4.35 8 3 9.35 3 11C3 12.3 3.84 13.41 5 13.82V18C5 19.1 5.9 20 7 20H17C18.1 20 19 19.1 19 18V13.82C20.16 13.41 21 12.3 21 11C21 9.35 19.65 8 18 8H14.81C14.93 7.69 15 7.35 15 7C15 5.35 13.65 4 12 4Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M9 16H15"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Restaurant icon
function RestaurantIcon({ size = 24, color = COLORS.textMuted }: { size?: number; color?: string }) {
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
  imageUrl,
  onPress,
  onLongPress,
}: MealCardProps) {
  const scoreColor = healthScore ? getScoreColor(healthScore) : COLORS.primary;
  const portionLabel = getPortionLabel(portionPercent, sharedWithCount);
  const isRestaurant = !!restaurantName;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Dish Image or Fallback Icon */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.dishImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fallbackIconContainer}>
            {isRestaurant ? (
              <RestaurantIcon size={24} color={COLORS.textSecondary} />
            ) : (
              <ChefHatIcon size={24} color={COLORS.textSecondary} />
            )}
          </View>
        )}
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
        <View style={styles.metaRow}>
          <Text style={styles.time}>{formatTime(time)}</Text>
          <Text style={styles.metaSeparator}>·</Text>
          <Text style={styles.calories}>{Math.round(calories)} cal</Text>
          {restaurantName && (
            <>
              <Text style={styles.metaSeparator}>·</Text>
              <Text style={styles.restaurant} numberOfLines={1}>{restaurantName}</Text>
            </>
          )}
        </View>
      </View>

      {/* Health Score Badge */}
      {healthScore !== undefined && (
        <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}15` }]}>
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
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dishImage: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
  },
  fallbackIconContainer: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    gap: 4,
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
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  portionText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  time: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  metaSeparator: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginHorizontal: 4,
  },
  calories: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  restaurant: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  scoreBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    minWidth: 48,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
