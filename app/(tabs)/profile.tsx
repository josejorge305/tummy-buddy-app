import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// App-wide theme color
const TEAL = '#14b8a6';
import { useUserPrefs } from '../../context/UserPrefsContext';

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { key: 'light', label: 'Light', desc: '1-3 days/week' },
  { key: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { key: 'active', label: 'Active', desc: '6-7 days/week' },
  { key: 'very_active', label: 'Very Active', desc: 'Athlete level' },
];

const GOALS = [
  { key: 'lose_weight', label: 'Lose Weight', icon: 'trending-down' },
  { key: 'maintain', label: 'Maintain', icon: 'remove' },
  { key: 'build_muscle', label: 'Build Muscle', icon: 'barbell' },
  { key: 'gut_health', label: 'Gut Health', icon: 'fitness' },
  { key: 'reduce_inflammation', label: 'Reduce Inflammation', icon: 'leaf' },
];

const ORGAN_PILLS = [
  { code: 'gut', label: 'Gut' },
  { code: 'heart', label: 'Heart' },
  { code: 'liver', label: 'Liver' },
  { code: 'brain', label: 'Brain' },
  { code: 'kidney', label: 'Kidney' },
  { code: 'immune', label: 'Immune' },
];

// Unit conversion helpers
const kgToLbs = (kg: number) => Math.round(kg * 2.20462);
const lbsToKg = (lbs: number) => lbs / 2.20462;
const cmToFeetInches = (cm: number) => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};
const feetInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * 2.54;

