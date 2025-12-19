import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InsightAccordionCard } from './InsightAccordionCard';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from './designSystem';

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

// Determine if calories are notably high/low for summary
function getCalorieSeverity(calories: number | null | undefined): 'high' | 'moderate' | 'low' | null {
  if (calories == null) return null;
  if (calories > 800) return 'high';
  if (calories > 500) return 'moderate';
  return 'low';
}

// Build one-line summary
function getSummary(nutrition: NutritionData, insight: string | null | undefined): string {
  // If we have an insight, use first sentence
  if (insight) {
    const firstSentence = insight.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 10 && firstSentence.length < 70) {
      return firstSentence;
    }
  }

  const parts: string[] = [];

  if (nutrition.calories != null) {
    parts.push(`${Math.round(nutrition.calories)} kcal`);
  }
  if (nutrition.protein != null) {
    parts.push(`${Math.round(nutrition.protein)}g protein`);
  }
  if (nutrition.carbs != null) {
    parts.push(`${Math.round(nutrition.carbs)}g carbs`);
  }

  return parts.join(' · ') || 'Nutrition data available';
}

export const NutritionCard: React.FC<Props> = ({
  nutrition,
  insight,
  sourceLabel,
}) => {
  const severity = getCalorieSeverity(nutrition.calories);
  const summary = getSummary(nutrition, insight);

  const formatValue = (value: number | null | undefined, unit: string = 'g'): string => {
    if (value == null) return '--';
    return `${Math.round(value)}${unit}`;
  };

  return (
    <InsightAccordionCard
      title="Nutrition"
      icon="nutrition-outline"
      severity={severity}
      severityLabel={severity ? `${Math.round(nutrition.calories || 0)} kcal` : undefined}
      summary={summary}
    >
      <View style={styles.content}>
        {/* Primary Macros Grid */}
        <View style={styles.macroGrid}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>
              {formatValue(nutrition.calories, '')}
            </Text>
            <Text style={styles.macroLabel}>KCAL</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>
              {formatValue(nutrition.protein)}
            </Text>
            <Text style={styles.macroLabel}>PROTEIN</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>
              {formatValue(nutrition.carbs)}
            </Text>
            <Text style={styles.macroLabel}>CARBS</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>
              {formatValue(nutrition.fat)}
            </Text>
            <Text style={styles.macroLabel}>FAT</Text>
          </View>
        </View>

        {/* Secondary Nutrition */}
        <View style={styles.secondaryRow}>
          <View style={styles.secondaryItem}>
            <Text style={styles.secondaryValue}>
              {formatValue(nutrition.fiber)}
            </Text>
            <Text style={styles.secondaryLabel}>fiber</Text>
          </View>
          <View style={styles.secondaryItem}>
            <Text style={styles.secondaryValue}>
              {formatValue(nutrition.sugar)}
            </Text>
            <Text style={styles.secondaryLabel}>sugar</Text>
          </View>
          <View style={styles.secondaryItem}>
            <Text style={styles.secondaryValue}>
              {formatValue(nutrition.sodium, 'mg')}
            </Text>
            <Text style={styles.secondaryLabel}>sodium</Text>
          </View>
        </View>

        {/* AI Insight */}
        {insight && (
          <View style={styles.insightBox}>
            <Ionicons name="bulb-outline" size={16} color="#facc15" />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        )}

        {/* Source disclaimer */}
        {sourceLabel && (
          <Text style={styles.sourceText}>{sourceLabel}</Text>
        )}
      </View>
    </InsightAccordionCard>
  );
};

const styles = StyleSheet.create({
  content: {
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

export default NutritionCard;
