import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from './designSystem';

type OrganLine = {
  organKey: string;
  organLabel: string;
  severity: 'high' | 'medium' | 'low' | 'neutral';
  score: number;
  sentence?: string;
};

type Props = {
  organLines: OrganLine[];
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high': return COLORS.severityHigh;
    case 'medium': return COLORS.severityModerate;
    case 'low': return COLORS.severityLow;
    default: return COLORS.textMuted;
  }
};

const getSeverityLabel = (severity: string) => {
  switch (severity) {
    case 'high': return 'High Impact';
    case 'medium': return 'Moderate';
    case 'low': return 'Beneficial';
    default: return 'Neutral';
  }
};

const ORGAN_ICONS: Record<string, string> = {
  heart: 'heart',
  liver: 'flask',
  kidney: 'water',
  stomach: 'restaurant',
  intestine: 'git-network',
  brain: 'bulb',
  skin: 'body',
  bones: 'fitness',
  lungs: 'cloud',
  pancreas: 'medical',
  default: 'body',
};

export const BodyImpactSheetContent: React.FC<Props> = ({
  organLines,
}) => {
  // Group by severity
  const highImpact = organLines.filter(o => o.severity === 'high');
  const moderateImpact = organLines.filter(o => o.severity === 'medium');
  const beneficial = organLines.filter(o => o.severity === 'low');
  const neutral = organLines.filter(o => o.severity === 'neutral');

  const renderOrganItem = (organ: OrganLine) => {
    const color = getSeverityColor(organ.severity);
    const iconName = ORGAN_ICONS[organ.organKey.toLowerCase()] || ORGAN_ICONS.default;

    return (
      <View key={organ.organKey} style={styles.organItem}>
        <View style={[styles.organIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={iconName as any} size={20} color={color} />
        </View>
        <View style={styles.organContent}>
          <View style={styles.organHeader}>
            <Text style={styles.organName}>{organ.organLabel}</Text>
            <View style={[styles.scoreBadge, { backgroundColor: `${color}20` }]}>
              <Text style={[styles.scoreText, { color }]}>
                {organ.score > 0 ? '+' : ''}{organ.score}
              </Text>
            </View>
          </View>
          {organ.sentence && (
            <Text style={styles.organSentence}>{organ.sentence}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* High Impact (Concern) */}
      {highImpact.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={18} color={COLORS.severityHigh} />
            <Text style={[styles.sectionTitle, { color: COLORS.severityHigh }]}>
              Areas of Concern
            </Text>
          </View>
          {highImpact.map(renderOrganItem)}
        </View>
      )}

      {/* Moderate Impact */}
      {moderateImpact.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={18} color={COLORS.severityModerate} />
            <Text style={[styles.sectionTitle, { color: COLORS.severityModerate }]}>
              Moderate Impact
            </Text>
          </View>
          {moderateImpact.map(renderOrganItem)}
        </View>
      )}

      {/* Beneficial */}
      {beneficial.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.severityLow} />
            <Text style={[styles.sectionTitle, { color: COLORS.severityLow }]}>
              Beneficial For
            </Text>
          </View>
          {beneficial.map(renderOrganItem)}
        </View>
      )}

      {/* Neutral */}
      {neutral.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="remove-circle" size={18} color={COLORS.textMuted} />
            <Text style={[styles.sectionTitle, { color: COLORS.textMuted }]}>
              Neutral Effect
            </Text>
          </View>
          {neutral.map(renderOrganItem)}
        </View>
      )}

      {/* Empty state */}
      {organLines.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="body-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No body impact data available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.lg,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  organItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginLeft: SPACING.sm,
    marginBottom: SPACING.md,
  },
  organIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organContent: {
    flex: 1,
  },
  organHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  organName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  scoreBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  organSentence: {
    ...TYPOGRAPHY.secondary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
});

export default BodyImpactSheetContent;
