// Google Places API calls - proxied through backend to keep API key secure
const API_BASE_URL = 'https://api.rrginvestment.com';

export type PlaceSuggestion = {
  placeId: string;
  description: string;
};

export type PlaceDetails = {
  lat: number;
  lng: number;
  photoRef?: string | null;
};

export async function fetchPlaceSuggestions(
  query: string
): Promise<PlaceSuggestion[]> {
  if (!query.trim()) return [];

  const url = `${API_BASE_URL}/api/places/autocomplete?input=${encodeURIComponent(query)}`;

  if (__DEV__) console.log('Calling Places Proxy:', url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (__DEV__) console.error('Places API error:', res.status, text.slice(0, 200));
    throw new Error(`Places API error ${res.status}`);
  }

  const json = await res.json();
  if (!json.ok) {
    if (__DEV__) console.warn('Places proxy error:', json.error);
    return [];
  }

  return json.predictions || [];
}

// Fetch lat/lng and photo reference for a placeId
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const url = `${API_BASE_URL}/api/places/details?place_id=${encodeURIComponent(placeId)}`;

  if (__DEV__) console.log('Calling Place Details Proxy:', url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (__DEV__) console.error(
      'Place Details API error:',
      res.status,
      text.slice(0, 200)
    );
    throw new Error(`Place Details API error ${res.status}`);
  }

  const json = await res.json();
  if (!json.ok) {
    if (__DEV__) console.warn('Place Details proxy error:', json.error);
    throw new Error(json.error || 'Failed to get place details');
  }

  return {
    lat: json.lat,
    lng: json.lng,
    photoRef: json.photoRef,
  };
}

export type NearbyPlace = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
};

export async function fetchNearbyPlaces(
  lat: number,
  lng: number
): Promise<NearbyPlace[]> {
  const url = `${API_BASE_URL}/api/places/nearby?lat=${lat}&lng=${lng}`;

  if (__DEV__) console.log('Calling Nearby Search Proxy:', url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (__DEV__) console.error('Nearby Search error:', res.status, text.slice(0, 200));
    throw new Error(`Nearby Search error ${res.status}`);
  }

  const json = await res.json();
  if (!json.ok) {
    if (__DEV__) console.warn('Nearby Search proxy error:', json.error);
    return [];
  }

  return json.results || [];
}

// Search for places/restaurants by text query
export async function searchPlaces(query: string): Promise<any[]> {
  if (!query.trim()) return [];

  const url = `${API_BASE_URL}/api/places/search?query=${encodeURIComponent(query)}`;

  if (__DEV__) console.log('Calling Text Search Proxy:', url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (__DEV__) console.error('Text Search API error:', res.status, text.slice(0, 200));
    throw new Error(`Text Search API error ${res.status}`);
  }

  const json = await res.json();
  if (!json.ok) {
    if (__DEV__) console.warn('Text Search proxy error:', json.error);
    return [];
  }

  return json.results || [];
}

export async function checkIfRestaurantAnalyzed(
  placeId: string
): Promise<'green' | 'orange'> {
  const url =
    `${API_BASE_URL}/menu/extract?placeId=${encodeURIComponent(placeId)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return 'orange';

    const raw = await res.text();
    try {
      const json = JSON.parse(raw);
      if (json && json.ok) return 'green';
    } catch (_e) {
      // ignore parse errors and treat as not analyzed
    }
    return 'orange';
  } catch (e) {
    return 'orange';
  }
}
