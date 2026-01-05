import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RestaurantAllergenPopupProps {
  restaurantId: string;
  restaurantName: string;
  visible: boolean;
  onDismiss: () => void;
}

export function RestaurantAllergenPopup({
  restaurantId,
  restaurantName,
  visible,
  onDismiss,
}: RestaurantAllergenPopupProps) {
  const { markRestaurantPopupShown } = useDisclaimer();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: LEGAL_ANIMATIONS.modalFadeIn,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: LEGAL_ANIMATIONS.modalSlideUp,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleDismiss = async () => {
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: LEGAL_ANIMATIONS.modalFadeIn,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: LEGAL_ANIMATIONS.modalSlideUp,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      await markRestaurantPopupShown(restaurantId);
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Warning Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={32} color={LEGAL_COLORS.warningIcon} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Important Allergen Notice</Text>

          {/* Restaurant Name */}
          <Text style={styles.restaurantName}>{restaurantName}</Text>

          {/* Warning Content */}
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Allergen and ingredient information displayed may be{' '}
              <Text style={styles.warningBold}>incomplete, inaccurate, or outdated</Text>.
            </Text>
          </View>

          {/* Bullet Points */}
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>Cross-contamination may occur in kitchens</Text>
            </View>
            <View style={styles.bulletItem}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>Ingredients may change seasonally</Text>
            </View>
            <View style={styles.bulletItem}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>Recipes may vary by location</Text>
            </View>
          </View>

          {/* Call to Action */}
          <View style={styles.ctaBox}>
            <Ionicons name="restaurant-outline" size={20} color={LEGAL_COLORS.primaryTeal} />
            <Text style={styles.ctaText}>
              If you have food allergies, always verify ingredients directly with the restaurant
            </Text>
          </View>

          {/* Dismiss Button */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.dismissButtonText}>I Understand</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: LEGAL_COLORS.overlayBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LEGAL_SPACING.lg,
  },
  container: {
    backgroundColor: LEGAL_COLORS.cardBg,
    borderRadius: LEGAL_RADIUS.xl,
    width: '100%',
    maxWidth: 340,
    padding: LEGAL_SPACING.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: LEGAL_COLORS.warningBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LEGAL_SPACING.lg,
  },
  title: {
    ...LEGAL_TYPOGRAPHY.modalTitle,
    textAlign: 'center',
    marginBottom: LEGAL_SPACING.sm,
  },
  restaurantName: {
    ...LEGAL_TYPOGRAPHY.body,
    color: LEGAL_COLORS.textMuted,
    textAlign: 'center',
    marginBottom: LEGAL_SPACING.lg,
  },
  warningBox: {
    backgroundColor: LEGAL_COLORS.warningBg,
    borderRadius: LEGAL_RADIUS.md,
    padding: LEGAL_SPACING.md,
    marginBottom: LEGAL_SPACING.lg,
    borderWidth: 1,
    borderColor: LEGAL_COLORS.warningBorder,
    width: '100%',
  },
  warningText: {
    ...LEGAL_TYPOGRAPHY.warningBody,
    textAlign: 'center',
  },
  warningBold: {
    fontWeight: '700',
    color: LEGAL_COLORS.warningIcon,
  },
  bulletList: {
    width: '100%',
    marginBottom: LEGAL_SPACING.lg,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: LEGAL_SPACING.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LEGAL_COLORS.textMuted,
    marginTop: 6,
    marginRight: LEGAL_SPACING.sm,
  },
  bulletText: {
    ...LEGAL_TYPOGRAPHY.small,
    flex: 1,
  },
  ctaBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: LEGAL_COLORS.tealSubtle,
    borderRadius: LEGAL_RADIUS.md,
    padding: LEGAL_SPACING.md,
    marginBottom: LEGAL_SPACING.xl,
    width: '100%',
  },
  ctaText: {
    ...LEGAL_TYPOGRAPHY.body,
    color: LEGAL_COLORS.primaryTeal,
    marginLeft: LEGAL_SPACING.sm,
    flex: 1,
  },
  dismissButton: {
    backgroundColor: LEGAL_COLORS.primaryTeal,
    paddingVertical: LEGAL_SPACING.md,
    paddingHorizontal: LEGAL_SPACING.xxl,
    borderRadius: LEGAL_RADIUS.full,
    width: '100%',
    alignItems: 'center',
  },
  dismissButtonText: {
    ...LEGAL_TYPOGRAPHY.button,
  },
});

export default RestaurantAllergenPopup;
