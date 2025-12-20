import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  getSeverityColor,
} from './designSystem';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type PlateComponent = {
  id: string;
  name: string;
  role?: string;
  shareRatio?: number;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  allergens?: string[];
  fodmapLevel?: 'high' | 'medium' | 'low' | null;
  isSafe?: boolean; // Based on user's profile
};

type Props = {
  visible: boolean;
  onClose: () => void;
  components: PlateComponent[];
  suggestion?: string | null; // AI suggestion like "Skip the roll and cheese..."
  onLogSelected?: (selectedIds: string[]) => void;
};

export function ComponentBreakdownSheet({
  visible,
  onClose,
  components,
  suggestion,
  onLogSelected,
}: Props) {
  const insets = useSafeAreaInsets();

  // Track which components are selected (all selected by default)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(components.map(c => c.id))
  );

  // Reset selection when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedIds(new Set(components.map(c => c.id)));
    }
  }, [visible, components]);

  // Calculate nutrition for selected components
  const selectedNutrition = useMemo(() => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    components.forEach(c => {
      if (selectedIds.has(c.id)) {
        totalCalories += c.calories || 0;
        totalProtein += c.protein || 0;
        totalCarbs += c.carbs || 0;
        totalFat += c.fat || 0;
      }
    });

    return { calories: totalCalories, protein: totalProtein, carbs: totalCarbs, fat: totalFat };
  }, [components, selectedIds]);

  // Calculate full plate nutrition
  const fullPlateNutrition = useMemo(() => {
    let totalCalories = 0;
    components.forEach(c => {
      totalCalories += c.calories || 0;
    });
    return totalCalories;
  }, [components]);

  const toggleComponent = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleLogSelected = () => {
    onLogSelected?.(Array.from(selectedIds));
    onClose();
  };

  const getComponentStatusIcon = (component: PlateComponent) => {
    if (component.isSafe === false) {
      return { name: 'alert-circle', color: COLORS.severityHigh };
    }
    if (component.fodmapLevel === 'high') {
      return { name: 'alert-circle', color: COLORS.severityHigh };
    }
    if (component.allergens && component.allergens.length > 0) {
      return { name: 'alert-circle', color: COLORS.severityModerate };
    }
    return { name: 'checkmark-circle', color: COLORS.severityLow };
  };

  const getComponentIssueText = (component: PlateComponent) => {
    const issues: string[] = [];
    if (component.allergens && component.allergens.length > 0) {
      issues.push(component.allergens.join(', '));
    }
    if (component.fodmapLevel === 'high') {
      issues.push('High FODMAP');
    } else if (component.fodmapLevel === 'medium') {
      issues.push('Moderate FODMAP');
    }
    return issues.length > 0 ? issues.join(' • ') : 'Safe for you';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Plate Breakdown</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* AI Suggestion */}
          {suggestion && (
            <View style={styles.suggestionBox}>
              <Ionicons name="bulb-outline" size={18} color={COLORS.brandTeal} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          )}

          {/* Component List */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {components.map((component) => {
              const isSelected = selectedIds.has(component.id);
              const statusIcon = getComponentStatusIcon(component);
              const issueText = getComponentIssueText(component);
              const sharePercent = component.shareRatio
                ? Math.round(component.shareRatio * 100)
                : null;

              return (
                <TouchableOpacity
                  key={component.id}
                  style={[
                    styles.componentCard,
                    !isSelected && styles.componentCardUnselected,
                  ]}
                  onPress={() => toggleComponent(component.id)}
                  activeOpacity={0.7}
                >
                  {/* Checkbox */}
                  <View style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color={COLORS.background} />
                    )}
                  </View>

                  {/* Component Info */}
                  <View style={styles.componentInfo}>
                    <View style={styles.componentHeader}>
                      <Text style={[
                        styles.componentName,
                        !isSelected && styles.componentNameUnselected,
                      ]}>
                        {component.name}
                      </Text>
                      {sharePercent !== null && (
                        <Text style={styles.componentShare}>{sharePercent}%</Text>
                      )}
                    </View>

                    {/* Status line */}
                    <View style={styles.componentStatus}>
                      <Ionicons
                        name={statusIcon.name as any}
                        size={14}
                        color={statusIcon.color}
                      />
                      <Text style={[
                        styles.componentIssue,
                        { color: statusIcon.color },
                      ]}>
                        {issueText}
                      </Text>
                    </View>

                    {/* Nutrition mini row */}
                    {component.calories != null && (
                      <Text style={styles.componentNutrition}>
                        {Math.round(component.calories)} kcal
                        {component.protein != null && ` • ${Math.round(component.protein)}g protein`}
                        {component.carbs != null && ` • ${Math.round(component.carbs)}g carbs`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer with comparison */}
          <View style={styles.footer}>
            <View style={styles.nutritionComparison}>
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Selected:</Text>
                <Text style={styles.nutritionValue}>
                  {Math.round(selectedNutrition.calories)} kcal
                </Text>
              </View>
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabelMuted}>Full plate:</Text>
                <Text style={styles.nutritionValueMuted}>
                  {Math.round(fullPlateNutrition)} kcal
                </Text>
              </View>
            </View>

            {onLogSelected && (
              <TouchableOpacity
                style={[
                  styles.logButton,
                  selectedIds.size === 0 && styles.logButtonDisabled,
                ]}
                onPress={handleLogSelected}
                disabled={selectedIds.size === 0}
                activeOpacity={0.8}
              >
                <Text style={styles.logButtonText}>
                  Log Selected Components
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: 'rgba(24,214,198,0.1)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(24,214,198,0.2)',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.brandTeal,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  componentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.cardSurface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  componentCardUnselected: {
    opacity: 0.5,
    backgroundColor: 'transparent',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  componentInfo: {
    flex: 1,
  },
  componentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  componentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  componentNameUnselected: {
    color: COLORS.textMuted,
  },
  componentShare: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  componentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  componentIssue: {
    fontSize: 13,
    fontWeight: '500',
  },
  componentNutrition: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nutritionComparison: {
    marginBottom: SPACING.md,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  nutritionLabelMuted: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  nutritionValueMuted: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  logButton: {
    backgroundColor: COLORS.brandTeal,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  logButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
});
