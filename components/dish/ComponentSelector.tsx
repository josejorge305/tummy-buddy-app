import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from './designSystem';

type PlateComponent = {
  id: string;
  name: string;
  role?: string;
};

type Props = {
  components: PlateComponent[];
  selectedIndex: number | null; // null = "Whole Plate"
  onSelect: (index: number | null) => void;
};

export const ComponentSelector: React.FC<Props> = ({
  components,
  selectedIndex,
  onSelect,
}) => {
  if (components.length <= 1) {
    return null; // Don't show selector for single component dishes
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Analyze by</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Whole Plate option */}
        <TouchableOpacity
          style={[
            styles.segment,
            selectedIndex === null && styles.segmentActive,
          ]}
          onPress={() => onSelect(null)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.segmentText,
            selectedIndex === null && styles.segmentTextActive,
          ]}>
            Whole Plate
          </Text>
        </TouchableOpacity>

        {/* Individual components */}
        {components.map((comp, index) => (
          <TouchableOpacity
            key={comp.id}
            style={[
              styles.segment,
              selectedIndex === index && styles.segmentActive,
            ]}
            onPress={() => onSelect(index)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.segmentText,
              selectedIndex === index && styles.segmentTextActive,
            ]} numberOfLines={1}>
              {comp.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.sm,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  segment: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: 'rgba(24, 214, 198, 0.15)',
    borderColor: COLORS.brandTeal,
  },
  segmentText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textMuted,
  },
  segmentTextActive: {
    color: COLORS.brandTeal,
    fontWeight: '600',
  },
});

export default ComponentSelector;
