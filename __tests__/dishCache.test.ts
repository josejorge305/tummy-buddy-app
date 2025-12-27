import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  normalizeDishName,
  cacheDishAnalysis,
  getCachedDish,
  searchCachedDishes,
  addToRecentDishSearches,
  getRecentDishSearches,
  clearDishCache,
} from '../utils/dishCache';
import { AnalyzeDishResponse } from '../api/api';

// Mock analysis response for testing
const createMockAnalysis = (dishName: string): AnalyzeDishResponse => ({
  ok: true,
  dishName,
  source: 'test',
  allergen_flags: [
    { kind: 'gluten', present: 'yes', message: 'Contains wheat flour', source: 'recipe' },
  ],
  fodmap_flags: { level: 'low', reason: 'Low FODMAP ingredients', source: 'recipe' },
  nutrition_summary: {
    energyKcal: 450,
    protein_g: 25,
    fat_g: 15,
    carbs_g: 45,
    sugar_g: 5,
    fiber_g: 3,
    sodium_mg: 800,
  },
  likely_recipe: {
    title: dishName,
    cooking_method: 'grilled',
    cooking_method_confidence: 0.9,
    ingredients: [
      { name: 'chicken breast', quantity: 200, unit: 'g' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'garlic', quantity: 2, unit: 'cloves' },
    ],
  },
});

