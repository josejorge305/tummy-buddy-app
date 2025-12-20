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
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, FONT_SIZES } from './designSystem';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  /** Card title shown in header */
  title: string;
  /** Optional severity text shown on right side of header (e.g., "High", "Moderate") */
  severityText?: string | null;
  /** Content always visible below the header (e.g., allergen tags) */
  alwaysVisibleContent?: React.ReactNode;
  /** Content shown when expanded */
  expandedContent?: React.ReactNode;
  /** Whether the card starts expanded */
  defaultExpanded?: boolean;
  /** If true, the card cannot be expanded/collapsed */
  disableExpand?: boolean;
};

export function ExpandableCard({
  title,
  severityText,
  alwaysVisibleContent,
  expandedContent,
  defaultExpanded = false,
  disableExpand = false,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = () => {
    if (disableExpand) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const hasExpandableContent = !!expandedContent && !disableExpand;

  return (
    <View style={styles.container}>
      {/* Header - always tappable if there's expandable content */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        disabled={!hasExpandableContent}
        activeOpacity={hasExpandableContent ? 0.7 : 1}
      >
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerRight}>
          {severityText && (
            <Text style={styles.severityText}>{severityText}</Text>
          )}
          {hasExpandableContent && (
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.textMuted}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Always visible content (e.g., allergen tags) */}
      {alwaysVisibleContent && (
        <View style={styles.alwaysVisibleContent}>
          {alwaysVisibleContent}
        </View>
      )}

      {/* Expandable content */}
      {isExpanded && expandedContent && (
        <View style={styles.expandedContent}>
          {expandedContent}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.cardSurface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg, // 18px section headers
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md, // 12px gap between severity text and chevron
  },
  severityText: {
    fontSize: FONT_SIZES.sm, // 14px
    fontWeight: '600',
    color: COLORS.brandTeal,
  },
  alwaysVisibleContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  expandedContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
});

export default ExpandableCard;
