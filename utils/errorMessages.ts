/**
 * User-Friendly Error Messages
 * Centralized error handling with friendly, actionable messages
 */

import { Alert, AlertButton } from 'react-native';

// Error categories for different user-facing scenarios
export type ErrorCategory =
  | 'network'
  | 'auth'
  | 'photo'
  | 'meal'
  | 'profile'
  | 'menu'
  | 'analysis'
  | 'generic';

// User-friendly error messages mapped by category
const ERROR_MESSAGES: Record<ErrorCategory, { title: string; messages: Record<string, string> }> = {
  network: {
    title: 'Connection Issue',
    messages: {
      default: 'Unable to connect. Please check your internet connection and try again.',
      timeout: 'The request took too long. Please check your connection and try again.',
      offline: 'You appear to be offline. Please connect to the internet and try again.',
    },
  },
  auth: {
    title: 'Sign In Required',
    messages: {
      default: 'Please sign in to continue.',
      expired: 'Your session has expired. Please sign in again.',
      invalid: 'Invalid email or password. Please try again.',
      not_logged_in: 'Please sign in to use this feature.',
    },
  },
  photo: {
    title: 'Photo Issue',
    messages: {
      default: 'Unable to process the photo. Please try again.',
      camera_permission: 'Camera access is needed. Please enable it in Settings.',
      upload_failed: 'Unable to upload photo. Please check your connection and try again.',
      capture_failed: 'Unable to take photo. Please try again.',
    },
  },
  meal: {
    title: 'Meal Logging Issue',
    messages: {
      default: 'Unable to log your meal. Please try again.',
      delete_failed: 'Unable to remove meal. Please try again.',
      update_failed: 'Unable to update meal. Please try again.',
      missing_data: 'Some information is missing. Please try again.',
    },
  },
  profile: {
    title: 'Profile Issue',
    messages: {
      default: 'Unable to update your profile. Please try again.',
      save_failed: 'Unable to save changes. Please try again.',
      load_failed: 'Unable to load your profile. Please try again.',
    },
  },
  menu: {
    title: 'Menu Issue',
    messages: {
      default: 'Unable to load the menu. Please try again.',
      not_found: 'Menu not available for this restaurant.',
      timeout: 'Loading the menu is taking longer than expected. Please wait or try again.',
    },
  },
  analysis: {
    title: 'Analysis Issue',
    messages: {
      default: 'Unable to analyze this item. Please try again.',
      unavailable: 'Analysis is temporarily unavailable. Please try again later.',
      timeout: 'Analysis is taking longer than expected. Please try again.',
    },
  },
  generic: {
    title: 'Oops!',
    messages: {
      default: 'Something went wrong. Please try again.',
      unknown: 'An unexpected error occurred. Please try again.',
    },
  },
};

/**
 * Get a user-friendly error message based on category and error type
 */
export function getErrorMessage(
  category: ErrorCategory,
  errorType: string = 'default'
): { title: string; message: string } {
  const categoryConfig = ERROR_MESSAGES[category] || ERROR_MESSAGES.generic;
  const message = categoryConfig.messages[errorType] || categoryConfig.messages.default;

  return {
    title: categoryConfig.title,
    message,
  };
}

/**
 * Show a user-friendly error alert
 */
export function showErrorAlert(
  category: ErrorCategory,
  errorType?: string,
  options?: {
    buttons?: AlertButton[];
    onDismiss?: () => void;
  }
): void {
  const { title, message } = getErrorMessage(category, errorType);

  const buttons: AlertButton[] = options?.buttons || [
    { text: 'OK', style: 'default', onPress: options?.onDismiss },
  ];

  Alert.alert(title, message, buttons);
}

/**
 * Show a retry alert with retry and cancel options
 */
export function showRetryAlert(
  category: ErrorCategory,
  onRetry: () => void,
  options?: {
    errorType?: string;
    onCancel?: () => void;
  }
): void {
  const { title, message } = getErrorMessage(category, options?.errorType);

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: options?.onCancel },
    { text: 'Retry', style: 'default', onPress: onRetry },
  ]);
}

/**
 * Parse an error and determine the appropriate category
 * Useful for converting raw errors into user-friendly messages
 */
export function parseError(
  error: any
): { category: ErrorCategory; errorType: string } {
  const message = error?.message?.toLowerCase() || '';

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('internet')
  ) {
    return { category: 'network', errorType: 'default' };
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return { category: 'network', errorType: 'timeout' };
  }

  // Auth errors
  if (message.includes('unauthorized') || message.includes('401')) {
    return { category: 'auth', errorType: 'expired' };
  }

  if (message.includes('not logged in') || message.includes('login required')) {
    return { category: 'auth', errorType: 'not_logged_in' };
  }

  // Photo errors
  if (message.includes('camera') || message.includes('photo')) {
    return { category: 'photo', errorType: 'default' };
  }

  if (message.includes('permission')) {
    return { category: 'photo', errorType: 'camera_permission' };
  }

  // Default to generic
  return { category: 'generic', errorType: 'default' };
}

/**
 * Show an appropriate error alert based on the error object
 */
export function showError(
  error: any,
  options?: {
    fallbackCategory?: ErrorCategory;
    onDismiss?: () => void;
  }
): void {
  const { category, errorType } = parseError(error);
  const finalCategory = options?.fallbackCategory || category;

  showErrorAlert(finalCategory, errorType, { onDismiss: options?.onDismiss });
}
