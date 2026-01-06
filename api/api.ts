import { addApiBreadcrumb, captureException } from '../utils/sentry';

export const API_BASE_URL = 'https://api.rrginvestment.com';

const RESTAURANT_API_BASE = API_BASE_URL;

const DISH_API_BASE = API_BASE_URL;

const GATEWAY_BASE_URL = API_BASE_URL;

// Helper to wrap fetch with Sentry tracking
async function trackedFetch(url: string, options?: RequestInit): Promise<Response> {
  const method = options?.method || 'GET';
  try {
    const response = await fetch(url, options);
    addApiBreadcrumb(method, url, response.status);
    return response;
  } catch (error) {
    addApiBreadcrumb(method, url, 0);
    captureException(error as Error, { url, method });
    throw error;
  }
}

export interface DishTummyBarometer {
  score: number | null | undefined;
  label: string | null | undefined;
}

export interface DishKeyFlags {
  allergens: string[];
  fodmapLevel: string | null;
  lactoseLevel: string | null;
  onionGarlic: boolean;
  spicy: boolean;
  alcohol: boolean;
}

export interface DishOrganSummaryEntry {
  organ: string | null;
  score: number | null;
  level: string | null;
}

export interface DishSummary {
  tummyBarometer: DishTummyBarometer;
  organs: DishOrganSummaryEntry[];
  keyFlags: DishKeyFlags;
  edamamLabels?: string[];
}

export interface NutritionInsights {
  summary: string;
  highlights: string[];
  cautions: string[];
  classifications: {
    calories: 'low' | 'medium' | 'high';
    protein: 'low' | 'medium' | 'high';
    carbs: 'low' | 'medium' | 'high';
    sugar: 'low' | 'medium' | 'high';
    fiber: 'low' | 'medium' | 'high';
    fat: 'low' | 'medium' | 'high';
    sodium: 'low' | 'medium' | 'high';
  };
}

export interface NutritionSummary {
  energyKcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
}

export interface AllergenFlag {
  kind: string;
  present: 'yes' | 'no' | 'maybe';
  message: string;
  source: string;
}

export interface FodmapFlag {
  level: 'low' | 'medium' | 'high';
  reason: string;
  source: string;
}

export interface LactoseFlag {
  level: 'none' | 'trace' | 'low' | 'medium' | 'high';
  reason: string;
  source: string;
}

export type LifestyleTag = string;

export interface LifestyleChecks {
  contains_red_meat: 'yes' | 'no' | 'maybe';
  red_meat_free: 'yes' | 'no' | 'maybe';
  vegetarian: 'yes' | 'no' | 'maybe';
  vegan: 'yes' | 'no' | 'maybe';
}

export interface DishOrganFlags {
  allergens?: { kind?: string; message?: string; source?: string }[];
  fodmap?: { level?: string; reason?: string; source?: string };
  lactose?: { level?: string; reason?: string; milk_source?: string | null };
  onion_garlic?: boolean;
  spicy?: boolean;
  alcohol?: boolean;
}

export interface DishOrgansBlock {
  ok?: boolean;
  tummy_barometer?: DishTummyBarometer;
  organs?: { organ?: string; score?: number; level?: string }[];
  flags?: DishOrganFlags;
  debug?: any;
}

export interface DishNormalizedBlock {
  ok: boolean;
  source: string | null;
  cache: boolean;
  items: any[];
  ingredients_lines: string[];
  ingredients_parsed: any | null;
}

export interface PlateComponent {
  component_id?: string;
  role?: string | null;
  category?: string | null;
  label?: string | null;
  confidence?: number | null;
  area_ratio?: number | null;
}

export interface SelectionNutritionRow {
  component_id?: string;
  component?: string;
  role?: string;
  category?: string;
  share_ratio?: number | null;
  energyKcal?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
  sugar_g?: number | null;
  fiber_g?: number | null;
  sodium_mg?: number | null;
}

export interface SelectionResult {
  componentIds: string[];
  components?: PlateComponent[];
  nutrition?: SelectionNutritionRow[];
  combined_nutrition?: NutritionSummary | null;
  combined_allergens?: AllergenFlag[];
  combined_fodmap?: FodmapFlag | null;
  combined_lactose?: LactoseFlag | null;
}

export interface ComponentAllergenBreakdown {
  component_id?: string;
  component?: string;
  role?: string;
  category?: string;
  allergen_flags?: AllergenFlag[];
  fodmap_flags?: FodmapFlag | null;
  lactose_flags?: LactoseFlag | null;
}

// Likely Recipe types
export interface LikelyIngredient {
  name?: string;
  quantity?: number | string | null;
  unit?: string | null;
  source?: 'recipe' | 'vision' | 'vision_nutrition';
  category?: string | null;
  vision_confidence?: number | null;
  vision_evidence?: string | null;
  vision_confirmed?: boolean;
  energyKcal?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
}

export interface LikelyInstruction {
  text?: string;
  adjusted?: boolean;
  original?: string | null;
}

export interface IngredientStats {
  total?: number;
  from_recipe?: number;
  from_vision?: number;
  vision_confirmed?: number;
}

export interface LikelyRecipe {
  title?: string | null;
  source?: string | null;
  cooking_method?: string | null;
  cooking_method_confidence?: number | null;
  cooking_method_reason?: string | null;
  cooking_method_adjusted?: boolean;
  ingredients?: LikelyIngredient[];
  instructions?: LikelyInstruction[];
  notes?: string[];
  ingredient_stats?: IngredientStats;
}

// Full Recipe types (cookbook-style with LLM)
export interface FullRecipeIngredient {
  amount?: string;
  item?: string;
  prep_note?: string | null;
}

export interface FullRecipeIngredientGroup {
  group_name?: string | null;
  ingredients?: FullRecipeIngredient[];
}

export interface FullRecipeInstruction {
  step?: number;
  phase?: 'prep' | 'cook' | 'assemble' | 'serve';
  action?: string; // The action verb (Preheat, Combine, Whisk, etc.)
  title?: string;
  detail?: string;
  time_minutes?: number | null;
  tip?: string | null;
}

export interface AllergenSubstitution {
  allergen?: string;
  original?: string;
  substitute?: string;
  note?: string | null;
}

export interface AllergenInfo {
  contains?: string[];
  substitutions?: AllergenSubstitution[];
}

export interface FullRecipeData {
  title?: string;
  introduction?: string; // Brief appetizing description/anecdote
  description?: string; // Backwards compatible alias for introduction
  yield?: string; // e.g., "Serves 4" or "Makes 24 cookies"
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  servings?: number;
  ingredient_groups?: FullRecipeIngredientGroup[]; // Grouped ingredients (e.g., "For the crust:", "For the filling:")
  ingredients?: FullRecipeIngredient[]; // Flat list for backwards compatibility
  equipment?: string[];
  instructions?: FullRecipeInstruction[];
  chef_notes?: string[];
  allergen_info?: AllergenInfo; // Allergens and substitutions
  allergen_warnings?: string[]; // Legacy field
  storage?: string | null;
  make_ahead?: string | null; // Make-ahead tips
  wine_pairing?: string | null;
}

export interface FullRecipeResponse {
  ok: boolean;
  full_recipe?: FullRecipeData | null;
  generation_method?: string;
  model_used?: string;
  reason?: string;
}

export interface SpellCorrection {
  original: string;
  corrected: string;
  confidence?: number | null;
}

export interface AnalyzeDishResponse {
  ok: boolean;
  apiVersion?: string;
  source?: string;
  dishName?: string;
  dishNameOriginal?: string;
  spell_correction?: SpellCorrection | null;
  restaurantName?: string;
  summary?: DishSummary | null;
  recipe?: any;
  normalized?: DishNormalizedBlock;
  organs?: DishOrgansBlock;
  debug?: any;
  error?: string;

  // Whole-dish level flags / nutrition
  allergen_flags?: AllergenFlag[];
  allergen_summary?: string | null;
  fodmap_flags?: FodmapFlag | null;
  fodmap_summary?: string | null;
  lactose_flags?: LactoseFlag | null;
  nutrition_summary?: NutritionSummary | null;
  nutrition_badges?: string[] | null;
  nutrition_insights?: NutritionInsights | null;
  lifestyle_tags?: LifestyleTag[];
  lifestyle_checks?: LifestyleChecks | null;
  nutrition_source?: string | null;

  // Plate / selection fields (optional for backward compatibility)
  plate_components?: PlateComponent[] | null;
  nutrition_breakdown?: SelectionNutritionRow[] | null;
  allergen_breakdown?: ComponentAllergenBreakdown[] | null;

  selection_default?: SelectionResult | null;
  selection_components?: Record<string, SelectionResult> | null;
  selection_custom?: SelectionResult | null;

  // Likely recipe (merged recipe + vision ingredients)
  likely_recipe?: LikelyRecipe | null;

  // Full recipe (cookbook-style with LLM instructions)
  full_recipe?: FullRecipeResponse | null;

  // Recipe image from provider (Spoonacular/Edamam)
  recipe_image?: string | null;

  // Generated description from recipe introduction (fallback when Uber Eats has no description)
  generated_description?: string | null;

  // Organs pending (when skip_organs=true was used)
  organs_pending?: boolean;
  organs_poll_key?: string;

  // Allergens pending (when skip_allergens=true was used)
  allergens_pending?: boolean;
  allergens_poll_key?: string;

  // Full recipe pending (when skip_full_recipe=true was used)
  full_recipe_pending?: boolean;
  full_recipe_poll_key?: string;
}

// Dish image lookup response
export interface DishImageResponse {
  ok: boolean;
  dish?: string;
  image?: string;
  provider?: string;
  error?: string;
}

/**
 * Fetch dish image from providers (Spoonacular/Edamam)
 * This is a lightweight endpoint that only returns an image URL
 */
