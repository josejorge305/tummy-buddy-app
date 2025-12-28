import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, FONT_SIZES } from './designSystem';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const [isExpanded, setIsExpanded] = useState(false);

  if (!nutrition) return null;

  const { calories, protein, carbs, fat, fiber, sugar, sodium } = nutrition;
  const hasExpandableContent = !!(insights?.summary || fiber != null || sugar != null || sodium != null || sourceLabel);

  const toggleExpand = () => {
    if (!hasExpandableContent) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  // Format macro value
  const formatValue = (value: number | null | undefined, unit: string = 'g') => {
    if (value === null || value === undefined) return '--';
    return `${Math.round(value)}${unit}`;
  };

  return (
    <View style={styles.container}>
      {/* Header - tappable to expand */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        disabled={!hasExpandableContent}
        activeOpacity={hasExpandableContent ? 0.7 : 1}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="nutrition-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.headerText}>Nutrition</Text>
        </View>
        {hasExpandableContent && (
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textMuted}
          />
        )}
      </TouchableOpacity>

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

      {/* Expanded content - shows when user taps to expand */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Secondary nutrients */}
          {(fiber != null || sugar != null || sodium != null) && (
            <View style={styles.secondaryRow}>
              {fiber != null && (
                <View style={styles.secondaryItem}>
                  <Text style={styles.secondaryValue}>{formatValue(fiber)}</Text>
                  <Text style={styles.secondaryLabel}>fiber</Text>
                </View>
              )}
              {sugar != null && (
                <View style={styles.secondaryItem}>
                  <Text style={styles.secondaryValue}>{formatValue(sugar)}</Text>
                  <Text style={styles.secondaryLabel}>sugar</Text>
                </View>
              )}
              {sodium != null && (
                <View style={styles.secondaryItem}>
                  <Text style={styles.secondaryValue}>{formatValue(sodium, 'mg')}</Text>
                  <Text style={styles.secondaryLabel}>sodium</Text>
                </View>
              )}
            </View>
          )}

          {/* AI Insight Summary - now shows in expanded view */}
          {insights?.summary && (
            <Text style={styles.insightText}>"{insights.summary}"</Text>
          )}

          {/* Source label */}
          {sourceLabel && (
            <Text style={styles.sourceText}>Source: {sourceLabel}</Text>
          )}
        </View>
      )}

      {/* See full breakdown CTA - only if callback provided */}
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
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerText: {
    fontSize: FONT_SIZES.lg, // 18px section headers
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  macrosGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  macroValue: {
    fontSize: FONT_SIZES.lg, // 18px - fits 4-digit numbers
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  macroValueTeal: {
    fontSize: FONT_SIZES.lg, // 18px - same as others for consistency
    color: COLORS.brandTeal,
  },
  macroLabelTeal: {
    color: COLORS.brandTeal,
  },
  macroDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  secondaryItem: {
    alignItems: 'center',
  },
  secondaryValue: {
    fontSize: FONT_SIZES.md, // 16px
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  secondaryLabel: {
    fontSize: FONT_SIZES.xs, // 12px
    fontWeight: '400',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  insightText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
    lineHeight: 20,
  },
  sourceText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
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
