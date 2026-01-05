import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDisclaimer } from '../../context/DisclaimerContext';
import {
  LEGAL_COLORS,
  LEGAL_TYPOGRAPHY,
  LEGAL_SPACING,
  LEGAL_RADIUS,
  LEGAL_ANIMATIONS,
  FULL_LEGAL_TEXT,
} from './legalDesignSystem';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeModalProps {
  onComplete?: () => void;
}

export function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const { shouldShowOnboardingModal, acknowledgeOnboarding, isLoading } = useDisclaimer();
  const [isChecked, setIsChecked] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const checkboxScale = useRef(new Animated.Value(1)).current;

  const visible = !isLoading && shouldShowOnboardingModal();

  useEffect(() => {
    if (visible) {
      // Animate in
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

  const handleCheckboxPress = () => {
    // Bounce animation
    Animated.sequence([
      Animated.timing(checkboxScale, {
        toValue: 0.8,
        duration: LEGAL_ANIMATIONS.checkboxBounce / 2,
        useNativeDriver: true,
      }),
      Animated.timing(checkboxScale, {
        toValue: 1,
        duration: LEGAL_ANIMATIONS.checkboxBounce / 2,
        useNativeDriver: true,
      }),
    ]).start();

    setIsChecked(!isChecked);
  };

  const handleContinue = async () => {
    if (!isChecked) return;

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
      await acknowledgeOnboarding();
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
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Restaurant AI</Text>
            <Text style={styles.subtitle}>
              Before you begin, please review our important guidelines
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Health Disclaimer Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="heart-outline" size={20} color={LEGAL_COLORS.primaryTeal} />
                <Text style={styles.sectionTitle}>Health Information</Text>
              </View>
              <Text style={styles.sectionBody}>
                This app provides general wellness information only. Nutritional data and
                AI recommendations are not medical advice and should not replace consultation
                with healthcare professionals.
              </Text>
            </View>

            {/* Allergen Warning Section */}
            <View style={styles.warningSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="warning-outline" size={20} color={LEGAL_COLORS.warningIcon} />
                <Text style={styles.warningTitle}>Allergen Warning</Text>
              </View>
              <Text style={styles.warningBody}>
                Allergen information may be incomplete or inaccurate. If you have food
                allergies, always verify ingredients directly with the restaurant before
                ordering.
              </Text>
            </View>

            {/* AI Disclaimer Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="sparkles-outline" size={20} color={LEGAL_COLORS.primaryTeal} />
                <Text style={styles.sectionTitle}>AI-Generated Content</Text>
              </View>
              <Text style={styles.sectionBody}>
                This app uses AI to generate insights and recommendations. AI content may
                contain errors. Always verify important information independently.
              </Text>
            </View>

            {/* View Full Terms Link */}
            <TouchableOpacity
              style={styles.viewTermsButton}
              onPress={() => setShowFullTerms(true)}
            >
              <Text style={styles.viewTermsText}>View full terms</Text>
              <Ionicons name="chevron-forward" size={16} color={LEGAL_COLORS.primaryTeal} />
            </TouchableOpacity>
          </ScrollView>

          {/* Checkbox */}
          <Pressable style={styles.checkboxRow} onPress={handleCheckboxPress}>
            <Animated.View
              style={[
                styles.checkbox,
                isChecked && styles.checkboxChecked,
                { transform: [{ scale: checkboxScale }] },
              ]}
            >
              {isChecked && (
                <Ionicons name="checkmark" size={16} color="#000" />
              )}
            </Animated.View>
            <Text style={styles.checkboxLabel}>I understand these guidelines</Text>
          </Pressable>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, !isChecked && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!isChecked}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Full Terms Bottom Sheet */}
      <FullTermsSheet
        visible={showFullTerms}
        onClose={() => setShowFullTerms(false)}
      />
    </Modal>
  );
}

// Full Terms Bottom Sheet Component
function FullTermsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.sheetOverlay} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheetContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Full Legal Terms</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={LEGAL_COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.sheetContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.fullTermsText}>{FULL_LEGAL_TEXT}</Text>
        </ScrollView>
      </Animated.View>
    </View>
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
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
  },
  header: {
    padding: LEGAL_SPACING.xl,
    paddingBottom: LEGAL_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: LEGAL_COLORS.borderSubtle,
  },
  title: {
    ...LEGAL_TYPOGRAPHY.modalTitle,
    textAlign: 'center',
    marginBottom: LEGAL_SPACING.sm,
  },
  subtitle: {
    ...LEGAL_TYPOGRAPHY.body,
    textAlign: 'center',
  },
  content: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  contentContainer: {
    padding: LEGAL_SPACING.lg,
  },
  section: {
    marginBottom: LEGAL_SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LEGAL_SPACING.sm,
  },
  sectionTitle: {
    ...LEGAL_TYPOGRAPHY.sectionTitle,
    marginLeft: LEGAL_SPACING.sm,
  },
  sectionBody: {
    ...LEGAL_TYPOGRAPHY.body,
  },
  warningSection: {
    backgroundColor: LEGAL_COLORS.warningBg,
    borderRadius: LEGAL_RADIUS.md,
    padding: LEGAL_SPACING.md,
    marginBottom: LEGAL_SPACING.lg,
    borderWidth: 1,
    borderColor: LEGAL_COLORS.warningBorder,
  },
  warningTitle: {
    ...LEGAL_TYPOGRAPHY.warningTitle,
    marginLeft: LEGAL_SPACING.sm,
  },
  warningBody: {
    ...LEGAL_TYPOGRAPHY.warningBody,
  },
  viewTermsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LEGAL_SPACING.sm,
  },
  viewTermsText: {
    ...LEGAL_TYPOGRAPHY.link,
    marginRight: LEGAL_SPACING.xs,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LEGAL_SPACING.xl,
    paddingVertical: LEGAL_SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: LEGAL_COLORS.borderSubtle,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: LEGAL_RADIUS.sm,
    borderWidth: 2,
    borderColor: LEGAL_COLORS.checkboxBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: LEGAL_SPACING.md,
  },
  checkboxChecked: {
    backgroundColor: LEGAL_COLORS.checkboxChecked,
    borderColor: LEGAL_COLORS.checkboxChecked,
  },
  checkboxLabel: {
    ...LEGAL_TYPOGRAPHY.checkboxLabel,
    flex: 1,
  },
  continueButton: {
    backgroundColor: LEGAL_COLORS.primaryTeal,
    marginHorizontal: LEGAL_SPACING.xl,
    marginBottom: LEGAL_SPACING.xl,
    paddingVertical: LEGAL_SPACING.md,
    borderRadius: LEGAL_RADIUS.full,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: LEGAL_COLORS.buttonDisabled,
  },
  continueButtonText: {
    ...LEGAL_TYPOGRAPHY.button,
  },
  // Full Terms Sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.8,
    backgroundColor: LEGAL_COLORS.cardBg,
    borderTopLeftRadius: LEGAL_RADIUS.xl,
    borderTopRightRadius: LEGAL_RADIUS.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: LEGAL_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: LEGAL_COLORS.borderSubtle,
  },
  sheetTitle: {
    ...LEGAL_TYPOGRAPHY.modalTitle,
  },
  closeButton: {
    padding: LEGAL_SPACING.xs,
  },
  sheetContent: {
    flex: 1,
    padding: LEGAL_SPACING.lg,
  },
  fullTermsText: {
    ...LEGAL_TYPOGRAPHY.small,
    lineHeight: 22,
  },
});

export default WelcomeModal;