export async function fetchDishImage(dishName: string): Promise<DishImageResponse> {
  const url = `${API_BASE_URL}/api/dish-image?dish=${encodeURIComponent(dishName)}`;
  if (__DEV__) console.log('TB fetchDishImage calling:', url);

  try {
    const res = await fetch(url);
    const text = await res.text();

    try {
      const data = JSON.parse(text);
      return data as DishImageResponse;
    } catch {
      return { ok: false, error: 'Invalid response' };
    }
  } catch (e: any) {
    if (__DEV__) console.error('fetchDishImage error:', e?.message || e);
    return { ok: false, error: e?.message || 'Failed to fetch image' };
  }
}

export interface AnalyzeDishCardResponse {
  apiVersion: string;
  dishName: string | null;
  restaurantName: string | null;
  summary: DishSummary | null;
}

async function apiGet(fullUrl: string) {
  if (__DEV__) console.log('Calling API GET:', fullUrl);

  const res = await fetch(fullUrl, {
    method: 'GET',
  });

  const raw = await res.text();
  if (__DEV__) console.log('apiGet raw snippet:', raw.slice(0, 200));

  if (!res.ok) {
    throw new Error(`API GET error ${res.status}: ${raw.slice(0, 200)}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    if (__DEV__) console.error('apiGet JSON.parse failed:', error);
    throw new Error(
      `API GET returned non-JSON or unexpected shape. Status: ${
        res.status
      }, body starts with: ${raw.slice(0, 40)}`
    );
  }
}

async function apiPostDish(path: string, body: any) {
  const url = `${DISH_API_BASE}${path}`;
  if (__DEV__) console.log('Calling Dish API POST:', url, 'with body:', body);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Dish API error ${res.status}: ${text.slice(0, 200)}`);
    }

    try {
      return JSON.parse(text);
    } catch (parseErr) {
      throw new Error(`Dish API returned invalid JSON: ${text.slice(0, 200)}`);
    }
  } catch (error) {
    if (__DEV__) console.error('Dish API error:', error);
    throw error;
  }
}

// Existing: menu extraction from restaurant-core
export function getMenuExtract(placeId: string) {
  const url = `${RESTAURANT_API_BASE}/menu/extract?placeId=${placeId}`;
  return apiGet(url);
}

export async function fetchMenu(placeId: string) {
  const url = `${RESTAURANT_API_BASE}/menu/extract?placeId=${placeId}`;
  if (__DEV__) console.log('TB fetchMenu calling:', url);

  const res = await fetch(url);

  const raw = await res.text();
  if (__DEV__) console.log('fetchMenu raw snippet:', raw.slice(0, 200));

  // For 202 responses (processing), parse and return the JSON body
  if (res.status === 202) {
    try {
      return JSON.parse(raw);
    } catch {
      return { ok: false, status: 'processing', retryIn: 5 };
    }
  }

  if (!res.ok) {
    throw new Error(`fetchMenu HTTP ${res.status} – body starts with: ${raw.slice(0, 40)}`);
  }

  try {
    const data = JSON.parse(raw);
    if (__DEV__) console.log(
      'fetchMenu JSON top-level keys:',
      data && typeof data === 'object' ? Object.keys(data) : typeof data
    );
    return data;
  } catch (e) {
    if (__DEV__) console.error('fetchMenu JSON.parse failed:', e);
    throw new Error(`fetchMenu got non-JSON body starting with: ${raw.slice(0, 40)}`);
  }
}

// ============================================================
// Updated Fast Menu Fetch with Validation Support
// ============================================================

// Helper to transform legacy format (backwards compatibility)
function transformLegacyMenuData(
  data: any,
  restaurantName: string,
  address: string
): {
  ok: boolean;
  source: string;
  restaurant: ValidatedRestaurant;
  sections: ValidatedMenuSection[];
  meta: ValidatedMenuData['meta'];
} {
  const items = data.data.items;

  // Group items by section
  const sectionMap: Record<string, ValidatedMenuItem[]> = {};
  let firstImageUrl: string | null = null;

  for (const item of items) {
    const sectionName = item.section || 'Menu';
    if (!sectionMap[sectionName]) {
      sectionMap[sectionName] = [];
    }

    const itemImage = item.imageUrl || item.image_url || item.image || null;
    if (!firstImageUrl && itemImage) {
      firstImageUrl = itemImage;
    }

    sectionMap[sectionName].push({
      id: item.id || `item-${sectionMap[sectionName].length}`,
      name: item.name,
      description: item.description || '',
      menuDescription: item.description || '',
      priceText: item.price_display || item.priceText || '',
      priceCents: item.price || 0,
      imageUrl: itemImage,
      available: true,
      soldOut: false,
      popular: false,
      rating: null,
      hasCustomizations: false,
    });
  }

  const sections: ValidatedMenuSection[] = Object.entries(sectionMap).map(
    ([name, sectionItems], idx) => ({
      id: `section-${idx}`,
      name,
      items: sectionItems,
      itemCount: sectionItems.length,
    })
  );

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

  return {
    ok: true,
    source: 'uber-test-legacy',
    restaurant: {
      id: data.data.query || '',
      name: restaurantName,
      address: address,
      city: '',
      state: '',
      postalCode: '',
      phone: '',
      imageUrl: firstImageUrl,
      rating: null,
      reviewCount: '',
      cuisines: [],
      isOpen: true,
      hours: [],
      deliveryEta: '',
      deliveryFee: '',
      url: '',
    },
    sections,
    meta: {
      totalSections: sections.length,
      totalItems,
      availableItems: totalItems,
      source: 'uber-eats-legacy',
      scrapedAt: new Date().toISOString(),
    },
  };
}

// Fast menu fetch using /menu/uber-test (no strict Google filter)
// This endpoint is faster (~10-30s) and more reliable than /menu/extract
// Note: maxRows controls the number of menu ITEMS returned, not search results
export async function fetchMenuFast(
  restaurantName: string,
  address: string,
  maxRows: number = 100 // Default to 100 items for complete menu
): Promise<{
  ok: boolean;
  source?: string;
  restaurant?: ValidatedRestaurant;
  sections?: ValidatedMenuSection[];
  meta?: ValidatedMenuData['meta'];
  validation?: MenuValidation;
  error?: string;
}> {
  const params = new URLSearchParams({
    query: restaurantName.trim(),
    address: address.trim(),
    maxRows: String(maxRows),
  });

  const url = `${RESTAURANT_API_BASE}/menu/uber-test?${params.toString()}`;
  if (__DEV__) console.log('TB fetchMenuFast calling:', url);

  try {
    // Menu scraping can take a while - use 90 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const raw = await res.text();
    if (__DEV__) console.log('fetchMenuFast raw snippet:', raw.slice(0, 200));

    if (!res.ok) {
      if (__DEV__) console.error('fetchMenuFast HTTP error:', res.status, 'URL:', url, 'Response:', raw.slice(0, 300));
      // Try to parse error response for better error message
      try {
        const errorData = JSON.parse(raw);
        const errorMsg = errorData.error || errorData.hint || `HTTP ${res.status}`;
        const isTimeout = res.status === 504 || errorMsg.toLowerCase().includes('timeout');
        return {
          ok: false,
          error: isTimeout ? 'Menu loading timed out. Please try again.' : errorMsg,
          hint: errorData.hint,
          isTimeout,
        };
      } catch {
        return { ok: false, error: `HTTP ${res.status}` };
      }
    }

    const data = JSON.parse(raw);

    // Handle new validated response format
    if (data.ok && data.data) {
      // New format: data contains { restaurant, sections, meta }
      if (data.data.restaurant && data.data.sections) {
        return {
          ok: true,
          source: 'uber-test-validated',
          restaurant: data.data.restaurant,
          sections: data.data.sections,
          meta: data.data.meta,
          validation: data.validation,
        };
      }

      // Legacy format: data.items array (keep for backwards compatibility)
      if (data.data.items) {
        return transformLegacyMenuData(data, restaurantName, address);
      }
    }

    // Handle validation failure
    if (!data.ok && data.debug?.rejected) {
      if (__DEV__) console.warn('Menu validation failed:', data.error);
      if (__DEV__) console.warn('Rejected restaurants:', data.debug.rejected);
      return {
        ok: false,
        error: data.error || 'No matching restaurant found',
      };
    }

    return { ok: false, error: data.error || 'No items found' };
  } catch (e: any) {
    // Handle abort/timeout separately
    if (e?.name === 'AbortError') {
      if (__DEV__) console.error('fetchMenuFast timeout after 90s');
      return { ok: false, error: 'Menu loading timed out. Please try again.', isTimeout: true };
    }
    if (__DEV__) console.error('fetchMenuFast error:', e?.message || e);
    return { ok: false, error: e?.message || 'Failed to fetch menu' };
  }
}

