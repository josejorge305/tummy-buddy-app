import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function TrackerScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tummy Tracker Pro</Text>
      <Text style={styles.subtitle}>
        Daily summary based on your logged meals and organ sensitivities.
      </Text>

      {/* Today summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today&apos;s overview</Text>
        <Text style={styles.bigScore}>74</Text>
        <Text style={styles.scoreLabel}>Average Tummy Barometer</Text>

        <View style={styles.row}>
          <View style={styles.chipBlock}>
            <Text style={styles.chipLabel}>Calories</Text>
            <Text style={styles.chipValue}>1,620 / 2,100</Text>
          </View>
          <View style={styles.chipBlock}>
            <Text style={styles.chipLabel}>Meals logged</Text>
            <Text style={styles.chipValue}>3</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.chipBlock}>
            <Text style={styles.chipLabel}>Gut</Text>
            <Text style={styles.chipValue}>Mostly stable</Text>
          </View>
          <View style={styles.chipBlock}>
            <Text style={styles.chipLabel}>Heart</Text>
            <Text style={styles.chipValue}>Safe choices</Text>
          </View>
        </View>
      </View>

      {/* Recent meals list */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent meals</Text>

        <View style={styles.mealRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mealName}>Mediterranean Salmon Bowl</Text>
            <Text style={styles.mealMeta}>Green Bowl Kitchen • 12:30 pm</Text>
          </View>
          <View style={styles.mealScoreBlock}>
            <Text style={styles.mealScore}>76</Text>
            <Text style={styles.mealScoreLabel}>Gut friendly</Text>
          </View>
        </View>

        <View style={styles.mealRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mealName}>Creamy Alfredo Pasta</Text>
            <Text style={styles.mealMeta}>Casa Firenze • Yesterday</Text>
          </View>
          <View style={styles.mealScoreBlock}>
            <Text style={styles.mealScoreBad}>42</Text>
            <Text style={styles.mealScoreLabel}>Dairy + FODMAP</Text>
          </View>
        </View>

        <Text style={styles.linkText}>View full meal log (coming soon)</Text>
      </View>

      {/* Organ trends stub */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Organ trends (7 days)</Text>
        <Text style={styles.infoText}>
          Simple graph-style summary will go here. For now, this is a placeholder
          to show where Gut / Heart / Liver trend charts will live.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  content: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fefefe',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#15151b',
    borderWidth: 1,
    borderColor: '#2a2a33',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fefefe',
    marginBottom: 8,
  },
  bigScore: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2ecc71',
  },
  scoreLabel: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipBlock: {
    width: '48%',
    marginBottom: 8,
  },
  chipLabel: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 2,
  },
  chipValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fefefe',
  },
  mealRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fefefe',
  },
  mealMeta: {
    fontSize: 12,
    color: '#888',
  },
  mealScoreBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: 80,
  },
  mealScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2ecc71',
  },
  mealScoreBad: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e74c3c',
  },
  mealScoreLabel: {
    fontSize: 11,
    color: '#aaa',
  },
  linkText: {
    fontSize: 12,
    color: '#3498db',
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#ccc',
  },
});
