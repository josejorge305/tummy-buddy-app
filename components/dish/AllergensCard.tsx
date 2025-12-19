import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InsightAccordionCard } from './InsightAccordionCard';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from './designSystem';

type AllergenInfo = {
  name: string;
  isUserAllergen: boolean;
  present?: string; // 'yes' | 'maybe'
};

type Props = {
  allergens: AllergenInfo[];
  sentence: string | null;
};

// Determine overall severity based on allergens
function getAllergenSeverity(allergens: AllergenInfo[]): 'high' | 'moderate' | 'low' | null {
  if (allergens.length === 0) return 'low';
  if (allergens.some(a => a.isUserAllergen)) return 'high';
  if (allergens.some(a => a.present === 'maybe')) return 'moderate';
  return 'moderate';
}

// Get one-line summary without restating the headline
function getSummary(allergens: AllergenInfo[], sentence: string | null): string {
  if (allergens.length === 0) {
    return 'No common allergens detected in this dish';
  }

  const userAllergens = allergens.filter(a => a.isUserAllergen);
  if (userAllergens.length > 0) {
    const names = userAllergens.map(a => a.name).slice(0, 3).join(', ');
    return `Contains ${names}${userAllergens.length > 3 ? '...' : ''} from your profile`;
  }

  // Extract meaningful part from sentence if available
  if (sentence) {
    const cleaned = sentence.replace(/^contains?\s+/i, '').replace(/^the following allergens.*?:\s*/i, '');
    if (cleaned.length > 10 && cleaned.length < 80) {
      return cleaned.split(/[.!?]/)[0].trim();
    }
  }

  const names = allergens.map(a => a.name).slice(0, 3).join(', ');
  return `Contains ${names}${allergens.length > 3 ? '...' : ''}`;
}

export const AllergensCard: React.FC<Props> = ({
  allergens,
  sentence,
}) => {
  const severity = getAllergenSeverity(allergens);
  const summary = getSummary(allergens, sentence);

  const severityLabel = severity === 'high'
    ? 'Alert'
    : severity === 'moderate'
    ? 'Caution'
    : 'Clear';

  return (
    <InsightAccordionCard
      title="Allergens"
      icon="warning-outline"
      severity={severity}
      severityLabel={severityLabel}
      summary={summary}
    >
      <View style={styles.content}>
        {allergens.length === 0 ? (
          <View style={styles.clearBox}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.severityLow} />
            <Text style={styles.clearText}>
              No common allergens detected in this dish.
            </Text>
          </View>
        ) : (
          <>
            {/* Allergen list */}
            <View style={styles.allergenList}>
              {allergens.map((allergen, idx) => (
                <View key={idx} style={styles.allergenItem}>
                  <View style={[
                    styles.allergenDot,
                    {
                      backgroundColor: allergen.isUserAllergen
                        ? COLORS.severityHigh
                        : COLORS.severityModerate,
                    },
                  ]} />
                  <Text style={styles.allergenText}>
                    <Text style={styles.allergenName}>{allergen.name}</Text>
                    {allergen.present === 'maybe' && (
                      <Text style={styles.allergenMaybe}> (possible)</Text>
                    )}
                    {allergen.isUserAllergen && (
                      <Text style={styles.allergenProfile}> - matches your profile</Text>
                    )}
                  </Text>
                </View>
              ))}
            </View>

            {/* Additional context from sentence */}
            {sentence && (
              <Text style={styles.explanation}>{sentence}</Text>
            )}
          </>
        )}
      </View>
    </InsightAccordionCard>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: SPACING.md,
  },
  clearBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(53,194,126,0.1)',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  clearText: {
    ...TYPOGRAPHY.body,
    color: COLORS.severityLow,
    flex: 1,
  },
  allergenList: {
    gap: SPACING.sm,
  },
  allergenItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  allergenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  allergenText: {
    ...TYPOGRAPHY.body,
    flex: 1,
  },
  allergenName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  allergenMaybe: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  allergenProfile: {
    color: COLORS.severityHigh,
  },
  explanation: {
    ...TYPOGRAPHY.secondary,
    marginTop: SPACING.sm,
  },
});

export default AllergensCard;
