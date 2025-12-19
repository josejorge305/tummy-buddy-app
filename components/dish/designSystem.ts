/**
 * Dish Screen Design System
 * Unified constants for the redesigned dish analysis screen
 */

export const COLORS = {
  // Backgrounds
  background: '#070B12',
  cardSurface: '#0F1724',
  elevatedSurface: '#131E2E',
  border: 'rgba(255,255,255,0.08)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.50)',

  // Brand
  brandTeal: '#18D6C6',

  // Severity
  severityHigh: '#E35B66',
  severityModerate: '#F4B740',
  severityLow: '#35C27E',

  // Severity backgrounds (18% opacity)
  severityHighBg: 'rgba(227,91,102,0.18)',
  severityModerateBg: 'rgba(244,183,64,0.18)',
  severityLowBg: 'rgba(53,194,126,0.18)',
} as const;

export const TYPOGRAPHY = {
  // Dish title - 24-26 w800
  dishTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: COLORS.textPrimary,
  },
  // Section titles - 20 w800
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: COLORS.textPrimary,
  },
  // Key numbers - 22 w800
  keyNumber: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: COLORS.textPrimary,
  },
  // Body text - 16 w500
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  // Secondary text - 14 w500
  secondary: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  // Disclaimer - 12-13 w400
  disclaimer: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  // Chip text
  chip: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  // Label
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

// Helper to get severity color
export function getSeverityColor(level: 'high' | 'moderate' | 'medium' | 'low' | string): string {
  const normalized = level.toLowerCase();
  if (normalized === 'high') return COLORS.severityHigh;
  if (normalized === 'moderate' || normalized === 'medium') return COLORS.severityModerate;
  return COLORS.severityLow;
}

// Helper to get severity background
export function getSeverityBgColor(level: 'high' | 'moderate' | 'medium' | 'low' | string): string {
  const normalized = level.toLowerCase();
  if (normalized === 'high') return COLORS.severityHighBg;
  if (normalized === 'moderate' || normalized === 'medium') return COLORS.severityModerateBg;
  return COLORS.severityLowBg;
}

// Helper to get severity label
export function getSeverityLabel(level: 'high' | 'moderate' | 'medium' | 'low' | string): string {
  const normalized = level.toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'moderate' || normalized === 'medium') return 'Moderate';
  return 'Low';
}

// Footer height constant (for scroll padding)
export const STICKY_FOOTER_HEIGHT = 80;
