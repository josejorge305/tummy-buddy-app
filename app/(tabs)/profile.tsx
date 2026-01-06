import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useUserPrefs } from '../../context/UserPrefsContext';
import { useDisclaimer } from '../../context/DisclaimerContext';
import { COLORS, SPACING, RADIUS, FONT_SIZES } from '../../components/tracker/utils/colors';

// Design System
const TEAL = '#2DD4BF';
const TEAL_DARK = '#14B8A6';
const BG_DARK = '#0a0f14';
const CARD_BG = 'rgba(30, 41, 59, 0.6)';
const BORDER_COLOR = 'rgba(71, 85, 105, 0.3)';

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { key: 'light', label: 'Light', desc: '1-3 days/week' },
  { key: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { key: 'active', label: 'Active', desc: '6-7 days/week' },
  { key: 'very_active', label: 'Very Active', desc: 'Athlete level' },
];

const GOALS = [
  { key: 'lose_weight', label: 'Lose Weight', icon: '↘' },
  { key: 'maintain', label: 'Maintain', icon: '―' },
  { key: 'build_muscle', label: 'Build Muscle', icon: '↗' },
  { key: 'gut_health', label: 'Gut Health', icon: '◐' },
  { key: 'reduce_inflammation', label: 'Reduce Inflammation', icon: '❋' },
];

const ORGANS = [
  { code: 'gut', label: 'Gut', color: '#2DD4BF' },
  { code: 'heart', label: 'Heart', color: '#F472B6' },
  { code: 'liver', label: 'Liver', color: '#A78BFA' },
  { code: 'brain', label: 'Brain', color: '#60A5FA' },
  { code: 'kidney', label: 'Kidney', color: '#FBBF24' },
  { code: 'immune', label: 'Immune', color: '#34D399' },
  { code: 'metabolic', label: 'Metabolic', color: '#FB923C' },
  { code: 'eyes', label: 'Eyes', color: '#818CF8' },
  { code: 'skin', label: 'Skin', color: '#F9A8D4' },
  { code: 'bones', label: 'Bones', color: '#CBD5E1' },
  { code: 'thyroid', label: 'Thyroid', color: '#22D3EE' },
];

