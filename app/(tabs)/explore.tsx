import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Meal = {
  id: string;
  name: string;
  time: string;
  gut: number;
  heart: number;
};

type WeeklyPoint = {
  label: string;
  score: number;
};

type Pillar = {
  label: string;
  score: number;
};

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function CircleProgress({ percent, size = 56 }: { percent: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const ringColor =
    clamped >= 85 ? '#22c55e' : clamped >= 65 ? '#fbbf24' : clamped >= 45 ? '#f97316' : '#ef4444';

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ringColor,
        },
      ]}
    >
      <Text style={styles.circleText}>{clamped}</Text>
    </View>
  );
}

function BarChart({ data }: { data: WeeklyPoint[] }) {
  const max = Math.max(...data.map((d) => d.score), 100);
  return (
    <View style={styles.barChart}>
      {data.map((d) => {
        const heightPct = Math.max(8, (d.score / max) * 100);
        const barColor = d.score >= 80 ? '#22c55e' : d.score >= 60 ? '#fbbf24' : '#f97316';
        return (
          <View key={d.label} style={styles.barItem}>
            <View style={[styles.bar, { height: `${heightPct}%`, backgroundColor: barColor }]} />
            <Text style={styles.barLabel}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const mealsToday: Meal[] = [
  { id: '1', name: 'Mediterranean Salmon Bowl', time: '12:30 pm', gut: 9, heart: 8 },
  { id: '2', name: 'Overnight Oats + Berries', time: '8:00 am', gut: 8, heart: 9 },
  { id: '3', name: 'Roasted Veggie Wrap', time: '6:45 pm', gut: 7, heart: 7 },
];

const weeklyScores: WeeklyPoint[] = [
  { label: 'M', score: 72 },
  { label: 'T', score: 75 },
  { label: 'W', score: 78 },
  { label: 'T', score: 80 },
  { label: 'F', score: 82 },
  { label: 'S', score: 70 },
  { label: 'S', score: 76 },
];

const healthPillars: Pillar[] = [
  { label: 'Gut', score: 90 },
  { label: 'Heart', score: 70 },
  { label: 'Liver', score: 85 },
];

export default function TummyTracker() {
  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Tummy Tracker</Text>
            <Text style={styles.subtitle}>Daily check-in for your gut and organ health.</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PRO</Text>
          </View>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Today’s Overview</Text>
          <View style={styles.rowBetween}>
            <View style={styles.centered}>
              <Text style={styles.tummyScore}>74</Text>
              <Text style={styles.subtle}>Tummy Score</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.subtle}>Calories: 1,620 / 2,100</Text>
              <Text style={styles.subtle}>Meals: 3</Text>
              <Text style={styles.subtle}>Streak: 🔥 4 days</Text>
            </View>
          </View>
        </Card>

        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          {healthPillars.map((pillar) => (
            <View key={pillar.label} style={styles.centered}>
              <CircleProgress percent={pillar.score} />
              <Text style={[styles.subtle, { marginTop: 6 }]}>{pillar.label}</Text>
            </View>
          ))}
        </View>

        <Card style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>💡 Insight</Text>
          <Text style={[styles.subtle, { fontStyle: 'italic', marginTop: 4 }]}>
            High fiber lunch kept your gut score stable. Nice work!
          </Text>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Meals Today</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            {mealsToday.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealMeta}>
                    {meal.time} · Gut {meal.gut}/10 · Heart {meal.heart}/10
                  </Text>
                </View>
                <Text style={styles.mealTag}>✓ Gut friendly</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ marginTop: 16, marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <Text style={[styles.subtle, { marginTop: 4 }]}>Avg Tummy Score: 76 ↑ (+5)</Text>
          <BarChart data={weeklyScores} />
          <Text style={[styles.subtle, { marginTop: 8 }]}>
            ✔️ 5 gut-stable days · 🔥 4-day logging streak
          </Text>
        </Card>
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.9}>
        <Ionicons name="add" size={22} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 120,
    gap: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fefefe',
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#22c55e33',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  badgeText: {
    color: '#22c55e',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#111219',
    borderWidth: 1,
    borderColor: '#1f2230',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fefefe',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tummyScore: {
    fontSize: 40,
    fontWeight: '800',
    color: '#22c55e',
  },
  subtle: {
    color: '#e5e7eb',
    opacity: 0.7,
    fontSize: 13,
  },
  circle: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0f',
  },
  circleText: {
    color: '#fefefe',
    fontWeight: '700',
  },
  mealCard: {
    backgroundColor: '#1a1c25',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealName: {
    color: '#fefefe',
    fontWeight: '600',
    fontSize: 14,
  },
  mealMeta: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  mealTag: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 6,
    height: 120,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    borderRadius: 6,
    backgroundColor: '#22c55e',
  },
  barLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 6,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
