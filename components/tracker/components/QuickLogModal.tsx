/**
 * QuickLogModal Component
 * Bottom sheet modal with quick logging options
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';

interface LogOption {
  id: string;
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
}

interface QuickLogModalProps {
  visible: boolean;
  onClose: () => void;
  onScanFood?: () => void;
  onSearch?: () => void;
  onBarcode?: () => void;
  onFavorites?: () => void;
}

function LogOptionCard({
  icon,
  label,
  description,
  onPress,
}: {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={[styles.optionCard, animatedStyle]}>
        <Text style={styles.optionIcon}>{icon}</Text>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function QuickLogModal({
  visible,
  onClose,
  onScanFood,
  onSearch,
  onBarcode,
  onFavorites,
}: QuickLogModalProps) {
  const options: LogOption[] = [
    {
      id: 'scan',
      icon: '📸',
      label: 'Scan Food',
      description: 'Take a photo',
      onPress: () => {
        onClose();
        onScanFood?.();
      },
    },
    {
      id: 'search',
      icon: '🔍',
      label: 'Search',
      description: 'Find foods',
      onPress: () => {
        onClose();
        onSearch?.();
      },
    },
    {
      id: 'barcode',
      icon: '📱',
      label: 'Barcode',
      description: 'Scan product',
      onPress: () => {
        onClose();
        onBarcode?.();
      },
    },
    {
      id: 'favorites',
      icon: '⭐',
      label: 'Favorites',
      description: 'Quick add',
      onPress: () => {
        onClose();
        onFavorites?.();
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Drag Handle */}
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>

              {/* Title */}
              <Text style={styles.title}>Log a Meal</Text>

              {/* Options Grid */}
              <View style={styles.optionsGrid}>
                {options.map((option) => (
                  <LogOptionCard
                    key={option.id}
                    icon={option.icon}
                    label={option.label}
                    description={option.description}
                    onPress={option.onPress}
                  />
                ))}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.cardBgSolid,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl + 20, // Extra padding for home indicator
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  optionCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  optionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
