import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyzeDishResponse } from '../api/api';

const DISH_CACHE_PREFIX = '@dish_cache_';
const RECENT_DISHES_KEY = '@recent_dish_searches';
const MAX_RECENT_DISHES = 10;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CachedDish {
  dishName: string;
  normalizedName: string;
  restaurantName?: string;
  restaurantAddress?: string;
  placeId?: string;
  analysis: AnalyzeDishResponse;
  imageUrl?: string;
  source: 'restaurant' | 'standalone';
  cachedAt: number;
}

export interface RecentDishSearch {
  dishName: string;
  normalizedName: string;
  restaurantName?: string;
  restaurantAddress?: string;
  hasCache: boolean;
  searchedAt: number;
}

/**
 * Normalize dish name for cache key (lowercase, trim, remove special chars)
 */
export function normalizeDishName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
}

/**
 * Build cache key for a dish
 */
function buildCacheKey(dishName: string, placeId?: string): string {
  const normalized = normalizeDishName(dishName);
  if (placeId) {
    return `${DISH_CACHE_PREFIX}${normalized}_${placeId}`;
  }
  return `${DISH_CACHE_PREFIX}${normalized}`;
}

/**
 * Save dish analysis to cache
 */
export async function cacheDishAnalysis(
  dishName: string,
  analysis: AnalyzeDishResponse,
  options?: {
    restaurantName?: string;
    restaurantAddress?: string;
    placeId?: string;
    imageUrl?: string;
    source?: 'restaurant' | 'standalone';
  }
): Promise<void> {
  const key = buildCacheKey(dishName, options?.placeId);
  const cached: CachedDish = {
    dishName,
    normalizedName: normalizeDishName(dishName),
    restaurantName: options?.restaurantName,
    restaurantAddress: options?.restaurantAddress,
    placeId: options?.placeId,
    analysis,
    imageUrl: options?.imageUrl,
    source: options?.source || 'standalone',
    cachedAt: Date.now(),
  };

  try {
    await AsyncStorage.setItem(key, JSON.stringify(cached));
    console.log('Dish cached:', dishName, key);
  } catch (e) {
    console.error('Failed to cache dish:', e);
  }
}

/**
 * Get cached dish analysis
 */
export async function getCachedDish(
  dishName: string,
  placeId?: string
): Promise<CachedDish | null> {
  const key = buildCacheKey(dishName, placeId);

  try {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;

    const cached = JSON.parse(stored) as CachedDish;

    // Check if cache has expired
    if (Date.now() - cached.cachedAt > CACHE_EXPIRY_MS) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return cached;
  } catch (e) {
    console.error('Failed to get cached dish:', e);
    return null;
  }
}

/**
 * Search for cached dishes matching a query
 */
export async function searchCachedDishes(query: string): Promise<CachedDish[]> {
  const normalizedQuery = normalizeDishName(query);
  if (!normalizedQuery) return [];

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const dishKeys = allKeys.filter((k) => k.startsWith(DISH_CACHE_PREFIX));

    const matches: CachedDish[] = [];

    for (const key of dishKeys) {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) continue;

      try {
        const cached = JSON.parse(stored) as CachedDish;

        // Check expiry
        if (Date.now() - cached.cachedAt > CACHE_EXPIRY_MS) {
          await AsyncStorage.removeItem(key);
          continue;
        }

        // Match against normalized name
        if (cached.normalizedName.includes(normalizedQuery)) {
          matches.push(cached);
        }
      } catch {
        // Skip invalid entries
      }
    }

    // Sort by most recent first
    return matches.sort((a, b) => b.cachedAt - a.cachedAt);
  } catch (e) {
    console.error('Failed to search cached dishes:', e);
    return [];
  }
}

/**
 * Add dish to recent searches
 */
export async function addToRecentDishSearches(
  dishName: string,
  options?: {
    restaurantName?: string;
    restaurantAddress?: string;
    hasCache?: boolean;
  }
): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(RECENT_DISHES_KEY);
    let recent: RecentDishSearch[] = stored ? JSON.parse(stored) : [];

    const normalizedName = normalizeDishName(dishName);

    // Remove existing entry for same dish
    recent = recent.filter((r) => r.normalizedName !== normalizedName);

    // Add new entry at the beginning
    recent.unshift({
      dishName,
      normalizedName,
      restaurantName: options?.restaurantName,
      restaurantAddress: options?.restaurantAddress,
      hasCache: options?.hasCache ?? false,
      searchedAt: Date.now(),
    });

    // Keep only MAX_RECENT_DISHES
    recent = recent.slice(0, MAX_RECENT_DISHES);

    await AsyncStorage.setItem(RECENT_DISHES_KEY, JSON.stringify(recent));
  } catch (e) {
    console.error('Failed to add to recent dish searches:', e);
  }
}

/**
 * Get recent dish searches
 */
export async function getRecentDishSearches(): Promise<RecentDishSearch[]> {
  try {
    const stored = await AsyncStorage.getItem(RECENT_DISHES_KEY);
    if (!stored) return [];

    const recent = JSON.parse(stored) as RecentDishSearch[];

    // Update hasCache status for each
    const updated = await Promise.all(
      recent.map(async (r) => {
        const cached = await getCachedDish(r.dishName);
        return { ...r, hasCache: !!cached };
      })
    );

    return updated;
  } catch (e) {
    console.error('Failed to get recent dish searches:', e);
    return [];
  }
}

/**
 * Clear all dish cache
 */
export async function clearDishCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const dishKeys = allKeys.filter((k) => k.startsWith(DISH_CACHE_PREFIX));
    await AsyncStorage.multiRemove(dishKeys);
    await AsyncStorage.removeItem(RECENT_DISHES_KEY);
    console.log('Dish cache cleared');
  } catch (e) {
    console.error('Failed to clear dish cache:', e);
  }
}
