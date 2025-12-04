import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useUserPrefs } from '../../context/UserPrefsContext';

const ALLERGEN_PILLS = [
  'Gluten',
  'Dairy',
  'Eggs',
  'Soy',
  'Peanuts',
  'Tree nuts',
  'Shellfish',
  'Fish',
  'Sesame',
  'High FODMAP',
  'Onion',
  'Garlic',
  'Other',
];

const ORGAN_PILLS = ['Gut', 'Liver', 'Heart', 'Brain', 'Kidney', 'Immune'];

export default function ProfileScreen() {
  const { selectedAllergens, setSelectedAllergens } = useUserPrefs();
  const [selectedOrgans, setSelectedOrgans] = React.useState<string[]>(['Gut', 'Heart']);
  const [isPro, setIsPro] = React.useState(true);

  const toggleAllergen = (name: string) => {
    setSelectedAllergens((prev) => {
      const lower = prev.map((p) => p.toLowerCase());
      const exists = lower.includes(name.toLowerCase());
      if (exists) {
        return prev.filter((a) => a.toLowerCase() !== name.toLowerCase());
      }
      return [...prev, name];
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>
        Tell Tummy Buddy how to personalize restaurant and dish scores for you.
      </Text>

      {/* Personal section stub */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Basic info</Text>
        <Text style={styles.infoText}>Age, height, weight, and goals will go here.</Text>
        <Text style={styles.infoText}>
          For now this is a placeholder. Later this will connect to calorie and
          macro targets.
        </Text>
      </View>

      {/* Dietary restrictions */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dietary restrictions</Text>
        <Text style={styles.infoText}>
          These are the same as your Home screen filters. They drive allergen and
          FODMAP scoring across the app.
        </Text>

        <Text style={styles.subSectionTitle}>Allergens & FODMAP</Text>
        <View style={styles.pillsRow}>
          {ALLERGEN_PILLS.map((pill) => {
            const selected = selectedAllergens
              .map((a) => a.toLowerCase())
              .includes(pill.toLowerCase());
            return (
              <TouchableOpacity
                key={pill}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => toggleAllergen(pill)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selected && styles.pillTextSelected,
                  ]}
                >
                  {pill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>
          Organ sensitivities
        </Text>
        <View style={styles.pillsRow}>
          {ORGAN_PILLS.map((pill) => {
            const selected = selectedOrgans.includes(pill);
            return (
              <TouchableOpacity
                key={pill}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() =>
                  togglePill(pill, selectedOrgans, setSelectedOrgans)
                }
              >
                <Text
                  style={[
                    styles.pillText,
                    selected && styles.pillTextSelected,
                  ]}
                >
                  {pill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Subscription */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoText}>
              Tummy Tracker Pro unlocks organ trends, trigger discovery, and doctor
              reports.
            </Text>
          </View>
          <View style={styles.switchBlock}>
            <Text style={styles.switchLabel}>{isPro ? 'Pro' : 'Free'}</Text>
            <Switch
              value={isPro}
              onValueChange={setIsPro}
              thumbColor={isPro ? '#2ecc71' : '#888'}
            />
          </View>
        </View>
        <Text style={styles.linkText}>Manage billing (coming soon)</Text>
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
  infoText: {
    fontSize: 13,
    color: '#ccc',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ddd',
    marginTop: 10,
    marginBottom: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 8,
    marginBottom: 8,
  },
  pillSelected: {
    backgroundColor: '#2ecc71',
    borderColor: '#2ecc71',
  },
  pillText: {
    color: '#fefefe',
    fontSize: 13,
  },
  pillTextSelected: {
    color: '#0b0b0f',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginTop: 8,
  },
  switchBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  switchLabel: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 2,
  },
  linkText: {
    fontSize: 12,
    color: '#3498db',
    marginTop: 8,
  },
});
