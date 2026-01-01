/**
 * Tracker Screen Design System
 * Color palette and helper functions for the redesigned tracker
 */

export const COLORS = {
  // Primary accents
  primary: '#00D4AA',      // Teal (new)
  secondary: '#00B4D8',    // Cyan

  // Backgrounds
  background: '#000000',   // Pure black
  bgGradientStart: '#000000',
  bgGradientEnd: '#000000',
  cardBg: '#0a0a0a',
  cardBgSolid: '#0a0a0a',

  // Status colors
  success: '#00D4AA',      // Teal (same as primary)
  excellent: '#00D4AA',
  good: '#00D4AA',
  moderate: '#f59e0b',
  attention: '#ef4444',
  warning: '#f59e0b',      // Amber
  error: '#ef4444',        // Red

  // Macro colors
  protein: '#8b5cf6',      // Purple
  carbs: '#f59e0b',        // Amber
  fat: '#ec4899',          // Pink
  fiber: '#00D4AA',        // Teal

  // Water
  waterLight: '#00D4AA',
  waterDark: '#00B4D8',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',  // gray-400
  textMuted: '#4B5563',      // gray-600
  textDark: '#374151',       // gray-700

  // Borders
  border: '#1a1a1a',
  borderLight: '#1a1a1a',
  borderDashed: '#2a2a2a',
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