// Async menu fetch with polling for background job completion
export async function fetchMenuWithRetry(
  placeId: string,
  maxRetries: number = 24, // 24 * 5s = 2 minutes max wait
  retryDelay: number = 5000
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchMenu(placeId);

      // Success - menu is ready
      if (response.ok) {
        return response;
      }

      // Job is processing - wait and retry
      if (response.status === 'processing') {
        if (__DEV__) console.log(
          `TB fetchMenuWithRetry: processing, attempt ${attempt + 1}/${maxRetries}, retrying in ${
            response.retryIn || 5
          }s`
        );
        const waitTime = (response.retryIn || 5) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Job failed recently - wait longer before retry
      if (response.status === 'failed') {
        if (__DEV__) console.log(
          `TB fetchMenuWithRetry: failed, attempt ${attempt + 1}/${maxRetries}, retrying in ${
            response.retryIn || 30
          }s`
        );
        const waitTime = (response.retryIn || 30) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Other error - throw
      throw new Error(response.error || 'Menu fetch failed');
    } catch (err: any) {
      // Network error on last attempt - throw
      if (attempt === maxRetries - 1) {
        throw err;
      }
      // Network error - wait and retry
      if (__DEV__) console.log(
        `TB fetchMenuWithRetry: network error, attempt ${attempt + 1}/${maxRetries}, retrying...`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(
    'Menu loading timed out after ' + Math.floor((maxRetries * retryDelay) / 1000) + ' seconds'
  );
}

// NEW: dish analysis from dish-processor
export interface AnalyzeDishPayload {
  dishName: string;
  restaurantName?: string | null;
  menuDescription?: string;
  menuSection?: string;
  priceText?: string;
  placeId?: string | null;
  source?: string;
  restaurantCalories?: number;
  portionFactor?: number;
  description?: string;
  menu?: any;
  price?: string;
  dishId?: string;
  dishImageUrl?: string;

  // New: unified image + selection contract
  imageUrl?: string | null;
  selection_component_ids?: string[];

  // Request full cookbook-style recipe with LLM instructions
  fullRecipe?: boolean;

  // Skip organs computation (runs in background, use polling to fetch)
  skip_organs?: boolean;

  // Skip detailed allergens computation (runs in background, use polling to fetch)
  skip_allergens?: boolean;

  // Skip full recipe LLM (runs in background, use polling to fetch)
  skip_full_recipe?: boolean;
}

export async function analyzeDish(payload: AnalyzeDishPayload): Promise<AnalyzeDishResponse> {
  const url = `${GATEWAY_BASE_URL}/pipeline/analyze-dish`;
  if (__DEV__) console.log('TB analyzeDish calling:', url, 'with', payload);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  if (__DEV__) console.log('TB analyzeDish raw snippet:', raw.slice(0, 200));

  if (!res.ok) {
    if (__DEV__) console.error('analyzeDish HTTP error:', res.status, raw.slice(0, 80));
    return {
      ok: false,
      error: `HTTP ${res.status}`,
      error_message: 'Analysis service temporarily unavailable. Please try again.',
      // Don't return fake scores - let the UI handle the error state
      tummy_score: undefined,
      organs: undefined,
      allergens: undefined,
      fodmap: undefined,
      insights: undefined,
      _raw: raw,
    } as unknown as AnalyzeDishResponse;
  }

  try {
    const data = JSON.parse(raw);
    if (__DEV__) console.log(
      'TB analyzeDish JSON keys:',
      data && typeof data === 'object' ? Object.keys(data) : typeof data
    );
    return data as AnalyzeDishResponse;
  } catch (e: any) {
    if (__DEV__) console.error('TB analyzeDish JSON.parse failed:', e?.message || String(e));
    return {
      ok: false,
      error: 'parse_error',
      error_message: 'Failed to process analysis response. Please try again.',
      // Don't return fake scores - let the UI handle the error state
      tummy_score: undefined,
      organs: undefined,
      allergens: undefined,
      fodmap: undefined,
      insights: undefined,
      _raw: raw,
    } as unknown as AnalyzeDishResponse;
  }
}

export async function analyzeDishCard(payload: any): Promise<AnalyzeDishCardResponse> {
  const url = `${GATEWAY_BASE_URL}/pipeline/analyze-dish/card`;
  if (__DEV__) console.log('TB analyzeDishCard calling:', url, 'with', payload);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  if (__DEV__) console.log('TB analyzeDishCard raw snippet:', raw.slice(0, 200));

  if (!res.ok) {
    throw new Error(`analyzeDishCard HTTP error: ${res.status} ${raw.slice(0, 120)}`);
  }

  try {
    const data = JSON.parse(raw);
    return data as AnalyzeDishCardResponse;
  } catch (e: any) {
    if (__DEV__) console.error('TB analyzeDishCard JSON.parse failed:', e?.message || String(e));
    throw e;
  }
}

// ============================================================
// Organs Status Polling (for skip_organs optimization)
// ============================================================

export interface OrgansStatusResponse {
  ok: boolean;
  ready: boolean;
  organs?: DishOrgansBlock;
  error?: string;
}

/**
 * Poll for organs computation status when skip_organs=true was used.
 *
 * @param pollKey - The organs_poll_key from the analyze-dish response
 * @returns Status with organs data when ready
 */
export async function getOrgansStatus(pollKey: string): Promise<OrgansStatusResponse> {
  const url = `${GATEWAY_BASE_URL}/pipeline/organs-status?key=${encodeURIComponent(pollKey)}`;
  if (__DEV__) console.log('TB getOrgansStatus calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const text = await res.text();

    if (!res.ok) {
      if (__DEV__) console.error('TB getOrgansStatus HTTP error:', res.status, text.slice(0, 200));
      return {
        ok: false,
        ready: false,
        error: `HTTP ${res.status}: ${text.slice(0, 100)}`,
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr: any) {
      if (__DEV__) console.error('TB getOrgansStatus JSON parse error:', parseErr?.message, text.slice(0, 200));
      return {
        ok: false,
        ready: false,
        error: `Invalid JSON response: ${text.slice(0, 100)}`,
      };
    }

    if (__DEV__) console.log('TB getOrgansStatus response:', JSON.stringify(data).slice(0, 200));
    return data as OrgansStatusResponse;
  } catch (e: any) {
    if (__DEV__) console.error('TB getOrgansStatus error:', e?.message || String(e));
    return {
      ok: false,
      ready: false,
      error: e?.message || 'Failed to get organs status',
    };
  }
}

/**
 * Poll for organs computation until ready or timeout.
 *
 * @param pollKey - The organs_poll_key from the analyze-dish response
 * @param onUpdate - Optional callback when status is checked
 * @param pollIntervalMs - Poll interval in ms (default 2000 = 2s)
 * @param maxAttempts - Maximum poll attempts (default 30 = 60s timeout)
 * @returns Final organs data when ready, or error
 */
export async function pollOrgansStatus(
  pollKey: string,
  onUpdate?: (attempt: number, ready: boolean) => void,
  pollIntervalMs: number = 2000,
  maxAttempts: number = 30
): Promise<OrgansStatusResponse> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getOrgansStatus(pollKey);

    onUpdate?.(attempt, result.ready);

    if (result.ready || !result.ok) {
      return result;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return {
    ok: false,
    ready: false,
    error: `Organs polling timed out after ${maxAttempts} attempts`,
  };
}

// ============================================================
// Allergens Status Polling (for skip_allergens optimization)
// ============================================================

export interface AllergensStatusResponse {
  ok: boolean;
  ready: boolean;
  allergen_flags?: AllergenFlag[];
  fodmap_flags?: FodmapFlag | null;
  lactose_flags?: LactoseFlag | null;
  lifestyle_tags?: LifestyleTag[];
  lifestyle_checks?: LifestyleChecks | null;
  allergen_breakdown?: ComponentAllergenBreakdown[] | null;
  error?: string;
}

/**
 * Poll for allergens computation status when skip_allergens=true was used.
 *
 * @param pollKey - The allergens_poll_key from the analyze-dish response
 * @returns Status with allergen data when ready
 */
export async function getAllergensStatus(pollKey: string): Promise<AllergensStatusResponse> {
  const url = `${GATEWAY_BASE_URL}/pipeline/allergens-status?key=${encodeURIComponent(pollKey)}`;
  if (__DEV__) console.log('TB getAllergensStatus calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const text = await res.text();

    if (!res.ok) {
      if (__DEV__) console.error('TB getAllergensStatus HTTP error:', res.status, text.slice(0, 200));
      return {
        ok: false,
        ready: false,
        error: `HTTP ${res.status}: ${text.slice(0, 100)}`,
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr: any) {
      if (__DEV__) console.error('TB getAllergensStatus JSON parse error:', parseErr?.message, text.slice(0, 200));
      return {
        ok: false,
        ready: false,
        error: `Invalid JSON response: ${text.slice(0, 100)}`,
      };
    }

    if (__DEV__) console.log('TB getAllergensStatus response:', JSON.stringify(data).slice(0, 200));
    return data as AllergensStatusResponse;
  } catch (e: any) {
    if (__DEV__) console.error('TB getAllergensStatus error:', e?.message || String(e));
    return {
      ok: false,
      ready: false,
      error: e?.message || 'Failed to get allergens status',
    };
  }
}

/**
 * Poll for allergens computation until ready or timeout.
 *
 * @param pollKey - The allergens_poll_key from the analyze-dish response
 * @param onUpdate - Optional callback when status is checked
 * @param pollIntervalMs - Poll interval in ms (default 2000 = 2s)
 * @param maxAttempts - Maximum poll attempts (default 30 = 60s timeout)
 * @returns Final allergens data when ready, or error
 */
export async function pollAllergensStatus(
  pollKey: string,
  onUpdate?: (attempt: number, ready: boolean) => void,
  pollIntervalMs: number = 2000,
  maxAttempts: number = 30
): Promise<AllergensStatusResponse> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getAllergensStatus(pollKey);

    onUpdate?.(attempt, result.ready);

    if (result.ready || !result.ok) {
      return result;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return {
    ok: false,
    ready: false,
    error: `Allergens polling timed out after ${maxAttempts} attempts`,
  };
}

// ============================================================
// Full Recipe Status Polling (for skip_full_recipe optimization)
// ============================================================

export interface FullRecipeStatusResponse {
  ok: boolean;
  ready: boolean;
  full_recipe?: FullRecipeResponse | null;
  error?: string;
}

/**
 * Poll for full recipe status when skip_full_recipe=true was used.
 *
 * @param pollKey - The full_recipe_poll_key from the analyze-dish response
 * @returns Status with full recipe data when ready
 */
export async function getFullRecipeStatus(pollKey: string): Promise<FullRecipeStatusResponse> {
  const url = `${GATEWAY_BASE_URL}/pipeline/full-recipe-status?key=${encodeURIComponent(pollKey)}`;
  if (__DEV__) console.log('TB getFullRecipeStatus calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const text = await res.text();

    if (!res.ok) {
      if (__DEV__) console.error('TB getFullRecipeStatus HTTP error:', res.status, text.slice(0, 200));
      return {
        ok: false,
        ready: false,
        error: `HTTP ${res.status}: ${text.slice(0, 100)}`,
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr: any) {
      if (__DEV__) console.error('TB getFullRecipeStatus JSON parse error:', parseErr?.message, text.slice(0, 200));
      return {
        ok: false,
        ready: false,
        error: `Invalid JSON response: ${text.slice(0, 100)}`,
      };
    }

    if (__DEV__) console.log('TB getFullRecipeStatus response:', JSON.stringify(data).slice(0, 200));
    return data as FullRecipeStatusResponse;
  } catch (e: any) {
    if (__DEV__) console.error('TB getFullRecipeStatus error:', e?.message || String(e));
    return {
      ok: false,
      ready: false,
      error: e?.message || 'Failed to get full recipe status',
    };
  }
}

/**
 * Poll for full recipe until ready or timeout.
 *
 * @param pollKey - The full_recipe_poll_key from the analyze-dish response
 * @param onUpdate - Optional callback when status is checked
 * @param pollIntervalMs - Poll interval in ms (default 2000 = 2s)
 * @param maxAttempts - Maximum poll attempts (default 30 = 60s timeout)
 * @returns Final full recipe data when ready, or error
 */
export async function pollFullRecipeStatus(
  pollKey: string,
  onUpdate?: (attempt: number, ready: boolean) => void,
  pollIntervalMs: number = 2000,
  maxAttempts: number = 30
): Promise<FullRecipeStatusResponse> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getFullRecipeStatus(pollKey);

    onUpdate?.(attempt, result.ready);

    if (result.ready || !result.ok) {
      return result;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return {
    ok: false,
    ready: false,
    error: `Full recipe polling timed out after ${maxAttempts} attempts`,
  };
}

// ============================================================
// Batch Analysis (parallel dish analysis for restaurant pages)
// ============================================================

export interface BatchDishInput {
  dishName: string;
  description?: string;
  section?: string;
  imageUrl?: string | null;
  priceText?: string;
  restaurantCalories?: number | null;
}

export interface BatchJobInfo {
  jobId: string;
  dishName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cached';
  result?: AnalyzeDishResponse | null;
  // When polling with results=1, backend includes job file data
  data?: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
    result?: AnalyzeDishResponse | null;
  };
}

export interface BatchAnalysisResponse {
  ok: boolean;
  batchId: string;
  jobs: BatchJobInfo[];
  totalCount: number;
  completedCount: number;
  failedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'partial';
}

export interface BatchStatusResponse {
  ok: boolean;
  rateLimited?: boolean;
  batch: BatchAnalysisResponse;
}

/**
 * Start batch analysis for multiple dishes at once.
 * Returns immediately with job IDs for each dish.
 * Some dishes may already have cached results.
 *
 * @param restaurantName - Restaurant name for context
 * @param dishes - Array of dishes to analyze
 * @param concurrency - Max parallel analyses (default 5)
 */
export async function startBatchAnalysis(
  restaurantName: string,
  dishes: BatchDishInput[],
  concurrency: number = 5
): Promise<BatchAnalysisResponse> {
  const url = `${GATEWAY_BASE_URL}/api/analyze/batch`;
  if (__DEV__) console.log('TB startBatchAnalysis calling:', url, 'with', dishes.length, 'dishes');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantName,
        dishes,
        concurrency,
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      if (__DEV__) console.error('TB startBatchAnalysis HTTP error:', res.status, text.slice(0, 200));
      // Return a fallback response so frontend can still work with individual analysis
      return {
        ok: false,
        batchId: '',
        jobs: dishes.map((d, i) => ({
          jobId: `fallback-${i}`,
          dishName: d.dishName,
          status: 'failed' as const,
          result: null,
        })),
        totalCount: dishes.length,
        completedCount: 0,
        failedCount: dishes.length,
        status: 'failed' as any,
      };
    }

    const data = JSON.parse(text);
    return data as BatchAnalysisResponse;
  } catch (err: any) {
    if (__DEV__) console.error('TB startBatchAnalysis error:', err?.message || err);
    return {
      ok: false,
      batchId: '',
      jobs: dishes.map((d, i) => ({
        jobId: `error-${i}`,
        dishName: d.dishName,
        status: 'failed' as const,
        result: null,
      })),
      totalCount: dishes.length,
      completedCount: 0,
      failedCount: dishes.length,
      status: 'failed' as any,
    };
  }
}

/**
 * Poll for batch analysis status.
 * Returns current status of all jobs in the batch.
 *
 * @param batchId - Batch ID from startBatchAnalysis
 * @param includeResults - Include full results in response (default true)
 */
export async function getBatchStatus(
  batchId: string,
  includeResults: boolean = true
): Promise<BatchStatusResponse> {
  const params = new URLSearchParams({
    batchId,
    results: includeResults ? '1' : '0',
  });

  const url = `${GATEWAY_BASE_URL}/api/analyze/batch/status?${params.toString()}`;

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    const text = await res.text();

    if (!res.ok) {
      if (__DEV__) console.error('TB getBatchStatus HTTP error:', res.status, text.slice(0, 200));
      // Return special status for rate limiting so polling can back off
      const isRateLimited = res.status === 429;
      return {
        ok: false,
        rateLimited: isRateLimited,
        batch: {
          ok: false,
          batchId,
          jobs: [],
          totalCount: 0,
          completedCount: 0,
          failedCount: 0,
          status: isRateLimited ? ('rate_limited' as any) : ('failed' as any),
        },
      };
    }

    const data = JSON.parse(text);
    return data as BatchStatusResponse;
  } catch (err: any) {
    // Network errors during polling are expected - downgrade to warning
    const isAbort = err?.name === 'AbortError';
    const msg = isAbort ? 'request timeout' : (err?.message || err);
    if (__DEV__) console.warn('TB getBatchStatus network issue:', msg);
    return {
      ok: false,
      batch: {
        ok: false,
        batchId,
        jobs: [],
        totalCount: 0,
        completedCount: 0,
        failedCount: 0,
        status: 'failed' as any,
      },
    };
  }
}

/**
 * Request priority processing for a specific dish.
 * Use when user clicks on a dish that hasn't been analyzed yet.
 *
 * @param jobId - Job ID from batch
 * @param dish - Dish payload for immediate analysis if needed
 */
export async function priorityAnalysis(
  jobId: string,
  dish: BatchDishInput & { restaurantName: string }
): Promise<{ ok: boolean; status: string; result?: AnalyzeDishResponse }> {
  const url = `${GATEWAY_BASE_URL}/api/analyze/batch/priority`;
  if (__DEV__) console.log('TB priorityAnalysis calling:', url, 'for job:', jobId);

  // Retry logic for network errors
  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, dish }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const text = await res.text();

      if (!res.ok) {
        if (__DEV__) console.error('TB priorityAnalysis HTTP error:', res.status, text.slice(0, 200));
        // Fallback to direct analysis
        return {
          ok: false,
          status: 'fallback',
        };
      }

      const data = JSON.parse(text);
      return data;
    } catch (err: any) {
      lastError = err;
      const isNetworkError = err?.message?.includes('Network request failed') ||
                             err?.name === 'AbortError' ||
                             err?.message?.includes('aborted');

      if (isNetworkError && attempt < maxRetries) {
        if (__DEV__) console.log(`TB priorityAnalysis retry ${attempt + 1}/${maxRetries} after error:`, err?.message);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      if (__DEV__) console.error('TB priorityAnalysis error:', err?.message || err);
      return { ok: false, status: 'error' };
    }
  }

  if (__DEV__) console.error('TB priorityAnalysis all retries failed:', lastError?.message || lastError);
  return { ok: false, status: 'error' };
}

