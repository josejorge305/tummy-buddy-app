import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from './designSystem';

type Props = {
  allergenSummary?: string | null;
  fodmapSummary?: string | null;
  hasFixableIssues?: boolean;
  safeComponentCount?: number;
  totalComponentCount?: number;
  onCanIStillEatThis?: () => void;
};

export function HeadsUpSection({
  allergenSummary,
  fodmapSummary,
  hasFixableIssues = false,
  safeComponentCount = 0,
  totalComponentCount = 0,
  onCanIStillEatThis,
}: Props) {
  // Combine summaries into one message
  const concerns: string[] = [];
  if (allergenSummary) concerns.push(allergenSummary);
  if (fodmapSummary) concerns.push(fodmapSummary);

  // If no concerns, don't render anything
  if (concerns.length === 0) {
    return null;
  }

  const combinedMessage = concerns.join(' ');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="warning" size={20} color={COLORS.severityModerate} />
        <Text style={styles.headerText}>Heads Up</Text>
      </View>

      {/* Combined concern message */}
      <Text style={styles.concernText}>{combinedMessage}</Text>

      {/* "Can I still eat this?" CTA - only if there are fixable issues */}
      {hasFixableIssues && totalComponentCount > 1 && (
        <TouchableOpacity
          style={styles.fixItButton}
          onPress={onCanIStillEatThis}
          activeOpacity={0.7}
        >
          <View style={styles.fixItContent}>
            <View style={styles.fixItLeft}>
              <Ionicons name="construct-outline" size={20} color={COLORS.brandTeal} />
              <View style={styles.fixItTextContainer}>
                <Text style={styles.fixItTitle}>Can I still eat this?</Text>
                <Text style={styles.fixItSubtitle}>
                  {safeComponentCount} of {totalComponentCount} components are safe
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: 'rgba(244,183,64,0.08)', // Subtle warning background
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(244,183,64,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.severityModerate,
  },
  concernText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  fixItButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.cardSurface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fixItContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fixItLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  fixItTextContainer: {
    flex: 1,
  },
  fixItTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.brandTeal,
  },
  fixItSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
