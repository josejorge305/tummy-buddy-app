/**
 * Helper functions for score calculations and display
 */

import { COLORS } from './colors';

/**
 * Returns color based on health score
 */
export function getScoreColor(score: number): string {
  if (score >= 85) return COLORS.success;
  if (score >= 70) return COLORS.warning;
  return COLORS.error;
}

/**
 * Returns percentage for progress indicators, capped at 100
 */
export function getPercentage(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
}

/**
 * Format a number with K suffix for thousands
 */
export function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toLocaleString();
}

/**
 * Get trend arrow and color based on direction
 */
export function getTrendInfo(trend: 'up' | 'down' | 'stable', trendPercent: number): {
  arrow: string;
  color: string;
} {
  switch (trend) {
    case 'up':
      return { arrow: '↑', color: COLORS.success };
    case 'down':
      return { arrow: '↓', color: COLORS.error };
    case 'stable':
    default:
      return { arrow: '→', color: COLORS.textSecondary };
  }
}

/**
 * Get day abbreviation from date
 */
export function getDayAbbrev(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return days[date.getDay()];
}

/**
 * Check if date is today
 */
export function isToday(dateStr: string): boolean {
  const today = new Date();
  const date = new Date(dateStr);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Format date as "Saturday, Dec 28"
 */
export function formatDateHeader(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get emoji for meal based on type or name
 */
export function getMealEmoji(mealType?: string | null, dishName?: string | null): string {
  const name = (dishName || '').toLowerCase();

  // Check dish name for common foods
  if (name.includes('pizza')) return '🍕';
  if (name.includes('burger')) return '🍔';
  if (name.includes('salad')) return '🥗';
  if (name.includes('pasta') || name.includes('spaghetti')) return '🍝';
  if (name.includes('sushi')) return '🍣';
  if (name.includes('taco')) return '🌮';
  if (name.includes('sandwich')) return '🥪';
  if (name.includes('steak') || name.includes('beef')) return '🥩';
  if (name.includes('chicken')) return '🍗';
  if (name.includes('fish') || name.includes('salmon')) return '🐟';
  if (name.includes('soup')) return '🍲';
  if (name.includes('rice')) return '🍚';
  if (name.includes('coffee')) return '☕';
  if (name.includes('smoothie')) return '🥤';
  if (name.includes('egg')) return '🍳';
  if (name.includes('pancake') || name.includes('waffle')) return '🥞';
  if (name.includes('fruit')) return '🍎';
  if (name.includes('dessert') || name.includes('cake') || name.includes('ice cream')) return '🍰';

  // Check meal type
  switch (mealType?.toLowerCase()) {
    case 'breakfast':
      return '🍳';
    case 'lunch':
      return '🥗';
    case 'dinner':
      return '🍽️';
    case 'snack':
      return '🍎';
    default:
      return '🍽️';
  }
}

/**
 * Format time from timestamp
 */
export function formatTime(timestamp: string | number): string {
  const date = typeof timestamp === 'number'
    ? new Date(timestamp * 1000)
    : new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get organ emoji based on organ code/name
 */
export function getOrganEmoji(organ: string): string {
  const name = organ.toLowerCase();

  if (name.includes('gut') || name.includes('intestin') || name.includes('digest')) return '🦠';
  if (name.includes('heart') || name.includes('cardio')) return '❤️';
  if (name.includes('liver')) return '🫁';
  if (name.includes('kidney')) return '🫘';
  if (name.includes('brain') || name.includes('cognitive')) return '🧠';
  if (name.includes('skin')) return '✨';
  if (name.includes('bone') || name.includes('joint')) return '🦴';
  if (name.includes('immune')) return '🛡️';
  if (name.includes('lung') || name.includes('respiratory')) return '🫁';
  if (name.includes('eye') || name.includes('vision')) return '👁️';

  return '💪';
}
