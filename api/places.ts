const GOOGLE_PLACES_API_KEY = 'AIzaSyD-s5WycqyPYBZ7PPUj5wsdMj5gzSS0WRw'; // keep your real key here

export type PlaceSuggestion = {
  placeId: string;
  description: string;
};

export type PlaceDetails = {
  lat: number;
  lng: number;
};

export async function fetchPlaceSuggestions(
  query: string
): Promise<PlaceSuggestion[]> {
  if (!query.trim()) return [];

  const url =
    'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
    `?input=${encodeURIComponent(query)}` +
    '&types=establishment' +
    '&components=country:us' +
    `&key=${GOOGLE_PLACES_API_KEY}`;

  console.log('Calling Google Places:', url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Places API error:', res.status, text.slice(0, 200));
    throw new Error(`Places API error ${res.status}`);
  }

  const json = await res.json();
  if (!Array.isArray(json.predictions)) {
    console.warn('Unexpected Places response:', json);
    return [];
  }

  return json.predictions.map((p: any) => ({
    placeId: p.place_id,
    description: p.description,
  }));
}

// NEW: fetch lat/lng for a placeId
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    `?place_id=${encodeURIComponent(placeId)}` +
    '&fields=geometry' +
    `&key=${GOOGLE_PLACES_API_KEY}`;

  console.log('Calling Google Place Details:', url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(
      'Place Details API error:',
      res.status,
      text.slice(0, 200)
    );
    throw new Error(`Place Details API error ${res.status}`);
  }

  const json = await res.json();
  const loc = json?.result?.geometry?.location;
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
    console.warn('Unexpected Place Details response:', json);
    throw new Error('No geometry.location in Place Details');
  }

  return {
    lat: loc.lat,
    lng: loc.lng,
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
  const radiusMeters = 800; // search radius ~0.5 mile

  const url =
    'https://maps.googleapis.com/maps/api/place/nearbysearch/json' +
    `?location=${lat},${lng}` +
    `&radius=${radiusMeters}` +
    '&type=restaurant' +
    `&key=${GOOGLE_PLACES_API_KEY}`;

  console.log('Calling Google Nearby Search:', url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Nearby Search error:', res.status, text.slice(0, 200));
    throw new Error(`Nearby Search error ${res.status}`);
  }

  const json = await res.json();
  if (!Array.isArray(json.results)) {
    console.warn('Unexpected Nearby Search response:', json);
    return [];
  }

  return json.results
    .map((r: any) => ({
      placeId: r.place_id,
      name: r.name,
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
    }))
    .filter(
      (p: NearbyPlace) => typeof p.lat === 'number' && typeof p.lng === 'number'
    );
}

export async function checkIfRestaurantAnalyzed(
  placeId: string
): Promise<'green' | 'orange'> {
  const url =
    `https://api.rrginvestment.com/menu/extract?placeId=${encodeURIComponent(placeId)}`;

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