const SECTIONS = [
  { id: 'metrics', label: 'Body', icon: 'body-outline' },
  { id: 'goals', label: 'Goals', icon: 'flag-outline' },
  { id: 'health', label: 'Health', icon: 'medical-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
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
  const router = useRouter();

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
  } = useUserPrefs();

  const {
    hasAcknowledgedOnboarding,
    onboardingTimestamp,
    hasAcknowledgedHealthCoach,
    healthCoachTimestamp,
    resetAllAcknowledgments,
  } = useDisclaimer();

  // UI state
  const [activeSection, setActiveSection] = useState('metrics');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['maintain']);
  const [selectedAllergenCodes, setSelectedAllergenCodes] = useState<string[]>([]);
  const [selectedOrganCodes, setSelectedOrganCodes] = useState<string[]>(['gut', 'heart']);
  const [isPro, setIsPro] = useState(false);

  // Initialize form from profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUnitSystem(profile.unit_system || 'imperial');
      setSex(profile.biological_sex || null);
      setActivityLevel(profile.activity_level || 'moderate');

      if (profile.goals && Array.isArray(profile.goals) && profile.goals.length > 0) {
        setSelectedGoals(profile.goals);
      } else if (profile.primary_goal) {
        setSelectedGoals([profile.primary_goal]);
      }

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

  useEffect(() => {
    setSelectedAllergenCodes(allergens.map(a => a.allergen_code));
  }, [allergens]);

  useEffect(() => {
    const starred = organPriorities.filter(o => o.is_starred).map(o => o.organ_code);
    if (starred.length > 0) {
      setSelectedOrganCodes(starred);
    }
  }, [organPriorities]);

  // Calculate age from birth year
  const calculateAge = () => {
    if (!birthYear) return null;
    const year = parseInt(birthYear);
    if (isNaN(year)) return null;
    return new Date().getFullYear() - year;
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!displayName) return 'U';
    const parts = displayName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  };

  // Format height display
  const getHeightDisplay = () => {
    if (unitSystem === 'metric') {
      return heightCm ? `${heightCm} cm` : '--';
    }
    if (heightFeet || heightInches) {
      return `${heightFeet || 0}'${heightInches || 0}"`;
    }
    return '--';
  };

  // Format weight display
  const getWeightDisplay = () => {
    if (!weight) return '--';
    return unitSystem === 'metric' ? `${weight} kg` : `${weight} lbs`;
  };

  const toggleAllergen = async (code: string) => {
    const newCodes = selectedAllergenCodes.includes(code)
      ? selectedAllergenCodes.filter(c => c !== code)
      : [...selectedAllergenCodes, code];

    setSelectedAllergenCodes(newCodes);
    const allergenData = newCodes.map(c => ({ allergen_code: c, severity: 'avoid' as const }));
    await saveAllergens(allergenData);
  };

  const toggleOrgan = async (code: string) => {
    const newCodes = selectedOrganCodes.includes(code)
      ? selectedOrganCodes.filter(c => c !== code)
      : [...selectedOrganCodes, code];

    setSelectedOrganCodes(newCodes);
    const organData = newCodes.map((c, idx) => ({
      organ_code: c,
      priority_rank: idx + 1,
      is_starred: true,
    }));
    await saveOrganPriorities(organData);
  };

  const toggleGoal = (key: string) => {
    if (selectedGoals.includes(key)) {
      if (selectedGoals.length > 1) {
        setSelectedGoals(selectedGoals.filter(g => g !== key));
      }
    } else {
      setSelectedGoals([...selectedGoals, key]);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);

    try {
      const profileData: any = {
        display_name: displayName || null,
        biological_sex: sex,
        activity_level: activityLevel,
        goals: selectedGoals,
        unit_system: unitSystem,
      };

      if (birthYear) {
        profileData.date_of_birth = `${birthYear}-01-01`;
      }

      if (unitSystem === 'metric' && heightCm) {
        profileData.height_cm = parseFloat(heightCm);
      } else if (heightFeet || heightInches) {
        const feet = parseInt(heightFeet) || 0;
        const inches = parseInt(heightInches) || 0;
        profileData.height_cm = feetInchesToCm(feet, inches);
      }

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

  const handleResetDisclosures = () => {
    Alert.alert(
      'Reset Disclosures',
      'This will reset all legal acknowledgments. You will see the welcome modal and other disclosures again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllAcknowledgments();
            Alert.alert('Done', 'All disclosures have been reset.');
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'Not acknowledged';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group allergen definitions by category
  const fdaAllergens = allergenDefinitions.filter(a => a.category === 'fda_top_9');
  const digestiveAllergens = allergenDefinitions.filter(a => a.category === 'digestive');
  const conditionAllergens = allergenDefinitions.filter(a => a.category === 'condition');

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient glow effect */}
      <View style={styles.ambientGlow} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profile</Text>
          {targets?.calories && (
            <LinearGradient
              colors={[TEAL, TEAL_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.caloriesBadge}
            >
              <Text style={styles.caloriesBadgeText}>{targets.calories} cal/day</Text>
            </LinearGradient>
          )}
        </View>
        <Text style={styles.subtitle}>Personalize your nutrition targets</Text>
      </View>

      {/* Section Navigation */}
      <View style={styles.sectionNav}>
        {SECTIONS.map(section => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.sectionTab,
              activeSection === section.id && styles.sectionTabActive,
            ]}
            onPress={() => setActiveSection(section.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={section.icon as any}
              size={18}
              color={activeSection === section.id ? TEAL : '#94A3B8'}
              style={styles.sectionIcon}
            />
            <Text
              style={[
                styles.sectionLabel,
                activeSection === section.id && styles.sectionLabelActive,
              ]}
            >
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BODY METRICS SECTION */}
        {activeSection === 'metrics' && (
          <View style={styles.sectionContent}>
            {/* Profile Card */}
            <View style={styles.card}>
              <View style={styles.profileHeader}>
                <LinearGradient
                  colors={[TEAL, TEAL_DARK]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </LinearGradient>
                <View style={styles.profileInfo}>
                  <TextInput
                    style={styles.nameInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your name"
                    placeholderTextColor="#64748B"
                  />
                  <Text style={styles.profileMeta}>
                    {calculateAge() ? `${calculateAge()} years old` : 'Age not set'}
                    {sex ? ` • ${sex === 'male' ? 'Male' : 'Female'}` : ''}
                  </Text>
                </View>
              </View>

              {/* Unit Toggle */}
              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    unitSystem === 'imperial' && styles.unitButtonActive,
                  ]}
                  onPress={() => setUnitSystem('imperial')}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      unitSystem === 'imperial' && styles.unitButtonTextActive,
                    ]}
                  >
                    Imperial (lbs, ft)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    unitSystem === 'metric' && styles.unitButtonActive,
                  ]}
                  onPress={() => setUnitSystem('metric')}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      unitSystem === 'metric' && styles.unitButtonTextActive,
                    ]}
                  >
                    Metric (kg, cm)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>↕</Text>
                  <Text style={styles.statValue}>{getHeightDisplay()}</Text>
                  <Text style={styles.statLabel}>HEIGHT</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>⚖</Text>
                  <Text style={styles.statValue}>{getWeightDisplay()}</Text>
                  <Text style={styles.statLabel}>WEIGHT</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>◉</Text>
                  <Text style={styles.statValue}>{birthYear || '--'}</Text>
                  <Text style={styles.statLabel}>BIRTH YEAR</Text>
                </View>
              </View>

              {/* Edit Fields */}
              <View style={styles.editFields}>
                {/* Sex Selection */}
                <Text style={styles.fieldLabel}>Biological Sex</Text>
                <View style={styles.sexButtons}>
                  <TouchableOpacity
                    style={[styles.sexButton, sex === 'male' && styles.sexButtonActive]}
                    onPress={() => setSex('male')}
                  >
                    <Ionicons
                      name="male"
                      size={16}
                      color={sex === 'male' ? BG_DARK : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.sexButtonText,
                        sex === 'male' && styles.sexButtonTextActive,
                      ]}
                    >
                      Male
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sexButton, sex === 'female' && styles.sexButtonActive]}
                    onPress={() => setSex('female')}
                  >
                    <Ionicons
                      name="female"
                      size={16}
                      color={sex === 'female' ? BG_DARK : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.sexButtonText,
                        sex === 'female' && styles.sexButtonTextActive,
                      ]}
                    >
                      Female
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Birth Year */}
                <Text style={styles.fieldLabel}>Birth Year</Text>
                <TextInput
                  style={styles.input}
                  value={birthYear}
                  onChangeText={setBirthYear}
                  placeholder="1990"
                  placeholderTextColor="#64748B"
                  keyboardType="number-pad"
                  maxLength={4}
                />

                {/* Height */}
                <Text style={styles.fieldLabel}>Height</Text>
                {unitSystem === 'metric' ? (
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, styles.inputFlex]}
                      value={heightCm}
                      onChangeText={setHeightCm}
                      placeholder="175"
                      placeholderTextColor="#64748B"
                      keyboardType="number-pad"
                    />
                    <Text style={styles.inputUnit}>cm</Text>
                  </View>
                ) : (
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, styles.inputFlex]}
                      value={heightFeet}
                      onChangeText={setHeightFeet}
                      placeholder="5"
                      placeholderTextColor="#64748B"
                      keyboardType="number-pad"
                    />
                    <Text style={styles.inputUnit}>ft</Text>
                    <TextInput
                      style={[styles.input, styles.inputFlex, { marginLeft: 8 }]}
                      value={heightInches}
                      onChangeText={setHeightInches}
                      placeholder="10"
                      placeholderTextColor="#64748B"
                      keyboardType="number-pad"
                    />
                    <Text style={styles.inputUnit}>in</Text>
                  </View>
                )}

                {/* Weight */}
                <Text style={styles.fieldLabel}>Weight</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    value={weight}
                    onChangeText={setWeight}
                    placeholder={unitSystem === 'metric' ? '70' : '155'}
                    placeholderTextColor="#64748B"
                    keyboardType="number-pad"
                  />
                  <Text style={styles.inputUnit}>
                    {unitSystem === 'metric' ? 'kg' : 'lbs'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Activity Level */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ACTIVITY LEVEL</Text>
              <View style={styles.activityList}>
                {ACTIVITY_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level.key}
                    style={[
                      styles.activityItem,
                      activityLevel === level.key && styles.activityItemActive,
                    ]}
                    onPress={() => setActivityLevel(level.key)}
                  >
                    <Text
                      style={[
                        styles.activityLabel,
                        activityLevel === level.key && styles.activityLabelActive,
                      ]}
                    >
                      {level.label}
                    </Text>
                    <Text style={styles.activityDesc}>{level.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* GOALS SECTION */}
        {activeSection === 'goals' && (
          <View style={styles.sectionContent}>
            {/* Daily Targets */}
            {targets && (
              <View style={[styles.card, styles.targetsCard]}>
                <Text style={styles.cardTitle}>YOUR DAILY TARGETS</Text>
                <View style={styles.macrosGrid}>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, { color: TEAL }]}>
                      {targets.calories || '--'}
                    </Text>
                    <Text style={styles.macroLabel}>CALORIES</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, { color: '#F472B6' }]}>
                      {targets.protein_g || '--'}g
                    </Text>
                    <Text style={styles.macroLabel}>PROTEIN</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, { color: '#FBBF24' }]}>
                      {targets.carbs_g || '--'}g
                    </Text>
                    <Text style={styles.macroLabel}>CARBS</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, { color: '#A78BFA' }]}>
                      {targets.fat_g || '--'}g
                    </Text>
                    <Text style={styles.macroLabel}>FAT</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Goals Selection */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>GOALS</Text>
              <Text style={styles.cardSubtitle}>
                Select all that apply — targets will be optimized
              </Text>
              <View style={styles.goalsGrid}>
                {GOALS.map(goal => (
                  <TouchableOpacity
                    key={goal.key}
                    style={[
                      styles.goalButton,
                      selectedGoals.includes(goal.key) && styles.goalButtonActive,
                    ]}
                    onPress={() => toggleGoal(goal.key)}
                  >
                    <Text
                      style={[
                        styles.goalIcon,
                        selectedGoals.includes(goal.key) && styles.goalIconActive,
                      ]}
                    >
                      {goal.icon}
                    </Text>
                    <Text
                      style={[
                        styles.goalLabel,
                        selectedGoals.includes(goal.key) && styles.goalLabelActive,
                      ]}
                    >
                      {goal.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Organ Priorities */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ORGAN PRIORITIES</Text>
              <Text style={styles.cardSubtitle}>
                Starred organs are highlighted in dish scores
              </Text>
              <View style={styles.organsWrap}>
                {ORGANS.map(organ => {
                  const selected = selectedOrganCodes.includes(organ.code);
                  return (
                    <TouchableOpacity
                      key={organ.code}
                      style={[
                        styles.organPill,
                        selected && {
                          backgroundColor: `${organ.color}25`,
                          borderColor: `${organ.color}60`,
                        },
                      ]}
                      onPress={() => toggleOrgan(organ.code)}
                    >
                      <Text style={{ color: selected ? organ.color : '#64748B', fontSize: 12 }}>
                        {selected ? '★' : '☆'}
                      </Text>
                      <Text
                        style={[
                          styles.organLabel,
                          selected && { color: organ.color },
                        ]}
                      >
                        {organ.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* HEALTH SECTION */}
        {activeSection === 'health' && (
          <View style={styles.sectionContent}>
            {/* Dietary Restrictions - FDA Top 9 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>DIETARY RESTRICTIONS</Text>
              <Text style={styles.cardSubtitle}>FDA Top 9 Allergens</Text>
              <View style={styles.pillsWrap}>
                {fdaAllergens.map(allergen => {
                  const selected = selectedAllergenCodes.includes(allergen.allergen_code);
                  return (
                    <TouchableOpacity
                      key={allergen.allergen_code}
                      style={[styles.allergenPill, selected && styles.allergenPillActive]}
                      onPress={() => toggleAllergen(allergen.allergen_code)}
                    >
                      <Text
                        style={[
                          styles.allergenPillText,
                          selected && styles.allergenPillTextActive,
                        ]}
                      >
                        {allergen.display_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Digestive Sensitivities */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>DIGESTIVE SENSITIVITIES</Text>
              <View style={styles.pillsWrap}>
                {digestiveAllergens.map(allergen => {
                  const selected = selectedAllergenCodes.includes(allergen.allergen_code);
                  return (
                    <TouchableOpacity
                      key={allergen.allergen_code}
                      style={[styles.allergenPill, selected && styles.allergenPillActive]}
                      onPress={() => toggleAllergen(allergen.allergen_code)}
                    >
                      <Text
                        style={[
                          styles.allergenPillText,
                          selected && styles.allergenPillTextActive,
                        ]}
                      >
                        {allergen.display_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Health Conditions */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>HEALTH CONDITIONS</Text>
              <Text style={styles.cardSubtitle}>
                Adjusts your nutrition limits automatically
              </Text>
              <View style={styles.pillsWrap}>
                {conditionAllergens.map(allergen => {
                  const selected = selectedAllergenCodes.includes(allergen.allergen_code);
                  return (
                    <TouchableOpacity
                      key={allergen.allergen_code}
                      style={[
                        styles.conditionPill,
                        selected && styles.conditionPillActive,
                      ]}
                      onPress={() => toggleAllergen(allergen.allergen_code)}
                    >
                      <Text
                        style={[
                          styles.conditionPillText,
                          selected && styles.conditionPillTextActive,
                        ]}
                      >
                        {allergen.display_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* SETTINGS SECTION */}
        {activeSection === 'settings' && (
          <View style={styles.sectionContent}>
            {/* Subscription */}
            <View style={[styles.card, styles.subscriptionCard]}>
              <View style={styles.subscriptionHeader}>
                <View>
                  <Text style={styles.subscriptionTitle}>Pro Membership</Text>
                  <Text style={styles.subscriptionDesc}>
                    Unlock personalized targets & trends
                  </Text>
                </View>
                <View
                  style={[
                    styles.subscriptionBadge,
                    isPro && styles.subscriptionBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.subscriptionBadgeText,
                      isPro && styles.subscriptionBadgeTextActive,
                    ]}
                  >
                    {isPro ? 'Active' : 'Free'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.8}>
                <LinearGradient
                  colors={[TEAL, TEAL_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.upgradeButton}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.billingText}>Manage billing (coming soon)</Text>
            </View>

            {/* Legal */}
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/terms')}
              >
                <View style={styles.menuItemLeft}>
                  <Text style={styles.menuIcon}>📄</Text>
                  <Text style={styles.menuItemText}>Terms of Service</Text>
                </View>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/privacy-policy')}
              >
                <View style={styles.menuItemLeft}>
                  <Text style={styles.menuIcon}>🔒</Text>
                  <Text style={styles.menuItemText}>Privacy Policy</Text>
                </View>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Acknowledgment Status */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ACKNOWLEDGMENT STATUS</Text>
              <View style={styles.acknowledgmentList}>
                <View style={styles.acknowledgmentItem}>
                  <View style={styles.acknowledgmentLeft}>
                    <View
                      style={[
                        styles.acknowledgmentCheck,
                        hasAcknowledgedOnboarding && styles.acknowledgmentCheckActive,
                      ]}
                    >
                      {hasAcknowledgedOnboarding && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.acknowledgmentLabel}>Welcome Terms</Text>
                  </View>
                  <Text style={styles.acknowledgmentDate}>
                    {formatDate(onboardingTimestamp)}
                  </Text>
                </View>
                <View style={styles.acknowledgmentItem}>
                  <View style={styles.acknowledgmentLeft}>
                    <View
                      style={[
                        styles.acknowledgmentCheck,
                        hasAcknowledgedHealthCoach && styles.acknowledgmentCheckActive,
                      ]}
                    >
                      {hasAcknowledgedHealthCoach && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.acknowledgmentLabel}>
                      Health Coach Disclaimer
                    </Text>
                  </View>
                  <Text style={styles.acknowledgmentDate}>
                    {formatDate(healthCoachTimestamp)}
                  </Text>
                </View>
              </View>
              <Text style={styles.versionText}>Disclaimer Version: 1.0</Text>
            </View>

            {/* Reset */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetDisclosures}
              activeOpacity={0.7}
            >
              <Text style={styles.resetIcon}>↺</Text>
              <Text style={styles.resetText}>Reset All Disclosures</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacer for save button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveChanges}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[TEAL, TEAL_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            {isSaving ? (
              <ActivityIndicator color={BG_DARK} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

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
    backgroundColor: BG_DARK,
  },
  ambientGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    backgroundColor: 'transparent',
    borderRadius: 150,
    opacity: 0.08,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 150,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#E2E8F0',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  caloriesBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  caloriesBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: BG_DARK,
  },
  sectionNav: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    gap: 4,
  },
  sectionTabActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderColor: 'rgba(45, 212, 191, 0.4)',
  },
  sectionIcon: {
    opacity: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabelActive: {
    color: TEAL,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionContent: {
    gap: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -8,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: BG_DARK,
  },
  profileInfo: {
    flex: 1,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 4,
    padding: 0,
  },
  profileMeta: {
    fontSize: 13,
    color: '#64748B',
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  unitButtonActive: {
    backgroundColor: TEAL,
  },
  unitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  unitButtonTextActive: {
    color: BG_DARK,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 6,
    opacity: 0.6,
    color: '#E2E8F0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editFields: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#E2E8F0',
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputFlex: {
    flex: 1,
  },
  inputUnit: {
    color: '#64748B',
    fontSize: 14,
    marginLeft: 8,
    minWidth: 24,
  },
  sexButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  sexButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  sexButtonActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  sexButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  sexButtonTextActive: {
    color: BG_DARK,
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activityItemActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderColor: 'rgba(45, 212, 191, 0.5)',
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  activityLabelActive: {
    color: TEAL,
  },
  activityDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  targetsCard: {
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderColor: 'rgba(45, 212, 191, 0.2)',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 12,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
    width: '48%',
  },
  goalButtonActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.2)',
    borderColor: 'rgba(45, 212, 191, 0.5)',
  },
  goalIcon: {
    fontSize: 18,
    opacity: 0.4,
    color: '#E2E8F0',
  },
  goalIconActive: {
    opacity: 1,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  goalLabelActive: {
    color: TEAL,
  },
  organsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  organPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  organLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  allergenPillActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.2)',
    borderColor: 'rgba(45, 212, 191, 0.5)',
  },
  allergenPillText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  allergenPillTextActive: {
    color: TEAL,
    fontWeight: '500',
  },
  conditionPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  conditionPillActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  conditionPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  conditionPillTextActive: {
    color: '#FBBF24',
  },
  subscriptionCard: {
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    borderColor: 'rgba(45, 212, 191, 0.2)',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  subscriptionDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  subscriptionBadge: {
    backgroundColor: 'rgba(71, 85, 105, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  subscriptionBadgeActive: {
    backgroundColor: TEAL,
  },
  subscriptionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  subscriptionBadgeTextActive: {
    color: BG_DARK,
  },
  upgradeButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BG_DARK,
  },
  billingText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    fontSize: 16,
  },
  menuItemText: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  menuChevron: {
    fontSize: 20,
    color: '#64748B',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(71, 85, 105, 0.2)',
  },
  acknowledgmentList: {
    gap: 12,
    marginBottom: 16,
  },
  acknowledgmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  acknowledgmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  acknowledgmentCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(71, 85, 105, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acknowledgmentCheckActive: {
    backgroundColor: TEAL,
  },
  checkmark: {
    fontSize: 10,
    color: BG_DARK,
    fontWeight: '700',
  },
  acknowledgmentLabel: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  acknowledgmentDate: {
    fontSize: 12,
    color: '#64748B',
  },
  versionText: {
    fontSize: 11,
    color: '#475569',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resetIcon: {
    fontSize: 16,
    color: '#EF4444',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BG_DARK,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
