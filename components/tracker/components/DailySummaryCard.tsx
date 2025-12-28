/**
 * DailySummaryCard Component
 * Main card showing calorie progress ring and macro bars
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CircularProgress } from './CircularProgress';
import { MacroBar } from './MacroBar';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';

interface DailySummaryCardProps {
  calories: { current: number; target: number };
  macros: {
    protein: { current: number; target: number };
    carbs: { current: number; target: number };
    fat: { current: number; target: number };
    fiber?: { current: number; target: number };
  };
  fiberAlert?: boolean;
}

export function DailySummaryCard({
  calories,
  macros,
  fiberAlert = false,
}: DailySummaryCardProps) {
  const fiberPercent = macros.fiber
    ? Math.round((macros.fiber.current / macros.fiber.target) * 100)
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        {/* Calorie Ring */}
        <View style={styles.ringContainer}>
          <CircularProgress
            current={calories.current}
            target={calories.target}
            size={110}
            strokeWidth={10}
          />
          <Text style={styles.calLabel}>calories</Text>
        </View>

        {/* Macro Bars */}
        <View style={styles.macrosContainer}>
          <MacroBar
            label="Protein"
            current={macros.protein.current}
            target={macros.protein.target}
            color={COLORS.protein}
          />
          <MacroBar
            label="Carbs"
            current={macros.carbs.current}
            target={macros.carbs.target}
            color={COLORS.carbs}
          />
          <MacroBar
            label="Fat"
            current={macros.fat.current}
            target={macros.fat.target}
            color={COLORS.fat}
          />
        </View>
      </View>

      {/* Fiber Alert */}
      {fiberAlert && macros.fiber && fiberPercent < 50 && (
        <View style={styles.alertContainer}>
          <View style={styles.alertIcon}>
            <Text style={styles.alertEmoji}>🌾</Text>
          </View>
          <View style={styles.alertTextContainer}>
            <Text style={styles.alertTitle}>Low Fiber Today</Text>
            <Text style={styles.alertSubtitle}>
              {Math.round(macros.fiber.current)}g of {macros.fiber.target}g target
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
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
  },
  calLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macrosContainer: {
    flex: 1,
    gap: SPACING.md,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertEmoji: {
    fontSize: 18,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.warning,
  },
  alertSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(245, 158, 11, 0.7)',
    marginTop: 2,
  },
});
