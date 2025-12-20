import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from './designSystem';
import { ExpandableCard } from './ExpandableCard';

export type FodmapCategory = {
  /** FODMAP category name (e.g., "Fructans", "Lactose") */
  name: string;
  /** Severity level for this category */
  level: 'high' | 'moderate' | 'low';
  /** Source ingredients contributing to this FODMAP category */
  sources: string;
};

type Props = {
  /** Overall FODMAP level: high, moderate (medium), or low */
  level: 'high' | 'medium' | 'moderate' | 'low' | null;
  /** Breakdown of FODMAP categories with sources */
  categories?: FodmapCategory[];
  /** Optional explanation sentence */
  explanation?: string | null;
};

function getLevelLabel(level: 'high' | 'medium' | 'moderate' | 'low' | null): string {
  if (!level) return 'Low';
  const normalized = level.toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'medium' || normalized === 'moderate') return 'Moderate';
  return 'Low';
}

function getTimingMessage(level: 'high' | 'medium' | 'moderate' | 'low' | null): string {
  const normalized = level?.toLowerCase();
  if (normalized === 'high') {
    return 'High FODMAP content may trigger symptoms within 2-6 hours.';
  }
  if (normalized === 'medium' || normalized === 'moderate') {
    return 'Moderate FODMAP content may cause mild symptoms in sensitive individuals.';
  }
  return 'Low FODMAP content is generally well-tolerated.';
}

export function DigestiveImpactModule({ level, categories, explanation }: Props) {
  // Don't show if no level
  if (!level) return null;

  const severityLabel = getLevelLabel(level);
  const timingMessage = explanation || getTimingMessage(level);

  // Build expanded content with FODMAP breakdown
  const expandedDetails = (
    <View style={styles.expandedContainer}>
      {/* Explanation */}
      <Text style={styles.explanation}>{timingMessage}</Text>

      {/* FODMAP categories breakdown */}
      {categories && categories.length > 0 && (
        <View style={styles.categoriesList}>
          {categories.map((cat, idx) => (
            <View key={idx} style={styles.categoryRow}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryLevel}>({getLevelLabel(cat.level)})</Text>
              </View>
              <Text style={styles.categorySources}>{cat.sources}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ExpandableCard
      title="Digestive Impact"
      severityText={severityLabel}
      expandedContent={expandedDetails}
      defaultExpanded={false}
    />
  );
}

const styles = StyleSheet.create({
  expandedContainer: {
    gap: SPACING.md,
  },
  explanation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  categoriesList: {
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  categoryRow: {
    gap: SPACING.xs,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  categoryLevel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.brandTeal,
  },
  categorySources: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingLeft: SPACING.xs,
  },
});

export default DigestiveImpactModule;
