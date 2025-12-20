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
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from './designSystem';

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

type Props = {
  nutrition: NutritionData;
  insight?: string | null;
  sourceLabel?: string | null;
};

export const NutritionSummary: React.FC<Props> = ({
  nutrition,
  insight,
  sourceLabel,
}) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const formatValue = (value: number | null | undefined, unit: string = 'g'): string => {
    if (value == null) return '--';
    return `${Math.round(value)}${unit}`;
  };

  // Build summary text
  const summaryParts: string[] = [];
  if (nutrition.calories != null) {
    summaryParts.push(`${Math.round(nutrition.calories)} cal`);
  }
  if (nutrition.protein != null) {
    summaryParts.push(`${Math.round(nutrition.protein)}g protein`);
  }
  if (nutrition.carbs != null) {
    summaryParts.push(`${Math.round(nutrition.carbs)}g carbs`);
  }
  if (nutrition.fat != null) {
    summaryParts.push(`${Math.round(nutrition.fat)}g fat`);
  }

  const collapsedText = summaryParts.slice(0, 3).join(' · ');
  const hasMore = nutrition.fiber != null || nutrition.sugar != null || nutrition.sodium != null || insight;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="nutrition-outline" size={18} color={COLORS.brandTeal} />
        <Text style={styles.title}>Nutrition</Text>
      </View>

      {/* Always visible: Primary macros */}
      <Text style={styles.summaryText}>
        {collapsedText || 'Nutrition data available'}
      </Text>

      {/* Expandable section */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Macro Grid */}
          <View style={styles.macroGrid}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{formatValue(nutrition.calories, '')}</Text>
              <Text style={styles.macroLabel}>KCAL</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{formatValue(nutrition.protein)}</Text>
              <Text style={styles.macroLabel}>PROTEIN</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{formatValue(nutrition.carbs)}</Text>
              <Text style={styles.macroLabel}>CARBS</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{formatValue(nutrition.fat)}</Text>
              <Text style={styles.macroLabel}>FAT</Text>
            </View>
          </View>

          {/* Secondary nutrients */}
          {(nutrition.fiber != null || nutrition.sugar != null || nutrition.sodium != null) && (
            <View style={styles.secondaryRow}>
              {nutrition.fiber != null && (
                <View style={styles.secondaryItem}>
                  <Text style={styles.secondaryValue}>{formatValue(nutrition.fiber)}</Text>
                  <Text style={styles.secondaryLabel}>fiber</Text>
                </View>
              )}
              {nutrition.sugar != null && (
                <View style={styles.secondaryItem}>
                  <Text style={styles.secondaryValue}>{formatValue(nutrition.sugar)}</Text>
                  <Text style={styles.secondaryLabel}>sugar</Text>
                </View>
              )}
              {nutrition.sodium != null && (
                <View style={styles.secondaryItem}>
                  <Text style={styles.secondaryValue}>{formatValue(nutrition.sodium, 'mg')}</Text>
                  <Text style={styles.secondaryLabel}>sodium</Text>
                </View>
              )}
            </View>
          )}

          {/* AI Insight */}
          {insight && (
            <View style={styles.insightBox}>
              <Ionicons name="bulb-outline" size={16} color="#facc15" />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          )}

          {/* Source */}
          {sourceLabel && (
            <Text style={styles.sourceText}>{sourceLabel}</Text>
          )}
        </View>
      )}

      {/* See more / See less */}
      {hasMore && (
        <TouchableOpacity onPress={toggleExpand} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.seeMoreText}>
            {expanded ? 'see less' : 'see more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryText: {
    ...TYPOGRAPHY.body,
    lineHeight: 20,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.brandTeal,
    marginTop: SPACING.xs,
  },
  expandedContent: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  macroGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.elevatedSurface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    ...TYPOGRAPHY.keyNumber,
  },
  macroLabel: {
    ...TYPOGRAPHY.label,
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  secondaryItem: {
    alignItems: 'center',
  },
  secondaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  secondaryLabel: {
    ...TYPOGRAPHY.disclaimer,
    marginTop: 2,
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: 'rgba(250, 204, 21, 0.08)',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.2)',
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#fcd34d',
    lineHeight: 18,
  },
  sourceText: {
    ...TYPOGRAPHY.disclaimer,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default NutritionSummary;
