/**
 * CircularProgress Component
 * Animated circular progress ring for displaying calorie progress
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, FONT_SIZES } from '../utils/colors';
import { getScoreColor } from '../utils/scoreHelpers';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
}

export function CircularProgress({
  current,
  target,
  size = 110,
  strokeWidth = 10,
  showPercentage = false,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((current / target) * 100, 100);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percentage / 100, {
      duration: 1000,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const progressColor = getScoreColor(percentage);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={COLORS.primary} />
            <Stop offset="100%" stopColor={COLORS.secondary} />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={styles.currentValue}>{Math.round(current).toLocaleString()}</Text>
        <Text style={styles.targetValue}>/ {Math.round(target).toLocaleString()}</Text>
        {showPercentage && (
          <Text style={[styles.percentage, { color: progressColor }]}>
            {Math.round(percentage)}%
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  targetValue: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  percentage: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: 4,
  },
});
