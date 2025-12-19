import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InsightAccordionCard } from './InsightAccordionCard';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  getSeverityColor,
} from './designSystem';

type Props = {
  level: 'high' | 'medium' | 'low' | null;
  sentence: string | null;
  triggerIngredients?: string[];
};

// Map level to severity for accordion
function mapLevelToSeverity(level: string | null): 'high' | 'moderate' | 'low' | null {
  if (!level) return null;
  if (level === 'high') return 'high';
  if (level === 'medium') return 'moderate';
  return 'low';
}

// Get appropriate one-line summary based on level
function getSummary(level: string | null, sentence: string | null): string {
  if (!level) return 'FODMAP level not determined';

  // Extract first meaningful part from sentence or generate default
  if (sentence) {
    // Don't repeat "High FODMAP" etc - start with the "why"
    const cleaned = sentence
      .replace(/^(high|medium|low)\s+fodmap[.,:;]?\s*/i, '')
      .replace(/^fodmap\s+(level\s+)?(is\s+)?(high|medium|low)[.,:;]?\s*/i, '');

    if (cleaned && cleaned.length > 10) {
      // Return first sentence only
      const firstSentence = cleaned.split(/[.!?]/)[0].trim();
      if (firstSentence.length > 80) {
        return firstSentence.substring(0, 77) + '...';
      }
      return firstSentence;
    }
  }

  // Default summaries
  if (level === 'high') return 'Contains ingredients that may trigger IBS symptoms';
  if (level === 'medium') return 'Some FODMAP-containing ingredients present';
  return 'Safe for most IBS-sensitive diets';
}

export const FodmapCard: React.FC<Props> = ({
  level,
  sentence,
  triggerIngredients = [],
}) => {
  const severity = mapLevelToSeverity(level);
  const summary = getSummary(level, sentence);
  const levelColor = severity ? getSeverityColor(severity) : COLORS.textMuted;

  const severityLabel = level === 'high' ? 'High' : level === 'medium' ? 'Moderate' : 'Low';

  return (
    <InsightAccordionCard
      title="FODMAP / IBS"
      icon="leaf-outline"
      severity={severity}
      severityLabel={severityLabel}
      summary={summary}
    >
      <View style={styles.content}>
        {/* Explanation paragraph - don't restate the headline */}
        {sentence && (
          <Text style={styles.explanation}>
            {sentence}
          </Text>
        )}

        {/* Trigger ingredients if available */}
        {triggerIngredients.length > 0 && (
          <View style={styles.triggersSection}>
            <Text style={styles.triggersLabel}>Trigger ingredients:</Text>
            <View style={styles.triggersList}>
              {triggerIngredients.map((ingredient, idx) => (
                <View key={idx} style={styles.triggerItem}>
                  <View style={[styles.triggerDot, { backgroundColor: levelColor }]} />
                  <Text style={styles.triggerText}>{ingredient}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Educational note */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.infoText}>
            FODMAPs are fermentable carbohydrates that can trigger digestive symptoms in people with IBS.
          </Text>
        </View>
      </View>
    </InsightAccordionCard>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: SPACING.md,
  },
  explanation: {
    ...TYPOGRAPHY.body,
  },
  triggersSection: {
    gap: SPACING.sm,
  },
  triggersLabel: {
    ...TYPOGRAPHY.secondary,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  triggersList: {
    gap: SPACING.xs,
  },
  triggerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  triggerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  triggerText: {
    ...TYPOGRAPHY.secondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.md,
    borderRadius: SPACING.sm,
    marginTop: SPACING.sm,
  },
  infoText: {
    ...TYPOGRAPHY.disclaimer,
    flex: 1,
    fontStyle: 'italic',
  },
});

export default FodmapCard;