/**
 * Poll batch status until all jobs complete or timeout.
 *
 * @param batchId - Batch ID to poll
 * @param onDishComplete - Callback for each completed dish
 * @param pollIntervalMs - Polling interval (default 3000ms)
 * @param maxAttempts - Max polling attempts (default 60 = 3 minutes)
 */
export async function pollBatchUntilComplete(
  batchId: string,
  onDishComplete: (jobId: string, dishName: string, result: AnalyzeDishResponse) => void,
  pollIntervalMs: number = 3000,
  maxAttempts: number = 60
): Promise<BatchAnalysisResponse | null> {
  const completedJobs = new Set<string>();
  let currentInterval = pollIntervalMs;
  let rateLimitBackoffs = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusRes = await getBatchStatus(batchId, true);

    if (!statusRes.ok) {
      // Handle rate limiting with exponential backoff
      if (statusRes.rateLimited) {
        rateLimitBackoffs++;
        const backoffMs = Math.min(pollIntervalMs * Math.pow(2, rateLimitBackoffs), 30000);
        if (__DEV__) console.log(`TB pollBatchUntilComplete: rate limited, backing off ${backoffMs}ms (attempt ${attempt})`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      if (__DEV__) console.log('TB pollBatchUntilComplete: batch status error, attempt', attempt);
      await new Promise((resolve) => setTimeout(resolve, currentInterval));
      continue;
    }

    // Reset backoff on successful request
    rateLimitBackoffs = 0;
    currentInterval = pollIntervalMs;

    const batch = statusRes.batch;

    // Notify for newly completed dishes (includes 'cached' status from backend)
    for (const job of batch.jobs) {
      // Check both paths: job.result (initial response) and job.data?.result (polling response)
      const jobResult = job.result || job.data?.result;
      const jobStatus = job.data?.status || job.status;

      if ((jobStatus === 'completed' || jobStatus === 'cached') && jobResult && !completedJobs.has(job.jobId)) {
        completedJobs.add(job.jobId);
        onDishComplete(job.jobId, job.dishName, jobResult);
      }
    }

    // Check if batch is done
    if (
      batch.status === 'completed' ||
      batch.completedCount + batch.failedCount >= batch.totalCount
    ) {
      if (__DEV__) console.log('TB pollBatchUntilComplete: batch completed after', attempt, 'attempts');
      return batch;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, currentInterval));
  }

  if (__DEV__) console.log('TB pollBatchUntilComplete: timeout after', maxAttempts, 'attempts');
  return null;
}

// ============================================================
// Apify Async Menu Scraping (for background prefetching)
// ============================================================

// ============================================================
// Updated Types for Validated Menu Data
// ============================================================

export interface ValidatedMenuItem {
  id: string;
  name: string;
  description: string;
  menuDescription: string;
  priceText: string;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  soldOut: boolean;
  popular: boolean;
  rating: string | null;
  hasCustomizations: boolean;
}

export interface ValidatedMenuSection {
  id: string;
  name: string;
  items: ValidatedMenuItem[];
  itemCount: number;
}

