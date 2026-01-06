/**
 * BackButton Component
 * Consistent back navigation button used across all screens
 */

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface BackButtonProps {
  /**
   * Override the default back behavior
   */
  onPress?: () => void;
  /**
   * Button color (defaults to white)
   */
  color?: string;
  /**
   * Button size (defaults to 24)
   */
  size?: number;
  /**
   * Additional styles for the container
   */
  style?: ViewStyle;
  /**
   * Whether to show a circular background
   */
  showBackground?: boolean;
  /**
   * Background color when showBackground is true
   */
  backgroundColor?: string;
}

export function BackButton({
  onPress,
  color = '#FFFFFF',
  size = 24,
  style,
  showBackground = false,
  backgroundColor = 'rgba(0, 0, 0, 0.3)',
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        showBackground && [styles.withBackground, { backgroundColor }],
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons
        name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
        size={size}
        color={color}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  withBackground: {
    borderRadius: 20,
    width: 40,
    height: 40,
  },
});

export default BackButton;
