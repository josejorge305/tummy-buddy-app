const RESTAURANT_API_BASE = "https://api.rrginvestment.com";
// or use production:
// const RESTAURANT_API_BASE = "https://tb-restaurant-core-production.tummybuddy.workers.dev";

const DISH_API_BASE = "https://api.rrginvestment.com";

async function doPost(base: string, path: string, body: any) {
  const url = `${base}${path}`;
  console.log("Calling API:", url, "with body:", body);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("API error:", error);
    throw error;
  }
}

export function postRestaurant(path: string, body: any) {
  return doPost(RESTAURANT_API_BASE, path, body);
}

export function postDish(path: string, body: any) {
  return doPost(DISH_API_BASE, path, body);
}