export interface ValidatedRestaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: string;
  cuisines: string[];
  isOpen: boolean;
  hours: Array<{ days: string; hours: string }>;
  deliveryEta: string;
  deliveryFee: string;
  url: string;
}

export interface ValidatedMenuData {
  restaurant: ValidatedRestaurant;
  sections: ValidatedMenuSection[];
  meta: {
    totalSections: number;
    totalItems: number;
    availableItems: number;
    source: string;
    scrapedAt: string;
  };
}

export interface MenuValidation {
  confidence: number;
  matchedName: string;
  requestedName: string;
  alternativeMatches?: number;
  rejectedCount?: number;
}

export interface ApifyJobStartResponse {
  ok: boolean;
  jobId: string;
  status: 'started' | 'already_cached';
  runId?: string;
  message?: string;
  data?: ValidatedMenuData; // Present if already cached (validated format)
  validation?: MenuValidation; // Validation info if data is cached
}

// Updated job status response with validation support
export interface ApifyJobStatusResponse {
  ok: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'not_found';
  jobId?: string;
  runId?: string;
  datasetId?: string;
  resultCount?: number;
  // NEW: Validated and transformed data
  data?: ValidatedMenuData;
  validation?: MenuValidation;
  error?: string;
  // Debug info for troubleshooting
  debug?: {
    query: string;
    resultsCount: number;
    rejected?: Array<{
      name: string;
      reason: string;
      scores: { name: number; location: number; combined: number };
    }>;
  };
}

/**
 * Start an async Apify scraping job for a restaurant.
 * Returns immediately with a jobId that can be polled.
 *
 * @param restaurantName - Restaurant name to search for (be specific!)
 * @param address - Full address for the search (more specific = better)
 * @param maxRows - Max results (default 3, max 5 to reduce cross-contamination)
 */
export async function startApifyScrape(
  restaurantName: string,
  address: string,
  maxRows: number = 3 // REDUCED from 5 to 3
): Promise<ApifyJobStartResponse> {
  // Validate inputs
  const cleanName = restaurantName.trim();
  const cleanAddress = address.trim();

  if (!cleanName || !cleanAddress) {
    return {
      ok: false,
      jobId: '',
      status: 'started',
      message: 'Restaurant name and address are required',
    };
  }

  const params = new URLSearchParams({
    query: cleanName,
    address: cleanAddress,
    maxRows: String(Math.min(maxRows, 5)), // Cap at 5
  });

  const url = `${API_BASE_URL}/api/apify-start?${params.toString()}`;
  if (__DEV__) console.log('TB startApifyScrape calling:', url);
  if (__DEV__) console.log('TB startApifyScrape params:', { query: cleanName, address: cleanAddress, maxRows });

  try {
    const res = await fetch(url);
    const text = await res.text();

    // Guard against non-JSON responses (HTML error pages, etc.)
    if (!res.ok) {
      if (__DEV__) console.error('TB startApifyScrape HTTP error:', res.status, text.slice(0, 200));
      return {
        ok: false,
        jobId: '',
        status: 'started',
        message: `HTTP ${res.status}: ${text.slice(0, 100)}`,
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr: any) {
      if (__DEV__) console.error('TB startApifyScrape JSON parse error:', parseErr?.message, text.slice(0, 200));
      return {
        ok: false,
        jobId: '',
        status: 'started',
        message: `Invalid JSON response: ${text.slice(0, 100)}`,
      };
    }

    if (__DEV__) console.log('TB startApifyScrape response:', data);
    return data as ApifyJobStartResponse;
  } catch (e: any) {
    if (__DEV__) console.error('TB startApifyScrape error:', e?.message || String(e));
    return {
      ok: false,
      jobId: '',
      status: 'started',
      message: e?.message || 'Failed to start scrape',
    };
  }
}

/**
 * Check the status of an Apify scraping job.
 * Now returns validated and transformed menu data.
 *
 * @param jobId - The job ID returned from startApifyScrape
 */
export async function getApifyJobStatus(jobId: string): Promise<ApifyJobStatusResponse> {
  const url = `${API_BASE_URL}/api/apify-job/${encodeURIComponent(jobId)}`;
  if (__DEV__) console.log('TB getApifyJobStatus calling:', url);

  try {
    const res = await fetch(url);
    const text = await res.text();

    // Guard against non-JSON responses (HTML error pages, etc.)
    if (!res.ok) {
      if (__DEV__) console.error('TB getApifyJobStatus HTTP error:', res.status, text.slice(0, 200));
      return {
        ok: false,
        status: 'failed',
        error: `HTTP ${res.status}: ${text.slice(0, 100)}`,
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr: any) {
      if (__DEV__) console.error(
        'TB getApifyJobStatus JSON parse error:',
        parseErr?.message,
        text.slice(0, 200)
      );
      return {
        ok: false,
        status: 'failed',
        error: `Invalid JSON response: ${text.slice(0, 100)}`,
      };
    }

    if (__DEV__) console.log('TB getApifyJobStatus response:', JSON.stringify(data).slice(0, 300));

    // Handle validation failure from backend
    if (data.status === 'completed' && !data.ok) {
      if (__DEV__) console.warn('TB Menu validation failed:', data.error);
      if (data.debug?.rejected) {
        if (__DEV__) console.warn('TB Rejected restaurants:', data.debug.rejected);
      }
      return {
        ok: false,
        status: 'failed',
        error: data.error || 'No matching restaurant found',
        debug: data.debug,
      };
    }

    // Log validation info if present
    if (data.validation) {
      if (__DEV__) console.log('TB Menu validation:', {
        confidence: `${(data.validation.confidence * 100).toFixed(0)}%`,
        matched: data.validation.matchedName,
        requested: data.validation.requestedName,
      });
    }

    return data as ApifyJobStatusResponse;
  } catch (e: any) {
    if (__DEV__) console.error('TB getApifyJobStatus error:', e?.message || String(e));
    return {
      ok: false,
      status: 'failed',
      error: e?.message || 'Failed to get job status',
    };
  }
}

/**
 * Poll for Apify job completion with configurable intervals.
 *
 * @param jobId - The job ID to poll
 * @param onStatusChange - Optional callback when status changes
 * @param maxWaitMs - Maximum wait time in ms (default 60s)
 * @param pollIntervalMs - Poll interval in ms (default 3s)
 */
export async function pollApifyJob(
  jobId: string,
  onStatusChange?: (status: ApifyJobStatusResponse) => void,
  maxWaitMs: number = 60000,
  pollIntervalMs: number = 3000
): Promise<ApifyJobStatusResponse> {
  const startTime = Date.now();
  let lastStatus = '';

  while (Date.now() - startTime < maxWaitMs) {
    const result = await getApifyJobStatus(jobId);

    if (result.status !== lastStatus) {
      lastStatus = result.status;
      onStatusChange?.(result);
    }

    if (
      result.status === 'completed' ||
      result.status === 'failed' ||
      result.status === 'not_found'
    ) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return {
    ok: false,
    status: 'failed',
    error: 'Polling timed out',
  };
}

// ============================================================
// Image Upload API (for photo analysis)
// ============================================================

export interface UploadImageResponse {
  ok: boolean;
  url?: string;
  key?: string;
  size?: number;
  mimeType?: string;
  error?: string;
}

/**
 * Upload a base64-encoded image to the server for dish analysis.
 * Returns a public URL that can be used with analyzeDish.
 *
 * @param base64Image - Base64-encoded image (with or without data URL prefix)
 * @param mimeType - Image MIME type (default: 'image/jpeg')
 * @returns Upload result with public URL
 *
 * @example
 * const result = await uploadDishImage(base64String, 'image/jpeg');
 * if (result.ok) {
 *   const analysis = await analyzeDish({ dishName: 'Unknown Dish', imageUrl: result.url });
 * }
 */
export async function uploadDishImage(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<UploadImageResponse> {
  const url = `${API_BASE_URL}/api/upload-image`;
  if (__DEV__) console.log('uploadDishImage calling:', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        mimeType,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('uploadDishImage HTTP error:', res.status);
      return {
        ok: false,
        error: data?.error || `HTTP ${res.status}`,
      };
    }

    return data as UploadImageResponse;
  } catch (e: any) {
    if (__DEV__) console.error('uploadDishImage error:', e?.message || e);
    return {
      ok: false,
      error: e?.message || 'Network error',
    };
  }
}

// ============================================================
// Dish Autocomplete / Spell Suggest API
// ============================================================

export interface DishSuggestion {
  id: number;
  name: string;
  cuisine: string | null;
  category: string | null;
  similarity: number;
  score: number;
}

export interface DishSuggestResponse {
  ok: boolean;
  query: string;
  suggestions: DishSuggestion[];
  count: number;
  message?: string;
  error?: string;
}

/**
 * Get dish name suggestions with typo tolerance.
 * Uses FTS5 + Levenshtein distance for fuzzy matching.
 *
 * @param query - User's search query (can be misspelled)
 * @param options - Optional filters: limit, cuisine
 * @returns Array of dish suggestions sorted by relevance
 *
 * @example
 * const suggestions = await getDishSuggestions('chiken parm');
 * // Returns: [{ name: 'Chicken Parmesan', similarity: 0.93, ... }]
 */
export async function getDishSuggestions(
  query: string,
  options?: { limit?: number; cuisine?: string }
): Promise<DishSuggestResponse> {
  const params = new URLSearchParams();
  params.set('q', query);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.cuisine) params.set('cuisine', options.cuisine);

  const url = `${API_BASE_URL}/api/dish-suggest?${params.toString()}`;
  if (__DEV__) console.log('getDishSuggestions calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('getDishSuggestions HTTP error:', res.status);
      return {
        ok: false,
        query,
        suggestions: [],
        count: 0,
        error: data?.error || `HTTP ${res.status}`,
      };
    }

    return data as DishSuggestResponse;
  } catch (e: any) {
    if (__DEV__) console.error('getDishSuggestions error:', e?.message || e);
    return {
      ok: false,
      query,
      suggestions: [],
      count: 0,
      error: e?.message || 'Network error',
    };
  }
}

// ============================================================
// User Tracking & Meal Logging API
// ============================================================

// Get today's date in YYYY-MM-DD format
// Uses local timezone but logs for debugging timezone issues
export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const localDate = `${year}-${month}-${day}`;

  // Also get UTC date for comparison
  const utcYear = now.getUTCFullYear();
  const utcMonth = String(now.getUTCMonth() + 1).padStart(2, '0');
  const utcDay = String(now.getUTCDate()).padStart(2, '0');
  const utcDate = `${utcYear}-${utcMonth}-${utcDay}`;

  if (__DEV__) console.log('[getTodayDate] Local:', localDate, 'UTC:', utcDate, 'TZ offset:', now.getTimezoneOffset(), 'minutes');

  // Use UTC date to match server time (Cloudflare Workers use UTC)
  return utcDate;
}

