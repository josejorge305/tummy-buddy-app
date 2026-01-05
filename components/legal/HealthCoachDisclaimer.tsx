import React, { useState, useRef, useEffect } from 'react';
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

// ========== First-Use Modal ==========
interface HealthCoachFirstUseModalProps {
  onComplete?: () => void;
}

export function HealthCoachFirstUseModal({ onComplete }: HealthCoachFirstUseModalProps) {
  const { shouldShowHealthCoachModal, acknowledgeHealthCoach, isLoading } = useDisclaimer();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const visible = !isLoading && shouldShowHealthCoachModal();

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

  const handleContinue = async () => {
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
      await acknowledgeHealthCoach();
      onComplete?.();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* AI Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={28} color={LEGAL_COLORS.primaryTeal} />
          </View>

          {/* Title */}
          <Text style={styles.title}>AI Health Coach</Text>

          {/* Description */}
          <Text style={styles.description}>
            Your AI coach provides personalized wellness insights based on your goals and preferences.
          </Text>

          {/* Warning Box */}
          <View style={styles.warningBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={LEGAL_COLORS.warningIcon}
              style={styles.warningIcon}
            />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Important</Text>
              <Text style={styles.warningText}>
                AI recommendations are for informational purposes only and do not constitute
                medical advice. Always consult healthcare professionals for medical decisions.
              </Text>
            </View>
          </View>

          {/* Key Points */}
          <View style={styles.pointsList}>
            <View style={styles.pointItem}>
              <Ionicons name="checkmark-circle" size={18} color={LEGAL_COLORS.primaryTeal} />
              <Text style={styles.pointText}>Personalized based on your profile</Text>
            </View>
            <View style={styles.pointItem}>
              <Ionicons name="checkmark-circle" size={18} color={LEGAL_COLORS.primaryTeal} />
              <Text style={styles.pointText}>General wellness guidance only</Text>
            </View>
            <View style={styles.pointItem}>
              <Ionicons name="checkmark-circle" size={18} color={LEGAL_COLORS.primaryTeal} />
              <Text style={styles.pointText}>Not a substitute for medical advice</Text>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>I Understand</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ========== Persistent Inline Disclaimer ==========
interface HealthCoachDisclaimerProps {
  style?: object;
}

export function HealthCoachDisclaimer({ style }: HealthCoachDisclaimerProps) {
  return (
    <View style={[styles.inlineContainer, style]}>
      <Ionicons
        name="information-circle-outline"
        size={14}
        color={LEGAL_COLORS.textInfo}
        style={styles.inlineIcon}
      />
      <Text style={styles.inlineText}>
        AI-generated advice is for informational purposes only
      </Text>
    </View>
  );
}

// ========== Collapsible Disclaimer (for chat interface) ==========
interface HealthCoachDisclaimerExpandableProps {
  style?: object;
}

export function HealthCoachDisclaimerExpandable({ style }: HealthCoachDisclaimerExpandableProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.expandableContainer, style]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.expandableHeader}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={LEGAL_COLORS.textMuted}
        />
        <Text style={styles.expandableTitle}>AI Disclaimer</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={LEGAL_COLORS.textMuted}
        />
      </View>
      {expanded && (
        <Text style={styles.expandableText}>
          This AI coach provides general wellness information only. Recommendations are not
          medical advice and should not replace consultation with healthcare professionals.
          AI responses may contain errors or inaccuracies.
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Modal styles
  overlay: {
    flex: 1,
    backgroundColor: LEGAL_COLORS.overlayBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LEGAL_SPACING.lg,
  },
  modalContainer: {
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
    backgroundColor: LEGAL_COLORS.tealSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LEGAL_SPACING.lg,
  },
  title: {
    ...LEGAL_TYPOGRAPHY.modalTitle,
    textAlign: 'center',
    marginBottom: LEGAL_SPACING.sm,
  },
  description: {
    ...LEGAL_TYPOGRAPHY.body,
    textAlign: 'center',
    marginBottom: LEGAL_SPACING.lg,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: LEGAL_COLORS.warningBg,
    borderRadius: LEGAL_RADIUS.md,
    padding: LEGAL_SPACING.md,
    marginBottom: LEGAL_SPACING.lg,
    borderWidth: 1,
    borderColor: LEGAL_COLORS.warningBorder,
    width: '100%',
  },
  warningIcon: {
    marginRight: LEGAL_SPACING.sm,
    marginTop: 2,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    ...LEGAL_TYPOGRAPHY.warningTitle,
    marginBottom: LEGAL_SPACING.xs,
  },
  warningText: {
    ...LEGAL_TYPOGRAPHY.warningBody,
  },
  pointsList: {
    width: '100%',
    marginBottom: LEGAL_SPACING.xl,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LEGAL_SPACING.sm,
  },
  pointText: {
    ...LEGAL_TYPOGRAPHY.body,
    marginLeft: LEGAL_SPACING.sm,
  },
  continueButton: {
    backgroundColor: LEGAL_COLORS.primaryTeal,
    paddingVertical: LEGAL_SPACING.md,
    paddingHorizontal: LEGAL_SPACING.xxl,
    borderRadius: LEGAL_RADIUS.full,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonText: {
    ...LEGAL_TYPOGRAPHY.button,
  },
  // Inline disclaimer styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LEGAL_SPACING.xs,
  },
  inlineIcon: {
    marginRight: LEGAL_SPACING.xs,
  },
  inlineText: {
    ...LEGAL_TYPOGRAPHY.inlineDisclaimer,
  },
  // Expandable disclaimer styles
  expandableContainer: {
    backgroundColor: LEGAL_COLORS.border,
    borderRadius: LEGAL_RADIUS.md,
    padding: LEGAL_SPACING.md,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandableTitle: {
    ...LEGAL_TYPOGRAPHY.small,
    flex: 1,
    marginLeft: LEGAL_SPACING.sm,
  },
  expandableText: {
    ...LEGAL_TYPOGRAPHY.small,
    marginTop: LEGAL_SPACING.sm,
    lineHeight: 18,
  },
});

export default HealthCoachDisclaimer;
