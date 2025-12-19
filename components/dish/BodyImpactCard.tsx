import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  getSeverityColor,
  getSeverityBgColor,
} from './designSystem';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type OrganImpact = {
  organKey: string;
  organLabel: string;
  severity: 'high' | 'medium' | 'low' | 'neutral';
  score: number | null;
  sentence: string | null;
};

type Props = {
  organLines: OrganImpact[];
};

// Organ icons mapping
const ORGAN_ICONS: Record<string, string> = {
  gut: 'fitness-outline',
  heart: 'heart-outline',
  liver: 'water-outline',
  kidney: 'water-outline',
  brain: 'bulb-outline',
  skin: 'sparkles-outline',
  immune: 'shield-outline',
  metabolic: 'flash-outline',
  eyes: 'eye-outline',
  bones: 'barbell-outline',
  thyroid: 'pulse-outline',
};

// Get overall severity from organ lines
function getOverallSeverity(organLines: OrganImpact[]): 'high' | 'moderate' | 'low' | null {
  const nonNeutral = organLines.filter(o => o.severity !== 'neutral');
  if (nonNeutral.length === 0) return null;
  if (nonNeutral.some(o => o.severity === 'high')) return 'high';
  if (nonNeutral.some(o => o.severity === 'medium')) return 'moderate';
  return 'low';
}

// Sort organs by severity (high first, then medium, then low)
function sortBySeverity(organs: OrganImpact[]): OrganImpact[] {
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, neutral: 3 };
  return [...organs].sort((a, b) => {
    const aOrder = severityOrder[a.severity] ?? 3;
    const bOrder = severityOrder[b.severity] ?? 3;
    return aOrder - bOrder;
  });
}

// Build one-line summary from top impacts
function getSummary(organLines: OrganImpact[]): string {
  const significant = organLines.filter(o => o.severity !== 'neutral' && o.severity !== 'low');

  if (significant.length === 0) {
    return 'Minimal impact on major organs';
  }

  const top = significant.slice(0, 2);
  const names = top.map(o => o.organLabel).join(', ');

  if (top.some(o => o.severity === 'high')) {
    return `Notable impact on ${names}`;
  }

  return `Moderate impact on ${names}`;
}

const OrganRow: React.FC<{
  organ: OrganImpact;
  expanded: boolean;
  onToggle: () => void;
}> = ({ organ, expanded, onToggle }) => {
  const iconName = ORGAN_ICONS[organ.organKey] || 'ellipse-outline';
  const severityColor = getSeverityColor(organ.severity === 'medium' ? 'moderate' : organ.severity);
  const severityBg = getSeverityBgColor(organ.severity === 'medium' ? 'moderate' : organ.severity);

  const severityLabel = organ.severity === 'high' ? 'High'
    : organ.severity === 'medium' ? 'Moderate'
    : organ.severity === 'low' ? 'Low'
    : 'Neutral';

  // Truncate sentence for collapsed view
  const truncatedSentence = organ.sentence
    ? organ.sentence.length > 60
      ? organ.sentence.substring(0, 57) + '...'
      : organ.sentence
    : null;

  return (
    <TouchableOpacity
      style={styles.organRow}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.organRowMain}>
        <View style={[styles.organIconContainer, { backgroundColor: severityBg }]}>
          <Ionicons name={iconName as any} size={18} color={severityColor} />
        </View>

        <View style={styles.organInfo}>
          <View style={styles.organNameRow}>
            <Text style={styles.organName}>{organ.organLabel}</Text>
            <View style={[styles.organSeverityBadge, { backgroundColor: severityBg, borderColor: severityColor }]}>
              <Text style={[styles.organSeverityText, { color: severityColor }]}>
                {severityLabel}
              </Text>
            </View>
          </View>

          {!expanded && truncatedSentence && (
            <Text style={styles.organSummary} numberOfLines={1}>
              {truncatedSentence}
            </Text>
          )}
        </View>

        {organ.sentence && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.textMuted}
          />
        )}
      </View>

      {expanded && organ.sentence && (
        <Text style={styles.organFullText}>{organ.sentence}</Text>
      )}
    </TouchableOpacity>
  );
};

export const BodyImpactCard: React.FC<Props> = ({ organLines }) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedOrgans, setExpandedOrgans] = useState<Set<string>>(new Set());

  // Filter out neutral organs and sort by severity
  const significantOrgans = sortBySeverity(organLines.filter(o => o.severity !== 'neutral'));
  const overallSeverity = getOverallSeverity(organLines);
  const summary = getSummary(organLines);

  if (significantOrgans.length === 0) {
    return null; // Don't show card if no significant impacts
  }

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const toggleOrgan = (organKey: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrgans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(organKey)) {
        newSet.delete(organKey);
      } else {
        newSet.add(organKey);
      }
      return newSet;
    });
  };

  const severityLabel = overallSeverity === 'high' ? 'Concern'
    : overallSeverity === 'moderate' ? 'Moderate'
    : 'Minor';

  const severityColor = overallSeverity ? getSeverityColor(overallSeverity) : COLORS.textMuted;
  const severityBg = overallSeverity ? getSeverityBgColor(overallSeverity) : 'rgba(255,255,255,0.08)';

  // Top 2-3 organs for collapsed preview
  const previewOrgans = significantOrgans.slice(0, 3);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={toggleExpanded}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="body-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.title}>Body Impact</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.severityBadge, { backgroundColor: severityBg, borderColor: severityColor }]}>
            <Text style={[styles.severityText, { color: severityColor }]}>
              {severityLabel}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textMuted}
          />
        </View>
      </View>

      {/* Collapsed: Preview chips + summary */}
      {!expanded && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewChipsRow}
            style={styles.previewChipsScroll}
          >
            {previewOrgans.map(organ => {
              const iconName = ORGAN_ICONS[organ.organKey] || 'ellipse-outline';
              const chipColor = getSeverityColor(organ.severity === 'medium' ? 'moderate' : organ.severity);
              return (
                <View key={organ.organKey} style={styles.previewChip}>
                  <Ionicons name={iconName as any} size={14} color={chipColor} />
                  <Text style={[styles.previewChipText, { color: chipColor }]}>
                    {organ.organLabel}
                  </Text>
                </View>
              );
            })}
            {significantOrgans.length > 3 && (
              <View style={styles.previewChip}>
                <Text style={styles.previewChipTextMuted}>
                  +{significantOrgans.length - 3} more
                </Text>
              </View>
            )}
          </ScrollView>
          <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
        </>
      )}

      {/* Expanded: Full organ list */}
      {expanded && (
        <View style={styles.organsList}>
          {significantOrgans.map(organ => (
            <OrganRow
              key={organ.organKey}
              organ={organ}
              expanded={expandedOrgans.has(organ.organKey)}
              onToggle={() => toggleOrgan(organ.organKey)}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  severityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewChipsScroll: {
    marginTop: SPACING.md,
  },
  previewChipsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.elevatedSurface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  previewChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewChipTextMuted: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  summary: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  organsList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  organRow: {
    backgroundColor: COLORS.elevatedSurface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  organRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  organIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organInfo: {
    flex: 1,
  },
  organNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  organName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  organSeverityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  organSeverityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  organSummary: {
    ...TYPOGRAPHY.disclaimer,
    marginTop: 2,
  },
  organFullText: {
    ...TYPOGRAPHY.secondary,
    marginTop: SPACING.sm,
    paddingLeft: 36 + SPACING.md, // Align with text after icon
  },
});

export default BodyImpactCard;
