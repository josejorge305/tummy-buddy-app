import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from './designSystem';

type Props = {
  level: 'high' | 'medium' | 'low';
  sentence?: string | null;
  triggerIngredients?: string[];
};

const getLevelColor = (level: string) => {
  switch (level) {
    case 'high': return COLORS.severityHigh;
    case 'medium': return COLORS.severityModerate;
    default: return COLORS.severityLow;
  }
};

const getLevelLabel = (level: string) => {
  switch (level) {
    case 'high': return 'High FODMAP';
    case 'medium': return 'Moderate FODMAP';
    default: return 'Low FODMAP';
  }
};

export const FodmapSheetContent: React.FC<Props> = ({
  level,
  sentence,
  triggerIngredients = [],
}) => {
  const levelColor = getLevelColor(level);

  return (
    <View style={styles.container}>
      {/* Level Badge */}
      <View style={[styles.levelBadge, { backgroundColor: `${levelColor}20` }]}>
        <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
        <Text style={[styles.levelText, { color: levelColor }]}>
          {getLevelLabel(level)}
        </Text>
      </View>

      {/* Summary */}
      {sentence && (
        <Text style={styles.summary}>{sentence}</Text>
      )}

      {/* Trigger Ingredients */}
      {triggerIngredients.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trigger Ingredients</Text>
          <View style={styles.pillsContainer}>
            {triggerIngredients.map((ingredient, index) => (
              <View key={index} style={[styles.pill, { borderColor: levelColor }]}>
                <Text style={[styles.pillText, { color: levelColor }]}>
                  {ingredient}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* What is FODMAP explanation */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.brandTeal} />
        <Text style={styles.infoText}>
          FODMAPs are fermentable carbohydrates that can trigger digestive symptoms in people with IBS or sensitive stomachs.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.lg,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    gap: SPACING.sm,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summary: {
    ...TYPOGRAPHY.body,
    lineHeight: 22,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  pill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: 'rgba(24, 214, 198, 0.08)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default FodmapSheetContent;
