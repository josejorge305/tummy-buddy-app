/**
 * Production-safe logger utility
 * Logs are only output in development mode (__DEV__)
 * In production builds, all logs are silently ignored
 */

// Check if we're in development mode
const isDev = __DEV__;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

/**
 * Create a logger with optional prefix
 * @param options - Logger configuration options
 */
export function createLogger(options: LoggerOptions = {}) {
  const { prefix = '', enabled = isDev } = options;

  const formatMessage = (level: LogLevel, message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefixStr = prefix ? `[${prefix}]` : '';
    return [`${timestamp} ${prefixStr}`, message, ...args];
  };

  return {
    debug: (message: string, ...args: any[]) => {
      if (enabled) {
        console.log(...formatMessage('debug', message, ...args));
      }
    },
    info: (message: string, ...args: any[]) => {
      if (enabled) {
        console.log(...formatMessage('info', message, ...args));
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (enabled) {
        console.warn(...formatMessage('warn', message, ...args));
      }
    },
    error: (message: string, ...args: any[]) => {
      // Errors are always logged (but could be sent to error tracking in production)
      if (enabled) {
        console.error(...formatMessage('error', message, ...args));
      }
      // In production, you might want to send to Sentry or similar:
      // if (!isDev) { Sentry.captureException(new Error(message)); }
    },
  };
}

// Default logger instance
const logger = createLogger();

// Simple wrapper functions for quick logging
export const logDebug = (message: string, ...args: any[]) => {
  if (isDev) console.log(message, ...args);
};

export const logInfo = (message: string, ...args: any[]) => {
  if (isDev) console.log(message, ...args);
};

export const logWarn = (message: string, ...args: any[]) => {
  if (isDev) console.warn(message, ...args);
};

export const logError = (message: string, ...args: any[]) => {
  // Errors logged in both dev and production (for debugging critical issues)
  // In production, these should go to an error tracking service
  if (isDev) {
    console.error(message, ...args);
  }
  // TODO: Add Sentry or similar error tracking for production
};

export default logger;
