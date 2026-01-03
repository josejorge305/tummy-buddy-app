/**
 * WaterTracker Component (Redesigned)
 * Horizontal card with tappable water glasses
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface WaterTrackerProps {
  glasses: number;
  totalGlasses?: number;
  onGlassPress?: (glassIndex: number) => void;
}

// Water droplet icon
function WaterDropIcon({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"
        fill={color}
        fillOpacity={0.9}
      />
    </Svg>
  );
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
    console.log('[WaterGlass] Glass pressed, index:', index);
    scale.value = withSequence(
      withSpring(0.85),
      withSpring(1.1),
      withSpring(1)
    );
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log('[WaterGlass] Haptics error (non-critical):', e);
    }
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
        >
          <WaterDropIcon size={14} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
      ) : (
        <View style={styles.glassEmpty}>
          <WaterDropIcon size={14} color="rgba(0, 212, 170, 0.3)" />
        </View>
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
    console.log('[WaterTracker] handleGlassPress:', { index, filledGlasses, newFilled });
    setFilledGlasses(newFilled);
    if (onGlassPress) {
      console.log('[WaterTracker] Calling onGlassPress with:', newFilled);
      onGlassPress(newFilled);
    } else {
      console.log('[WaterTracker] WARNING: onGlassPress is not defined!');
    }
  };

  const percentage = Math.round((filledGlasses / totalGlasses) * 100);

  return (
    <LinearGradient
      colors={['rgba(0, 180, 216, 0.12)', 'rgba(0, 212, 170, 0.08)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={styles.iconContainer}>
            <WaterDropIcon size={16} color={COLORS.secondary} />
          </View>
          <Text style={styles.label}>Hydration</Text>
        </View>
        <View style={styles.countContainer}>
          <Text style={styles.countCurrent}>{filledGlasses}</Text>
          <Text style={styles.countTotal}>/{totalGlasses}</Text>
          <Text style={styles.percentage}> · {percentage}%</Text>
        </View>
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

      {filledGlasses < 4 && (
        <Text style={styles.reminderText}>
          Stay hydrated! You're {4 - filledGlasses} glasses behind midday goal.
        </Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 180, 216, 0.2)',
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
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0, 180, 216, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countCurrent: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  countTotal: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  percentage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  glassesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  glass: {
    flex: 1,
    height: 36,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  glassFilled: {
    flex: 1,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassEmpty: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 180, 216, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
