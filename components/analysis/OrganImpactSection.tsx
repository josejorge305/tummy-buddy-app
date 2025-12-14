import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

type ImpactLevel = "high" | "medium" | "low";

export type OrganImpactEntry = {
  id: string;
  organId: string;
  label: string;
  level: ImpactLevel;
  score?: number | null;
  description: string;
};

type Props = {
  title?: string;
  impacts: OrganImpactEntry[];
  overallSummary?: string | null;
  showHeader?: boolean;
  showSummary?: boolean;
  showToggle?: boolean;
};

// Colors for negative impacts (concerns)
const NEGATIVE_COLORS: Record<ImpactLevel, string> = {
  high: "#ef4444",    // red - high concern
  medium: "#fb923c",  // orange - medium concern
  low: "#facc15",     // yellow - low concern
};

// Colors for positive impacts (benefits)
const POSITIVE_COLORS: Record<ImpactLevel, string> = {
  high: "#22c55e",    // green - high benefit
  medium: "#4ade80",  // light green - medium benefit
  low: "#86efac",     // pale green - low benefit
};

const NEGATIVE_BADGE_BG: Record<ImpactLevel, string> = {
  high: "rgba(239, 68, 68, 0.16)",
  medium: "rgba(251, 146, 60, 0.16)",
  low: "rgba(250, 204, 21, 0.16)",
};

const POSITIVE_BADGE_BG: Record<ImpactLevel, string> = {
  high: "rgba(34, 197, 94, 0.16)",
  medium: "rgba(74, 222, 128, 0.16)",
  low: "rgba(134, 239, 172, 0.16)",
};

// Helper to get colors based on score (positive = benefit, negative = concern)
const getColorForImpact = (level: ImpactLevel, score: number | null | undefined): string => {
  const isPositive = typeof score === "number" && score > 0;
  return isPositive ? POSITIVE_COLORS[level] : NEGATIVE_COLORS[level];
};

const getBadgeBgForImpact = (level: ImpactLevel, score: number | null | undefined): string => {
  const isPositive = typeof score === "number" && score > 0;
  return isPositive ? POSITIVE_BADGE_BG[level] : NEGATIVE_BADGE_BG[level];
};

const LEVEL_LABEL: Record<ImpactLevel, string> = {
  high: "high",
  medium: "medium",
  low: "low",
};

const DEFAULT_GAUGE_BY_LEVEL: Record<ImpactLevel, number> = {
  high: 0.9,
  medium: 0.65,
  low: 0.35,
};

const ORGAN_TINT: Record<string, string> = {
  gut: "rgba(251, 146, 60, 0.18)",
  liver: "rgba(168, 85, 247, 0.18)",
  heart: "rgba(248, 113, 113, 0.18)",
  metabolic: "rgba(59, 130, 246, 0.18)",
  immune: "rgba(34, 197, 94, 0.18)",
  brain: "rgba(129, 140, 248, 0.18)",
  kidney: "rgba(52, 211, 153, 0.18)",
  // NEW: 4 additional organs
  eyes: "rgba(96, 165, 250, 0.18)",
  skin: "rgba(251, 191, 36, 0.18)",
  bones: "rgba(209, 213, 219, 0.18)",
  thyroid: "rgba(192, 132, 252, 0.18)",
};

