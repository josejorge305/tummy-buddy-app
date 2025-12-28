/**
 * MacroBar Component
 * Horizontal progress bar for displaying macro nutrient progress
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

export function MacroBar({
  label,
  current,
  target,
  color,
  unit = 'g',
}: MacroBarProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const isOver = current > target;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percentage, {
      duration: 800,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, isOver && styles.valueOver]}>
          {Math.round(current)}{unit}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: isOver ? COLORS.error : color },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  valueOver: {
    color: COLORS.error,
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
});
