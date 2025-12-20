import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from './designSystem';

type Props = {
  /** Whether the analysis is still loading */
  isAnalysisLoading: boolean;
  /** Current loading message to display */
  loadingMessage?: string;
  /** Loading progress (0-1) */
  loadingProgress?: number;
  /** Called when Log Meal button is pressed */
  onLogMeal: () => void;
  /** Called when Recipe button is pressed */
  onViewRecipe: () => void;
  /** Whether meal is currently being logged */
  isLoggingMeal: boolean;
  /** Whether meal has been logged */
  mealLogged: boolean;
  /** Whether recipe is available */
  hasRecipe: boolean;
};

export function InlineActionButtons({
  isAnalysisLoading,
  loadingMessage = 'Analyzing...',
  loadingProgress = 0,
  onLogMeal,
  onViewRecipe,
  isLoggingMeal,
  mealLogged,
  hasRecipe,
}: Props) {
  // Loading state - show spinner and progress
  if (isAnalysisLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.brandTeal} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(loadingProgress * 100, 95)}%` },
            ]}
          />
        </View>
      </View>
    );
  }

  // Ready state - show action buttons
  return (
    <View style={styles.buttonsContainer}>
      <View style={styles.buttonsRow}>
        {/* Primary: Log Meal */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            mealLogged && styles.primaryButtonLogged,
            isLoggingMeal && styles.buttonDisabled,
          ]}
          onPress={onLogMeal}
          disabled={isLoggingMeal || mealLogged}
          activeOpacity={0.8}
        >
          {isLoggingMeal ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <>
              <Ionicons
                name={mealLogged ? 'checkmark-circle' : 'add-circle'}
                size={20}
                color="#000000"
              />
              <Text style={styles.primaryButtonText}>
                {mealLogged ? 'Logged!' : 'Log Meal'}
              </Text>
            </>
          )}
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
              size={18}
              color={COLORS.brandTealLight}
            />
            <Text style={styles.secondaryButtonText}>Recipe</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Loading state
  loadingContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.brandTeal,
    borderRadius: 2,
  },

  // Buttons state
  buttonsContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.brandTeal,
  },
  primaryButtonLogged: {
    backgroundColor: COLORS.severityLow,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.brandTealLight,
  },
});

export default InlineActionButtons;