const SEVERITY_ORDER: Record<ImpactLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const OrganImpactSection: React.FC<Props> = ({
  title = "Organ impact (whole plate)",
  impacts,
  overallSummary,
  showHeader = true,
  showSummary = true,
  showToggle = true,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const { sortedImpacts, summaryText, overallLevel } = useMemo(() => {
    const sorted = [...impacts].sort((a, b) => {
      const levelDiff = SEVERITY_ORDER[a.level] - SEVERITY_ORDER[b.level];
      if (levelDiff !== 0) return levelDiff;
      const aScore = Math.abs(a.score ?? 0);
      const bScore = Math.abs(b.score ?? 0);
      return bScore - aScore;
    });

    const top = sorted[0];
    const effLevel: ImpactLevel = top?.level ?? "low";

    // Build comprehensive summary from all organ descriptions
    // Filter to organs with meaningful impact (not neutral/low with generic text)
    const significantImpacts = sorted.filter(
      (o) => o.level !== "low" || (o.description && o.description.length > 30)
    );

    // Take descriptions from high/medium impacts first, then a couple low ones
    const highMedDescriptions = significantImpacts
      .filter((o) => o.level === "high" || o.level === "medium")
      .map((o) => o.description?.trim())
      .filter((d) => d && d.length > 10);

    const lowDescriptions = significantImpacts
      .filter((o) => o.level === "low")
      .slice(0, 2)
      .map((o) => o.description?.trim())
      .filter((d) => d && d.length > 10);

    // Combine into a paragraph (up to 4-5 sentences)
    const allDescriptions = [...highMedDescriptions, ...lowDescriptions].slice(0, 5);

    let comprehensiveSummary = "";
    if (allDescriptions.length > 0) {
      // Join sentences, ensuring proper punctuation
      comprehensiveSummary = allDescriptions
        .map((d) => {
          // Ensure sentence ends with period
          const trimmed = d.replace(/\.+$/, "").trim();
          return trimmed + ".";
        })
        .join(" ");
    } else {
      // Fallback if no descriptions
      const strongestOrgans = sorted
        .filter((o) => o.level !== "low")
        .slice(0, 2)
        .map((o) => o.label)
        .join(" & ");

      comprehensiveSummary = strongestOrgans.length > 0
        ? `${capitalize(LEVEL_LABEL[effLevel])} overall impact – strongest effects on ${strongestOrgans}.`
        : `${capitalize(LEVEL_LABEL[effLevel])} overall impact for this plate.`;
    }

    return {
      sortedImpacts: sorted,
      overallLevel: effLevel,
      summaryText:
        overallSummary && overallSummary.trim().length > 0
          ? overallSummary
          : comprehensiveSummary,
    };
  }, [impacts, overallSummary]);

  if (!impacts || impacts.length === 0) {
    return null;
  }

  // If showToggle is false, show all organs directly (parent handles toggle)
  const displayedImpacts = showToggle ? (showDetails ? sortedImpacts : []) : sortedImpacts;

  return (
    <View style={styles.card}>
      {showHeader && (
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <OverallBadge level={overallLevel} />
        </View>
      )}

      {showSummary && summaryText && (
        <Text style={styles.summaryText}>{summaryText}</Text>
      )}

      {showToggle && (
        <TouchableOpacity
          onPress={() => setShowDetails((prev) => !prev)}
          activeOpacity={0.8}
        >
          <Text style={styles.lowToggleText}>
            {showDetails ? "Hide organ details" : "Show organ details"}
          </Text>
        </TouchableOpacity>
      )}

      {displayedImpacts.map((item) => (
        <OrganImpactRow key={item.id} entry={item} />
      ))}
    </View>
  );
};

const OverallBadge: React.FC<{ level: ImpactLevel }> = ({ level }) => {
  const icon = level === "high" ? "⚠️" : level === "medium" ? "⚠️" : "✅";
  return (
    <View style={[styles.overallBadge, { borderColor: NEGATIVE_COLORS[level] }]}>
      <Text style={styles.overallBadgeText}>
        {icon} {capitalize(LEVEL_LABEL[level])}
      </Text>
    </View>
  );
};

const OrganImpactRow: React.FC<{
  entry: OrganImpactEntry;
  isLow?: boolean;
}> = ({ entry, isLow }) => {
  const { organId, label, level, description, score } = entry;
  const tint = ORGAN_TINT[organId] ?? "rgba(148, 163, 184, 0.22)";
  const color = getColorForImpact(level, score);

  const fraction = (() => {
    if (typeof score !== "number") {
      return DEFAULT_GAUGE_BY_LEVEL[level];
    }
    const abs = Math.min(Math.abs(score), 100);
    return abs / 100 || DEFAULT_GAUGE_BY_LEVEL[level];
  })();

  return (
    <View
      style={[
        styles.row,
        {
          borderLeftColor: color,
          opacity: isLow ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.iconColumn}>
        <View style={[styles.iconWrapper, { backgroundColor: tint }]}>
          <Text style={styles.iconEmoji}>{fallbackEmojiForOrgan(organId)}</Text>
        </View>
      </View>

      <View style={styles.contentColumn}>
        <View style={styles.rowHeader}>
          <Text style={styles.organLabel}>{label}</Text>
          <ImpactLevelChip level={level} score={score} />
        </View>

        <ImpactGauge level={level} fraction={fraction} score={score} />

        <Text style={styles.description} numberOfLines={3}>
          {description}
        </Text>
      </View>
    </View>
  );
};

const ImpactLevelChip: React.FC<{ level: ImpactLevel; score?: number | null }> = ({ level, score }) => {
  const color = getColorForImpact(level, score);
  const bgColor = getBadgeBgForImpact(level, score);
  return (
    <View
      style={[
        styles.levelChip,
        { backgroundColor: bgColor },
      ]}
    >
      <Text
        style={[
          styles.levelChipText,
          { color: color },
        ]}
      >
        {LEVEL_LABEL[level]}
      </Text>
    </View>
  );
};

const ImpactGauge: React.FC<{
  level: ImpactLevel;
  fraction: number;
  score?: number | null;
}> = ({ level, fraction, score }) => {
  const color = getColorForImpact(level, score);
  return (
    <View style={styles.gaugeTrack}>
      <View
        style={[
          styles.gaugeFill,
          {
            width: `${Math.round(
              Math.max(0.15, Math.min(fraction, 1)) * 100
            )}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const fallbackEmojiForOrgan = (organId: string): string => {
  switch (organId) {
    case "gut":
      return "🦠";
    case "liver":
      return "🧬";
    case "heart":
      return "❤️";
    case "metabolic":
      return "⚙️";
    case "immune":
      return "🛡️";
    case "brain":
      return "🧠";
    case "kidney":
      return "🫘";
    // NEW: 4 additional organs
    case "eyes":
      return "👁️";
    case "skin":
      return "✨";
    case "bones":
      return "🦴";
    case "thyroid":
      return "🦋";
    default:
      return "💫";
  }
};

const capitalize = (s: string) =>
  s.length ? s[0].toUpperCase() + s.slice(1) : s;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#020617",
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  overallBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  overallBadgeText: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  summaryText: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 10,
    columnGap: 10,
  },
  iconColumn: {
    width: 40,
    alignItems: "center",
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: {
    fontSize: 18,
  },
  contentColumn: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  organLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  levelChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelChipText: {
    fontSize: 11,
    textTransform: "capitalize",
  },
  gaugeTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    overflow: "hidden",
    marginBottom: 4,
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 999,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    color: "#9ca3af",
  },
  lowImpactSection: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.3)",
    paddingTop: 6,
  },
  lowToggleText: {
    fontSize: 12,
    color: "#67e8f9",
    marginBottom: 4,
  },
});