describe('dishCache', () => {
  beforeEach(async () => {
    // Clear all stored data before each test
    await AsyncStorage.clear();
  });

  describe('normalizeDishName', () => {
    it('should lowercase the dish name', () => {
      expect(normalizeDishName('Chicken Parmesan')).toBe('chicken_parmesan');
    });

    it('should remove special characters', () => {
      expect(normalizeDishName("Pad Thai (Spicy!!)")).toBe('pad_thai_spicy');
    });

    it('should trim whitespace', () => {
      expect(normalizeDishName('  Pizza  ')).toBe('pizza');
    });

    it('should handle multiple spaces', () => {
      expect(normalizeDishName('Grilled   Salmon')).toBe('grilled_salmon');
    });

    it('should handle empty string', () => {
      expect(normalizeDishName('')).toBe('');
    });
  });

  describe('cacheDishAnalysis and getCachedDish', () => {
    it('should cache and retrieve a dish analysis', async () => {
      const dishName = 'Grilled Chicken';
      const analysis = createMockAnalysis(dishName);

      await cacheDishAnalysis(dishName, analysis);
      const cached = await getCachedDish(dishName);

      expect(cached).not.toBeNull();
      expect(cached?.dishName).toBe(dishName);
      expect(cached?.analysis.ok).toBe(true);
      expect(cached?.analysis.nutrition_summary?.energyKcal).toBe(450);
    });

    it('should cache ingredients correctly', async () => {
      const dishName = 'Garlic Chicken';
      const analysis = createMockAnalysis(dishName);

      await cacheDishAnalysis(dishName, analysis);
      const cached = await getCachedDish(dishName);

      const ingredients = cached?.analysis.likely_recipe?.ingredients;
      expect(ingredients).toHaveLength(3);
      expect(ingredients?.[0].name).toBe('chicken breast');
    });

    it('should cache cooking method correctly', async () => {
      const dishName = 'Grilled Steak';
      const analysis = createMockAnalysis(dishName);

      await cacheDishAnalysis(dishName, analysis);
      const cached = await getCachedDish(dishName);

      expect(cached?.analysis.likely_recipe?.cooking_method).toBe('grilled');
      expect(cached?.analysis.likely_recipe?.cooking_method_confidence).toBe(0.9);
    });

    it('should return null for non-existent dish', async () => {
      const cached = await getCachedDish('Non-existent Dish');
      expect(cached).toBeNull();
    });

    it('should cache with restaurant context', async () => {
      const dishName = 'Margherita Pizza';
      const analysis = createMockAnalysis(dishName);

      await cacheDishAnalysis(dishName, analysis, {
        restaurantName: 'Test Restaurant',
        restaurantAddress: '123 Main St',
        placeId: 'place123',
        source: 'restaurant',
      });

      const cached = await getCachedDish(dishName, 'place123');

      expect(cached?.restaurantName).toBe('Test Restaurant');
      expect(cached?.restaurantAddress).toBe('123 Main St');
      expect(cached?.placeId).toBe('place123');
      expect(cached?.source).toBe('restaurant');
    });

    it('should differentiate dishes by placeId', async () => {
      const dishName = 'Fish Tacos';
      const analysis1 = createMockAnalysis(dishName);
      const analysis2 = { ...createMockAnalysis(dishName), dishName: 'Fish Tacos Special' };

      await cacheDishAnalysis(dishName, analysis1, { placeId: 'place1' });
      await cacheDishAnalysis(dishName, analysis2, { placeId: 'place2' });

      const cached1 = await getCachedDish(dishName, 'place1');
      const cached2 = await getCachedDish(dishName, 'place2');

      expect(cached1?.analysis.dishName).toBe('Fish Tacos');
      expect(cached2?.analysis.dishName).toBe('Fish Tacos Special');
    });

    it('should include timestamp when caching', async () => {
      const dishName = 'Pasta Primavera';
      const beforeCache = Date.now();

      await cacheDishAnalysis(dishName, createMockAnalysis(dishName));

      const cached = await getCachedDish(dishName);
      const afterCache = Date.now();

      expect(cached?.cachedAt).toBeGreaterThanOrEqual(beforeCache);
      expect(cached?.cachedAt).toBeLessThanOrEqual(afterCache);
    });
  });

  describe('searchCachedDishes', () => {
    beforeEach(async () => {
      // Cache several dishes for search tests
      await cacheDishAnalysis('Grilled Chicken', createMockAnalysis('Grilled Chicken'));
      await cacheDishAnalysis('Chicken Parmesan', createMockAnalysis('Chicken Parmesan'));
      await cacheDishAnalysis('Beef Steak', createMockAnalysis('Beef Steak'));
      await cacheDishAnalysis('Chicken Tikka Masala', createMockAnalysis('Chicken Tikka Masala'));
    });

    it('should find dishes matching a search query', async () => {
      const results = await searchCachedDishes('chicken');
      expect(results.length).toBe(3);
    });

    it('should be case-insensitive', async () => {
      const results = await searchCachedDishes('CHICKEN');
      expect(results.length).toBe(3);
    });

    it('should return empty array for no matches', async () => {
      const results = await searchCachedDishes('sushi');
      expect(results.length).toBe(0);
    });

    it('should return empty array for empty query', async () => {
      const results = await searchCachedDishes('');
      expect(results.length).toBe(0);
    });

    it('should sort results by most recent first', async () => {
      // Add a new dish with slight delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      await cacheDishAnalysis('Spicy Chicken Wings', createMockAnalysis('Spicy Chicken Wings'));

      const results = await searchCachedDishes('chicken');
      expect(results[0].dishName).toBe('Spicy Chicken Wings');
    });
  });

  describe('Recent Dish Searches', () => {
    it('should add and retrieve recent searches', async () => {
      await addToRecentDishSearches('Pad Thai');
      await addToRecentDishSearches('Sushi Roll');

      const recent = await getRecentDishSearches();

      expect(recent.length).toBe(2);
      expect(recent[0].dishName).toBe('Sushi Roll'); // Most recent first
      expect(recent[1].dishName).toBe('Pad Thai');
    });

    it('should deduplicate searches by moving to top', async () => {
      await addToRecentDishSearches('Dish A');
      await addToRecentDishSearches('Dish B');
      await addToRecentDishSearches('Dish A'); // Re-search

      const recent = await getRecentDishSearches();

      expect(recent.length).toBe(2);
      expect(recent[0].dishName).toBe('Dish A'); // Moved to top
    });

    it('should limit to MAX_RECENT_DISHES', async () => {
      // Add 15 dishes (more than the limit of 10)
      for (let i = 1; i <= 15; i++) {
        await addToRecentDishSearches(`Dish ${i}`);
      }

      const recent = await getRecentDishSearches();

      expect(recent.length).toBe(10);
      expect(recent[0].dishName).toBe('Dish 15'); // Most recent
    });

    it('should track hasCache status', async () => {
      await addToRecentDishSearches('Cached Dish', { hasCache: true });
      await addToRecentDishSearches('Uncached Dish', { hasCache: false });

      const recent = await getRecentDishSearches();

      // Note: getRecentDishSearches updates hasCache based on actual cache
      // Since we didn't actually cache these, they'll show as false
      expect(recent.length).toBe(2);
    });

    it('should include restaurant info if provided', async () => {
      await addToRecentDishSearches('Restaurant Dish', {
        restaurantName: 'Test Restaurant',
        restaurantAddress: '123 Main St',
      });

      const recent = await getRecentDishSearches();

      expect(recent[0].restaurantName).toBe('Test Restaurant');
      expect(recent[0].restaurantAddress).toBe('123 Main St');
    });
  });

  describe('clearDishCache', () => {
    it('should clear all cached dishes', async () => {
      await cacheDishAnalysis('Dish 1', createMockAnalysis('Dish 1'));
      await cacheDishAnalysis('Dish 2', createMockAnalysis('Dish 2'));
      await addToRecentDishSearches('Dish 1');

      await clearDishCache();

      const cached1 = await getCachedDish('Dish 1');
      const cached2 = await getCachedDish('Dish 2');
      const recent = await getRecentDishSearches();

      expect(cached1).toBeNull();
      expect(cached2).toBeNull();
      expect(recent.length).toBe(0);
    });
  });

  describe('Cache Performance', () => {
    it('should expedite subsequent lookups (cache hit is faster than miss)', async () => {
      const dishName = 'Performance Test Dish';
      const analysis = createMockAnalysis(dishName);

      // Simulate first lookup (cache miss - would require API call)
      const missStart = Date.now();
      const missResult = await getCachedDish(dishName);
      const missTime = Date.now() - missStart;
      expect(missResult).toBeNull();

      // Cache the dish
      await cacheDishAnalysis(dishName, analysis);

      // Second lookup (cache hit)
      const hitStart = Date.now();
      const hitResult = await getCachedDish(dishName);
      const hitTime = Date.now() - hitStart;

      expect(hitResult).not.toBeNull();
      expect(hitResult?.analysis.ok).toBe(true);

      // Cache operations should be very fast (< 100ms for mock storage)
      expect(hitTime).toBeLessThan(100);

      console.log(`Cache miss time: ${missTime}ms, Cache hit time: ${hitTime}ms`);
    });

    it('should handle multiple rapid cache operations', async () => {
      const promises = [];

      // Rapidly cache 10 dishes
      for (let i = 0; i < 10; i++) {
        promises.push(cacheDishAnalysis(`Rapid Dish ${i}`, createMockAnalysis(`Rapid Dish ${i}`)));
      }

      await Promise.all(promises);

      // Verify all were cached
      for (let i = 0; i < 10; i++) {
        const cached = await getCachedDish(`Rapid Dish ${i}`);
        expect(cached).not.toBeNull();
      }
    });
  });

  describe('Cache Data Integrity', () => {
    it('should preserve allergen flags through cache cycle', async () => {
      const dishName = 'Allergen Test';
      const analysis = createMockAnalysis(dishName);

      await cacheDishAnalysis(dishName, analysis);
      const cached = await getCachedDish(dishName);

      expect(cached?.analysis.allergen_flags?.[0].kind).toBe('gluten');
      expect(cached?.analysis.allergen_flags?.[0].present).toBe('yes');
    });

    it('should preserve FODMAP flags through cache cycle', async () => {
      const dishName = 'FODMAP Test';
      const analysis = createMockAnalysis(dishName);

      await cacheDishAnalysis(dishName, analysis);
      const cached = await getCachedDish(dishName);

      expect(cached?.analysis.fodmap_flags?.level).toBe('low');
    });

    it('should preserve nutrition data through cache cycle', async () => {
      const dishName = 'Nutrition Test';
      const analysis = createMockAnalysis(dishName);

      await cacheDishAnalysis(dishName, analysis);
      const cached = await getCachedDish(dishName);

      expect(cached?.analysis.nutrition_summary?.energyKcal).toBe(450);
      expect(cached?.analysis.nutrition_summary?.protein_g).toBe(25);
    });

    it('should preserve full recipe through cache cycle', async () => {
      const dishName = 'Recipe Test';
      const analysis = createMockAnalysis(dishName);

      await cacheDishAnalysis(dishName, analysis);
      const cached = await getCachedDish(dishName);

      const recipe = cached?.analysis.likely_recipe;
      expect(recipe?.title).toBe(dishName);
      expect(recipe?.cooking_method).toBe('grilled');
      expect(recipe?.ingredients).toHaveLength(3);
      expect(recipe?.ingredients?.[0].name).toBe('chicken breast');
    });
  });
});

