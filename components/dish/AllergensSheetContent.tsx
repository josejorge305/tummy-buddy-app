import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from './designSystem';

type Allergen = {
  kind: string;
  present: 'yes' | 'no' | 'maybe';
  detail?: string | null;
};

type Props = {
  allergens: Allergen[];
  sentence?: string | null;
};

const getPresenceColor = (present: string) => {
  switch (present) {
    case 'yes': return COLORS.severityHigh;
    case 'maybe': return COLORS.severityModerate;
    default: return COLORS.severityLow;
  }
};

const getPresenceLabel = (present: string) => {
  switch (present) {
    case 'yes': return 'Contains';
    case 'maybe': return 'May contain';
    default: return 'Free';
  }
};

const getPresenceIcon = (present: string) => {
  switch (present) {
    case 'yes': return 'alert-circle';
    case 'maybe': return 'help-circle';
    default: return 'checkmark-circle';
  }
};

export const AllergensSheetContent: React.FC<Props> = ({
  allergens,
  sentence,
}) => {
  const presentAllergens = allergens.filter(a => a.present === 'yes');
  const maybeAllergens = allergens.filter(a => a.present === 'maybe');
  const freeAllergens = allergens.filter(a => a.present === 'no');

  return (
    <View style={styles.container}>
      {/* Summary */}
      {sentence && (
        <Text style={styles.summary}>{sentence}</Text>
      )}

      {/* Present Allergens (Danger) */}
      {presentAllergens.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={18} color={COLORS.severityHigh} />
            <Text style={[styles.sectionTitle, { color: COLORS.severityHigh }]}>
              Contains
            </Text>
          </View>
          {presentAllergens.map((allergen, index) => (
            <View key={index} style={styles.allergenRow}>
              <View style={[styles.allergenBadge, { backgroundColor: `${COLORS.severityHigh}20` }]}>
                <Text style={[styles.allergenName, { color: COLORS.severityHigh }]}>
                  {allergen.kind}
                </Text>
              </View>
              {allergen.detail && (
                <Text style={styles.allergenDetail}>{allergen.detail}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Maybe Allergens (Warning) */}
      {maybeAllergens.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={18} color={COLORS.severityModerate} />
            <Text style={[styles.sectionTitle, { color: COLORS.severityModerate }]}>
              May Contain
            </Text>
          </View>
          {maybeAllergens.map((allergen, index) => (
            <View key={index} style={styles.allergenRow}>
              <View style={[styles.allergenBadge, { backgroundColor: `${COLORS.severityModerate}20` }]}>
                <Text style={[styles.allergenName, { color: COLORS.severityModerate }]}>
                  {allergen.kind}
                </Text>
              </View>
              {allergen.detail && (
                <Text style={styles.allergenDetail}>{allergen.detail}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Free from (Good) */}
      {freeAllergens.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.severityLow} />
            <Text style={[styles.sectionTitle, { color: COLORS.severityLow }]}>
              Free From
            </Text>
          </View>
          <View style={styles.pillsContainer}>
            {freeAllergens.map((allergen, index) => (
              <View key={index} style={[styles.pill, { borderColor: COLORS.severityLow }]}>
                <Text style={[styles.pillText, { color: COLORS.severityLow }]}>
                  {allergen.kind}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* No allergens detected */}
      {allergens.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color={COLORS.severityLow} />
          <Text style={styles.emptyText}>No common allergens detected</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.lg,
  },
  summary: {
    ...TYPOGRAPHY.body,
    lineHeight: 22,
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
  allergenRow: {
    marginLeft: 26,
    marginBottom: SPACING.sm,
  },
  allergenBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginBottom: 4,
  },
  allergenName: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  allergenDetail: {
    ...TYPOGRAPHY.secondary,
    marginTop: 2,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginLeft: 26,
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
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.severityLow,
  },
});

export default AllergensSheetContent;
