import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
const TEAL = '#14b8a6';
const ORANGE = '#f97316';

// Cooking method icons
const getCookingMethodIcon = (method?: string | null): string => {
  if (!method) return 'flame-outline';
  const m = method.toLowerCase();
  if (m.includes('grill')) return 'flame';
  if (m.includes('fry') || m.includes('fried')) return 'flame';
  if (m.includes('bake') || m.includes('baked')) return 'cube-outline';
  if (m.includes('steam')) return 'water-outline';
  if (m.includes('roast')) return 'flame';
  if (m.includes('boil')) return 'water';
  if (m.includes('raw')) return 'leaf-outline';
  return 'restaurant-outline';
};

// Ingredient category emojis
const getIngredientEmoji = (category?: string | null): string => {
  if (!category) return '•';
  const c = category.toLowerCase();
  if (c.includes('meat') || c === 'red_meat') return '🥩';
  if (c.includes('poultry') || c === 'chicken') return '🍗';
  if (c.includes('seafood') || c.includes('fish')) return '🐟';
  if (c.includes('dairy') || c.includes('cheese')) return '🧀';
  if (c.includes('vegetable') || c === 'veggie') return '🥬';
  if (c.includes('fruit')) return '🍅';
  if (c.includes('grain') || c.includes('bread') || c.includes('bun')) return '🍞';
  if (c.includes('sauce') || c.includes('condiment')) return '🥫';
  if (c.includes('spice') || c.includes('herb')) return '🌶️';
  return '•';
};