// User Profile Types
export interface UserProfile {
  user_id: string;
  display_name?: string | null;
  sex?: 'male' | 'female' | null;
  biological_sex?: 'male' | 'female' | null;
  birth_year?: number | null;
  date_of_birth?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  current_weight_kg?: number | null;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  primary_goal?: 'lose_weight' | 'maintain' | 'build_muscle' | 'improve_health' | 'manage_condition' | null;
  goals?: string[] | null;
  unit_system?: 'imperial' | 'metric' | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserDailyTargets {
  user_id: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  source: 'calculated' | 'manual';
  bmr?: number | null;
  tdee?: number | null;
}

export interface UserAllergen {
  user_id: string;
  allergen_code: string;
  severity: 'avoid' | 'limit' | 'monitor';
  display_name?: string;
  category?: string;
}

export interface UserOrganPriority {
  user_id: string;
  organ_code: string;
  priority_rank?: number;
  is_starred: boolean;
  display_name?: string;
}

export type PortionMode = 'preset' | 'custom' | 'shared' | 'leftovers' | 'count';

// Photo analysis status for meal logging
export type PhotoAnalysisStatus = 'pending_after_photo' | 'analyzing' | 'completed' | 'manual';

// Individual item breakdown from photo analysis
export interface PhotoAnalysisItem {
  name: string;
  percentConsumed: number;
  caloriesEaten: number;
  caloriesLeft: number;
}

// Photo analysis result
export interface PhotoAnalysisResult {
  percentConsumed: number;
  caloriesEaten: number;
  caloriesLeft: number;
  items: PhotoAnalysisItem[];
  confidence: number;
}

export interface LoggedMeal {
  id: number;
  user_id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dish_name: string;
  dish_id?: string | null;
  restaurant_name?: string | null;
  portion_factor: number;
  // Portion & Sharing fields
  portion_percent?: number | null;
  portion_multiplier?: number | null;
  shared_with_count?: number | null;
  leftovers_saved?: boolean | null;
  portion_mode?: PortionMode | null;
  // Photo analysis fields
  photo_status?: PhotoAnalysisStatus | null;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  photo_analysis?: PhotoAnalysisResult | null;
  // Baseline values (full serving, before portion scaling)
  baseline_calories?: number | null;
  baseline_protein_g?: number | null;
  baseline_carbs_g?: number | null;
  baseline_fat_g?: number | null;
  baseline_fiber_g?: number | null;
  baseline_sugar_g?: number | null;
  baseline_sodium_mg?: number | null;
  baseline_organ_impacts?: Record<string, number> | null;
  // Consumed values (after portion scaling) - for display
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
  organ_impacts?: Record<string, number> | null;
  risk_flags?: string[] | null;
  logged_at: string;
}

export interface DailySummary {
  user_id: string;
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  total_sugar_g: number;
  total_sodium_mg: number;
  meal_count: number;
  organ_scores?: Record<string, number> | null;
  daily_insight?: string | null;
}

export interface WeightEntry {
  id: number;
  user_id: string;
  weight_kg: number;
  recorded_at: string;
}

export interface SavedDish {
  id: number;
  user_id: string;
  dish_name: string;
  dish_id?: string | null;
  restaurant_name?: string | null;
  saved_at: string;
  full_analysis?: any | null;
}

export interface AllergenDefinition {
  allergen_code: string;
  display_name: string;
  category: string;
  description?: string | null;
}

// API Response Types
interface UserProfileResponse {
  ok: boolean;
  profile?: UserProfile | null;
  targets?: UserDailyTargets | null;
  allergens?: UserAllergen[];
  organPriorities?: UserOrganPriority[];
  error?: string;
}

interface UpdateProfileResponse {
  ok: boolean;
  profile?: UserProfile | null;
  targets?: UserDailyTargets | null;
  error?: string;
}

interface AllergensResponse {
  ok: boolean;
  allergens?: UserAllergen[];
  targets?: UserDailyTargets | null;
  error?: string;
}

interface OrganPrioritiesResponse {
  ok: boolean;
  organPriorities?: UserOrganPriority[];
  error?: string;
}

interface WeightResponse {
  ok: boolean;
  entry?: WeightEntry | null;
  profile?: UserProfile | null;
  error?: string;
}

interface LogMealResponse {
  ok: boolean;
  meal?: LoggedMeal | null;
  duplicate?: boolean;
  error?: string;
}

interface MealsResponse {
  ok: boolean;
  meals?: LoggedMeal[];
  error?: string;
}

interface DeleteMealResponse {
  ok: boolean;
  error?: string;
}

interface DailyTrackerResponse {
  ok: boolean;
  date: string;
  summary?: DailySummary | null;
  meals?: LoggedMeal[];
  targets?: UserDailyTargets | null;
  error?: string;
}

interface WeeklyTrackerResponse {
  ok: boolean;
  summaries?: DailySummary[];
  weeklyAverages?: {
    avg_calories: number;
    avg_protein_g: number;
    avg_carbs_g: number;
    avg_fat_g: number;
    days_logged: number;
  } | null;
  error?: string;
}

interface AllergenDefinitionsResponse {
  ok: boolean;
  allergens?: AllergenDefinition[];
  error?: string;
}

// ============================================================
// User Profile API Functions
// ============================================================

/**
 * Map backend targets response to frontend interface
 */
function mapTargetsResponse(targets: any): UserDailyTargets | null {
  if (!targets) return null;
  return {
    user_id: targets.user_id,
    calories: targets.calories_target || targets.calories || 0,
    protein_g: targets.protein_target_g || targets.protein_g || 0,
    carbs_g: targets.carbs_target_g || targets.carbs_g || 0,
    fat_g: targets.fat_target_g || targets.fat_g || 0,
    fiber_g: targets.fiber_target_g || targets.fiber_g || 0,
    sugar_g: targets.sugar_limit_g || targets.sugar_g || 0,
    sodium_mg: targets.sodium_limit_mg || targets.sodium_mg || 0,
    source: targets.source || 'calculated',
    bmr: targets.bmr_kcal || targets.bmr || null,
    tdee: targets.tdee_kcal || targets.tdee || null,
  };
}

/**
 * Get user profile, targets, allergens, and organ priorities
 */
export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  const url = `${API_BASE_URL}/api/profile?user_id=${encodeURIComponent(userId)}`;
  if (__DEV__) console.log('getUserProfile calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('getUserProfile HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    // Map targets to frontend interface
    return {
      ok: data.ok,
      profile: data.profile,
      targets: mapTargetsResponse(data.targets),
      allergens: data.allergens,
      organPriorities: data.organPriorities,
      error: data.error,
    };
  } catch (e: any) {
    if (__DEV__) console.error('getUserProfile error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Update user profile (sex, birth_year, height, weight, activity_level, goal)
 */
export async function updateUserProfile(
  userId: string,
  profileData: Partial<UserProfile>
): Promise<UpdateProfileResponse> {
  const url = `${API_BASE_URL}/api/profile`;
  if (__DEV__) console.log('updateUserProfile calling:', url, profileData);

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ...profileData, user_id: userId }),
    });

    const data = await res.json();
    if (__DEV__) console.log('updateUserProfile response:', JSON.stringify(data, null, 2));

    if (!res.ok) {
      if (__DEV__) console.error('updateUserProfile HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    // Map targets to frontend interface
    return {
      ok: data.ok,
      profile: data.profile,
      targets: mapTargetsResponse(data.targets),
      error: data.error,
    };
  } catch (e: any) {
    if (__DEV__) console.error('updateUserProfile error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Set user allergens (replaces all existing allergens)
 */
export async function setUserAllergens(
  userId: string,
  allergens: Array<{ allergen_code: string; severity: 'avoid' | 'limit' | 'monitor' }>
): Promise<AllergensResponse> {
  const url = `${API_BASE_URL}/api/profile/allergens`;
  if (__DEV__) console.log('setUserAllergens calling:', url, allergens);

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ user_id: userId, allergens }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('setUserAllergens HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as AllergensResponse;
  } catch (e: any) {
    if (__DEV__) console.error('setUserAllergens error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Set user organ priorities (replaces all existing priorities)
 */
export async function setUserOrganPriorities(
  userId: string,
  organs: Array<{ organ_code: string; priority_rank?: number; is_starred?: boolean }>
): Promise<OrganPrioritiesResponse> {
  const url = `${API_BASE_URL}/api/profile/organs`;
  if (__DEV__) console.log('setUserOrganPriorities calling:', url, organs);

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ user_id: userId, organs }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('setUserOrganPriorities HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as OrganPrioritiesResponse;
  } catch (e: any) {
    if (__DEV__) console.error('setUserOrganPriorities error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Add a weight entry and update profile
 */
export async function addWeightEntry(userId: string, weightKg: number): Promise<WeightResponse> {
  const url = `${API_BASE_URL}/api/profile/weight`;
  if (__DEV__) console.log('addWeightEntry calling:', url, { weight_kg: weightKg });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ user_id: userId, weight_kg: weightKg }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('addWeightEntry HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as WeightResponse;
  } catch (e: any) {
    if (__DEV__) console.error('addWeightEntry error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

// ============================================================
// Meal Logging API Functions
// ============================================================

/**
 * Log a meal for the user
 */
export async function logMeal(
  userId: string,
  mealData: {
    dish_name: string;
    dish_id?: string;
    restaurant_name?: string;
    meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    portion_factor?: number;
    // Portion & Sharing fields
    portion_percent?: number;
    portion_multiplier?: number;
    shared_with_count?: number | null;
    leftovers_saved?: boolean;
    portion_mode?: PortionMode;
    // Baseline values (full serving)
    baseline_calories?: number;
    baseline_protein_g?: number;
    baseline_carbs_g?: number;
    baseline_fat_g?: number;
    baseline_fiber_g?: number;
    baseline_sugar_g?: number;
    baseline_sodium_mg?: number;
    baseline_organ_impacts?: Record<string, number>;
    // Consumed values (after portion scaling)
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    organ_impacts?: Record<string, number>;
    risk_flags?: string[];
    full_analysis?: any;
    // Photo analysis fields
    photo_status?: 'pending_after_photo' | 'analyzing' | 'completed' | 'manual' | null;
    before_photo_url?: string;
    after_photo_url?: string;
  }
): Promise<LogMealResponse> {
  const url = `${API_BASE_URL}/api/meals/log`;
  if (__DEV__) console.log('logMeal calling:', url, mealData);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ...mealData, user_id: userId }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('logMeal HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as LogMealResponse;
  } catch (e: any) {
    if (__DEV__) console.error('logMeal error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Get meals for a specific date
 */
export async function getMeals(userId: string, date?: string): Promise<MealsResponse> {
  const targetDate = date || getTodayDate();
  const url = `${API_BASE_URL}/api/meals?user_id=${encodeURIComponent(userId)}&date=${targetDate}`;
  if (__DEV__) console.log('getMeals calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('getMeals HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as MealsResponse;
  } catch (e: any) {
    if (__DEV__) console.error('getMeals error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Get meals for a specific date (returns array directly)
 */
export async function getMealsForDate(userId: string, date?: string): Promise<LoggedMeal[]> {
  const result = await getMeals(userId, date);
  return result.ok && result.meals ? result.meals : [];
}

/**
 * Delete a logged meal
 */
export async function deleteMeal(userId: string, mealId: number): Promise<DeleteMealResponse> {
  const url = `${API_BASE_URL}/api/meals/${mealId}?user_id=${encodeURIComponent(userId)}`;
  if (__DEV__) console.log('deleteMeal calling:', url);

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('deleteMeal HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as DeleteMealResponse;
  } catch (e: any) {
    if (__DEV__) console.error('deleteMeal error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

interface UpdateMealPortionResponse {
  ok: boolean;
  meal?: LoggedMeal;
  error?: string;
}

/**
 * Update portion data for an existing logged meal
 * This is a local-only operation that scales baseline values
 */
export async function updateMealPortion(
  userId: string,
  mealId: number,
  portionData: {
    portion_percent: number;
    portion_multiplier: number;
    shared_with_count?: number | null;
    leftovers_saved?: boolean;
    portion_mode?: PortionMode;
  }
): Promise<UpdateMealPortionResponse> {
  const url = `${API_BASE_URL}/api/meals/${mealId}/portion`;
  if (__DEV__) console.log('updateMealPortion calling:', url, portionData);

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ...portionData, user_id: userId }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('updateMealPortion HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as UpdateMealPortionResponse;
  } catch (e: any) {
    if (__DEV__) console.error('updateMealPortion error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Update a meal's fields (photo_status, portion_percent, calories, etc.)
 * This is a general update function for meal modifications
 */
export async function updateMeal(
  userId: string,
  mealId: number,
  updates: {
    photo_status?: 'pending_after_photo' | 'analyzing' | 'completed' | 'manual' | null;
    portion_percent?: number;
    calories?: number;
    after_photo_url?: string;
  }
): Promise<{ ok: boolean; meal?: LoggedMeal; error?: string }> {
  const url = `${API_BASE_URL}/api/meals/${mealId}?user_id=${userId}`;
  if (__DEV__) console.log('updateMeal calling:', url, updates);

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('updateMeal HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return { ok: true, meal: data.meal };
  } catch (e: any) {
    if (__DEV__) console.error('updateMeal error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

// ============================================================
// Daily & Weekly Tracker API Functions
// ============================================================

/**
 * Get daily tracker data (summary, meals, targets) for a specific date
 */
export async function getDailyTracker(
  userId: string,
  date?: string
): Promise<DailyTrackerResponse> {
  const targetDate = date || getTodayDate();
  const url = `${API_BASE_URL}/api/tracker/daily?user_id=${encodeURIComponent(
    userId
  )}&date=${targetDate}`;
  if (__DEV__) console.log('getDailyTracker calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('getDailyTracker HTTP error:', res.status);
      return { ok: false, date: targetDate, error: data?.error || `HTTP ${res.status}` };
    }

    return { ...data, date: targetDate } as DailyTrackerResponse;
  } catch (e: any) {
    if (__DEV__) console.error('getDailyTracker error:', e?.message || e);
    return { ok: false, date: targetDate, error: e?.message || 'Network error' };
  }
}

/**
 * Get weekly tracker data (daily summaries + averages for last 7 days)
 */
export async function getWeeklyTracker(userId: string): Promise<WeeklyTrackerResponse> {
  const url = `${API_BASE_URL}/api/tracker/weekly?user_id=${encodeURIComponent(userId)}`;
  if (__DEV__) console.log('getWeeklyTracker calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();
    if (__DEV__) console.log('getWeeklyTracker raw response:', JSON.stringify(data, null, 2));

    if (!res.ok) {
      if (__DEV__) console.error('getWeeklyTracker HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    // Map backend response fields to expected interface
    // Backend returns: daily_summaries (with summary_date, meals_logged), averages
    // Frontend expects: summaries (with date, meal_count), weeklyAverages
    const rawSummaries = data.daily_summaries || data.summaries || [];
    const mappedSummaries: DailySummary[] = rawSummaries.map((s: any) => ({
      user_id: s.user_id,
      date: s.summary_date || s.date,
      total_calories: s.total_calories || 0,
      total_protein_g: s.total_protein_g || 0,
      total_carbs_g: s.total_carbs_g || 0,
      total_fat_g: s.total_fat_g || 0,
      total_fiber_g: s.total_fiber_g || 0,
      total_sugar_g: s.total_sugar_g || 0,
      total_sodium_mg: s.total_sodium_mg || 0,
      meal_count: s.meals_logged ?? s.meal_count ?? 0,
      organ_scores: s.organ_impacts_net || s.organ_scores || null,
      daily_insight: s.daily_insight || null,
    }));

    const mappedResponse: WeeklyTrackerResponse = {
      ok: data.ok,
      summaries: mappedSummaries,
      weeklyAverages: data.averages ? {
        avg_calories: data.averages.avg_calories || 0,
        avg_protein_g: data.averages.avg_protein_g || 0,
        avg_carbs_g: data.averages.avg_carbs_g || 0,
        avg_fat_g: data.averages.avg_fat_g || 0,
        days_logged: data.days_with_data || 0,
      } : null,
      error: data.error,
    };

    if (__DEV__) console.log('getWeeklyTracker mapped response:', JSON.stringify(mappedResponse, null, 2));
    return mappedResponse;
  } catch (e: any) {
    if (__DEV__) console.error('getWeeklyTracker error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

// ============================================================
// Water Tracking API Functions
// ============================================================

export interface WaterData {
  ok: boolean;
  date?: string;
  total_glasses: number;
  total_ml: number;
  target_glasses: number;
  hydration_score: number;
  organ_impacts: Record<string, number>;
  error?: string;
}

/**
 * Get water intake for a specific date
 */
export async function getWater(userId: string, date?: string): Promise<WaterData> {
  const targetDate = date || getTodayDate();
  const url = `${API_BASE_URL}/api/water?user_id=${encodeURIComponent(userId)}&date=${targetDate}`;
  if (__DEV__) console.log('getWater calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('getWater HTTP error:', res.status);
      return {
        ok: false,
        total_glasses: 0,
        total_ml: 0,
        target_glasses: 8,
        hydration_score: 0,
        organ_impacts: {},
        error: data?.error || `HTTP ${res.status}`,
      };
    }

    return data as WaterData;
  } catch (e: any) {
    if (__DEV__) console.error('getWater error:', e?.message || e);
    return {
      ok: false,
      total_glasses: 0,
      total_ml: 0,
      target_glasses: 8,
      hydration_score: 0,
      organ_impacts: {},
      error: e?.message || 'Network error',
    };
  }
}

/**
 * Log additional water intake (adds to existing)
 */
export async function logWater(
  userId: string,
  glasses: number = 1,
  source: string = 'manual'
): Promise<{ ok: boolean; glasses?: number; ml_amount?: number; error?: string }> {
  const url = `${API_BASE_URL}/api/water/log`;
  if (__DEV__) console.log('logWater calling:', url, { user_id: userId, glasses, source });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ user_id: userId, glasses, source }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('logWater HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data;
  } catch (e: any) {
    if (__DEV__) console.error('logWater error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Set total water glasses for today (replaces existing)
 */
export async function setWater(
  userId: string,
  totalGlasses: number
): Promise<{ ok: boolean; total_glasses?: number; error?: string }> {
  const url = `${API_BASE_URL}/api/water/set`;
  if (__DEV__) console.log('setWater calling:', url, { user_id: userId, glasses: totalGlasses });

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ user_id: userId, glasses: totalGlasses }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('setWater HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data;
  } catch (e: any) {
    if (__DEV__) console.error('setWater error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

// ============================================================
// Allergen Definitions API
// ============================================================

/**
 * Get all available allergen definitions
 */
export async function getAllergenDefinitions(): Promise<AllergenDefinitionsResponse> {
  const url = `${API_BASE_URL}/api/allergens`;
  if (__DEV__) console.log('getAllergenDefinitions calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('getAllergenDefinitions HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as AllergenDefinitionsResponse;
  } catch (e: any) {
    if (__DEV__) console.error('getAllergenDefinitions error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

// ============================================================
// Saved Dishes API Functions
// ============================================================

/**
 * Save a dish to user's favorites
 */
export async function saveDish(
  userId: string,
  dishData: {
    dish_name: string;
    dish_id?: string;
    restaurant_name?: string;
    full_analysis?: any;
  }
): Promise<{ ok: boolean; dish?: SavedDish; error?: string }> {
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/saved-dishes`;
  if (__DEV__) console.log('saveDish calling:', url, dishData);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(dishData),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('saveDish HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data;
  } catch (e: any) {
    if (__DEV__) console.error('saveDish error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Get user's saved dishes
 */
export async function getSavedDishes(
  userId: string
): Promise<{ ok: boolean; dishes?: SavedDish[]; error?: string }> {
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/saved-dishes`;
  if (__DEV__) console.log('getSavedDishes calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('getSavedDishes HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data;
  } catch (e: any) {
    if (__DEV__) console.error('getSavedDishes error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

// ============================================================
// AI Assistant API Functions
// ============================================================

export interface AIConversation {
  id: number;
  title: string | null;
  started_at: number;
  last_message_at: number;
}

export interface AIMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string | null;
  created_at: number;
}

export interface AIChatResponse {
  ok: boolean;
  conversation_id?: number;
  response?: string;
  model_used?: string;
  response_time_ms?: number;
  error?: string;
}

export interface AIConversationsResponse {
  ok: boolean;
  conversations?: AIConversation[];
  error?: string;
}

export interface AIMessagesResponse {
  ok: boolean;
  conversation_id?: number;
  messages?: AIMessage[];
  error?: string;
}

export interface AIContextResponse {
  ok: boolean;
  context?: {
    user: {
      sex: string | null;
      age: number | null;
      weight_kg: number | null;
      height_cm: number | null;
      activity_level: string;
      goals: string[];
    };
    allergens: Array<{ name: string; severity: string }>;
    prioritized_organs: string[];
    today: {
      date: string;
      meals: Array<{
        name: string;
        time: string;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        organ_impacts: Record<string, number> | null;
        risk_flags: string[];
      }>;
      meal_count: number;
      totals: {
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        fiber_g: number;
        sugar_g: number;
        sodium_mg: number;
      } | null;
      targets: {
        calories: number;
        protein_g: number;
        fiber_g: number;
        sugar_limit_g: number;
        sodium_limit_mg: number;
      } | null;
      organ_impacts: Record<string, number>;
      water_glasses: number;
      water_target: number;
    };
  };
  error?: string;
}

/**
 * Menu context for AI assistant (when user is viewing a restaurant)
 * Backend fetches full menu using placeId instead of sending all items
 */
export interface AIMenuContext {
  restaurantName: string;
  placeId: string;
}

/**
 * Send a message to the AI assistant and get a response
 */
export async function sendAssistantMessage(
  userId: string,
  message: string,
  conversationId?: number | null,
  menuContext?: AIMenuContext | null
): Promise<AIChatResponse> {
  const url = `${API_BASE_URL}/api/assistant/chat`;
  if (__DEV__) console.log('sendAssistantMessage calling:', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        message,
        conversation_id: conversationId || undefined,
        menu_context: menuContext || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('sendAssistantMessage HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as AIChatResponse;
  } catch (e: any) {
    if (__DEV__) console.error('sendAssistantMessage error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Get user's recent conversations
 */
export async function getAssistantConversations(
  userId: string,
  limit: number = 10
): Promise<AIConversationsResponse> {
  const url = `${API_BASE_URL}/api/assistant/conversations?user_id=${encodeURIComponent(userId)}&limit=${limit}`;
  if (__DEV__) console.log('getAssistantConversations calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('getAssistantConversations HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as AIConversationsResponse;
  } catch (e: any) {
    if (__DEV__) console.error('getAssistantConversations error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Get messages for a specific conversation
 */
export async function getConversationMessages(
  conversationId: number,
  limit: number = 50
): Promise<AIMessagesResponse> {
  const url = `${API_BASE_URL}/api/assistant/conversation/${conversationId}?limit=${limit}`;
  if (__DEV__) console.log('getConversationMessages calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('getConversationMessages HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as AIMessagesResponse;
  } catch (e: any) {
    if (__DEV__) console.error('getConversationMessages error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Get current user context (for debugging/preview)
 */
export async function getAssistantContext(userId: string): Promise<AIContextResponse> {
  const url = `${API_BASE_URL}/api/assistant/context?user_id=${encodeURIComponent(userId)}`;
  if (__DEV__) console.log('getAssistantContext calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('getAssistantContext HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as AIContextResponse;
  } catch (e: any) {
    if (__DEV__) console.error('getAssistantContext error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

// ============================================================
// Photo-Based Meal Logging
// ============================================================

/**
 * Upload a meal photo (before or after) and get a URL back.
 * Photos are stored temporarily for analysis.
 */
export async function uploadMealPhoto(
  userId: string,
  photoUri: string,
  photoType: 'before' | 'after'
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const url = `${GATEWAY_BASE_URL}/api/meal-photo/upload`;
  if (__DEV__) console.log('TB uploadMealPhoto calling:', url, photoType);

  try {
    // Create form data for upload
    const formData = new FormData();
    const filename = `${photoType}_${Date.now()}.jpg`;

    // @ts-ignore - React Native FormData accepts this format
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: filename,
    });
    formData.append('userId', userId);
    formData.append('photoType', photoType);

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('uploadMealPhoto HTTP error:', res.status, data);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return { ok: true, url: data.url };
  } catch (e: any) {
    if (__DEV__) console.error('uploadMealPhoto error:', e?.message || e);
    return { ok: false, error: e?.message || 'Upload failed' };
  }
}

/**
 * Food identification result from photo analysis
 */
export interface FoodIdentificationResult {
  ok: boolean;
  dishName?: string;
  dishDescription?: string;
  portionSize?: string;
  ingredients?: Array<{ name: string; estimatedAmount: string; visible: boolean }>;
  nutrition?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number | null;
    sodium_mg?: number | null;
  };
  allergens?: string[];
  confidence?: number;
  notes?: string | null;
  source?: string;
  error?: string;
}

/**
 * Identify food in a photo using Claude Vision.
 * Returns dish name, ingredients, calories, and allergens based on the ACTUAL visible food.
 * Use this for the "before" photo to get calorie estimates from the real portion.
 */
export async function identifyFoodInPhoto(
  photoUrl: string,
  context?: string
): Promise<FoodIdentificationResult> {
  const url = `${GATEWAY_BASE_URL}/api/meal-photo/identify`;
  if (__DEV__) console.log('TB identifyFoodInPhoto calling:', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl, context }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('identifyFoodInPhoto HTTP error:', res.status, data);
      return { ok: false, error: data?.error || data?.hint || `HTTP ${res.status}` };
    }

    return data;
  } catch (e: any) {
    if (__DEV__) console.error('identifyFoodInPhoto error:', e?.message || e);
    return { ok: false, error: e?.message || 'Identification failed' };
  }
}

/**
 * Analyze before and after photos to determine consumption percentage.
 * Returns detailed breakdown by item.
 */
export async function analyzePhotoConsumption(
  beforePhotoUrl: string,
  afterPhotoUrl: string,
  dishName: string,
  baselineCalories: number
): Promise<{ ok: boolean; analysis?: PhotoAnalysisResult; error?: string }> {
  const url = `${GATEWAY_BASE_URL}/api/meal-photo/analyze`;
  if (__DEV__) console.log('TB analyzePhotoConsumption calling:', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        beforePhotoUrl,
        afterPhotoUrl,
        dishName,
        baselineCalories,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('analyzePhotoConsumption HTTP error:', res.status, data);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return { ok: true, analysis: data.analysis };
  } catch (e: any) {
    if (__DEV__) console.error('analyzePhotoConsumption error:', e?.message || e);
    return { ok: false, error: e?.message || 'Analysis failed' };
  }
}

/**
 * Update a logged meal with after photo and analysis results.
 * Call this after user takes the after photo.
 * Uses PUT /api/meals/{id} endpoint with user_id in query params.
 */
export async function updateMealWithPhotoAnalysis(
  userId: string,
  mealId: number,
  afterPhotoUrl: string,
  analysis: PhotoAnalysisResult
): Promise<{ ok: boolean; meal?: LoggedMeal; error?: string }> {
  // Use the correct endpoint: PUT /api/meals/{id}?user_id={userId}
  const url = `${API_BASE_URL}/api/meals/${mealId}?user_id=${userId}`;
  if (__DEV__) console.log('TB updateMealWithPhotoAnalysis calling:', url);

  // Validate photo analysis data
  if (analysis.percentConsumed == null || analysis.percentConsumed < 0 || analysis.percentConsumed > 100) {
    if (__DEV__) console.error('updateMealWithPhotoAnalysis: Invalid percentConsumed:', analysis.percentConsumed);
    return { ok: false, error: 'Invalid consumption percentage from photo analysis' };
  }
  if (analysis.caloriesEaten == null || analysis.caloriesEaten < 0) {
    if (__DEV__) console.error('updateMealWithPhotoAnalysis: Invalid caloriesEaten:', analysis.caloriesEaten);
    return { ok: false, error: 'Invalid calories from photo analysis' };
  }

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Update photo status and URL
        photo_status: 'completed',
        after_photo_url: afterPhotoUrl,
        // Update portion based on analysis
        portion_percent: analysis.percentConsumed,
        calories: analysis.caloriesEaten,
        // Store the analysis result
        photo_analysis_result: analysis,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (__DEV__) console.error('updateMealWithPhotoAnalysis HTTP error:', res.status, data);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return { ok: true, meal: data.meal };
  } catch (e: any) {
    if (__DEV__) console.error('updateMealWithPhotoAnalysis error:', e?.message || e);
    return { ok: false, error: e?.message || 'Update failed' };
  }
}

/**
 * Get meals that are pending after photo (status = 'pending_after_photo').
 * These are meals where user took before photo but hasn't taken after photo yet.
 */
export async function getPendingPhotoMeals(
  userId: string,
  date?: string
): Promise<LoggedMeal[]> {
  const targetDate = date || getTodayDate();
  const allMeals = await getMealsForDate(userId, targetDate);
  return allMeals.filter((meal) => meal.photo_status === 'pending_after_photo');
}
