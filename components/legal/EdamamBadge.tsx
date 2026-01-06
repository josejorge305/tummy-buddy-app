import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  LEGAL_COLORS,
  LEGAL_TYPOGRAPHY,
  LEGAL_SPACING,
  LEGAL_RADIUS,
} from './legalDesignSystem';

const EDAMAM_URL = 'https://www.edamam.com';

interface EdamamBadgeProps {
  style?: object;
  showDisclaimer?: boolean;
}

export function EdamamBadge({ style, showDisclaimer = true }: EdamamBadgeProps) {
  const handlePress = async () => {
    try {
      await Linking.openURL(EDAMAM_URL);
    } catch (e) {
      if (__DEV__) console.error('[EdamamBadge] Failed to open URL:', e);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.badge}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.badgeContent}>
          <Text style={styles.poweredBy}>Powered by</Text>
          <Text style={styles.edamamText}>edamam</Text>
        </View>
        <Ionicons
          name="open-outline"
          size={12}
          color={LEGAL_COLORS.textMuted}
          style={styles.externalIcon}
        />
      </TouchableOpacity>
      {showDisclaimer && (
        <Text style={styles.disclaimer}>
          Nutritional data provided by Edamam. Values are estimates.
        </Text>
      )}
    </View>
  );
}

// Compact inline version
interface EdamamBadgeInlineProps {
  style?: object;
}

export function EdamamBadgeInline({ style }: EdamamBadgeInlineProps) {
  const handlePress = async () => {
    try {
      await Linking.openURL(EDAMAM_URL);
    } catch (e) {
      if (__DEV__) console.error('[EdamamBadge] Failed to open URL:', e);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.inlineContainer, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons
        name="nutrition-outline"
        size={12}
        color={LEGAL_COLORS.textInfo}
        style={styles.inlineIcon}
      />
      <Text style={styles.inlineText}>
        Data by Edamam
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LEGAL_COLORS.border,
    paddingVertical: LEGAL_SPACING.sm,
    paddingHorizontal: LEGAL_SPACING.md,
    borderRadius: LEGAL_RADIUS.md,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  poweredBy: {
    fontSize: 10,
    fontWeight: '400',
    color: LEGAL_COLORS.textMuted,
    marginRight: LEGAL_SPACING.xs,
  },
  edamamText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6cc644', // Edamam green
    letterSpacing: 0.5,
  },
  externalIcon: {
    marginLeft: LEGAL_SPACING.sm,
  },
  disclaimer: {
    ...LEGAL_TYPOGRAPHY.inlineDisclaimer,
    marginTop: LEGAL_SPACING.sm,
    textAlign: 'center',
  },
  // Inline styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineIcon: {
    marginRight: LEGAL_SPACING.xs,
  },
  inlineText: {
    ...LEGAL_TYPOGRAPHY.inlineDisclaimer,
  },
});

export default EdamamBadge;
