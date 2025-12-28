/**
 * WaterTracker Component
 * Horizontal card with tappable water glasses
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface WaterTrackerProps {
  glasses: number;
  totalGlasses?: number;
  onGlassPress?: (glassIndex: number) => void;
}

function WaterGlass({
  index,
  isFilled,
  onPress,
}: {
  index: number;
  isFilled: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9),
      withSpring(1.1),
      withSpring(1)
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[styles.glass, animatedStyle]}
    >
      {isFilled ? (
        <LinearGradient
          colors={[COLORS.secondary, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glassFilled}
        />
      ) : (
        <View style={styles.glassEmpty} />
      )}
    </AnimatedPressable>
  );
}

export function WaterTracker({
  glasses,
  totalGlasses = 8,
  onGlassPress,
}: WaterTrackerProps) {
  const [filledGlasses, setFilledGlasses] = useState(glasses);

  useEffect(() => {
    setFilledGlasses(glasses);
  }, [glasses]);

  const handleGlassPress = (index: number) => {
    // Tapping a glass fills all glasses up to and including that one
    // If tapping the same glass that's the last filled one, unfill it
    const newFilled = filledGlasses === index + 1 ? index : index + 1;
    setFilledGlasses(newFilled);
    onGlassPress?.(newFilled);
  };

  return (
    <LinearGradient
      colors={['rgba(6, 182, 212, 0.15)', 'rgba(20, 184, 166, 0.15)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Text style={styles.icon}>💧</Text>
          <Text style={styles.label}>Water Intake</Text>
        </View>
        <Text style={styles.count}>
          <Text style={styles.countCurrent}>{filledGlasses}</Text>
          <Text style={styles.countTotal}> / {totalGlasses} glasses</Text>
        </Text>
      </View>

      <View style={styles.glassesRow}>
        {Array.from({ length: totalGlasses }).map((_, index) => (
          <WaterGlass
            key={index}
            index={index}
            isFilled={index < filledGlasses}
            onPress={() => handleGlassPress(index)}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  count: {
    fontSize: FONT_SIZES.md,
  },
  countCurrent: {
    fontWeight: '700',
    color: COLORS.secondary,
  },
  countTotal: {
    color: COLORS.textSecondary,
  },
  glassesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  glass: {
    flex: 1,
    height: 32,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  glassFilled: {
    flex: 1,
    borderRadius: RADIUS.sm,
  },
  glassEmpty: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderStyle: 'dashed',
  },
});
