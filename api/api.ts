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
export async function analyzeDish(payload: any): Promise<AnalyzeDishResponse> {
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