export default function LikelyRecipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={TEAL} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Hero Image */}
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="restaurant-outline" size={48} color="#4b5563" />
            </View>
          )}

          {/* Title & Badges */}
          <View style={styles.titleSection}>
            <Text style={styles.dishName}>{dishName || 'Unknown Dish'}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.recipeBadge}>
                <Ionicons name="sparkles" size={12} color="#fff" />
                <Text style={styles.recipeBadgeText}>Likely Recipe</Text>
              </View>
              {nutritionSource === 'fatsecret_image' && (
                <View style={[styles.recipeBadge, { backgroundColor: ORANGE }]}>
                  <Ionicons name="eye" size={12} color="#fff" />
                  <Text style={styles.recipeBadgeText}>Vision Enhanced</Text>
                </View>
              )}
            </View>

            {/* Cooking Method */}
            {likelyRecipe?.cooking_method && (
              <View style={styles.cookingMethodCard}>
                <View style={styles.cookingMethodHeader}>
                  <Ionicons
                    name={getCookingMethodIcon(likelyRecipe.cooking_method) as any}
                    size={18}
                    color={ORANGE}
                  />
                  <Text style={styles.cookingMethodText}>
                    {likelyRecipe.cooking_method.charAt(0).toUpperCase() +
                      likelyRecipe.cooking_method.slice(1)}
                  </Text>
                  {likelyRecipe.cooking_method_confidence && (
                    <Text style={styles.confidenceText}>
                      ({Math.round(likelyRecipe.cooking_method_confidence * 100)}%)
                    </Text>
                  )}
                </View>
                {likelyRecipe.cooking_method_reason && (
                  <Text style={styles.cookingMethodReason}>
                    {likelyRecipe.cooking_method_reason}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Nutrition Facts */}
          {nutrition && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nutrition Facts</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Ionicons name="flame" size={16} color={ORANGE} />
                  <Text style={styles.nutritionValue}>
                    {nutrition.energyKcal ? Math.round(nutrition.energyKcal) : '-'}
                  </Text>
                  <Text style={styles.nutritionLabel}>kcal</Text>
                </View>
                <View style={styles.nutritionDivider} />
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {nutrition.protein_g ? `${Math.round(nutrition.protein_g)}g` : '-'}
                  </Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionDivider} />
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {nutrition.carbs_g ? `${Math.round(nutrition.carbs_g)}g` : '-'}
                  </Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionDivider} />
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {nutrition.fat_g ? `${Math.round(nutrition.fat_g)}g` : '-'}
                  </Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              </View>
            </View>
          )}

          {/* Allergen Warnings */}
          {presentAllergens.length > 0 && (
            <View style={styles.allergenSection}>
              <View style={styles.allergenHeader}>
                <Ionicons name="warning" size={18} color="#f59e0b" />
                <Text style={styles.allergenTitle}>Allergen Warnings</Text>
              </View>
              {presentAllergens.map((allergen, idx) => (
                <View key={idx} style={styles.allergenRow}>
                  <View
                    style={[
                      styles.allergenDot,
                      {
                        backgroundColor:
                          allergen.present === 'maybe' ? '#facc15' : '#ef4444',
                      },
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

          {/* FODMAP Notice */}
          {fodmap && (fodmap.level === 'high' || fodmap.level === 'medium') && (
            <View style={styles.fodmapSection}>
              <View style={styles.fodmapHeader}>
                <Ionicons
                  name="leaf"
                  size={18}
                  color={fodmap.level === 'high' ? '#ef4444' : '#f59e0b'}
                />
                <Text style={styles.fodmapTitle}>
                  {fodmap.level.toUpperCase()} FODMAP
                </Text>
              </View>
              {fodmap.reason && (
                <Text style={styles.fodmapReason}>{fodmap.reason}</Text>
              )}
            </View>
          )}

          {/* Ingredients */}
          {likelyRecipe?.ingredients && likelyRecipe.ingredients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.ingredientHeaderRow}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {likelyRecipe.ingredient_stats?.total && (
                  <Text style={styles.ingredientCount}>
                    ({likelyRecipe.ingredient_stats.total} items)
                  </Text>
                )}
              </View>

              {/* Stats pills */}
              {likelyRecipe.ingredient_stats && (
                <View style={styles.statsPillRow}>
                  {(likelyRecipe.ingredient_stats.from_recipe ?? 0) > 0 && (
                    <View style={[styles.statPill, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Text style={[styles.statPillText, { color: '#3b82f6' }]}>
                        {likelyRecipe.ingredient_stats.from_recipe} Recipe
                      </Text>
                    </View>
                  )}
                  {(likelyRecipe.ingredient_stats.from_vision ?? 0) > 0 && (
                    <View style={[styles.statPill, { backgroundColor: 'rgba(20, 184, 166, 0.15)' }]}>
                      <Text style={[styles.statPillText, { color: TEAL }]}>
                        {likelyRecipe.ingredient_stats.from_vision} Vision
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.ingredientList}>
                {likelyRecipe.ingredients.map((ing, idx) => (
                  <IngredientRow key={idx} ingredient={ing} />
                ))}
              </View>
            </View>
          )}

          {/* Instructions */}
          {likelyRecipe?.instructions && likelyRecipe.instructions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <View style={styles.instructionList}>
                {likelyRecipe.instructions.map((inst, idx) => (
                  <InstructionRow key={idx} step={idx + 1} instruction={inst} />
                ))}
              </View>
            </View>
          )}

          {/* Notes */}
          {likelyRecipe?.notes && likelyRecipe.notes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesCard}>
                {likelyRecipe.notes.map((note, idx) => (
                  <View key={idx} style={styles.noteRow}>
                    <Ionicons name="information-circle-outline" size={16} color="#9ca3af" />
                    <Text style={styles.noteText}>{note}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/')}>
            <Ionicons name="home" size={22} color="#ffffff" />
            <Text style={styles.bottomNavText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Ionicons name="bar-chart-outline" size={22} color="#ffffff" />
            <Text style={styles.bottomNavText}>Tracker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle" size={22} color="#ffffff" />
            <Text style={styles.bottomNavText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Sub-components
function IngredientRow({ ingredient }: { ingredient: LikelyIngredient }) {
  const isVision = ingredient.source === 'vision' || ingredient.source === 'vision_nutrition';
  const quantityDisplay = ingredient.quantity
    ? `${ingredient.quantity}${ingredient.unit ? ` ${ingredient.unit}` : ''}`
    : null;

  return (
    <View style={styles.ingredientRow}>
      <View style={styles.ingredientMain}>
        <Text style={styles.ingredientEmoji}>{getIngredientEmoji(ingredient.category)}</Text>
        <Text style={styles.ingredientName}>{ingredient.name || 'Unknown'}</Text>
        {quantityDisplay && (
          <Text style={styles.ingredientQty}>{quantityDisplay}</Text>
        )}
      </View>
      <View style={styles.ingredientMeta}>
        {isVision && (
          <View style={styles.visionBadge}>
            <Ionicons name="eye" size={10} color={TEAL} />
            <Text style={styles.visionBadgeText}>Vision</Text>
          </View>
        )}
        {ingredient.vision_confidence && (
          <Text style={styles.confidenceSmall}>
            {Math.round(ingredient.vision_confidence * 100)}%
          </Text>
        )}
        {ingredient.energyKcal && ingredient.energyKcal > 0 && (
          <Text style={styles.ingredientKcal}>{Math.round(ingredient.energyKcal)} kcal</Text>
        )}
      </View>
    </View>
  );
}

function InstructionRow({
  step,
  instruction,
}: {
  step: number;
  instruction: LikelyInstruction;
}) {
  return (
    <View style={styles.instructionRow}>
      <View style={styles.stepCircle}>
        <Text style={styles.stepNumber}>{step}</Text>
      </View>
      <View style={styles.instructionContent}>
        <Text style={styles.instructionText}>{instruction.text}</Text>
        {instruction.adjusted && (
          <View style={styles.adjustedBadge}>
            <Ionicons name="sparkles" size={10} color={TEAL} />
            <Text style={styles.adjustedText}>Adjusted based on visual analysis</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEAL,
    marginLeft: 4,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  heroPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titleSection: {
    marginBottom: 20,
  },
  dishName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  recipeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TEAL,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  recipeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cookingMethodCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
  },
  cookingMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cookingMethodText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  confidenceText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  cookingMethodReason: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  nutritionItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutritionDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#374151',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  allergenSection: {
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  allergenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  allergenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  allergenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  allergenText: {
    fontSize: 14,
    color: '#ffffff',
  },
  allergenMaybe: {
    fontSize: 12,
    color: '#9ca3af',
  },
  fodmapSection: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  fodmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  fodmapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  fodmapReason: {
    fontSize: 14,
    color: '#9ca3af',
  },
  ingredientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientCount: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statsPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ingredientList: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  ingredientRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  ingredientMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientEmoji: {
    fontSize: 16,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    flex: 1,
  },
  ingredientQty: {
    fontSize: 14,
    color: '#9ca3af',
  },
  ingredientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  visionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: TEAL,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  visionBadgeText: {
    fontSize: 10,
    color: TEAL,
    fontWeight: '500',
  },
  confidenceSmall: {
    fontSize: 11,
    color: '#9ca3af',
  },
  ingredientKcal: {
    fontSize: 11,
    color: ORANGE,
  },
  instructionList: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 8,
  },
  instructionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  instructionContent: {
    flex: 1,
  },
  instructionText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 22,
  },
  adjustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  adjustedText: {
    fontSize: 11,
    color: TEAL,
  },
  notesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#9ca3af',
    flex: 1,
    lineHeight: 20,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  bottomNavItem: {
    alignItems: 'center',
    gap: 4,
  },
  bottomNavText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
});
