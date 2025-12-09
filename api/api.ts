export const API_BASE_URL = "https://api.rrginvestment.com";

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
    calories: "low" | "medium" | "high";
    protein: "low" | "medium" | "high";
    carbs: "low" | "medium" | "high";
    sugar: "low" | "medium" | "high";
    fiber: "low" | "medium" | "high";
    fat: "low" | "medium" | "high";
    sodium: "low" | "medium" | "high";
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
  present: "yes" | "no" | "maybe";
  message: string;
  source: string;
}

export interface FodmapFlag {
  level: "low" | "medium" | "high";
  reason: string;
  source: string;
}

export interface LactoseFlag {
  level: "none" | "trace" | "low" | "medium" | "high";
  reason: string;
  source: string;
}

export type LifestyleTag = string;

export interface LifestyleChecks {
  contains_red_meat: "yes" | "no" | "maybe";
  red_meat_free: "yes" | "no" | "maybe";
  vegetarian: "yes" | "no" | "maybe";
  vegan: "yes" | "no" | "maybe";
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

export interface AnalyzeDishResponse {
  ok: boolean;
  apiVersion?: string;
  source?: string;
  dishName?: string;
  restaurantName?: string;
  summary?: DishSummary | null;
  recipe?: any;
  normalized?: DishNormalizedBlock;
  organs?: DishOrgansBlock;
  debug?: any;
  error?: string;

  // Whole-dish level flags / nutrition
  allergen_flags?: AllergenFlag[];
  fodmap_flags?: FodmapFlag | null;
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
}

export interface AnalyzeDishCardResponse {
  apiVersion: string;
  dishName: string | null;
  restaurantName: string | null;
  summary: DishSummary | null;
}

async function apiGet(fullUrl: string) {
  console.log("Calling API GET:", fullUrl);

  const res = await fetch(fullUrl, {
    method: "GET",
  });

  const raw = await res.text();
  console.log("apiGet raw snippet:", raw.slice(0, 200));

  if (!res.ok) {
    throw new Error(
      `API GET error ${res.status}: ${raw.slice(0, 200)}`,
    );
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("apiGet JSON.parse failed:", error);
    throw new Error(
      `API GET returned non-JSON or unexpected shape. Status: ${res.status}, body starts with: ${raw.slice(0, 40)}`,
    );
  }
}

async function apiPostDish(path: string, body: any) {
  const url = `${DISH_API_BASE}${path}`;
  console.log("Calling Dish API POST:", url, "with body:", body);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Dish API error ${res.status}: ${text.slice(0, 200)}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Dish API error:", error);
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
  console.log("TB fetchMenu calling:", url);

  const res = await fetch(url);

  const raw = await res.text();
  console.log("fetchMenu raw snippet:", raw.slice(0, 200));

  if (!res.ok) {
    throw new Error(
      `fetchMenu HTTP ${res.status} – body starts with: ${raw.slice(0, 40)}`,
    );
  }

  try {
    const data = JSON.parse(raw);
    console.log(
      "fetchMenu JSON top-level keys:",
      data && typeof data === "object" ? Object.keys(data) : typeof data,
    );
    return data;
  } catch (e) {
    console.error("fetchMenu JSON.parse failed:", e);
    throw new Error(
      `fetchMenu got non-JSON body starting with: ${raw.slice(0, 40)}`,
    );
  }
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
}

export async function analyzeDish(payload: AnalyzeDishPayload): Promise<AnalyzeDishResponse> {
  const url = `${GATEWAY_BASE_URL}/pipeline/analyze-dish`;
  console.log("TB analyzeDish calling:", url, "with", payload);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  console.log("TB analyzeDish raw snippet:", raw.slice(0, 200));

  if (!res.ok) {
    console.error("analyzeDish HTTP error:", res.status, raw.slice(0, 80));
    return {
      ok: false,
      tummy_score: 82,
      organs: {},
      allergens: [],
      fodmap: {},
      insights: ["Analysis temporarily unavailable."],
      _raw: raw,
    } as unknown as AnalyzeDishResponse;
  }

  try {
    const data = JSON.parse(raw);
    console.log(
      "TB analyzeDish JSON keys:",
      data && typeof data === "object" ? Object.keys(data) : typeof data,
    );
    return data as AnalyzeDishResponse;
  } catch (e: any) {
    console.error(
      "TB analyzeDish JSON.parse failed:",
      e?.message || String(e),
    );
    return {
      ok: false,
      tummy_score: 82,
      organs: {},
      allergens: [],
      fodmap: {},
      insights: ["Analysis response was not valid JSON."],
      _raw: raw,
    } as unknown as AnalyzeDishResponse;
  }
}

export async function analyzeDishCard(payload: any): Promise<AnalyzeDishCardResponse> {
  const url = `${GATEWAY_BASE_URL}/pipeline/analyze-dish/card`;
  console.log("TB analyzeDishCard calling:", url, "with", payload);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  console.log("TB analyzeDishCard raw snippet:", raw.slice(0, 200));

  if (!res.ok) {
    throw new Error(`analyzeDishCard HTTP error: ${res.status} ${raw.slice(0, 120)}`);
  }

  try {
    const data = JSON.parse(raw);
    return data as AnalyzeDishCardResponse;
  } catch (e: any) {
    console.error("TB analyzeDishCard JSON.parse failed:", e?.message || String(e));
    throw e;
  }
}
