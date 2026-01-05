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
  // Photo analysis status
  photoStatus?: 'pending_after_photo' | 'analyzing' | 'completed' | 'manual' | null;
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
  photoStatus,
  onPress,
  onLongPress,
}: MealCardProps) {
  const scoreColor = healthScore ? getScoreColor(healthScore) : COLORS.primary;
  const portionLabel = getPortionLabel(portionPercent, sharedWithCount);
  const isRestaurant = !!restaurantName;
  const isPendingPhoto = photoStatus === 'pending_after_photo';
  const isAnalyzing = photoStatus === 'analyzing';

  return (
    <TouchableOpacity
      style={[styles.container, isPendingPhoto && styles.containerPending]}
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
        {/* Pending indicator dot */}
        {isPendingPhoto && (
          <View style={styles.pendingIndicator}>
            <View style={styles.pendingDot} />
          </View>
        )}
        {/* Complete indicator checkmark */}
        {photoStatus === 'completed' && (
          <View style={styles.completeIndicator}>
            <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
              <Path d="M5 12l5 5L20 7" stroke="#0a0f1a" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        )}
      </View>

      {/* Meal Info */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {isPendingPhoto && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>After photo needed</Text>
            </View>
          )}
          {!isPendingPhoto && portionLabel && (
            <View style={styles.portionPill}>
              <Text style={styles.portionText}>{portionLabel}</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{formatTime(time)}</Text>
          <Text style={styles.metaSeparator}>·</Text>
          <Text style={[styles.calories, isPendingPhoto && styles.caloriesPending]}>
            {isPendingPhoto ? `~${Math.round(calories)} cal` : `${Math.round(calories)} cal`}
          </Text>
          {restaurantName && (
            <>
              <Text style={styles.metaSeparator}>·</Text>
              <Text style={styles.restaurant} numberOfLines={1}>{restaurantName}</Text>
            </>
          )}
        </View>
        {/* Progress bar for pending meals */}
        {isPendingPhoto && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.progressLabel}>Tap when done eating</Text>
          </View>
        )}
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
  // Pending photo styles
  containerPending: {
    borderColor: 'rgba(45, 212, 191, 0.4)',
    backgroundColor: 'rgba(13, 26, 31, 0.5)',
  },
  pendingIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    backgroundColor: '#0a0f1a',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 10,
    height: 10,
    backgroundColor: '#2dd4bf',
    borderRadius: 5,
  },
  completeIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    backgroundColor: '#2dd4bf',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    backgroundColor: 'rgba(45, 212, 191, 0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    color: '#2dd4bf',
    fontSize: 9,
    fontWeight: '600',
  },
  caloriesPending: {
    color: '#2dd4bf',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressFill: {
    width: '50%',
    height: '100%',
    backgroundColor: '#2dd4bf',
    borderRadius: 100,
  },
  progressLabel: {
    fontSize: 11,
    color: '#2dd4bf',
  },
});
