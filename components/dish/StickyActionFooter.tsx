import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COLORS,
  SPACING,
  RADIUS,
  STICKY_FOOTER_HEIGHT,
} from './designSystem';

type Props = {
  onLogMeal: () => void;
  onViewRecipe: () => void;
  isLoggingMeal: boolean;
  mealLogged: boolean;
  hasRecipe: boolean;
};

export const StickyActionFooter: React.FC<Props> = ({
  onLogMeal,
  onViewRecipe,
  isLoggingMeal,
  mealLogged,
  hasRecipe,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
      <View style={styles.buttonsRow}>
        {/* Primary: Log Meal */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            mealLogged && styles.primaryButtonLogged,
            isLoggingMeal && styles.primaryButtonDisabled,
          ]}
          onPress={onLogMeal}
          disabled={isLoggingMeal}
          activeOpacity={0.8}
        >
          {isLoggingMeal ? (
            <ActivityIndicator size="small" color={COLORS.background} style={styles.buttonIcon} />
          ) : (
            <Ionicons
              name={mealLogged ? 'checkmark-circle' : 'add-circle'}
              size={18}
              color={COLORS.background}
              style={styles.buttonIcon}
            />
          )}
          <Text style={styles.primaryButtonText}>
            {mealLogged ? 'Logged!' : isLoggingMeal ? 'Logging...' : 'Log Meal'}
          </Text>
        </TouchableOpacity>

        {/* Secondary: Recipe */}
        {hasRecipe && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onViewRecipe}
            activeOpacity={0.8}
          >
            <Ionicons
              name="restaurant-outline"
              size={16}
              color={COLORS.brandTeal}
              style={styles.buttonIcon}
            />
            <Text style={styles.secondaryButtonText}>Recipe</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Export the height for scroll padding calculation
export const getFooterHeight = (bottomInset: number): number => {
  return STICKY_FOOTER_HEIGHT + Math.max(bottomInset, SPACING.lg);
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.cardSurface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.brandTeal,
    minWidth: 140,
  },
  primaryButtonLogged: {
    backgroundColor: COLORS.severityLow,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.background,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.brandTeal,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  buttonIcon: {
    marginRight: 6,
  },
});

export default StickyActionFooter;
