import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AllergenFlag,
  FodmapFlag,
  LikelyIngredient,
  LikelyInstruction,
  LikelyRecipe,
  NutritionSummary,
} from '../api/api';

const BG = '#020617';
const CARD_BG = '#0f172a';
const TEAL = '#14b8a6';
const ORANGE = '#f97316';
const TEXT_PRIMARY = '#f8fafc';
const TEXT_SECONDARY = '#94a3b8';
const TEXT_MUTED = '#64748b';
const DIVIDER = '#1e293b';

// Cooking method display
const getCookingMethodDisplay = (method?: string | null): { icon: string; label: string } => {
  if (!method) return { icon: 'flame-outline', label: 'Prepared' };
  const m = method.toLowerCase();
  if (m.includes('grill')) return { icon: 'flame', label: 'Grilled' };
  if (m.includes('fry') || m.includes('fried')) return { icon: 'flame', label: 'Fried' };
  if (m.includes('bake') || m.includes('baked')) return { icon: 'cube-outline', label: 'Baked' };
  if (m.includes('steam')) return { icon: 'water-outline', label: 'Steamed' };
  if (m.includes('roast')) return { icon: 'flame', label: 'Roasted' };
  if (m.includes('boil')) return { icon: 'water', label: 'Boiled' };
  if (m.includes('raw')) return { icon: 'leaf-outline', label: 'Raw' };
  if (m.includes('sauté') || m.includes('saute')) return { icon: 'flame', label: 'Sautéed' };
  return { icon: 'restaurant-outline', label: method.charAt(0).toUpperCase() + method.slice(1) };
};

// Format ingredient for cookbook display
const formatIngredient = (ing: LikelyIngredient): string => {
  const parts: string[] = [];

  if (ing.quantity) {
    parts.push(String(ing.quantity));
  }
  if (ing.unit) {
    parts.push(ing.unit);
  }
  parts.push(ing.name || 'Unknown');

  return parts.join(' ');
};

