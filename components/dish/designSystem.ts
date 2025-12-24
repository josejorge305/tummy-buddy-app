/**
 * Dish Screen Design System
 * Unified constants for the redesigned dish analysis screen
 *
 * REDESIGN v2: Teal-only color palette for severity indicators
 * No red, amber, orange, purple - only teal as accent color
 */

export const COLORS = {
  // Backgrounds - matching spec: black or bg-black
  background: '#000000',
  // Card background: bg-slate-900/80
  cardSurface: 'rgba(15, 23, 42, 0.8)',
  elevatedSurface: '#131E2E',
  // Card border: border-slate-800
  border: '#1e293b',
  // Subtle border for tags
  tagBorder: '#475569',

  // Text
  textPrimary: '#FFFFFF',
  // text-slate-300
  textSecondary: '#cbd5e1',
  // text-slate-500
  textMuted: '#64748b',

  // Brand - primary accent (teal-500 / teal-400)
  brandTeal: '#14b8a6',
  brandTealLight: '#2dd4bf',

  // Tag background: bg-slate-800/50
  tagBg: 'rgba(30, 41, 59, 0.5)',

  // LEGACY: Severity colors (kept for backward compatibility with existing components)
  // New modules should use teal-only severity text
  severityHigh: '#E35B66',
  severityModerate: '#F4B740',
  severityLow: '#35C27E',

  // Severity backgrounds (18% opacity) - LEGACY
  severityHighBg: 'rgba(227,91,102,0.18)',
  severityModerateBg: 'rgba(244,183,64,0.18)',
  severityLowBg: 'rgba(53,194,126,0.18)',
} as const;

/**
 * Typography Scale (per spec):
 * - xxl: 28px - Page titles only
 * - xl: 22px - Dish names, major headings
 * - lg: 18px - Section headers
 * - md: 16px - Body text, descriptions
 * - sm: 14px - Secondary info
 * - xs: 12px - Captions, units
 */
export const FONT_SIZES = {
  xxl: 28,
  xl: 22,
  lg: 18,
  md: 16,
  sm: 14,
  xs: 12,
} as const;

export const TYPOGRAPHY = {
  // Page title - 28px w700 (used sparingly, e.g., main page headers)
  pageTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
    lineHeight: 34,
  },
  // Dish title - 20px w700 (dish names, max 2 lines with ellipsis)
  dishTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
    lineHeight: 26,
  },
  // Section titles - 18px w600
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  // Key numbers - 22px w700 (nutrition values, etc.)
  keyNumber: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },
  // Large key number - 28px w700 (calories in teal)
  keyNumberLarge: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700' as const,
    color: COLORS.brandTeal,
  },
  // Body text - 16px w500
  body: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  // Secondary text - 14px w500
  secondary: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  // Disclaimer/caption - 12px w400
  disclaimer: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '400' as const,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  // Chip text - 13px w600
  chip: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  // Label - 11px w600 uppercase
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  // Severity badge text - 14px w600
  severityBadge: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
    color: COLORS.brandTeal,
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
  pill: 100,
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
