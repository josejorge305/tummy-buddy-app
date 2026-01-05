import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  Alert,
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
  DISCLAIMER_VERSION,
} from './legalDesignSystem';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SettingsLegalSectionProps {
  style?: object;
}

export function SettingsLegalSection({ style }: SettingsLegalSectionProps) {
  const {
    hasAcknowledgedOnboarding,
    onboardingTimestamp,
    hasAcknowledgedHealthCoach,
    healthCoachTimestamp,
    resetAllAcknowledgments,
  } = useDisclaimer();

  const [showFullTerms, setShowFullTerms] = useState(false);

  const handleResetDisclosures = () => {
    Alert.alert(
      'Reset Disclosures',
      'This will reset all legal acknowledgments. You will see the welcome modal and other disclosures again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllAcknowledgments();
            Alert.alert('Done', 'All disclosures have been reset.');
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'Not acknowledged';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Section Header */}
      <Text style={styles.sectionHeader}>Legal & Disclosures</Text>

      {/* Terms of Service */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => setShowFullTerms(true)}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="document-text-outline" size={22} color={LEGAL_COLORS.textSecondary} />
          <Text style={styles.menuItemText}>Terms & Disclosures</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={LEGAL_COLORS.textMuted} />
      </TouchableOpacity>

      {/* Privacy Policy */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          // TODO: Link to privacy policy
          Alert.alert('Privacy Policy', 'Privacy policy coming soon.');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="shield-checkmark-outline" size={22} color={LEGAL_COLORS.textSecondary} />
          <Text style={styles.menuItemText}>Privacy Policy</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={LEGAL_COLORS.textMuted} />
      </TouchableOpacity>

      {/* Acknowledgment Status */}
      <View style={styles.statusSection}>
        <Text style={styles.statusHeader}>Acknowledgment Status</Text>

        <View style={styles.statusItem}>
          <View style={styles.statusLeft}>
            <Ionicons
              name={hasAcknowledgedOnboarding ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={hasAcknowledgedOnboarding ? LEGAL_COLORS.primaryTeal : LEGAL_COLORS.textMuted}
            />
            <Text style={styles.statusLabel}>Welcome Terms</Text>
          </View>
          <Text style={styles.statusDate}>{formatDate(onboardingTimestamp)}</Text>
        </View>

        <View style={styles.statusItem}>
          <View style={styles.statusLeft}>
            <Ionicons
              name={hasAcknowledgedHealthCoach ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={hasAcknowledgedHealthCoach ? LEGAL_COLORS.primaryTeal : LEGAL_COLORS.textMuted}
            />
            <Text style={styles.statusLabel}>Health Coach Disclaimer</Text>
          </View>
          <Text style={styles.statusDate}>{formatDate(healthCoachTimestamp)}</Text>
        </View>

        <Text style={styles.versionText}>Disclaimer Version: {DISCLAIMER_VERSION}</Text>
      </View>

      {/* Reset Disclosures */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleResetDisclosures}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh-outline" size={18} color={LEGAL_COLORS.warningIcon} />
        <Text style={styles.resetButtonText}>Reset All Disclosures</Text>
      </TouchableOpacity>

      {/* Full Terms Modal */}
      <FullTermsModal
        visible={showFullTerms}
        onClose={() => setShowFullTerms(false)}
      />
    </View>
  );
}

// Full Terms Modal
function FullTermsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={styles.sheetOverlay} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Terms & Disclosures</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={LEGAL_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.sheetContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.fullTermsText}>{FULL_LEGAL_TEXT}</Text>
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: LEGAL_SPACING.lg,
  },
  sectionHeader: {
    ...LEGAL_TYPOGRAPHY.sectionTitle,
    marginBottom: LEGAL_SPACING.lg,
    paddingHorizontal: LEGAL_SPACING.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: LEGAL_SPACING.md,
    paddingHorizontal: LEGAL_SPACING.lg,
    backgroundColor: LEGAL_COLORS.border,
    marginBottom: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    ...LEGAL_TYPOGRAPHY.body,
    color: LEGAL_COLORS.textPrimary,
    marginLeft: LEGAL_SPACING.md,
  },
  statusSection: {
    marginTop: LEGAL_SPACING.xl,
    paddingHorizontal: LEGAL_SPACING.lg,
  },
  statusHeader: {
    ...LEGAL_TYPOGRAPHY.small,
    color: LEGAL_COLORS.textMuted,
    marginBottom: LEGAL_SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: LEGAL_SPACING.sm,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    ...LEGAL_TYPOGRAPHY.body,
    marginLeft: LEGAL_SPACING.sm,
  },
  statusDate: {
    ...LEGAL_TYPOGRAPHY.small,
  },
  versionText: {
    ...LEGAL_TYPOGRAPHY.inlineDisclaimer,
    marginTop: LEGAL_SPACING.md,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: LEGAL_SPACING.xl,
    paddingVertical: LEGAL_SPACING.md,
    marginHorizontal: LEGAL_SPACING.lg,
    borderRadius: LEGAL_RADIUS.md,
    borderWidth: 1,
    borderColor: LEGAL_COLORS.warningBorder,
    backgroundColor: LEGAL_COLORS.warningBg,
  },
  resetButtonText: {
    ...LEGAL_TYPOGRAPHY.body,
    color: LEGAL_COLORS.warningIcon,
    marginLeft: LEGAL_SPACING.sm,
  },
  // Sheet styles
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.85,
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
  bottomPadding: {
    height: LEGAL_SPACING.xxl,
  },
});

export default SettingsLegalSection;
