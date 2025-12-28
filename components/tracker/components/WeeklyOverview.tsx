/**
 * WeeklyOverview Component
 * Week view with vertical bar charts showing daily scores
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';
import { getScoreColor, getDayAbbrev, isToday } from '../utils/scoreHelpers';

interface DayData {
  date: string;
  score: number | null;
  logged: boolean;
}

interface WeeklyOverviewProps {
  weekData: DayData[];
  averageScore?: number;
}

function DayBar({
  day,
  score,
  isCurrentDay,
  index,
}: {
  day: string;
  score: number | null;
  isCurrentDay: boolean;
  index: number;
}) {
  const height = useSharedValue(0);
  const hasScore = score !== null && score > 0;
  const displayScore = hasScore ? Math.min(score, 100) : 0;
  const barColor = hasScore ? getScoreColor(displayScore) : 'transparent';

  useEffect(() => {
    height.value = withDelay(
      index * 100, // Stagger animation
      withTiming(displayScore, {
        duration: 600,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      })
    );
  }, [displayScore, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${height.value}%`,
  }));

  return (
    <View style={styles.dayColumn}>
      {/* Bar container */}
      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.bar,
            { backgroundColor: barColor },
            animatedStyle,
          ]}
        />
      </View>

      {/* Day label */}
      <Text
        style={[
          styles.dayLabel,
          isCurrentDay && styles.dayLabelCurrent,
        ]}
      >
        {day}
      </Text>

      {/* Score */}
      <Text style={styles.scoreLabel}>
        {hasScore ? Math.round(displayScore) : '—'}
      </Text>
    </View>
  );
}

export function WeeklyOverview({ weekData, averageScore }: WeeklyOverviewProps) {
  // Ensure we have 7 days of data
  const days = weekData.slice(-7);

  // Pad with empty days if needed
  while (days.length < 7) {
    days.unshift({ date: '', score: null, logged: false });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>This Week</Text>
        {averageScore !== undefined && averageScore > 0 && (
          <View style={[styles.avgBadge, { backgroundColor: `${getScoreColor(averageScore)}20` }]}>
            <Text style={[styles.avgText, { color: getScoreColor(averageScore) }]}>
              Avg: {Math.round(averageScore)}
            </Text>
          </View>
        )}
      </View>

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        {days.map((day, index) => {
          const dayAbbrev = day.date ? getDayAbbrev(day.date) : ['S', 'M', 'T', 'W', 'T', 'F', 'S'][index];
          const current = day.date ? isToday(day.date) : false;

          return (
            <DayBar
              key={day.date || `day-${index}`}
              day={dayAbbrev}
              score={day.score}
              isCurrentDay={current}
              index={index}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  avgBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  avgText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    height: 140,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: SPACING.sm,
  },
  bar: {
    width: '100%',
    borderRadius: RADIUS.md,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  dayLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
