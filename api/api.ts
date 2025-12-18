export const API_BASE_URL = 'https://api.rrginvestment.com';

const RESTAURANT_API_BASE = API_BASE_URL;

const DISH_API_BASE = API_BASE_URL;

const GATEWAY_BASE_URL = API_BASE_URL;

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
  console.log('TB fetchDishImage calling:', url);

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
    console.error('fetchDishImage error:', e?.message || e);
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
  console.log('Calling API GET:', fullUrl);

  const res = await fetch(fullUrl, {
    method: 'GET',
  });

  const raw = await res.text();
  console.log('apiGet raw snippet:', raw.slice(0, 200));

  if (!res.ok) {
    throw new Error(`API GET error ${res.status}: ${raw.slice(0, 200)}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('apiGet JSON.parse failed:', error);
    throw new Error(
      `API GET returned non-JSON or unexpected shape. Status: ${
        res.status
      }, body starts with: ${raw.slice(0, 40)}`
    );
  }
}

async function apiPostDish(path: string, body: any) {
  const url = `${DISH_API_BASE}${path}`;
  console.log('Calling Dish API POST:', url, 'with body:', body);

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
    console.error('Dish API error:', error);
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
  console.log('TB fetchMenu calling:', url);

  const res = await fetch(url);

  const raw = await res.text();
  console.log('fetchMenu raw snippet:', raw.slice(0, 200));

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
    console.log(
      'fetchMenu JSON top-level keys:',
      data && typeof data === 'object' ? Object.keys(data) : typeof data
    );
    return data;
  } catch (e) {
    console.error('fetchMenu JSON.parse failed:', e);
    throw new Error(`fetchMenu got non-JSON body starting with: ${raw.slice(0, 40)}`);
  }
}

// Fast menu fetch using /menu/uber-test (no strict Google filter)
// This endpoint is faster (~10-30s) and more reliable than /menu/extract
export async function fetchMenuFast(
  restaurantName: string,
  address: string,
  maxRows: number = 50
): Promise<any> {
  const params = new URLSearchParams({
    query: restaurantName,
    address,
    maxRows: String(maxRows),
  });
  const url = `${RESTAURANT_API_BASE}/menu/uber-test?${params.toString()}`;
  console.log('TB fetchMenuFast calling:', url);

  try {
    const res = await fetch(url);
    const raw = await res.text();
    console.log('fetchMenuFast raw snippet:', raw.slice(0, 200));

    if (!res.ok) {
      console.error('fetchMenuFast HTTP error:', res.status);
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const data = JSON.parse(raw);

    // Transform /menu/uber-test response to match /menu/extract format
    if (data.ok && data.data?.items) {
      const items = data.data.items;

      // Group items by section
      const sectionMap: Record<string, any[]> = {};
      let firstImageUrl: string | null = null;

      for (const item of items) {
        const sectionName = item.section || 'Menu';
        if (!sectionMap[sectionName]) {
          sectionMap[sectionName] = [];
        }

        // Capture first item's image as potential hero
        const itemImage = item.imageUrl || item.image_url || item.image || null;
        if (!firstImageUrl && itemImage) {
          firstImageUrl = itemImage;
        }

        sectionMap[sectionName].push({
          id: item.id || `item-${sectionMap[sectionName].length}`,
          name: item.name,
          description: item.description,
          menuDescription: item.description,
          priceText: item.price_display,
          restaurantCalories: item.restaurantCalories,
          imageUrl: itemImage,
        });
      }

      const sections = Object.entries(sectionMap).map(([name, sectionItems], idx) => ({
        id: `section-${idx}`,
        name,
        items: sectionItems,
      }));

      return {
        ok: true,
        source: 'uber-test-fast',
        restaurant: {
          id: data.data.query,
          name: restaurantName,
          address: address,
          imageUrl: firstImageUrl, // Use first item image as hero fallback
        },
        sections,
      };
    }

    return { ok: false, error: data.error || 'No items found' };
  } catch (e: any) {
    console.error('fetchMenuFast error:', e?.message || e);
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
        console.log(
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
        console.log(
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
      console.log(
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
}

export async function analyzeDish(payload: AnalyzeDishPayload): Promise<AnalyzeDishResponse> {
  const url = `${GATEWAY_BASE_URL}/pipeline/analyze-dish`;
  console.log('TB analyzeDish calling:', url, 'with', payload);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  console.log('TB analyzeDish raw snippet:', raw.slice(0, 200));

  if (!res.ok) {
    console.error('analyzeDish HTTP error:', res.status, raw.slice(0, 80));
    return {
      ok: false,
      tummy_score: 82,
      organs: {},
      allergens: [],
      fodmap: {},
      insights: ['Analysis temporarily unavailable.'],
      _raw: raw,
    } as unknown as AnalyzeDishResponse;
  }

  try {
    const data = JSON.parse(raw);
    console.log(
      'TB analyzeDish JSON keys:',
      data && typeof data === 'object' ? Object.keys(data) : typeof data
    );
    return data as AnalyzeDishResponse;
  } catch (e: any) {
    console.error('TB analyzeDish JSON.parse failed:', e?.message || String(e));
    return {
      ok: false,
      tummy_score: 82,
      organs: {},
      allergens: [],
      fodmap: {},
      insights: ['Analysis response was not valid JSON.'],
      _raw: raw,
    } as unknown as AnalyzeDishResponse;
  }
}

export async function analyzeDishCard(payload: any): Promise<AnalyzeDishCardResponse> {
  const url = `${GATEWAY_BASE_URL}/pipeline/analyze-dish/card`;
  console.log('TB analyzeDishCard calling:', url, 'with', payload);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  console.log('TB analyzeDishCard raw snippet:', raw.slice(0, 200));

  if (!res.ok) {
    throw new Error(`analyzeDishCard HTTP error: ${res.status} ${raw.slice(0, 120)}`);
  }

  try {
    const data = JSON.parse(raw);
    return data as AnalyzeDishCardResponse;
  } catch (e: any) {
    console.error('TB analyzeDishCard JSON.parse failed:', e?.message || String(e));
    throw e;
  }
}

// ============================================================
// Apify Async Menu Scraping (for background prefetching)
// ============================================================

export interface ApifyJobStartResponse {
  ok: boolean;
  jobId: string;
  status: 'started' | 'already_cached';
  runId?: string;
  message?: string;
  data?: any[]; // Present if already cached
}

export interface ApifyJobStatusResponse {
  ok: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'not_found';
  jobId?: string;
  runId?: string;
  datasetId?: string;
  resultCount?: number;
  data?: any[];
  error?: string;
}

/**
 * Start an async Apify scraping job for a restaurant.
 * Returns immediately with a jobId that can be polled.
 *
 * @param restaurantName - Restaurant name to search for
 * @param address - Address/location for the search
 * @param maxRows - Max results (default 5)
 */
export async function startApifyScrape(
  restaurantName: string,
  address: string,
  maxRows: number = 5
): Promise<ApifyJobStartResponse> {
  const params = new URLSearchParams({
    query: restaurantName,
    address,
    maxRows: String(maxRows),
  });

  const url = `${API_BASE_URL}/api/apify-start?${params.toString()}`;
  console.log('TB startApifyScrape calling:', url);

  try {
    const res = await fetch(url);
    const text = await res.text();

    // Guard against non-JSON responses (HTML error pages, etc.)
    if (!res.ok) {
      console.error('TB startApifyScrape HTTP error:', res.status, text.slice(0, 200));
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
      console.error('TB startApifyScrape JSON parse error:', parseErr?.message, text.slice(0, 200));
      return {
        ok: false,
        jobId: '',
        status: 'started',
        message: `Invalid JSON response: ${text.slice(0, 100)}`,
      };
    }

    console.log('TB startApifyScrape response:', data);
    return data as ApifyJobStartResponse;
  } catch (e: any) {
    console.error('TB startApifyScrape error:', e?.message || String(e));
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
 *
 * @param jobId - The job ID returned from startApifyScrape
 */
export async function getApifyJobStatus(jobId: string): Promise<ApifyJobStatusResponse> {
  const url = `${API_BASE_URL}/api/apify-job/${encodeURIComponent(jobId)}`;
  console.log('TB getApifyJobStatus calling:', url);

  try {
    const res = await fetch(url);
    const text = await res.text();

    // Guard against non-JSON responses (HTML error pages, etc.)
    if (!res.ok) {
      console.error('TB getApifyJobStatus HTTP error:', res.status, text.slice(0, 200));
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
      console.error('TB getApifyJobStatus JSON parse error:', parseErr?.message, text.slice(0, 200));
      return {
        ok: false,
        status: 'failed',
        error: `Invalid JSON response: ${text.slice(0, 100)}`,
      };
    }

    console.log('TB getApifyJobStatus response:', JSON.stringify(data).slice(0, 200));
    return data as ApifyJobStatusResponse;
  } catch (e: any) {
    console.error('TB getApifyJobStatus error:', e?.message || String(e));
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

    if (result.status === 'completed' || result.status === 'failed' || result.status === 'not_found') {
      return result;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return {
    ok: false,
    status: 'failed',
    error: 'Polling timed out',
  };
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
  console.log('getDishSuggestions calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('getDishSuggestions HTTP error:', res.status);
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
    console.error('getDishSuggestions error:', e?.message || e);
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

// Get today's date in YYYY-MM-DD format (local timezone)
export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// User Profile Types
export interface UserProfile {
  user_id: string;
  sex?: 'male' | 'female' | null;
  birth_year?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  primary_goal?: 'lose_weight' | 'maintain' | 'build_muscle' | 'improve_health' | 'manage_condition' | null;
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

export interface LoggedMeal {
  id: number;
  user_id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dish_name: string;
  dish_id?: string | null;
  restaurant_name?: string | null;
  portion_factor: number;
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
 * Get user profile, targets, allergens, and organ priorities
 */
export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/profile`;
  console.log('getUserProfile calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('getUserProfile HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as UserProfileResponse;
  } catch (e: any) {
    console.error('getUserProfile error:', e?.message || e);
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
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/profile`;
  console.log('updateUserProfile calling:', url, profileData);

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('updateUserProfile HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as UpdateProfileResponse;
  } catch (e: any) {
    console.error('updateUserProfile error:', e?.message || e);
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
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/allergens`;
  console.log('setUserAllergens calling:', url, allergens);

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ allergens }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('setUserAllergens HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as AllergensResponse;
  } catch (e: any) {
    console.error('setUserAllergens error:', e?.message || e);
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
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/organs`;
  console.log('setUserOrganPriorities calling:', url, organs);

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ organs }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('setUserOrganPriorities HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as OrganPrioritiesResponse;
  } catch (e: any) {
    console.error('setUserOrganPriorities error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Add a weight entry and update profile
 */
export async function addWeightEntry(
  userId: string,
  weightKg: number
): Promise<WeightResponse> {
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/weight`;
  console.log('addWeightEntry calling:', url, { weight_kg: weightKg });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ weight_kg: weightKg }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('addWeightEntry HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as WeightResponse;
  } catch (e: any) {
    console.error('addWeightEntry error:', e?.message || e);
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
  }
): Promise<LogMealResponse> {
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/meals`;
  console.log('logMeal calling:', url, mealData);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(mealData),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('logMeal HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as LogMealResponse;
  } catch (e: any) {
    console.error('logMeal error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Get meals for a specific date
 */
export async function getMeals(
  userId: string,
  date?: string
): Promise<MealsResponse> {
  const targetDate = date || getTodayDate();
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/meals?date=${targetDate}`;
  console.log('getMeals calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('getMeals HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as MealsResponse;
  } catch (e: any) {
    console.error('getMeals error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Delete a logged meal
 */
export async function deleteMeal(
  userId: string,
  mealId: number
): Promise<DeleteMealResponse> {
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/meals/${mealId}`;
  console.log('deleteMeal calling:', url);

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('deleteMeal HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as DeleteMealResponse;
  } catch (e: any) {
    console.error('deleteMeal error:', e?.message || e);
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
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/tracker/daily?date=${targetDate}`;
  console.log('getDailyTracker calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('getDailyTracker HTTP error:', res.status);
      return { ok: false, date: targetDate, error: data?.error || `HTTP ${res.status}` };
    }

    return { ...data, date: targetDate } as DailyTrackerResponse;
  } catch (e: any) {
    console.error('getDailyTracker error:', e?.message || e);
    return { ok: false, date: targetDate, error: e?.message || 'Network error' };
  }
}

/**
 * Get weekly tracker data (daily summaries + averages for last 7 days)
 */
export async function getWeeklyTracker(userId: string): Promise<WeeklyTrackerResponse> {
  const url = `${API_BASE_URL}/api/user/${encodeURIComponent(userId)}/tracker/weekly`;
  console.log('getWeeklyTracker calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('getWeeklyTracker HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as WeeklyTrackerResponse;
  } catch (e: any) {
    console.error('getWeeklyTracker error:', e?.message || e);
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
  console.log('getAllergenDefinitions calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('getAllergenDefinitions HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data as AllergenDefinitionsResponse;
  } catch (e: any) {
    console.error('getAllergenDefinitions error:', e?.message || e);
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
  console.log('saveDish calling:', url, dishData);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(dishData),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('saveDish HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data;
  } catch (e: any) {
    console.error('saveDish error:', e?.message || e);
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
  console.log('getSavedDishes calling:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('getSavedDishes HTTP error:', res.status);
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return data;
  } catch (e: any) {
    console.error('getSavedDishes error:', e?.message || e);
    return { ok: false, error: e?.message || 'Network error' };
  }
}
