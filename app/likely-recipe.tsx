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
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AllergenFlag,
  DishOrgansBlock,
  FodmapFlag,
  FullRecipeData,
  FullRecipeResponse,
  LikelyIngredient,
  LikelyRecipe,
  NutritionInsights,
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

// Unified Design System (matching dish.tsx)
const DESIGN = {
  colors: {
    primary: '#14b8a6',
    background: '#020617',
    card: '#1e293b',
    cardDark: '#0f172a',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    textMuted: '#64748b',
    border: 'rgba(255,255,255,0.08)',
    safe: '#22c55e',
    caution: '#f59e0b',
    danger: '#ef4444',
  },
};

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

// Map nutrition source to human-readable label
const mapNutritionSourceToLabel = (source: string | null | undefined): string | null => {
  if (!source) return null;
  if (source === 'restaurant_kcal_only') return 'Calories from restaurant label (kcal only).';
  if (source.includes('restaurant_kcal')) return 'Calories aligned with restaurant label; macros estimated from recipe.';
  if (source === 'recipe_out' || source === 'recipe_legacy') return 'Estimated from recipe provider.';
  if (source === 'edamam_totalNutrients' || source === 'edamam_manual') return 'Estimated from recipe nutrition database.';
  if (source === 'enriched_ingredients_parsed' || source === 'enriched_normalized_items') return 'Estimated from ingredient-level analysis.';
  if (source.includes('fatsecret')) return 'Estimated from FatSecret nutrition database.';
  if (source.includes('usda')) return 'Estimated from USDA FoodData Central.';
  return 'Estimated nutrition values.';
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

// Truncate text helper (Instagram-style)
function truncateText(text: string, maxLength: number): { truncated: string; isTruncated: boolean } {
  if (!text || text.length <= maxLength) {
    return { truncated: text || '', isTruncated: false };
  }
  const truncated = text.substring(0, maxLength).trim();
  const lastSpace = truncated.lastIndexOf(' ');
  return {
    truncated: (lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated) + '...',
    isTruncated: true,
  };
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon,
  badge,
  badgeColor,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.collapsibleLeft}>
          <Ionicons name={icon as any} size={18} color={TEAL} />
          <Text style={styles.collapsibleTitle}>{title}</Text>
          {badge && (
            <Text style={[styles.collapsibleBadge, badgeColor ? { color: badgeColor } : null]}>
              {badge}
            </Text>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={TEXT_MUTED}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.collapsibleContent}>{children}</View>}
    </View>
  );
}

