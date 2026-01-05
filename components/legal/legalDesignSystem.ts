/**
 * Legal Disclaimers Design System
 * Color palette and typography optimized for dark theme (BLACK background)
 */

export const LEGAL_COLORS = {
  // Modal backgrounds
  overlayBg: 'rgba(13, 17, 23, 0.7)', // #0d1117 at 70%
  cardBg: '#1a1a2e',

  // Primary accent (teal)
  primaryTeal: '#00d4aa',
  tealDarker: '#00a88a',
  tealSubtle: '#1a3a3a',

  // Warning colors (amber - dark theme compatible)
  warningBg: '#3d2e00',
  warningBorder: '#5d4e00',
  warningIcon: '#ffc107',
  warningText: '#ddbb88', // Brightened for black bg

  // Text colors (optimized for BLACK background)
  textPrimary: '#FFFFFF',
  textSecondary: '#cccccc',
  textMuted: '#999999',
  textSubtle: '#888888',
  textInfo: '#777777', // Minimum for readability on black

  // Borders
  border: '#2a2a3e',
  borderSubtle: 'rgba(255, 255, 255, 0.1)',

  // Button states
  buttonDisabled: 'rgba(0, 212, 170, 0.5)',

  // Checkbox
  checkboxBorder: '#555555',
  checkboxChecked: '#00d4aa',
} as const;

export const LEGAL_TYPOGRAPHY = {
  // Modal title - 20px w700
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: LEGAL_COLORS.textPrimary,
    lineHeight: 28,
  },
  // Section header - 16px w600
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: LEGAL_COLORS.textPrimary,
    lineHeight: 22,
  },
  // Body text - 14px w400
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: LEGAL_COLORS.textSecondary,
    lineHeight: 20,
  },
  // Small text - 13px w400
  small: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: LEGAL_COLORS.textMuted,
    lineHeight: 18,
  },
  // Checkbox label - 14px w500
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: LEGAL_COLORS.textPrimary,
    lineHeight: 20,
  },
  // Secondary checkbox - 12px w400
  checkboxSecondary: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: LEGAL_COLORS.textSubtle,
    lineHeight: 16,
  },
  // Button text - 16px w600
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
    lineHeight: 22,
  },
  // Link text - 14px w500
  link: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: LEGAL_COLORS.primaryTeal,
    lineHeight: 20,
  },
  // Inline disclaimer - 11px w400
  inlineDisclaimer: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: LEGAL_COLORS.textInfo,
    lineHeight: 14,
  },
  // Warning title - 14px w600
  warningTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: LEGAL_COLORS.warningIcon,
    lineHeight: 20,
  },
  // Warning body - 13px w400
  warningBody: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: LEGAL_COLORS.warningText,
    lineHeight: 18,
  },
} as const;

export const LEGAL_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const LEGAL_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

// Animation timings
export const LEGAL_ANIMATIONS = {
  modalFadeIn: 300,
  modalSlideUp: 200,
  tooltipAppear: 200,
  bannerDismiss: 200,
  checkboxBounce: 150,
  buttonEnable: 200,
} as const;

// Full legal text for "View full terms" bottom sheet
export const FULL_LEGAL_TEXT = `HEALTH DISCLAIMER

Restaurant-AI provides general wellness information only. Caloric targets, nutritional data, and AI recommendations are NOT medical advice and should not replace consultation with healthcare professionals. The information provided has not been evaluated by the Food and Drug Administration (FDA).

Always consult with a qualified healthcare provider, registered dietitian, or physician before making any dietary changes, especially if you have diabetes, heart disease, kidney disease, eating disorders, are pregnant or nursing, or have any other medical condition. Individual nutritional needs vary significantly based on factors this app cannot assess.

Reliance on any information provided by this application is solely at your own risk.

---

ALLERGEN WARNING

IMPORTANT: Allergen and ingredient information displayed in this application may be INCOMPLETE, INACCURATE, or OUTDATED. This information DOES NOT account for:
• Cross-contamination in kitchens
• Seasonal ingredient changes
• Regional recipe variations
• Kitchen preparation methods

IF YOU HAVE A FOOD ALLERGY OR INTOLERANCE, YOU MUST VERIFY ALL INGREDIENTS DIRECTLY WITH THE RESTAURANT BEFORE ORDERING OR CONSUMING ANY FOOD.

Do not rely solely on this application for allergen safety. Failure to verify ingredients with the restaurant could result in serious allergic reaction, including anaphylaxis or death.

---

AI-GENERATED CONTENT DISCLAIMER

This application uses artificial intelligence to generate:
• Nutritional insights and recommendations
• Allergen analysis
• Health impact assessments
• Recipe instructions

AI-generated content may contain errors, inaccuracies, or omissions ("hallucinations"). AI systems can produce confident-sounding information that is factually incorrect.

You should independently verify any AI-generated information before relying upon it. The AI does not have access to your complete medical history, current medications, or individual health circumstances, and cannot provide personalized medical advice.

---

NUTRITIONAL DATA DISCLAIMER

Nutritional information, including calorie counts, macronutrient values, and ingredient lists, is derived from third-party databases (Edamam, USDA FoodData Central), restaurant-provided data, and AI analysis.

This information may contain errors and should be considered estimates only. Actual nutritional values may vary based on portion sizes, preparation methods, and ingredient substitutions.

---

By checking "I understand these guidelines" you acknowledge that you have read and understood these terms.`;

// Version for tracking acknowledgments
export const DISCLAIMER_VERSION = '1.0';