export default function ProfileScreen() {
  const {
    profile,
    targets,
    allergens,
    organPriorities,
    allergenDefinitions,
    isProfileLoading,
    saveProfile,
    saveAllergens,
    saveOrganPriorities,
    updateWeight,
  } = useUserPrefs();

  // Local form state
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [primaryGoal, setPrimaryGoal] = useState('maintain');
  const [selectedAllergenCodes, setSelectedAllergenCodes] = useState<string[]>([]);
  const [selectedOrganCodes, setSelectedOrganCodes] = useState<string[]>(['gut', 'heart']);
  const [isPro, setIsPro] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form from profile
  useEffect(() => {
    if (profile) {
      setUnitSystem(profile.unit_system || 'imperial');
      setSex(profile.biological_sex || null);
      setActivityLevel(profile.activity_level || 'moderate');
      setPrimaryGoal(profile.primary_goal || 'maintain');

      if (profile.date_of_birth) {
        const year = profile.date_of_birth.split('-')[0];
        setBirthYear(year);
      }

      if (profile.height_cm) {
        if (profile.unit_system === 'metric') {
          setHeightCm(String(Math.round(profile.height_cm)));
        } else {
          const { feet, inches } = cmToFeetInches(profile.height_cm);
          setHeightFeet(String(feet));
          setHeightInches(String(inches));
        }
      }

      if (profile.current_weight_kg) {
        if (profile.unit_system === 'metric') {
          setWeight(String(Math.round(profile.current_weight_kg)));
        } else {
          setWeight(String(kgToLbs(profile.current_weight_kg)));
        }
      }
    }
  }, [profile]);

  // Initialize allergens from context
  useEffect(() => {
    setSelectedAllergenCodes(allergens.map(a => a.allergen_code));
  }, [allergens]);

  // Initialize organ priorities from context
  useEffect(() => {
    const starred = organPriorities.filter(o => o.is_starred).map(o => o.organ_code);
    if (starred.length > 0) {
      setSelectedOrganCodes(starred);
    }
  }, [organPriorities]);

  const toggleAllergen = async (code: string) => {
    const newCodes = selectedAllergenCodes.includes(code)
      ? selectedAllergenCodes.filter(c => c !== code)
      : [...selectedAllergenCodes, code];

    setSelectedAllergenCodes(newCodes);

    // Save to backend
    const allergenData = newCodes.map(c => ({ allergen_code: c, severity: 'avoid' as const }));
    await saveAllergens(allergenData);
  };

  const toggleOrgan = async (code: string) => {
    const newCodes = selectedOrganCodes.includes(code)
      ? selectedOrganCodes.filter(c => c !== code)
      : [...selectedOrganCodes, code];

    setSelectedOrganCodes(newCodes);

    // Save to backend
    const organData = newCodes.map((c, idx) => ({
      organ_code: c,
      priority_rank: idx + 1,
      is_starred: true,
    }));
    await saveOrganPriorities(organData);
  };

  const handleSaveBodyMetrics = async () => {
    setIsSaving(true);

    try {
      // Build profile data
      const profileData: any = {
        biological_sex: sex,
        activity_level: activityLevel,
        primary_goal: primaryGoal,
        unit_system: unitSystem,
      };

      // Date of birth
      if (birthYear) {
        profileData.date_of_birth = `${birthYear}-01-01`;
      }

      // Height
      if (unitSystem === 'metric' && heightCm) {
        profileData.height_cm = parseFloat(heightCm);
      } else if (heightFeet || heightInches) {
        const feet = parseInt(heightFeet) || 0;
        const inches = parseInt(heightInches) || 0;
        profileData.height_cm = feetInchesToCm(feet, inches);
      }

      // Weight
      if (weight) {
        const weightNum = parseFloat(weight);
        if (unitSystem === 'metric') {
          profileData.current_weight_kg = weightNum;
        } else {
          profileData.current_weight_kg = lbsToKg(weightNum);
        }
      }

      const success = await saveProfile(profileData);

      if (success) {
        Alert.alert('Saved', 'Your profile has been updated!');
      } else {
        Alert.alert('Error', 'Failed to save profile. Please try again.');
      }
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Group allergen definitions by category
  const fdaAllergens = allergenDefinitions.filter(a => a.category === 'fda_top_9');
  const digestiveAllergens = allergenDefinitions.filter(a => a.category === 'digestive');
  const conditionAllergens = allergenDefinitions.filter(a => a.category === 'condition');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>
        Personalize your nutrition targets and health scoring.
      </Text>

      {/* Body Metrics Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Body Metrics</Text>
          {targets?.calories_target && (
            <View style={styles.targetBadge}>
              <Text style={styles.targetBadgeText}>{targets.calories_target} cal/day</Text>
            </View>
          )}
        </View>

        {/* Unit Toggle */}
        <View style={styles.unitToggle}>
          <TouchableOpacity
            style={[styles.unitButton, unitSystem === 'imperial' && styles.unitButtonActive]}
            onPress={() => setUnitSystem('imperial')}
          >
            <Text style={[styles.unitButtonText, unitSystem === 'imperial' && styles.unitButtonTextActive]}>
              Imperial (lbs, ft)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitButton, unitSystem === 'metric' && styles.unitButtonActive]}
            onPress={() => setUnitSystem('metric')}
          >
            <Text style={[styles.unitButtonText, unitSystem === 'metric' && styles.unitButtonTextActive]}>
              Metric (kg, cm)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sex Selection */}
        <Text style={styles.fieldLabel}>Biological Sex</Text>
        <View style={styles.rowButtons}>
          <TouchableOpacity
            style={[styles.selectButton, sex === 'male' && styles.selectButtonActive]}
            onPress={() => setSex('male')}
          >
            <Ionicons name="male" size={18} color={sex === 'male' ? '#0b0b0f' : '#ccc'} />
            <Text style={[styles.selectButtonText, sex === 'male' && styles.selectButtonTextActive]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectButton, sex === 'female' && styles.selectButtonActive]}
            onPress={() => setSex('female')}
          >
            <Ionicons name="female" size={18} color={sex === 'female' ? '#0b0b0f' : '#ccc'} />
            <Text style={[styles.selectButtonText, sex === 'female' && styles.selectButtonTextActive]}>Female</Text>
          </TouchableOpacity>
        </View>

        {/* Birth Year */}
        <Text style={styles.fieldLabel}>Birth Year</Text>
        <TextInput
          style={styles.input}
          value={birthYear}
          onChangeText={setBirthYear}
          placeholder="1990"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          maxLength={4}
        />

        {/* Height */}
        <Text style={styles.fieldLabel}>Height</Text>
        {unitSystem === 'metric' ? (
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={heightCm}
              onChangeText={setHeightCm}
              placeholder="175"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />
            <Text style={styles.inputUnit}>cm</Text>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={heightFeet}
              onChangeText={setHeightFeet}
              placeholder="5"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />
            <Text style={styles.inputUnit}>ft</Text>
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              value={heightInches}
              onChangeText={setHeightInches}
              placeholder="10"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />
            <Text style={styles.inputUnit}>in</Text>
          </View>
        )}

        {/* Weight */}
        <Text style={styles.fieldLabel}>Weight</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={weight}
            onChangeText={setWeight}
            placeholder={unitSystem === 'metric' ? '70' : '155'}
            placeholderTextColor="#666"
            keyboardType="number-pad"
          />
          <Text style={styles.inputUnit}>{unitSystem === 'metric' ? 'kg' : 'lbs'}</Text>
        </View>

        {/* Activity Level */}
        <Text style={styles.fieldLabel}>Activity Level</Text>
        <View style={styles.activityGrid}>
          {ACTIVITY_LEVELS.map(level => (
            <TouchableOpacity
              key={level.key}
              style={[styles.activityButton, activityLevel === level.key && styles.activityButtonActive]}
              onPress={() => setActivityLevel(level.key)}
            >
              <Text style={[styles.activityLabel, activityLevel === level.key && styles.activityLabelActive]}>
                {level.label}
              </Text>
              <Text style={[styles.activityDesc, activityLevel === level.key && styles.activityDescActive]}>
                {level.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Primary Goal */}
        <Text style={styles.fieldLabel}>Primary Goal</Text>
        <View style={styles.goalsGrid}>
          {GOALS.map(goal => (
            <TouchableOpacity
              key={goal.key}
              style={[styles.goalButton, primaryGoal === goal.key && styles.goalButtonActive]}
              onPress={() => setPrimaryGoal(goal.key)}
            >
              <Ionicons
                name={goal.icon as any}
                size={20}
                color={primaryGoal === goal.key ? '#0b0b0f' : '#ccc'}
              />
              <Text style={[styles.goalLabel, primaryGoal === goal.key && styles.goalLabelActive]}>
                {goal.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calculated Targets Display */}
        {targets && (
          <View style={styles.targetsDisplay}>
            <Text style={styles.targetsTitle}>Your Daily Targets</Text>
            <View style={styles.targetsRow}>
              <View style={styles.targetItem}>
                <Text style={styles.targetValue}>{targets.calories_target || '--'}</Text>
                <Text style={styles.targetLabel}>Calories</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={styles.targetValue}>{targets.protein_target_g || '--'}g</Text>
                <Text style={styles.targetLabel}>Protein</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={styles.targetValue}>{targets.carbs_target_g || '--'}g</Text>
                <Text style={styles.targetLabel}>Carbs</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={styles.targetValue}>{targets.fat_target_g || '--'}g</Text>
                <Text style={styles.targetLabel}>Fat</Text>
              </View>
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveBodyMetrics}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#0b0b0f" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Dietary Restrictions Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dietary Restrictions</Text>

        {/* FDA Top 9 Allergens */}
        <Text style={styles.subSectionTitle}>Major Allergens (FDA Top 9)</Text>
        <View style={styles.pillsRow}>
          {fdaAllergens.map(allergen => {
            const selected = selectedAllergenCodes.includes(allergen.allergen_code);
            return (
              <TouchableOpacity
                key={allergen.allergen_code}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => toggleAllergen(allergen.allergen_code)}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {allergen.display_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Digestive */}
        <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>Digestive Sensitivities</Text>
        <View style={styles.pillsRow}>
          {digestiveAllergens.map(allergen => {
            const selected = selectedAllergenCodes.includes(allergen.allergen_code);
            return (
              <TouchableOpacity
                key={allergen.allergen_code}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => toggleAllergen(allergen.allergen_code)}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {allergen.display_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Conditions */}
        <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>Health Conditions</Text>
        <Text style={styles.conditionHint}>
          Selecting these will adjust your nutrition limits automatically.
        </Text>
        <View style={styles.pillsRow}>
          {conditionAllergens.map(allergen => {
            const selected = selectedAllergenCodes.includes(allergen.allergen_code);
            return (
              <TouchableOpacity
                key={allergen.allergen_code}
                style={[styles.pill, selected && styles.pillCondition, selected && styles.pillSelected]}
                onPress={() => toggleAllergen(allergen.allergen_code)}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {allergen.display_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Organ Priorities Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Organ Priorities</Text>
        <Text style={styles.infoText}>
          Star the organs you want to focus on. These will be highlighted in dish scores.
        </Text>
        <View style={styles.pillsRow}>
          {ORGAN_PILLS.map(organ => {
            const selected = selectedOrganCodes.includes(organ.code);
            return (
              <TouchableOpacity
                key={organ.code}
                style={[styles.organPill, selected && styles.organPillSelected]}
                onPress={() => toggleOrgan(organ.code)}
              >
                <Ionicons
                  name={selected ? 'star' : 'star-outline'}
                  size={14}
                  color={selected ? '#0b0b0f' : '#888'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {organ.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Subscription Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoText}>
              Tummy Tracker Pro unlocks personalized targets, organ trends, and detailed insights.
            </Text>
          </View>
          <View style={styles.switchBlock}>
            <Text style={styles.switchLabel}>{isPro ? 'Pro' : 'Free'}</Text>
            <Switch
              value={isPro}
              onValueChange={setIsPro}
              thumbColor={isPro ? TEAL : '#888'}
              trackColor={{ false: '#333', true: 'rgba(20, 184, 166, 0.3)' }}
            />
          </View>
        </View>
        <Text style={styles.linkText}>Manage billing (coming soon)</Text>
      </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isProfileLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={TEAL} size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fefefe',
  },
  targetBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  targetBadgeText: {
    color: TEAL,
    fontSize: 12,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ddd',
    marginTop: 10,
    marginBottom: 6,
  },
  conditionHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  unitToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1a1a22',
  },
  unitButtonActive: {
    backgroundColor: TEAL,
  },
  unitButtonText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  unitButtonTextActive: {
    color: '#0b0b0f',
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#aaa',
    marginBottom: 6,
    marginTop: 12,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  selectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1a1a22',
    gap: 6,
  },
  selectButtonActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  selectButtonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  selectButtonTextActive: {
    color: '#0b0b0f',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1a1a22',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fefefe',
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputUnit: {
    color: '#888',
    fontSize: 14,
    marginLeft: 8,
    minWidth: 24,
  },
  activityGrid: {
    gap: 8,
  },
  activityButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1a1a22',
  },
  activityButtonActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  activityLabel: {
    color: '#fefefe',
    fontSize: 14,
    fontWeight: '500',
  },
  activityLabelActive: {
    color: '#0b0b0f',
    fontWeight: '600',
  },
  activityDesc: {
    color: '#888',
    fontSize: 12,
  },
  activityDescActive: {
    color: '#0b0b0f99',
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1a1a22',
    gap: 6,
  },
  goalButtonActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  goalLabel: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  goalLabelActive: {
    color: '#0b0b0f',
    fontWeight: '600',
  },
  targetsDisplay: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#0b0b0f',
    borderRadius: 12,
  },
  targetsTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetItem: {
    alignItems: 'center',
  },
  targetValue: {
    color: TEAL,
    fontSize: 18,
    fontWeight: '700',
  },
  targetLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#0b0b0f',
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  pillCondition: {
    borderColor: '#f59e0b55',
  },
  pillText: {
    color: '#fefefe',
    fontSize: 13,
  },
  pillTextSelected: {
    color: '#0b0b0f',
    fontWeight: '600',
  },
  organPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 8,
    marginBottom: 8,
  },
  organPillSelected: {
    backgroundColor: TEAL,
    borderColor: TEAL,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
