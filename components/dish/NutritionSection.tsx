import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from './designSystem';

type NutritionData = {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
};

type NutritionInsights = {
  summary?: string | null;
  highlights?: string[];
  cautions?: string[];
};

type Props = {
  nutrition: NutritionData | null;
  insights?: NutritionInsights | null;
  sourceLabel?: string | null;
  onSeeFullBreakdown?: () => void;
};

export function NutritionSection({
  nutrition,
  insights,
  sourceLabel,
  onSeeFullBreakdown,
}: Props) {
  if (!nutrition) return null;

  const { calories, protein, carbs, fat } = nutrition;

  // Format macro value
  const formatValue = (value: number | null | undefined, unit: string = 'g') => {
    if (value === null || value === undefined) return '--';
    return `${Math.round(value)}${unit}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="nutrition-outline" size={20} color={COLORS.textSecondary} />
        <Text style={styles.headerText}>Nutrition</Text>
      </View>

      {/* Macros Grid - kcal in teal, rest in white */}
      <View style={styles.macrosGrid}>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, styles.macroValueTeal]}>{formatValue(calories, '')}</Text>
          <Text style={[styles.macroLabel, styles.macroLabelTeal]}>kcal</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{formatValue(protein)}</Text>
          <Text style={styles.macroLabel}>protein</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{formatValue(carbs)}</Text>
          <Text style={styles.macroLabel}>carbs</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{formatValue(fat)}</Text>
          <Text style={styles.macroLabel}>fat</Text>
        </View>
      </View>

      {/* AI Insight Summary */}
      {insights?.summary && (
        <Text style={styles.insightText}>"{insights.summary}"</Text>
      )}

      {/* Source label */}
      {sourceLabel && (
        <Text style={styles.sourceText}>Source: {sourceLabel}</Text>
      )}

      {/* See full breakdown CTA */}
      {onSeeFullBreakdown && (
        <TouchableOpacity
          style={styles.breakdownButton}
          onPress={onSeeFullBreakdown}
          activeOpacity={0.7}
        >
          <Text style={styles.breakdownButtonText}>See full breakdown</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.brandTeal} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.cardSurface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  macrosGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  macroValueTeal: {
    color: COLORS.brandTeal,
  },
  macroLabelTeal: {
    color: COLORS.brandTeal,
  },
  macroDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  insightText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
    lineHeight: 20,
  },
  sourceText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  breakdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  breakdownButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.brandTeal,
  },
});
