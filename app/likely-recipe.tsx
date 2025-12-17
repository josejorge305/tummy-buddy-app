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
  AllergenSubstitution,
  FodmapFlag,
  FullRecipeData,
  FullRecipeIngredientGroup,
  FullRecipeResponse,
  LikelyIngredient,
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

// Difficulty badge colors
const getDifficultyColor = (difficulty?: string): string => {
  if (!difficulty) return TEXT_MUTED;
  const d = difficulty.toLowerCase();
  if (d === 'easy') return '#22c55e';
  if (d === 'medium') return '#f59e0b';
  if (d === 'hard') return '#ef4444';
  return TEXT_MUTED;
};

// Phase icon mapping
const getPhaseIcon = (phase?: string): string => {
  if (!phase) return 'ellipse-outline';
  switch (phase) {
    case 'prep':
      return 'cut-outline';
    case 'cook':
      return 'flame-outline';
    case 'assemble':
      return 'layers-outline';
    case 'serve':
      return 'restaurant-outline';
    default:
      return 'ellipse-outline';
  }
};

// Format ingredient for cookbook display (basic)
const formatBasicIngredient = (ing: LikelyIngredient): string => {
  const parts: string[] = [];
  if (ing.quantity) parts.push(String(ing.quantity));
  if (ing.unit) parts.push(ing.unit);
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
  const [equipmentExpanded, setEquipmentExpanded] = useState(false);

  // Parse the data passed via params
  const dishName = params.dishName as string | undefined;
  const imageUrl = params.imageUrl as string | undefined;
  const likelyRecipeJson = params.likelyRecipe as string | undefined;
  const fullRecipeJson = params.fullRecipe as string | undefined;
  const nutritionJson = params.nutrition as string | undefined;
  const allergensJson = params.allergens as string | undefined;
  const fodmapJson = params.fodmap as string | undefined;
  const nutritionSource = params.nutritionSource as string | undefined;

  let likelyRecipe: LikelyRecipe | null = null;
  let fullRecipeResponse: FullRecipeResponse | null = null;
  let fullRecipe: FullRecipeData | null = null;
  let nutrition: NutritionSummary | null = null;
  let allergens: AllergenFlag[] = [];
  let fodmap: FodmapFlag | null = null;

  try {
    if (likelyRecipeJson) likelyRecipe = JSON.parse(likelyRecipeJson);
    if (fullRecipeJson) fullRecipeResponse = JSON.parse(fullRecipeJson);
    // The backend returns full_recipe as: { ...likelyRecipe, full_recipe: { cookbook data }, generation_method, model_used }
    // The actual cookbook data (wine_pairing, storage, chef_notes, etc.) is nested in full_recipe.full_recipe
    if (fullRecipeResponse?.full_recipe) {
      fullRecipe = fullRecipeResponse.full_recipe;
    } else if (fullRecipeResponse?.generation_method === 'llm') {
      // Fallback: if structure is flat (has generation_method but no nested full_recipe), use the response directly
      fullRecipe = fullRecipeResponse as unknown as FullRecipeData;
    }
    if (nutritionJson) nutrition = JSON.parse(nutritionJson);
    if (allergensJson) allergens = JSON.parse(allergensJson);
    if (fodmapJson) fodmap = JSON.parse(fodmapJson);
  } catch (e) {
    console.error('Error parsing likely recipe params:', e);
  }

  // Determine if we have enhanced recipe data
  const hasFullRecipe = !!fullRecipe && (fullRecipe.instructions?.length || 0) > 0;

  const presentAllergens = allergens.filter(
    (a) => a.present === 'yes' || a.present === 'maybe'
  );

  const cookingMethod = getCookingMethodDisplay(likelyRecipe?.cooking_method);
  const isVisionEnhanced = nutritionSource === 'fatsecret_image';
  const isFatSecretNutrition = nutritionSource?.includes('fatsecret');
  const isUSDANutrition = nutritionSource?.includes('usda');

  // Build attribution list for data providers
  const attributions: { name: string; role: string; url?: string }[] = [];

  if (likelyRecipe?.source) {
    const s = likelyRecipe.source.toLowerCase();
    if (s.includes('edamam')) {
      attributions.push({ name: 'Edamam', role: 'Recipe data', url: 'https://www.edamam.com' });
    } else if (s.includes('spoonacular')) {
      attributions.push({ name: 'Spoonacular', role: 'Recipe data', url: 'https://spoonacular.com' });
    }
  }

  if (isFatSecretNutrition || isVisionEnhanced) {
    attributions.push({ name: 'FatSecret', role: 'Nutrition data', url: 'https://www.fatsecret.com' });
  } else if (isUSDANutrition) {
    attributions.push({ name: 'USDA FoodData Central', role: 'Nutrition data', url: 'https://fdc.nal.usda.gov' });
  }

  if (hasFullRecipe) {
    attributions.push({ name: 'AI Generated', role: 'Recipe instructions' });
  }

  // Build source display
  const sourceParts: string[] = [];
  if (likelyRecipe?.source) {
    const s = likelyRecipe.source.toLowerCase();
    if (s.includes('edamam')) sourceParts.push('Edamam');
    else if (s.includes('spoonacular')) sourceParts.push('Spoonacular');
    else if (s.includes('openai')) sourceParts.push('OpenAI');
  }
  if (isVisionEnhanced) sourceParts.push('Vision');
  const sourceDisplay = sourceParts.length > 0 ? sourceParts.join(' + ') : null;

  // Recipe metadata (from full recipe if available)
  const recipeTitle = fullRecipe?.title || dishName || likelyRecipe?.title || 'Recipe';
  const recipeIntro = fullRecipe?.introduction || fullRecipe?.description;
  const recipeYield = fullRecipe?.yield;
  const difficulty = fullRecipe?.difficulty;
  const prepTime = fullRecipe?.prep_time_minutes;
  const cookTime = fullRecipe?.cook_time_minutes;
  const totalTime = fullRecipe?.total_time_minutes;
  const servings = fullRecipe?.servings;
  const ingredientGroups = fullRecipe?.ingredient_groups || [];
  const equipment = fullRecipe?.equipment || [];
  const chefNotes = fullRecipe?.chef_notes || [];
  const allergenInfo = fullRecipe?.allergen_info;
  const substitutions = allergenInfo?.substitutions || [];
  const winePairing = fullRecipe?.wine_pairing;
  const storage = fullRecipe?.storage;
  const makeAhead = fullRecipe?.make_ahead;

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
        {imageUrl && imageUrl.length > 0 ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="restaurant-outline" size={48} color={TEXT_MUTED} />
          </View>
        )}

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.dishName}>{recipeTitle}</Text>

          {recipeIntro && (
            <Text style={styles.recipeDescription}>{recipeIntro}</Text>
          )}

          {/* Yield Display */}
          {recipeYield && (
            <Text style={styles.yieldText}>{recipeYield}</Text>
          )}

          {/* Metadata Row */}
          <View style={styles.metaRow}>
            <Ionicons name={cookingMethod.icon as any} size={16} color={ORANGE} />
            <Text style={styles.cookingMethod}>{cookingMethod.label}</Text>
            {likelyRecipe?.cooking_method_confidence && (
              <Text style={styles.confidence}>
                {Math.round(likelyRecipe.cooking_method_confidence * 100)}%
              </Text>
            )}
          </View>

          {/* Time & Difficulty Row */}
          {(difficulty || totalTime || servings) && (
            <View style={styles.recipeMetaRow}>
              {difficulty && (
                <View style={styles.metaBadge}>
                  <Text style={[styles.metaBadgeText, { color: getDifficultyColor(difficulty) }]}>
                    {difficulty}
                  </Text>
                </View>
              )}
              {totalTime && (
                <View style={styles.metaBadge}>
                  <Ionicons name="time-outline" size={12} color={TEXT_SECONDARY} />
                  <Text style={styles.metaBadgeText}>{totalTime} min</Text>
                </View>
              )}
              {servings && (
                <View style={styles.metaBadge}>
                  <Ionicons name="people-outline" size={12} color={TEXT_SECONDARY} />
                  <Text style={styles.metaBadgeText}>{servings} servings</Text>
                </View>
              )}
            </View>
          )}

          {/* Prep/Cook breakdown */}
          {(prepTime || cookTime) && (
            <View style={styles.timeBreakdown}>
              {prepTime && <Text style={styles.timeBreakdownText}>Prep: {prepTime} min</Text>}
              {prepTime && cookTime && <Text style={styles.timeBreakdownText}> | </Text>}
              {cookTime && <Text style={styles.timeBreakdownText}>Cook: {cookTime} min</Text>}
            </View>
          )}

          {sourceDisplay && (
            <Text style={styles.sourceText}>Source: {sourceDisplay}</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* INGREDIENTS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INGREDIENTS</Text>
          <View style={styles.ingredientsList}>
            {hasFullRecipe && ingredientGroups.length > 0 ? (
              // Use grouped ingredients (e.g., "For the crust:", "For the filling:")
              ingredientGroups.map((group, groupIdx) => (
                <View key={groupIdx} style={styles.ingredientGroup}>
                  {group.group_name && (
                    <Text style={styles.ingredientGroupName}>{group.group_name}</Text>
                  )}
                  {(group.ingredients || []).map((ing, idx) => (
                    <View key={idx} style={styles.ingredientItem}>
                      <Text style={styles.bullet}>•</Text>
                      <View style={styles.ingredientContent}>
                        <Text style={styles.ingredientText}>
                          {ing.amount && <Text style={styles.ingredientAmount}>{ing.amount} </Text>}
                          {ing.item}
                          {ing.prep_note && <Text style={styles.ingredientPrepInline}>, {ing.prep_note}</Text>}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            ) : hasFullRecipe && fullRecipe?.ingredients ? (
              // Use flat ingredients list
              fullRecipe.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientItem}>
                  <Text style={styles.bullet}>•</Text>
                  <View style={styles.ingredientContent}>
                    <Text style={styles.ingredientText}>
                      {ing.amount && <Text style={styles.ingredientAmount}>{ing.amount} </Text>}
                      {ing.item}
                      {ing.prep_note && <Text style={styles.ingredientPrepInline}>, {ing.prep_note}</Text>}
                    </Text>
                  </View>
                </View>
              ))
            ) : likelyRecipe?.ingredients && likelyRecipe.ingredients.length > 0 ? (
              // Fallback to basic likely recipe ingredients
              likelyRecipe.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.ingredientText}>{formatBasicIngredient(ing)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No ingredients available</Text>
            )}
          </View>
        </View>

        {/* EQUIPMENT SECTION (collapsible) */}
        {equipment.length > 0 && (
          <>
            <Pressable
              style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.7 }]}
              onPress={() => setEquipmentExpanded(!equipmentExpanded)}
            >
              <View style={styles.collapsibleLeft}>
                <Ionicons name="construct-outline" size={18} color={TEXT_SECONDARY} />
                <Text style={styles.collapsibleTitle}>Equipment</Text>
                <Text style={styles.collapsiblePreview}>
                  {equipment.length} item{equipment.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <Ionicons
                name={equipmentExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={TEXT_MUTED}
              />
            </Pressable>
            {equipmentExpanded && (
              <View style={styles.collapsibleContent}>
                <View style={styles.equipmentList}>
                  {equipment.map((item, idx) => (
                    <View key={idx} style={styles.equipmentItem}>
                      <Ionicons name="checkmark-circle" size={14} color={TEAL} />
                      <Text style={styles.equipmentText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* INSTRUCTIONS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INSTRUCTIONS</Text>
          <View style={styles.instructionsList}>
            {hasFullRecipe && fullRecipe?.instructions ? (
              // Enhanced cookbook-style instructions
              fullRecipe.instructions.map((inst, idx) => (
                <View key={idx} style={styles.enhancedInstructionItem}>
                  <View style={styles.instructionHeader}>
                    <View style={styles.stepCircle}>
                      <Text style={styles.stepCircleText}>{inst.step || idx + 1}</Text>
                    </View>
                    {inst.action && (
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>{inst.action}</Text>
                      </View>
                    )}
                    {inst.phase && (
                      <View style={styles.phaseBadge}>
                        <Ionicons name={getPhaseIcon(inst.phase) as any} size={10} color={TEAL} />
                        <Text style={styles.phaseBadgeText}>
                          {inst.phase.charAt(0).toUpperCase() + inst.phase.slice(1)}
                        </Text>
                      </View>
                    )}
                    {inst.time_minutes && (
                      <View style={styles.timeBadge}>
                        <Ionicons name="time-outline" size={10} color={TEXT_MUTED} />
                        <Text style={styles.timeBadgeText}>{inst.time_minutes} min</Text>
                      </View>
                    )}
                  </View>
                  {inst.title && <Text style={styles.instructionTitle}>{inst.title}</Text>}
                  <Text style={styles.instructionDetail}>{inst.detail}</Text>
                  {inst.tip && (
                    <View style={styles.tipBox}>
                      <Ionicons name="bulb-outline" size={14} color="#facc15" />
                      <Text style={styles.tipText}>{inst.tip}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : likelyRecipe?.instructions && likelyRecipe.instructions.length > 0 ? (
              // Basic instructions fallback
              likelyRecipe.instructions.map((inst, idx) => (
                <View key={idx} style={styles.instructionItem}>
                  <Text style={styles.stepNumber}>{idx + 1}.</Text>
                  <Text style={styles.instructionText}>{inst.text}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No instructions available</Text>
            )}
          </View>
        </View>

        {/* CHEF'S NOTES SECTION */}
        {chefNotes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CHEF'S NOTES</Text>
            <View style={styles.notesContainer}>
              {chefNotes.map((note, idx) => (
                <View key={idx} style={styles.noteItem}>
                  <Ionicons name="sparkles" size={14} color={TEAL} style={styles.noteIcon} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Legacy notes from likely_recipe */}
        {!hasFullRecipe && likelyRecipe?.notes && likelyRecipe.notes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTES</Text>
            <View style={styles.notesContainer}>
              {likelyRecipe.notes.map((note, idx) => (
                <Text key={idx} style={styles.legacyNoteText}>{note}</Text>
              ))}
            </View>
          </View>
        )}

        {/* ALLERGEN SUBSTITUTIONS */}
        {substitutions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ALLERGEN SUBSTITUTIONS</Text>
            <View style={styles.substitutionsContainer}>
              {substitutions.map((sub, idx) => (
                <View key={idx} style={styles.substitutionItem}>
                  <View style={styles.substitutionHeader}>
                    <Ionicons name="swap-horizontal" size={16} color="#f59e0b" />
                    <Text style={styles.substitutionAllergen}>
                      {sub.allergen?.charAt(0).toUpperCase()}{sub.allergen?.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.substitutionDetails}>
                    <Text style={styles.substitutionOriginal}>
                      Replace <Text style={styles.substitutionHighlight}>{sub.original}</Text>
                    </Text>
                    <Text style={styles.substitutionArrow}>→</Text>
                    <Text style={styles.substitutionReplacement}>{sub.substitute}</Text>
                  </View>
                  {sub.note && (
                    <Text style={styles.substitutionNote}>{sub.note}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* MAKE AHEAD */}
        {makeAhead && (
          <View style={styles.makeAheadCard}>
            <Ionicons name="calendar-outline" size={18} color="#22c55e" />
            <View style={styles.makeAheadContent}>
              <Text style={styles.makeAheadLabel}>Make Ahead</Text>
              <Text style={styles.makeAheadText}>{makeAhead}</Text>
            </View>
          </View>
        )}

        {/* WINE PAIRING */}
        {winePairing && (
          <View style={styles.pairingCard}>
            <Ionicons name="wine-outline" size={20} color="#a855f7" />
            <View style={styles.pairingContent}>
              <Text style={styles.pairingLabel}>Wine Pairing</Text>
              <Text style={styles.pairingText}>{winePairing}</Text>
            </View>
          </View>
        )}

        {/* STORAGE */}
        {storage && (
          <View style={styles.storageCard}>
            <Ionicons name="snow-outline" size={18} color="#38bdf8" />
            <View style={styles.storageContent}>
              <Text style={styles.storageLabel}>Storage</Text>
              <Text style={styles.storageText}>{storage}</Text>
            </View>
          </View>
        )}

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
  recipeDescription: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 24,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
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
  recipeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CARD_BG,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  timeBreakdown: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timeBreakdownText: {
    fontSize: 12,
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
    marginBottom: 32,
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
  ingredientContent: {
    flex: 1,
  },
  ingredientText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    lineHeight: 24,
  },
  ingredientAmount: {
    fontWeight: '600',
    color: TEAL,
  },
  ingredientPrepNote: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontStyle: 'italic',
    marginTop: 2,
  },
  ingredientPrepInline: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontStyle: 'italic',
  },
  ingredientGroup: {
    marginBottom: 16,
  },
  ingredientGroupName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEAL,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  yieldText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 8,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontStyle: 'italic',
  },
  instructionsList: {
    gap: 20,
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
  enhancedInstructionItem: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    fontSize: 14,
    fontWeight: '700',
    color: BG,
  },
  actionBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: ORANGE,
    textTransform: 'uppercase',
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  phaseBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEAL,
    textTransform: 'uppercase',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  instructionDetail: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 26,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#fef08a',
    lineHeight: 18,
    flex: 1,
  },
  notesContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
    gap: 12,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteIcon: {
    marginTop: 2,
  },
  noteText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 23,
    flex: 1,
  },
  legacyNoteText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  pairingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#a855f7',
  },
  pairingContent: {
    flex: 1,
  },
  pairingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a855f7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pairingText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 20,
  },
  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
  },
  storageContent: {
    flex: 1,
  },
  storageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  storageText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 20,
  },
  makeAheadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  makeAheadContent: {
    flex: 1,
  },
  makeAheadLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  makeAheadText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 20,
  },
  substitutionsContainer: {
    gap: 16,
  },
  substitutionItem: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  substitutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  substitutionAllergen: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f59e0b',
  },
  substitutionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  substitutionOriginal: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  substitutionHighlight: {
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  substitutionArrow: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginHorizontal: 4,
  },
  substitutionReplacement: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  substitutionNote: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontStyle: 'italic',
    marginTop: 6,
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
  equipmentList: {
    gap: 8,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  equipmentText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
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
