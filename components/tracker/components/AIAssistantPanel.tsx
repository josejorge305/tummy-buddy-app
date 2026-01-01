/**
 * AIAssistantPanel Component
 * Shows smart AI insights and suggestions for the day
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';

interface AIAssistantPanelProps {
  insight: string;
  suggestion?: string;
  onAskTummy?: () => void;
}

// Sparkle icon for AI branding
function SparkleIcon({ size = 20, color = COLORS.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L13.09 8.26L19 7L14.74 11.09L21 12L14.74 12.91L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.91L3 12L9.26 11.09L5 7L10.91 8.26L12 2Z"
        fill={color}
      />
    </Svg>
  );
}

// Robot/AI icon
function AIIcon({ size = 24, color = COLORS.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
      />
      <SvgCircle cx="8.5" cy="10.5" r="1.5" fill={color} />
      <SvgCircle cx="15.5" cy="10.5" r="1.5" fill={color} />
      <Path
        d="M8 15c0 0 1.5 2 4 2s4-2 4-2"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function AIAssistantPanel({
  insight,
  suggestion,
  onAskTummy,
}: AIAssistantPanelProps) {
  return (
    <LinearGradient
      colors={['rgba(0, 212, 170, 0.1)', 'rgba(0, 180, 216, 0.1)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <SparkleIcon size={18} />
          <Text style={styles.title}>Tummy AI</Text>
        </View>
        {onAskTummy && (
          <TouchableOpacity style={styles.askButton} onPress={onAskTummy}>
            <Text style={styles.askButtonText}>Ask Tummy</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.insightContainer}>
        <View style={styles.iconContainer}>
          <AIIcon size={32} color={COLORS.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.insightText}>{insight}</Text>
          {suggestion && (
            <Text style={styles.suggestionText}>{suggestion}</Text>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

// Generate AI insight based on daily data
export function generateAIInsight(data: {
  calories: { current: number; target: number };
  organScores?: { name: string; score: number }[];
  waterGlasses?: number;
  meals?: number;
}): { insight: string; suggestion?: string } {
  const { calories, organScores, waterGlasses = 0, meals = 0 } = data;
  const caloriePercent = (calories.current / calories.target) * 100;

  // Check for low organ scores
  const lowOrgan = organScores?.find(o => o.score < 60);
  if (lowOrgan) {
    return {
      insight: `Your ${lowOrgan.name.toLowerCase()} health score is lower than usual today.`,
      suggestion: `Consider foods rich in nutrients that support ${lowOrgan.name.toLowerCase()} function.`,
    };
  }

  // Check water intake
  if (waterGlasses < 4) {
    return {
      insight: "You're behind on hydration today.",
      suggestion: "Aim for 8 glasses - your organs will thank you!",
    };
  }

  // Check meal frequency
  if (meals === 0 && caloriePercent < 20) {
    return {
      insight: "Good morning! Ready to fuel your day?",
      suggestion: "A balanced breakfast supports steady energy levels.",
    };
  }

  // Check calorie progress
  if (caloriePercent > 100) {
    return {
      insight: "You've exceeded your calorie target today.",
      suggestion: "A light evening walk could help balance things out.",
    };
  }

  if (caloriePercent > 80) {
    return {
      insight: "Great progress! You're almost at your daily goal.",
      suggestion: "A light snack with protein would round out the day nicely.",
    };
  }

  if (caloriePercent > 50) {
    return {
      insight: "You're on track for a balanced day!",
      suggestion: "Keep up the good choices.",
    };
  }

  return {
    insight: "You have plenty of room for nutritious meals today.",
    suggestion: "Focus on whole foods and lean proteins.",
  };
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
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
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  askButton: {
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  askButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: SPACING.xs,
  },
  insightText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  suggestionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
