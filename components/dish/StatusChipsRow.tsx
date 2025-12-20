import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  getSeverityColor,
  getSeverityBgColor,
  getSeverityLabel,
} from './designSystem';

type AllergenInfo = {
  name: string;
  isUserAllergen: boolean;
  present?: string;
};

type Props = {
  fodmapLevel?: 'high' | 'medium' | 'low' | null;
  allergens?: AllergenInfo[];
  calories?: number | null;
  bodyImpactLevel?: 'high' | 'medium' | 'low' | null;
  onFodmapPress?: () => void;
  onAllergensPress?: () => void;
  onBodyImpactPress?: () => void;
};

export const StatusChipsRow: React.FC<Props> = ({
  fodmapLevel,
  allergens = [],
  calories,
  bodyImpactLevel,
  onFodmapPress,
  onAllergensPress,
  onBodyImpactPress,
}) => {
  // Count allergens for summary
  const userAllergenCount = allergens.filter(a => a.isUserAllergen).length;
  const maybeCount = allergens.filter(a => a.present === 'maybe').length;
  const totalAllergenCount = allergens.length;

  // Build allergen summary text
  let allergenSummary = '';
  let allergenSeverity: 'high' | 'moderate' | 'low' = 'low';

  if (totalAllergenCount === 0) {
    allergenSummary = 'No allergens';
    allergenSeverity = 'low';
  } else if (userAllergenCount > 0) {
    allergenSummary = `${userAllergenCount} allergen${userAllergenCount > 1 ? 's' : ''}`;
    allergenSeverity = 'high';
  } else if (maybeCount > 0) {
    allergenSummary = `${totalAllergenCount} detected`;
    if (maybeCount > 0) allergenSummary += ` (${maybeCount}?)`;
    allergenSeverity = 'moderate';
  } else {
    allergenSummary = `${totalAllergenCount} detected`;
    allergenSeverity = 'moderate';
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* FODMAP Chip - Tappable */}
        {fodmapLevel && (
          <TouchableOpacity
            onPress={onFodmapPress}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: getSeverityBgColor(fodmapLevel),
                borderColor: getSeverityColor(fodmapLevel),
              }
            ]}
          >
            <Text style={[styles.chipText, { color: getSeverityColor(fodmapLevel) }]}>
              {getSeverityLabel(fodmapLevel)} FODMAP
            </Text>
            <Ionicons name="chevron-forward" size={12} color={getSeverityColor(fodmapLevel)} />
          </TouchableOpacity>
        )}

        {/* Allergens Chip - Tappable */}
        <TouchableOpacity
          onPress={onAllergensPress}
          activeOpacity={0.7}
          style={[
            styles.chip,
            {
              backgroundColor: getSeverityBgColor(allergenSeverity),
              borderColor: getSeverityColor(allergenSeverity),
            }
          ]}
        >
          {totalAllergenCount === 0 ? (
            <Ionicons name="checkmark-circle" size={14} color={getSeverityColor(allergenSeverity)} />
          ) : userAllergenCount > 0 ? (
            <Ionicons name="alert-circle" size={14} color={getSeverityColor(allergenSeverity)} />
          ) : null}
          <Text style={[styles.chipText, { color: getSeverityColor(allergenSeverity) }]}>
            {allergenSummary}
          </Text>
          <Ionicons name="chevron-forward" size={12} color={getSeverityColor(allergenSeverity)} />
        </TouchableOpacity>

        {/* Calories Chip - Static (no modal) */}
        {calories != null && (
          <View style={styles.chipNeutral}>
            <Text style={styles.chipTextNeutral}>
              {Math.round(calories)} kcal
            </Text>
          </View>
        )}

        {/* Body Impact Chip - Tappable */}
        {bodyImpactLevel && (
          <TouchableOpacity
            onPress={onBodyImpactPress}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: getSeverityBgColor(bodyImpactLevel),
                borderColor: getSeverityColor(bodyImpactLevel),
              }
            ]}
          >
            <Ionicons name="body-outline" size={14} color={getSeverityColor(bodyImpactLevel)} />
            <Text style={[styles.chipText, { color: getSeverityColor(bodyImpactLevel) }]}>
              {getSeverityLabel(bodyImpactLevel)}
            </Text>
            <Ionicons name="chevron-forward" size={12} color={getSeverityColor(bodyImpactLevel)} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    ...TYPOGRAPHY.chip,
  },
  chipNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  chipTextNeutral: {
    ...TYPOGRAPHY.chip,
    color: COLORS.textPrimary,
  },
});

export default StatusChipsRow;
