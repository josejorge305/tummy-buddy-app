/**
 * WeeklyOverview Component (Redesigned)
 * Week view with vertical bar charts showing daily scores and trend indicator
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

// Trend arrow icon
function TrendIcon({ direction, size = 16, color = COLORS.primary }: { direction: 'up' | 'down' | 'stable'; size?: number; color?: string }) {
  if (direction === 'stable') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12H19"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (direction === 'up') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 19V5M5 12L12 5L19 12"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V19M19 12L12 19L5 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Calendar icon
function CalendarIcon({ size = 18, color = COLORS.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2V5M16 2V5M3 9H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
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
      index * 80, // Stagger animation
      withTiming(displayScore, {
        duration: 500,
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
      <View style={[styles.barContainer, isCurrentDay && styles.barContainerCurrent]}>
        {hasScore ? (
          <Animated.View
            style={[
              styles.bar,
              { backgroundColor: barColor },
              animatedStyle,
            ]}
          />
        ) : (
          <View style={styles.emptyBar} />
        )}
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
      <Text style={[styles.scoreLabel, isCurrentDay && styles.scoreLabelCurrent]}>
        {hasScore ? Math.round(displayScore) : '—'}
      </Text>
    </View>
  );
}

// Calculate trend from week data
function calculateTrend(weekData: DayData[]): { direction: 'up' | 'down' | 'stable'; value: number } {
  const validScores = weekData.filter(d => d.score !== null && d.score > 0);
  if (validScores.length < 2) return { direction: 'stable', value: 0 };

  const recent = validScores.slice(-3);
  const earlier = validScores.slice(0, Math.max(1, validScores.length - 3));

  const recentAvg = recent.reduce((sum, d) => sum + (d.score || 0), 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, d) => sum + (d.score || 0), 0) / earlier.length;

  const diff = recentAvg - earlierAvg;

  if (Math.abs(diff) < 3) return { direction: 'stable', value: 0 };
  return { direction: diff > 0 ? 'up' : 'down', value: Math.abs(Math.round(diff)) };
}

export function WeeklyOverview({ weekData, averageScore }: WeeklyOverviewProps) {
  // Ensure we have 7 days of data
  const days = weekData.slice(-7);

  // Pad with empty days if needed
  while (days.length < 7) {
    days.unshift({ date: '', score: null, logged: false });
  }

  const trend = calculateTrend(weekData);
  const trendColor = trend.direction === 'up' ? COLORS.primary :
                     trend.direction === 'down' ? COLORS.attention : COLORS.textMuted;

  const daysLogged = weekData.filter(d => d.logged).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <CalendarIcon size={18} color={COLORS.textSecondary} />
          <Text style={styles.title}>Weekly Progress</Text>
        </View>
        <View style={styles.headerRight}>
          {trend.direction !== 'stable' && (
            <View style={[styles.trendBadge, { backgroundColor: `${trendColor}15` }]}>
              <TrendIcon direction={trend.direction} size={14} color={trendColor} />
              <Text style={[styles.trendText, { color: trendColor }]}>
                {trend.value}pts
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {averageScore !== undefined && averageScore > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(averageScore)}</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{daysLogged}</Text>
          <Text style={styles.statLabel}>Days Logged</Text>
        </View>
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
    marginBottom: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  trendText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    height: 120,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: SPACING.sm,
  },
  barContainerCurrent: {
    backgroundColor: 'rgba(0, 212, 170, 0.08)',
  },
  bar: {
    width: '100%',
    borderRadius: RADIUS.md,
    minHeight: 4,
  },
  emptyBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: RADIUS.md,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  dayLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  scoreLabelCurrent: {
    color: COLORS.textSecondary,
  },
});