export default function LikelyRecipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Collapsible state
  const [nutritionExpanded, setNutritionExpanded] = useState(false);
  const [allergensExpanded, setAllergensExpanded] = useState(false);
  const [fodmapExpanded, setFodmapExpanded] = useState(false);

  // Parse the data passed via params
  const dishName = params.dishName as string | undefined;
  const imageUrl = params.imageUrl as string | undefined;
  const likelyRecipeJson = params.likelyRecipe as string | undefined;
  const nutritionJson = params.nutrition as string | undefined;
  const allergensJson = params.allergens as string | undefined;
  const fodmapJson = params.fodmap as string | undefined;
  const nutritionSource = params.nutritionSource as string | undefined;

  let likelyRecipe: LikelyRecipe | null = null;
  let nutrition: NutritionSummary | null = null;
  let allergens: AllergenFlag[] = [];
  let fodmap: FodmapFlag | null = null;

  try {
    if (likelyRecipeJson) likelyRecipe = JSON.parse(likelyRecipeJson);
    if (nutritionJson) nutrition = JSON.parse(nutritionJson);
    if (allergensJson) allergens = JSON.parse(allergensJson);
    if (fodmapJson) fodmap = JSON.parse(fodmapJson);
  } catch (e) {
    console.error('Error parsing likely recipe params:', e);
  }

  const presentAllergens = allergens.filter(
    (a) => a.present === 'yes' || a.present === 'maybe'
  );

  const cookingMethod = getCookingMethodDisplay(likelyRecipe?.cooking_method);
  const isVisionEnhanced = nutritionSource === 'fatsecret_image';
  const isFatSecretNutrition = nutritionSource?.includes('fatsecret');
  const isUSDANutrition = nutritionSource?.includes('usda');

  // Build attribution list for data providers
  const attributions: { name: string; role: string; url?: string }[] = [];

  // Recipe source attribution
  if (likelyRecipe?.source) {
    const s = likelyRecipe.source.toLowerCase();
    if (s.includes('edamam')) {
      attributions.push({
        name: 'Edamam',
        role: 'Recipe data',
        url: 'https://www.edamam.com',
      });
    } else if (s.includes('spoonacular')) {
      attributions.push({
        name: 'Spoonacular',
        role: 'Recipe data',
        url: 'https://spoonacular.com',
      });
    }
  }

  // Nutrition source attribution
  if (isFatSecretNutrition || isVisionEnhanced) {
    attributions.push({
      name: 'FatSecret',
      role: 'Nutrition data',
      url: 'https://www.fatsecret.com',
    });
  } else if (isUSDANutrition) {
    attributions.push({
      name: 'USDA FoodData Central',
      role: 'Nutrition data',
      url: 'https://fdc.nal.usda.gov',
    });
  }

  // Build simple source display for header
  const sourceParts: string[] = [];
  if (likelyRecipe?.source) {
    const s = likelyRecipe.source.toLowerCase();
    if (s.includes('edamam')) sourceParts.push('Edamam');
    else if (s.includes('spoonacular')) sourceParts.push('Spoonacular');
    else if (s.includes('openai')) sourceParts.push('OpenAI');
  }
  if (isVisionEnhanced) sourceParts.push('Vision');
  const sourceDisplay = sourceParts.length > 0 ? sourceParts.join(' + ') : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Back Button */}
        <Pressable
          style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={TEAL} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Hero Image */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="restaurant-outline" size={48} color={TEXT_MUTED} />
          </View>
        )}

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.dishName}>{dishName || likelyRecipe?.title || 'Recipe'}</Text>

          {/* Cooking Method & Source */}
          <View style={styles.metaRow}>
            <Ionicons name={cookingMethod.icon as any} size={16} color={ORANGE} />
            <Text style={styles.cookingMethod}>{cookingMethod.label}</Text>
            {likelyRecipe?.cooking_method_confidence && (
              <Text style={styles.confidence}>
                {Math.round(likelyRecipe.cooking_method_confidence * 100)}%
              </Text>
            )}
          </View>

          {sourceDisplay && (
            <Text style={styles.sourceText}>Source: {sourceDisplay}</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* INGREDIENTS SECTION */}
        {likelyRecipe?.ingredients && likelyRecipe.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INGREDIENTS</Text>
            <View style={styles.ingredientsList}>
              {likelyRecipe.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.ingredientText}>{formatIngredient(ing)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* INSTRUCTIONS SECTION */}
        {likelyRecipe?.instructions && likelyRecipe.instructions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INSTRUCTIONS</Text>
            <View style={styles.instructionsList}>
              {likelyRecipe.instructions.map((inst, idx) => (
                <View key={idx} style={styles.instructionItem}>
                  <Text style={styles.stepNumber}>{idx + 1}.</Text>
                  <Text style={styles.instructionText}>{inst.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* NOTES SECTION */}
        {likelyRecipe?.notes && likelyRecipe.notes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CHEF'S NOTES</Text>
            <View style={styles.notesContainer}>
              {likelyRecipe.notes.map((note, idx) => (
                <Text key={idx} style={styles.noteText}>{note}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Divider before collapsibles */}
        <View style={styles.collapsibleDivider} />

        {/* COLLAPSIBLE: Nutrition */}
        {nutrition && (
          <Pressable
            style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.7 }]}
            onPress={() => setNutritionExpanded(!nutritionExpanded)}
          >
            <View style={styles.collapsibleLeft}>
              <Ionicons name="flame-outline" size={18} color={TEXT_SECONDARY} />
              <Text style={styles.collapsibleTitle}>Nutrition</Text>
              <Text style={styles.collapsiblePreview}>
                {nutrition.energyKcal ? `${Math.round(nutrition.energyKcal)} kcal` : ''}
              </Text>
            </View>
            <Ionicons
              name={nutritionExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={TEXT_MUTED}
            />
          </Pressable>
        )}
        {nutritionExpanded && nutrition && (
          <View style={styles.collapsibleContent}>
            <View style={styles.nutritionRow}>
              <NutritionItem label="Calories" value={nutrition.energyKcal} unit="kcal" />
              <NutritionItem label="Protein" value={nutrition.protein_g} unit="g" />
              <NutritionItem label="Carbs" value={nutrition.carbs_g} unit="g" />
              <NutritionItem label="Fat" value={nutrition.fat_g} unit="g" />
            </View>
          </View>
        )}

        {/* COLLAPSIBLE: Allergens */}
        {presentAllergens.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.7 }]}
            onPress={() => setAllergensExpanded(!allergensExpanded)}
          >
            <View style={styles.collapsibleLeft}>
              <Ionicons name="warning-outline" size={18} color="#f59e0b" />
              <Text style={styles.collapsibleTitle}>Allergens</Text>
              <Text style={[styles.collapsiblePreview, { color: '#f59e0b' }]}>
                {presentAllergens.length} warning{presentAllergens.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons
              name={allergensExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={TEXT_MUTED}
            />
          </Pressable>
        )}
        {allergensExpanded && presentAllergens.length > 0 && (
          <View style={styles.collapsibleContent}>
            {presentAllergens.map((allergen, idx) => (
              <View key={idx} style={styles.allergenRow}>
                <View
                  style={[
                    styles.allergenDot,
                    { backgroundColor: allergen.present === 'maybe' ? '#facc15' : '#ef4444' },
                  ]}
                />
                <Text style={styles.allergenText}>
                  {allergen.kind.charAt(0).toUpperCase() + allergen.kind.slice(1)}
                </Text>
                {allergen.present === 'maybe' && (
                  <Text style={styles.allergenMaybe}>(possible)</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* COLLAPSIBLE: FODMAP */}
        {fodmap && (fodmap.level === 'high' || fodmap.level === 'medium') && (
          <Pressable
            style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.7 }]}
            onPress={() => setFodmapExpanded(!fodmapExpanded)}
          >
            <View style={styles.collapsibleLeft}>
              <Ionicons
                name="leaf-outline"
                size={18}
                color={fodmap.level === 'high' ? '#ef4444' : '#f59e0b'}
              />
              <Text style={styles.collapsibleTitle}>FODMAP</Text>
              <Text
                style={[
                  styles.collapsiblePreview,
                  { color: fodmap.level === 'high' ? '#ef4444' : '#f59e0b' },
                ]}
              >
                {fodmap.level.charAt(0).toUpperCase() + fodmap.level.slice(1)}
              </Text>
            </View>
            <Ionicons
              name={fodmapExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={TEXT_MUTED}
            />
          </Pressable>
        )}
        {fodmapExpanded && fodmap && (
          <View style={styles.collapsibleContent}>
            {fodmap.reason && <Text style={styles.fodmapReason}>{fodmap.reason}</Text>}
          </View>
        )}

        {/* Data Attribution Section */}
        {attributions.length > 0 && (
          <View style={styles.attributionSection}>
            <Text style={styles.attributionTitle}>Data provided by</Text>
            <View style={styles.attributionList}>
              {attributions.map((attr, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.attributionItem,
                    pressed && attr.url && { opacity: 0.6 },
                  ]}
                  onPress={() => {
                    if (attr.url) {
                      Linking.openURL(attr.url);
                    }
                  }}
                  disabled={!attr.url}
                >
                  <View style={styles.attributionBadge}>
                    <Text style={styles.attributionName}>{attr.name}</Text>
                  </View>
                  <Text style={styles.attributionRole}>{attr.role}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.attributionDisclaimer}>
              Nutrition information is estimated and may vary based on preparation methods and portion sizes.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Nutrition item component
function NutritionItem({
  label,
  value,
  unit,
}: {
  label: string;
  value?: number | null;
  unit: string;
}) {
  return (
    <View style={styles.nutritionItem}>
      <Text style={styles.nutritionValue}>
        {value ? Math.round(value) : '-'}
        <Text style={styles.nutritionUnit}>{unit}</Text>
      </Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEAL,
    marginLeft: 4,
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 20,
  },
  heroPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  titleSection: {
    marginBottom: 20,
  },
  dishName: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cookingMethod: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  confidence: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  sourceText: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  ingredientsList: {
    gap: 10,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    fontSize: 18,
    color: TEXT_SECONDARY,
    lineHeight: 24,
  },
  ingredientText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    lineHeight: 24,
    flex: 1,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: TEAL,
    width: 24,
    lineHeight: 26,
  },
  instructionText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    lineHeight: 26,
    flex: 1,
  },
  notesContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
  },
  noteText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  collapsibleDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginTop: 8,
    marginBottom: 8,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  collapsibleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collapsibleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  collapsiblePreview: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginLeft: 4,
  },
  collapsibleContent: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  nutritionUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT_MUTED,
  },
  nutritionLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  allergenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  allergenText: {
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  allergenMaybe: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  fodmapReason: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },
  attributionSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  attributionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  attributionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  attributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attributionBadge: {
    backgroundColor: CARD_BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  attributionName: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  attributionRole: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  attributionDisclaimer: {
    fontSize: 11,
    color: TEXT_MUTED,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
