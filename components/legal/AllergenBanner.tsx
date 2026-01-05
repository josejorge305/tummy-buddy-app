import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDisclaimer } from '../../context/DisclaimerContext';
import {
  LEGAL_COLORS,
  LEGAL_TYPOGRAPHY,
  LEGAL_SPACING,
  LEGAL_RADIUS,
  LEGAL_ANIMATIONS,
} from './legalDesignSystem';

interface AllergenBannerProps {
  style?: object;
}

export function AllergenBanner({ style }: AllergenBannerProps) {
  const { isAllergenBannerDismissed, dismissAllergenBanner, isLoading } = useDisclaimer();

  // Animation values
  const heightAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Don't render if loading or already dismissed
  if (isLoading || isAllergenBannerDismissed) {
    return null;
  }

  const handleDismiss = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: 0,
        duration: LEGAL_ANIMATIONS.bannerDismiss,
        useNativeDriver: false, // height animation needs native driver off
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: LEGAL_ANIMATIONS.bannerDismiss,
        useNativeDriver: false,
      }),
    ]).start(() => {
      dismissAllergenBanner();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: opacityAnim,
          transform: [
            {
              scaleY: heightAnim,
            },
          ],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name="warning-outline"
          size={18}
          color={LEGAL_COLORS.warningIcon}
          style={styles.icon}
        />
        <Text style={styles.text} numberOfLines={2}>
          Allergen info may be incomplete. Always verify with restaurant.
        </Text>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={LEGAL_COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Compact version for inline use in menu items
interface AllergenBannerCompactProps {
  style?: object;
}

export function AllergenBannerCompact({ style }: AllergenBannerCompactProps) {
  return (
    <View style={[styles.compactContainer, style]}>
      <Ionicons
        name="information-circle-outline"
        size={14}
        color={LEGAL_COLORS.textInfo}
        style={styles.compactIcon}
      />
      <Text style={styles.compactText}>
        Allergen data is informational only
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: LEGAL_COLORS.warningBg,
    borderRadius: LEGAL_RADIUS.md,
    marginHorizontal: LEGAL_SPACING.lg,
    marginVertical: LEGAL_SPACING.sm,
    borderWidth: 1,
    borderColor: LEGAL_COLORS.warningBorder,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LEGAL_SPACING.sm,
    paddingHorizontal: LEGAL_SPACING.md,
  },
  icon: {
    marginRight: LEGAL_SPACING.sm,
  },
  text: {
    ...LEGAL_TYPOGRAPHY.small,
    color: LEGAL_COLORS.warningText,
    flex: 1,
  },
  dismissButton: {
    padding: LEGAL_SPACING.xs,
    marginLeft: LEGAL_SPACING.sm,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LEGAL_SPACING.xs,
  },
  compactIcon: {
    marginRight: LEGAL_SPACING.xs,
  },
  compactText: {
    ...LEGAL_TYPOGRAPHY.inlineDisclaimer,
  },
});

export default AllergenBanner;
