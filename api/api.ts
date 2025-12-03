export const API_BASE_URL = "https://api.rrginvestment.com";

const RESTAURANT_API_BASE = API_BASE_URL;

const DISH_API_BASE = API_BASE_URL;

const GATEWAY_BASE_URL = API_BASE_URL;

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
export async function analyzeDish(payload: {
  dishName: string;
  restaurantName?: string;
  userFlags?: any;
}) {
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
    };
  }

  try {
    const data = JSON.parse(raw);
    console.log(
      "TB analyzeDish JSON keys:",
      data && typeof data === "object" ? Object.keys(data) : typeof data,
    );
    return data;
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
    };
  }
}
