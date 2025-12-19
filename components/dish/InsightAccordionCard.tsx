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

type SeverityLevel = 'high' | 'moderate' | 'medium' | 'low';

type Props = {
  title: string;
  icon: string;
  severity?: SeverityLevel | null;
  severityLabel?: string;
  summary: string; // One-line "why" summary shown in collapsed state
  children: React.ReactNode; // Expanded content
  defaultExpanded?: boolean;
};

export const InsightAccordionCard: React.FC<Props> = ({
  title,
  icon,
  severity,
  severityLabel,
  summary,
  children,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const severityColor = severity ? getSeverityColor(severity) : COLORS.textMuted;
  const severityBg = severity ? getSeverityBgColor(severity) : 'rgba(255,255,255,0.08)';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={toggleExpanded}
      activeOpacity={0.8}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={icon as any} size={20} color={COLORS.textSecondary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.headerRight}>
          {severity && (
            <View style={[styles.severityBadge, { backgroundColor: severityBg, borderColor: severityColor }]}>
              <Text style={[styles.severityText, { color: severityColor }]}>
                {severityLabel || severity.charAt(0).toUpperCase() + severity.slice(1)}
              </Text>
            </View>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textMuted}
          />
        </View>
      </View>

      {/* Summary Row - always visible */}
      {!expanded && summary && (
        <Text style={styles.summary} numberOfLines={1}>
          {summary}
        </Text>
      )}

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.content}>
          {children}
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
  summary: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  content: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

export default InsightAccordionCard;
