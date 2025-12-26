import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING } from './designSystem';
import { ExpandableCard } from './ExpandableCard';

export type OrganImpact = {
  /** Organ name (e.g., "Heart", "Liver", "Gut Microbiome") */
  organName: string;
  /** Severity level */
  level: 'high' | 'moderate' | 'low' | 'beneficial';
  /** Single concern/benefit for this organ (deduplicated, no redundancy) */
  concern: string;
};

type Props = {
  /** Overall severity level for long-term health */
  overallLevel: 'high' | 'moderate' | 'low' | null;
  /** List of organ impacts - ONE concern per organ, no redundancy */
  organImpacts: OrganImpact[];
  /** Whether organs data is still loading (polling in progress) */
  loading?: boolean;
};

function getLevelLabel(level: 'high' | 'moderate' | 'low' | 'beneficial' | null): string {
  if (!level) return 'Low';
  const normalized = level.toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'moderate') return 'Moderate';
  if (normalized === 'beneficial') return 'Beneficial';
  return 'Low';
}

function getOverallLabel(level: 'high' | 'moderate' | 'low' | null): string {
  if (!level) return 'Low';
  if (level === 'high') return 'High';
  if (level === 'moderate') return 'Moderate';
  return 'Low';
}

export function LongTermHealthModule({ overallLevel, organImpacts, loading }: Props) {
  // Show loading state if organs are still being computed
  if (loading) {
    const loadingContent = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.brandTeal} />
        <Text style={styles.loadingText}>Analyzing organ impacts...</Text>
      </View>
    );

    return (
      <ExpandableCard
        title="Long-term Health"
        severityText="Loading"
        expandedContent={loadingContent}
        defaultExpanded={false}
      />
    );
  }

  // Don't show if no impacts
  if (!organImpacts || organImpacts.length === 0) return null;

  // Filter to only show non-beneficial impacts (concerns)
  const concernImpacts = organImpacts.filter(o => o.level !== 'beneficial' && o.level !== 'low');

  // If no concerns, don't show the module
  if (concernImpacts.length === 0) return null;

  const severityLabel = getOverallLabel(overallLevel);

  // Build expanded content with organ impacts
  const expandedDetails = (
    <View style={styles.expandedContainer}>
      {concernImpacts.map((impact, idx) => (
        <View key={idx} style={styles.organRow}>
          <View style={styles.organHeader}>
            <Text style={styles.organName}>{impact.organName}</Text>
            <Text style={styles.organLevel}>({getLevelLabel(impact.level)})</Text>
          </View>
          <Text style={styles.organConcern}>{impact.concern}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <ExpandableCard
      title="Long-term Health"
      severityText={severityLabel}
      expandedContent={expandedDetails}
      defaultExpanded={false}
    />
  );
}

const styles = StyleSheet.create({
  expandedContainer: {
    gap: SPACING.lg,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  organRow: {
    gap: SPACING.xs,
  },
  organHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  organName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  organLevel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.brandTeal,
  },
  organConcern: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    paddingLeft: SPACING.xs,
  },
});

export default LongTermHealthModule;
