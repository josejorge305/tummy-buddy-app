/**
 * OrganHealthCard Component (Redesigned)
 * Card displaying organ health score with icon, status, and contributing factors
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../utils/colors';

// Organ status types
type OrganStatus = 'excellent' | 'good' | 'moderate' | 'attention';

// Factor type for contributing factors
interface OrganFactor {
  name: string;
  positive: boolean;
}

// Props for individual organ card
interface OrganHealthCardProps {
  name: string;
  score: number;
  status: OrganStatus;
  factors: OrganFactor[];
  icon?: React.ReactNode;
}

// Props for the full organ section
interface OrganHealthSectionProps {
  organs: Array<{
    name: string;
    score: number;
    status: OrganStatus;
    factors: OrganFactor[];
  }>;
  avgScore: number;
  priorityInsight?: string;
}

// Helper to get status color
function getStatusColor(status: OrganStatus): string {
  switch (status) {
    case 'excellent':
    case 'good':
      return COLORS.primary;
    case 'moderate':
      return COLORS.moderate;
    case 'attention':
      return COLORS.attention;
    default:
      return COLORS.textMuted;
  }
}

// Helper to get status label
function getStatusLabel(status: OrganStatus): string {
  switch (status) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'moderate':
      return 'Moderate';
    case 'attention':
      return 'Attention';
    default:
      return 'Unknown';
  }
}

// Organ Icons as SVG components
function HeartIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LiverIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12c0-4 2-8 8-8s8 4 8 8c0 5-4 8-8 10-2-1-4-2-5.5-4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 12c0-2 1.5-4 4-4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function KidneyIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 4c-3 0-5 3-5 7s2 9 5 9c2 0 3-2 4-2s2 2 4 2c3 0 5-5 5-9s-2-7-5-7c-2 0-3 1-4 1s-2-1-4-1z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 8v8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function BrainIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4.5c-2 0-3.5.5-4.5 1.5C6 7.5 6 9 6 10c-1.5.5-2.5 2-2.5 3.5 0 2 1.5 3.5 3 4 .5 1.5 2 2.5 4 2.5h3c2 0 3.5-1 4-2.5 1.5-.5 3-2 3-4 0-1.5-1-3-2.5-3.5 0-1 0-2.5-1.5-4-1-1-2.5-1.5-4.5-1.5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 4.5V20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function StomachIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c2 0 4 1 5 3 1.5 3 1 6 0 8-1 2-3 4-3 6v1"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 8c0-2 2-4 5-4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M7 8c-1 1-2 3-2 5s1 4 3 5c1.5 1 3 1 4 1"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function GutIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h3c1 0 2 1 2 2s-1 2-2 2H5c-1 0-2 1-2 2s1 2 2 2h2c1 0 2 1 2 2s-1 2-2 2H4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20 7h-3c-1 0-2 1-2 2s1 2 2 2h2c1 0 2 1 2 2s-1 2-2 2h-2c-1 0-2 1-2 2s1 2 2 2h3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 9h6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 15h6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

// Get the appropriate icon for an organ
function getOrganIcon(name: string, color: string) {
  const normalizedName = name.toLowerCase();
  switch (normalizedName) {
    case 'heart':
      return <HeartIcon color={color} />;
    case 'liver':
      return <LiverIcon color={color} />;
    case 'kidneys':
    case 'kidney':
      return <KidneyIcon color={color} />;
    case 'brain':
      return <BrainIcon color={color} />;
    case 'stomach':
      return <StomachIcon color={color} />;
    case 'gut':
    case 'intestine':
      return <GutIcon color={color} />;
    default:
      return <HeartIcon color={color} />;
  }
}

// Individual Organ Health Card
export function OrganHealthCard({
  name,
  score,
  status,
  factors,
  icon,
}: OrganHealthCardProps) {
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);
  const organIcon = icon || getOrganIcon(name, statusColor);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconAndName}>
          <View style={[styles.iconContainer, { backgroundColor: `${statusColor}15` }]}>
            {organIcon}
          </View>
          <View>
            <Text style={styles.organName}>{name}</Text>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{Math.round(score)}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${Math.min(score, 100)}%`, backgroundColor: statusColor },
          ]}
        />
      </View>

      {/* Contributing Factors */}
      <View style={styles.factorsContainer}>
        {factors.slice(0, 3).map((factor, index) => (
          <View
            key={index}
            style={[
              styles.factorBadge,
              {
                backgroundColor: factor.positive
                  ? `${COLORS.primary}15`
                  : `${COLORS.attention}15`,
              },
            ]}
          >
            <Text
              style={[
                styles.factorText,
                { color: factor.positive ? COLORS.primary : COLORS.attention },
              ]}
            >
              {factor.positive ? '+' : '−'} {factor.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Full Organ Health Section with Grid and Insight
export function OrganHealthSection({
  organs,
  avgScore,
  priorityInsight,
}: OrganHealthSectionProps) {
  const avgColor =
    avgScore >= 70 ? COLORS.primary : avgScore >= 50 ? COLORS.moderate : COLORS.attention;

  return (
    <View style={styles.sectionContainer}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Organ Health</Text>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke={COLORS.textMuted} strokeWidth={2} />
            <Path d="M12 16v-4M12 8h.01" stroke={COLORS.textMuted} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </View>
        <View style={styles.avgScoreContainer}>
          <Text style={styles.avgScoreLabel}>Avg Score</Text>
          <Text style={[styles.avgScoreValue, { color: avgColor }]}>
            {avgScore}/100
          </Text>
        </View>
      </View>

      {/* 2-Column Grid of Organ Cards */}
      <View style={styles.organsGrid}>
        {organs.map((organ, index) => (
          <OrganHealthCard
            key={`${organ.name}-${index}`}
            name={organ.name}
            score={organ.score}
            status={organ.status}
            factors={organ.factors}
          />
        ))}
      </View>

      {/* Priority Insight */}
      {priorityInsight && (
        <View style={styles.insightCard}>
          <Text style={styles.insightText}>
            <Text style={styles.insightHighlight}>Top priority: </Text>
            {priorityInsight}
          </Text>
        </View>
      )}
    </View>
  );
}

// Legacy support - OrganScoreCard for backwards compatibility
interface LegacyOrganScoreCardProps {
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
}: LegacyOrganScoreCardProps) {
  // Convert legacy format to new format
  const status: OrganStatus =
    score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'moderate' : 'attention';

  const factors: OrganFactor[] = [
    {
      name: trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable',
      positive: trend !== 'down',
    },
  ];

  return (
    <OrganHealthCard name={name} score={score} status={status} factors={factors} />
  );
}

// Legacy support - OrganScoresRow
interface LegacyOrganScoresRowProps {
  organs: Array<{
    name: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
    trendPercent: number;
  }>;
}

export function OrganScoresRow({ organs }: LegacyOrganScoresRowProps) {
  const displayOrgans = organs.slice(0, 2);

  if (displayOrgans.length === 0) {
    return null;
  }

  return (
    <View style={styles.legacyRow}>
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
  // Section styles
  sectionContainer: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  avgScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avgScoreLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  avgScoreValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },

  // Grid styles
  organsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },

  // Card styles
  card: {
    width: '48%',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  iconAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    textTransform: 'capitalize',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scoreMax: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },

  // Progress bar
  progressContainer: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: RADIUS.full,
  },

  // Factors
  factorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  factorBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  factorText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },

  // Insight card
  insightCard: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  insightText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  insightHighlight: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },

  // Legacy row
  legacyRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
