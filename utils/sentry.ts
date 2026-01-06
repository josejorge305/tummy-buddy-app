import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = Constants.expoConfig?.extra?.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    if (__DEV__) console.log('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Set environment based on __DEV__
    environment: __DEV__ ? 'development' : 'production',

    // Enable performance monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 100% in dev, 20% in prod

    // Enable profiling (requires tracing)
    profilesSampleRate: __DEV__ ? 1.0 : 0.1,

    // Attach stack traces to errors
    attachStacktrace: true,

    // Enable automatic breadcrumbs
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,

    // Debug mode in development
    debug: __DEV__,

    // Filter out certain errors
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (__DEV__ && !process.env.EXPO_PUBLIC_SENTRY_DEBUG) {
        if (__DEV__) console.log('[Sentry] Event captured (dev mode):', event.message || event.exception);
        return null;
      }

      // Filter out network errors that are user-caused
      const error = hint.originalException;
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          // Tag as network error but still send
          event.tags = { ...event.tags, error_type: 'network' };
        }
      }

      return event;
    },

    // Add app context
    initialScope: {
      tags: {
        app_version: Constants.expoConfig?.version || 'unknown',
        build_version: Constants.expoConfig?.ios?.buildNumber ||
                       Constants.expoConfig?.android?.versionCode?.toString() || 'unknown',
      },
    },
  });

  if (__DEV__) console.log('[Sentry] Initialized successfully');
}

// Helper to capture exceptions with context
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

// Helper to capture messages
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

// Helper to set user context
export function setUser(userId: string, userData?: { email?: string; username?: string }) {
  Sentry.setUser({
    id: userId,
    ...userData,
  });
}

// Helper to clear user context (on logout)
export function clearUser() {
  Sentry.setUser(null);
}

// Helper to add breadcrumb for navigation
export function addNavigationBreadcrumb(from: string, to: string) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `${from} -> ${to}`,
    level: 'info',
  });
}

// Helper to add breadcrumb for API calls
export function addApiBreadcrumb(method: string, url: string, statusCode?: number) {
  Sentry.addBreadcrumb({
    category: 'api',
    message: `${method} ${url}`,
    level: statusCode && statusCode >= 400 ? 'error' : 'info',
    data: { statusCode },
  });
}

// Helper to add breadcrumb for user actions
export function addActionBreadcrumb(action: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category: 'user_action',
    message: action,
    level: 'info',
    data,
  });
}

// Performance monitoring helpers
export function startTransaction(name: string, op: string) {
  return Sentry.startInactiveSpan({ name, op });
}

// Export Sentry for direct access if needed
export { Sentry };
