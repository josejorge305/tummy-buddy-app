import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from './designSystem';
import { ExpandableCard } from './ExpandableCard';

export type AllergenWithSource = {
  /** Allergen name (e.g., "Gluten", "Milk") */
  name: string;
  /** Whether this allergen is definitely present, possibly present, or uncertain */
  present: 'yes' | 'maybe' | 'no';
  /** Source ingredient(s) for this allergen */
  source?: string | null;
  /** Whether this is a user's allergen */
  isUserAllergen?: boolean;
};

type Props = {
  /** List of allergens with their sources */
  allergens: AllergenWithSource[];
};

export function AllergensModule({ allergens }: Props) {
  // Filter to only show detected allergens (yes or maybe)
  const detectedAllergens = allergens.filter(a => a.present === 'yes' || a.present === 'maybe');

  if (detectedAllergens.length === 0) {
    return null;
  }

  // Build allergen tags for always-visible section
  const allergenTags = (
    <View style={styles.tagsRow}>
      {detectedAllergens.map((allergen, idx) => {
        const displayName = allergen.present === 'maybe'
          ? `${allergen.name}?`
          : allergen.name;
        return (
          <View key={idx} style={styles.tag}>
            <Text style={styles.tagText}>{displayName}</Text>
          </View>
        );
      })}
    </View>
  );

  // Build expanded content with source details
  const expandedDetails = (
    <View style={styles.detailsList}>
      {detectedAllergens.map((allergen, idx) => (
        <View key={idx} style={styles.detailRow}>
          <Text style={styles.detailAllergen}>{allergen.name}</Text>
          {allergen.source ? (
            <Text style={styles.detailSource}>{allergen.source}</Text>
          ) : allergen.present === 'maybe' ? (
            <Text style={styles.detailSourceMaybe}>May be present</Text>
          ) : (
            <Text style={styles.detailSource}>Present in dish</Text>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <ExpandableCard
      title="Allergens"
      alwaysVisibleContent={allergenTags}
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
    backgroundColor: COLORS.tagBg,
    borderWidth: 1,
    borderColor: COLORS.tagBorder,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  detailsList: {
    gap: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailAllergen: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  detailSource: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 2,
    textAlign: 'right',
  },
  detailSourceMaybe: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    flex: 2,
    textAlign: 'right',
  },
});

export default AllergensModule;
