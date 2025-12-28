/**
 * Tracker Screen Design System
 * Color palette and helper functions for the redesigned tracker
 */

export const COLORS = {
  // Primary accents
  primary: '#14B8A6',      // Teal
  secondary: '#06B6D4',    // Cyan

  // Backgrounds
  bgGradientStart: '#0A0F1C',
  bgGradientEnd: '#111827',
  cardBg: 'rgba(255, 255, 255, 0.08)',
  cardBgSolid: '#111827',

  // Status colors
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red

  // Macro colors
  protein: '#F43F5E',      // Rose
  carbs: '#F59E0B',        // Amber
  fat: '#8B5CF6',          // Purple
  fiber: '#10B981',        // Green

  // Water
  waterLight: '#06B6D4',
  waterDark: '#0891B2',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.5)',
  textMuted: 'rgba(255, 255, 255, 0.3)',

  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
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
  xxl: 24,
  full: 999,
} as const;

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;
