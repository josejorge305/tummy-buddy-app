/**
 * DailySummaryCard Component (Redesigned)
 * Main card showing calorie progress ring, macro bars, and smart insight
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircularProgress } from './CircularProgress';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';
import { InfoIconTooltip } from '../../legal';

interface DailySummaryCardProps {
  calories: { current: number; target: number };
  macros: {
    protein: { current: number; target: number };
    carbs: { current: number; target: number };
    fat: { current: number; target: number };
    fiber?: { current: number; target: number };
  };
  fiberAlert?: boolean;
  smartInsight?: string;
}

// Generate a smart insight based on the data
function generateSmartInsight(
  calories: { current: number; target: number },
  macros: {
    protein: { current: number; target: number };
    carbs: { current: number; target: number };
    fat: { current: number; target: number };
    fiber?: { current: number; target: number };
  }
): string {
  const remaining = calories.target - calories.current;
  const proteinRemaining = macros.protein.target - macros.protein.current;

  // Find the macro most behind
  const proteinPercent = (macros.protein.current / macros.protein.target) * 100;
  const carbsPercent = (macros.carbs.current / macros.carbs.target) * 100;
  const fatPercent = (macros.fat.current / macros.fat.target) * 100;
  const fiberPercent = macros.fiber
    ? (macros.fiber.current / macros.fiber.target) * 100
    : 100;

  if (proteinPercent < carbsPercent && proteinPercent < fatPercent && proteinPercent < 50) {
    return `Low on protein. A meal with ${Math.max(20, Math.round(proteinRemaining * 0.3))}g+ would help meet your goal.`;
  } else if (fiberPercent < 50 && macros.fiber) {
    return `Low on fiber. Consider adding vegetables or whole grains.`;
  } else if (remaining > 500) {
    return `On track! You have room for a balanced meal.`;
  } else if (remaining > 0) {
    return `Almost at your goal. A light snack would round out the day.`;
  } else {
    return `You've reached your calorie target for today.`;
  }
}

export function DailySummaryCard({
  calories,
  macros,
  fiberAlert = false,
  smartInsight,
}: DailySummaryCardProps) {
  const remaining = Math.max(0, calories.target - calories.current);
  const insight = smartInsight || generateSmartInsight(calories, macros);

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        {/* Calorie Ring */}
        <View style={styles.ringContainer}>
          <CircularProgress
            current={calories.current}
            target={calories.target}
            size={130}
            strokeWidth={6}
          />
        </View>

        {/* Macro Bars */}
        <View style={styles.macrosContainer}>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroValue}>{Math.round(macros.protein.current)}g</Text>
          </View>
          <View style={styles.macroBarContainer}>
            <View
              style={[
                styles.macroBar,
                {
                  width: `${Math.min((macros.protein.current / macros.protein.target) * 100, 100)}%`,
                  backgroundColor: COLORS.protein,
                },
              ]}
            />
          </View>

          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroValue}>{Math.round(macros.carbs.current)}g</Text>
          </View>
          <View style={styles.macroBarContainer}>
            <View
              style={[
                styles.macroBar,
                {
                  width: `${Math.min((macros.carbs.current / macros.carbs.target) * 100, 100)}%`,
                  backgroundColor: COLORS.carbs,
                },
              ]}
            />
          </View>

          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={styles.macroValue}>{Math.round(macros.fat.current)}g</Text>
          </View>
          <View style={styles.macroBarContainer}>
            <View
              style={[
                styles.macroBar,
                {
                  width: `${Math.min((macros.fat.current / macros.fat.target) * 100, 100)}%`,
                  backgroundColor: COLORS.fat,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Smart Insight */}
      <View style={styles.insightContainer}>
        <View style={styles.insightRow}>
          <Text style={styles.insightText}>
            <Text style={styles.insightHighlight}>{remaining} cal</Text> remaining · {insight}
          </Text>
          <InfoIconTooltip type="calorie" size={14} color={COLORS.textMuted} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  ringContainer: {
    alignItems: 'center',
    flexShrink: 0,
  },
  macrosContainer: {
    flex: 1,
    gap: SPACING.sm,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  macroValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  macroBarContainer: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  macroBar: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  insightContainer: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  insightHighlight: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});