export default function LikelyRecipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Collapsible state - All sections collapsed by default
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [equipmentExpanded, setEquipmentExpanded] = useState(false);
  const [chefNotesExpanded, setChefNotesExpanded] = useState(false);
  const [nutritionExpanded, setNutritionExpanded] = useState(false);
  const [allergensExpanded, setAllergensExpanded] = useState(false);
  const [fodmapExpanded, setFodmapExpanded] = useState(false);
  const [longTermHealthExpanded, setLongTermHealthExpanded] = useState(false);
  const [winePairingExpanded, setWinePairingExpanded] = useState(false);
  const [storageExpanded, setStorageExpanded] = useState(false);

  // Description expansion
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Parse the data passed via params
  const dishName = params.dishName as string | undefined;
  const imageUrl = params.imageUrl as string | undefined;
  const likelyRecipeJson = params.likelyRecipe as string | undefined;
  const fullRecipeJson = params.fullRecipe as string | undefined;
  const nutritionJson = params.nutrition as string | undefined;
  const nutritionInsightsJson = params.nutritionInsights as string | undefined;
  const nutritionSourceLabel = params.nutritionSourceLabel as string | undefined;
  const allergensJson = params.allergens as string | undefined;
  const allergenSummary = params.allergenSummary as string | undefined;
  const fodmapJson = params.fodmap as string | undefined;
  const fodmapSummary = params.fodmapSummary as string | undefined;
  const organsJson = params.organs as string | undefined;
  const nutritionSource = params.nutritionSource as string | undefined;

  let likelyRecipe: LikelyRecipe | null = null;
  let fullRecipeResponse: FullRecipeResponse | null = null;
  let fullRecipe: FullRecipeData | null = null;
  let nutrition: NutritionSummary | null = null;
  let nutritionInsights: NutritionInsights | null = null;
  let allergens: AllergenFlag[] = [];
  let fodmap: FodmapFlag | null = null;
  let organs: DishOrgansBlock | null = null;

  try {
    if (likelyRecipeJson) likelyRecipe = JSON.parse(likelyRecipeJson);
    if (fullRecipeJson) fullRecipeResponse = JSON.parse(fullRecipeJson);
    if (fullRecipeResponse?.full_recipe) {
      fullRecipe = fullRecipeResponse.full_recipe;
    } else if (fullRecipeResponse?.generation_method === 'llm') {
      fullRecipe = fullRecipeResponse as unknown as FullRecipeData;
    }
    if (nutritionJson) nutrition = JSON.parse(nutritionJson);
    if (nutritionInsightsJson) nutritionInsights = JSON.parse(nutritionInsightsJson);
    if (allergensJson) allergens = JSON.parse(allergensJson);
    if (fodmapJson) fodmap = JSON.parse(fodmapJson);
    if (organsJson) organs = JSON.parse(organsJson);
  } catch (e) {
    console.error('Error parsing likely recipe params:', e);
  }

  // Determine if we have enhanced recipe data
  const hasFullRecipe = !!fullRecipe && (fullRecipe.instructions?.length || 0) > 0;

  const presentAllergens = allergens.filter(
    (a) => a.present === 'yes' || a.present === 'maybe'
  );

  // Compute organ impacts for Long-term Health section
  const organImpacts = (organs?.organs || [])
    .filter(o => o.organ && o.level && o.level.toLowerCase() !== 'low' && o.level.toLowerCase() !== 'beneficial')
    .map(o => {
      const reasons = (o as any).reasons as string[] | undefined;
      const organName = o.organ!.charAt(0).toUpperCase() + o.organ!.slice(1);
      const levelLower = o.level!.toLowerCase();
      return {
        organName,
        level: levelLower === 'medium' ? 'Moderate' : o.level!.charAt(0).toUpperCase() + o.level!.slice(1),
        levelColor: levelLower === 'high' ? '#ef4444' : '#14b8a6',
        sentence: reasons?.[0] || `${levelLower === 'high' ? 'Significant' : 'Moderate'} impact on ${organName.toLowerCase()}.`,
      };
    });

  // Get overall level from tummy_barometer or compute from organ levels
  const getOverallLevel = (): { label: string; color: string } | null => {
    if (!organs?.organs || organs.organs.length === 0) return null;
    const hasHigh = organs.organs.some(o => o.level?.toLowerCase() === 'high');
    const hasMedium = organs.organs.some(o => o.level?.toLowerCase() === 'medium');
    if (hasHigh) return { label: 'High', color: '#ef4444' };
    if (hasMedium) return { label: 'Moderate', color: '#14b8a6' };
    return { label: 'Low', color: '#22c55e' };
  };
  const overallOrganLevel = getOverallLevel();

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

  // Recipe metadata
  const recipeTitle = fullRecipe?.title || dishName || likelyRecipe?.title || 'Recipe';
  const recipeIntro = fullRecipe?.introduction || fullRecipe?.description;
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

  // Description truncation
  const { truncated: truncatedDesc, isTruncated: descIsTruncated } = truncateText(recipeIntro || '', 150);

  // Count items for badges
  const ingredientCount = hasFullRecipe && ingredientGroups.length > 0
    ? ingredientGroups.reduce((acc, g) => acc + (g.ingredients?.length || 0), 0)
    : hasFullRecipe && fullRecipe?.ingredients
    ? fullRecipe.ingredients.length
    : likelyRecipe?.ingredients?.length || 0;

  const instructionCount = hasFullRecipe
    ? fullRecipe?.instructions?.length || 0
    : likelyRecipe?.instructions?.length || 0;

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

        {/* Title Section - Name first */}
        <View style={styles.titleSection}>
          <Text style={styles.dishName}>{recipeTitle}</Text>

          {/* Description with see more */}
          {recipeIntro && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>
                {showFullDescription ? recipeIntro : truncatedDesc}
              </Text>
              {descIsTruncated && (
                <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                  <Text style={styles.seeMoreText}>
                    {showFullDescription ? 'see less' : 'see more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Recipe Meta - Under title/description */}
        <View style={styles.metaSection}>
          {/* Cooking Method Row */}
          <View style={styles.cookingMethodRow}>
            <Ionicons name={cookingMethod.icon as any} size={16} color={ORANGE} />
            <Text style={styles.cookingMethodText}>{cookingMethod.label}</Text>
            {likelyRecipe?.cooking_method_confidence && (
              <Text style={styles.confidenceText}>
                {Math.round(likelyRecipe.cooking_method_confidence * 100)}%
              </Text>
            )}
          </View>

          {/* Badges Row */}
          <View style={styles.badgesRow}>
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

          {/* Prep/Cook breakdown */}
          {(prepTime || cookTime) && (
            <Text style={styles.timeBreakdownText}>
              {prepTime && `Prep: ${prepTime} min`}
              {prepTime && cookTime && ' | '}
              {cookTime && `Cook: ${cookTime} min`}
            </Text>
          )}

          {/* Source */}
          {sourceDisplay && (
            <Text style={styles.sourceText}>Source: {sourceDisplay}</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* COLLAPSIBLE SECTIONS */}

        {/* 1. Nutrition */}
        {nutrition && (
          <CollapsibleSection
            title="Nutrition"
            icon="flame-outline"
            badge={nutrition.energyKcal ? `${Math.round(nutrition.energyKcal)} kcal` : undefined}
            expanded={nutritionExpanded}
            onToggle={() => setNutritionExpanded(!nutritionExpanded)}
          >
            <View style={styles.nutritionRow}>
              <NutritionItem label="Calories" value={nutrition.energyKcal} unit="kcal" />
              <NutritionItem label="Protein" value={nutrition.protein_g} unit="g" />
              <NutritionItem label="Carbs" value={nutrition.carbs_g} unit="g" />
              <NutritionItem label="Fat" value={nutrition.fat_g} unit="g" />
            </View>
            {nutritionInsights?.summary && (
              <Text style={styles.nutritionSummaryText}>"{nutritionInsights.summary}"</Text>
            )}
            {(nutritionSourceLabel || nutritionSource) && (
              <Text style={styles.nutritionSourceText}>
                Source: {nutritionSourceLabel || mapNutritionSourceToLabel(nutritionSource)}
              </Text>
            )}
          </CollapsibleSection>
        )}

        {/* 2. Allergens */}
        {presentAllergens.length > 0 && (
          <CollapsibleSection
            title="Allergens"
            icon="warning-outline"
            badge={`${presentAllergens.length} warning${presentAllergens.length !== 1 ? 's' : ''}`}
            badgeColor="#f59e0b"
            expanded={allergensExpanded}
            onToggle={() => setAllergensExpanded(!allergensExpanded)}
          >
            {/* Allergen Pills */}
            <View style={styles.allergenPillsContainer}>
              {presentAllergens.map((allergen, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.allergenPill,
                    { backgroundColor: allergen.present === 'maybe' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.allergenPillText,
                      { color: allergen.present === 'maybe' ? '#facc15' : '#ef4444' },
                    ]}
                  >
                    {allergen.kind.toLowerCase()}
                  </Text>
                </View>
              ))}
            </View>
            {/* Allergen Explanations - Table Style */}
            <View style={styles.allergenExplanationsContainer}>
              {presentAllergens.map((allergen, idx) => (
                <View key={idx} style={styles.allergenExplanationRow}>
                  <Text style={styles.allergenExplanationName}>
                    {allergen.kind.toLowerCase()}
                  </Text>
                  <Text style={styles.allergenExplanationText}>
                    {allergen.message || `This dish contains ${allergen.kind.toLowerCase()}.`}
                  </Text>
                </View>
              ))}
            </View>
            {/* Allergen Substitutions inside Allergens section */}
            {substitutions.length > 0 && (
              <View style={styles.substitutionsInline}>
                <Text style={styles.substitutionsInlineTitle}>Substitutions</Text>
                {substitutions.map((sub, idx) => (
                  <View key={idx} style={styles.substitutionItemInline}>
                    <View style={styles.substitutionHeader}>
                      <Ionicons name="swap-horizontal" size={14} color="#f59e0b" />
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
            )}
          </CollapsibleSection>
        )}

        {/* 3. Digestive Impact (FODMAP) */}
        {fodmap && (fodmap.level === 'high' || fodmap.level === 'medium') && (
          <CollapsibleSection
            title="Digestive Impact"
            icon="leaf-outline"
            badge={fodmap.level.charAt(0).toUpperCase() + fodmap.level.slice(1)}
            badgeColor={fodmap.level === 'high' ? '#ef4444' : '#f59e0b'}
            expanded={fodmapExpanded}
            onToggle={() => setFodmapExpanded(!fodmapExpanded)}
          >
            <Text style={styles.fodmapReason}>
              {fodmapSummary || fodmap.reason || `This dish has ${fodmap.level} FODMAP content.`}
            </Text>
          </CollapsibleSection>
        )}

        {/* 4. Long-term Health */}
        {organImpacts.length > 0 && overallOrganLevel && (
          <CollapsibleSection
            title="Long-term Health"
            icon="fitness-outline"
            badge={overallOrganLevel.label}
            badgeColor={overallOrganLevel.color}
            expanded={longTermHealthExpanded}
            onToggle={() => setLongTermHealthExpanded(!longTermHealthExpanded)}
          >
            <View style={styles.organImpactsList}>
              {organImpacts.map((impact, idx) => (
                <View key={idx} style={styles.organImpactItem}>
                  <View style={styles.organImpactHeader}>
                    <Text style={styles.organImpactName}>{impact.organName}</Text>
                    <Text style={[styles.organImpactLevel, { color: impact.levelColor }]}>
                      ({impact.level})
                    </Text>
                  </View>
                  <Text style={styles.organImpactSentence}>{impact.sentence}</Text>
                </View>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {/* 5. Ingredients - Collapsed by default */}
        <CollapsibleSection
          title="Ingredients"
          icon="list-outline"
          badge={`${ingredientCount} items`}
          expanded={ingredientsExpanded}
          onToggle={() => setIngredientsExpanded(!ingredientsExpanded)}
        >
          <View style={styles.ingredientsList}>
            {hasFullRecipe && ingredientGroups.length > 0 ? (
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
        </CollapsibleSection>

        {/* 5. Instructions */}
        <CollapsibleSection
          title="Instructions"
          icon="checkbox-outline"
          badge={`${instructionCount} steps`}
          expanded={instructionsExpanded}
          onToggle={() => setInstructionsExpanded(!instructionsExpanded)}
        >
          <View style={styles.instructionsList}>
            {hasFullRecipe && fullRecipe?.instructions ? (
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
        </CollapsibleSection>

        {/* 6. Equipment */}
        {equipment.length > 0 && (
          <CollapsibleSection
            title="Equipment"
            icon="construct-outline"
            badge={`${equipment.length} items`}
            expanded={equipmentExpanded}
            onToggle={() => setEquipmentExpanded(!equipmentExpanded)}
          >
            <View style={styles.equipmentList}>
              {equipment.map((item, idx) => (
                <View key={idx} style={styles.equipmentItem}>
                  <Ionicons name="checkmark-circle" size={14} color={TEAL} />
                  <Text style={styles.equipmentText}>{item}</Text>
                </View>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {/* 7. Chef's Notes */}
        {chefNotes.length > 0 && (
          <CollapsibleSection
            title="Chef's Notes"
            icon="bulb-outline"
            badge={`${chefNotes.length} tips`}
            expanded={chefNotesExpanded}
            onToggle={() => setChefNotesExpanded(!chefNotesExpanded)}
          >
            <View style={styles.notesContainer}>
              {chefNotes.map((note, idx) => (
                <View key={idx} style={styles.noteItem}>
                  <Ionicons name="sparkles" size={14} color={TEAL} style={styles.noteIcon} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
              {/* Make Ahead info inside Chef's Notes */}
              {makeAhead && (
                <View style={styles.makeAheadInline}>
                  <Ionicons name="calendar-outline" size={14} color="#22c55e" />
                  <Text style={styles.makeAheadInlineText}>{makeAhead}</Text>
                </View>
              )}
            </View>
          </CollapsibleSection>
        )}

        {/* Legacy notes from likely_recipe */}
        {!hasFullRecipe && likelyRecipe?.notes && likelyRecipe.notes.length > 0 && (
          <CollapsibleSection
            title="Notes"
            icon="document-text-outline"
            badge={`${likelyRecipe.notes.length}`}
            expanded={chefNotesExpanded}
            onToggle={() => setChefNotesExpanded(!chefNotesExpanded)}
          >
            <View style={styles.notesContainer}>
              {likelyRecipe.notes.map((note, idx) => (
                <Text key={idx} style={styles.legacyNoteText}>{note}</Text>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {/* 8. Wine Pairing */}
        {winePairing && (
          <CollapsibleSection
            title="Wine Pairing"
            icon="wine-outline"
            expanded={winePairingExpanded}
            onToggle={() => setWinePairingExpanded(!winePairingExpanded)}
          >
            <Text style={styles.pairingText}>{winePairing}</Text>
          </CollapsibleSection>
        )}

        {/* 9. Storage */}
        {storage && (
          <CollapsibleSection
            title="Storage"
            icon="snow-outline"
            expanded={storageExpanded}
            onToggle={() => setStorageExpanded(!storageExpanded)}
          >
            <Text style={styles.storageTextCollapsible}>{storage}</Text>
          </CollapsibleSection>
        )}

        {/* 10. Data Attribution Section */}
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
    marginBottom: 16,
  },
  heroPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  // Meta section - immediately under hero
  metaSection: {
    marginBottom: 16,
  },
  cookingMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cookingMethodText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  confidenceText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  badgesRow: {
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
  timeBreakdownText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  // Title section
  titleSection: {
    marginBottom: 16,
  },
  dishName: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 8,
  },
  descriptionContainer: {
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: TEAL,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginBottom: 8,
  },
  // Collapsible sections
  collapsibleSection: {
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
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
  collapsibleBadge: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginLeft: 4,
  },
  collapsibleContent: {
    paddingBottom: 16,
  },
  // Ingredients
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
  emptyText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontStyle: 'italic',
  },
  // Instructions
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
  // Equipment
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
  // Notes
  notesContainer: {
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
  // Special cards
  pairingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
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
    marginTop: 12,
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
    marginTop: 16,
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
  // Section styles
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 1.5,
    marginBottom: 16,
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
  // Inline substitutions (inside Allergens collapsible)
  substitutionsInline: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  substitutionsInlineTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },
  substitutionItemInline: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  // Inline make ahead (inside Chef's Notes collapsible)
  makeAheadInline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  makeAheadInlineText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    flex: 1,
  },
  // Storage text inside collapsible
  storageTextCollapsible: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },
  collapsibleDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginTop: 16,
    marginBottom: 8,
  },
  // Nutrition
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionSummaryText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    marginTop: 12,
    fontStyle: 'italic',
  },
  nutritionSourceText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 8,
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
  // Allergens
  allergenPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  allergenPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  allergenPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  allergenExplanationsContainer: {
    gap: 16,
  },
  allergenExplanationRow: {
    flexDirection: 'row',
    gap: 16,
  },
  allergenExplanationName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    width: 70,
  },
  allergenExplanationText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    flex: 1,
  },
  allergenItemContainer: {
    marginBottom: 12,
  },
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  allergenMessage: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    marginTop: 4,
    marginLeft: 18,
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
  // FODMAP
  fodmapReason: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },
  // Long-term Health / Organ Impacts
  organImpactsList: {
    gap: 16,
  },
  organImpactItem: {
    gap: 4,
  },
  organImpactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  organImpactName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  organImpactLevel: {
    fontSize: 14,
    fontWeight: '500',
  },
  organImpactSentence: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    marginLeft: 2,
  },
  // Attribution
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