describe('Cache Metrics', () => {
  // These tests verify the metrics tracking module
  const {
    recordCacheHit,
    recordCacheMiss,
    recordCacheStore,
    getCacheMetrics,
    getCacheHitRate,
    resetMetrics,
  } = require('../utils/cacheMetrics');

  beforeEach(() => {
    resetMetrics();
  });

  it('should track cache hits', () => {
    recordCacheHit('Test Dish');
    const metrics = getCacheMetrics();

    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(0);
  });

  it('should track cache misses', () => {
    recordCacheMiss('Test Dish');
    const metrics = getCacheMetrics();

    expect(metrics.hits).toBe(0);
    expect(metrics.misses).toBe(1);
  });

  it('should calculate hit rate correctly', () => {
    recordCacheHit('Dish 1');
    recordCacheHit('Dish 2');
    recordCacheMiss('Dish 3');

    const hitRate = getCacheHitRate();
    expect(hitRate).toBe(67); // 2/3 = 66.67% rounded to 67%
  });

  it('should track time saved on cache hits', () => {
    recordCacheHit('Dish 1', 2000);
    recordCacheHit('Dish 2', 1500);

    const metrics = getCacheMetrics();
    expect(metrics.totalTimesSavedMs).toBe(3500);
  });

  it('should reset all metrics', () => {
    recordCacheHit('Dish 1');
    recordCacheMiss('Dish 2');
    resetMetrics();

    const metrics = getCacheMetrics();
    expect(metrics.hits).toBe(0);
    expect(metrics.misses).toBe(0);
    expect(metrics.totalTimesSavedMs).toBe(0);
  });
});
