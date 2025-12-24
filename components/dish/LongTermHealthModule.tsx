import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

export function LongTermHealthModule({ overallLevel, organImpacts }: Props) {
  // Don't show if no impacts
  if (!organImpacts || organImpacts.length === 0) return null;

  // Filter to only show non-beneficial impacts (concerns)
  const concernImpacts = organImpacts.filter(o => o.level !== 'beneficial' && o.level !== 'low');

  // If no concerns, don't show the module
  if (concernImpacts.length === 0) return null;

  const severityLabel = getOverallLabel(overallLevel);

  // Build teal pill for always-visible section showing impact level
  const impactPill = (
    <View style={styles.tagsRow}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{severityLabel} Impact</Text>
      </View>
    </View>
  );

  // Build smart summary sentence from organ impacts
  const buildSmartSummary = (): string => {
    if (concernImpacts.length === 0) return '';

    const organNames = concernImpacts.map(o => o.organName.toLowerCase());
    const uniqueOrgans = [...new Set(organNames)];

    if (uniqueOrgans.length === 1) {
      return `This dish may have ${severityLabel.toLowerCase()} impact on your ${uniqueOrgans[0]}. ${concernImpacts[0].concern}`;
    } else if (uniqueOrgans.length === 2) {
      return `This dish may affect your ${uniqueOrgans[0]} and ${uniqueOrgans[1]}. ${concernImpacts[0].concern}`;
    } else {
      const lastOrgan = uniqueOrgans.pop();
      return `This dish may affect your ${uniqueOrgans.join(', ')}, and ${lastOrgan}. Consider moderation for long-term health.`;
    }
  };

  const smartSummary = buildSmartSummary();

  // Build expanded content with smart summary
  const expandedDetails = (
    <View style={styles.expandedContainer}>
      {smartSummary && (
        <Text style={styles.smartSummary}>{smartSummary}</Text>
      )}
    </View>
  );

  return (
    <ExpandableCard
      title="Organ Impact"
      alwaysVisibleContent={impactPill}
      expandedContent={expandedDetails}
      defaultExpanded={false}
    />
  );
}

const styles = StyleSheet.create({
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.brandTeal,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.brandTeal,
  },
  expandedContainer: {
    gap: SPACING.md,
  },
  smartSummary: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default LongTermHealthModule;
