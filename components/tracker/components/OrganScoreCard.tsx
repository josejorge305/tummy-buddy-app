/**
 * OrganScoreCard Component
 * Card displaying organ health score with trend indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';
import { getScoreColor, getTrendInfo, getOrganEmoji } from '../utils/scoreHelpers';

interface OrganScoreCardProps {
  name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export function OrganScoreCard({
  name,
  score,
  trend,
  trendPercent,
}: OrganScoreCardProps) {
  const scoreColor = getScoreColor(score);
  const { arrow, color: trendColor } = getTrendInfo(trend, trendPercent);
  const emoji = getOrganEmoji(name);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
        <View style={[styles.trendBadge, { backgroundColor: `${trendColor}20` }]}>
          <Text style={[styles.trendText, { color: trendColor }]}>
            {arrow} {Math.abs(trendPercent)}%
          </Text>
        </View>
      </View>
      <Text style={[styles.score, { color: scoreColor }]}>{Math.round(score)}</Text>
    </View>
  );
}

interface OrganScoresRowProps {
  organs: Array<{
    name: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
    trendPercent: number;
  }>;
}

export function OrganScoresRow({ organs }: OrganScoresRowProps) {
  // Take first 2 organs for the row
  const displayOrgans = organs.slice(0, 2);

  if (displayOrgans.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {displayOrgans.map((organ, index) => (
        <OrganScoreCard
          key={`${organ.name}-${index}`}
          name={organ.name}
          score={organ.score}
          trend={organ.trend}
          trendPercent={organ.trendPercent}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  emoji: {
    fontSize: 16,
  },
  name: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  trendBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  trendText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  score: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
  },
});
