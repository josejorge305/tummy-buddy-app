/**
 * Cache performance metrics for testing and debugging
 */

interface CacheMetrics {
  hits: number;
  misses: number;
  totalTimesSavedMs: number;
  avgApiCallTimeMs: number;
  cacheOperations: CacheOperation[];
}

interface CacheOperation {
  type: 'hit' | 'miss' | 'store';
  dishName: string;
  timestamp: number;
  apiTimeSavedMs?: number;
  details?: string;
}

// In-memory metrics (reset on app restart)
let metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  totalTimesSavedMs: 0,
  avgApiCallTimeMs: 2000, // Estimated average API call time
  cacheOperations: [],
};

const MAX_OPERATIONS_LOG = 50;

/**
 * Record a cache hit
 */
export function recordCacheHit(dishName: string, estimatedApiTimeMs: number = 2000): void {
  metrics.hits++;
  metrics.totalTimesSavedMs += estimatedApiTimeMs;

  metrics.cacheOperations.unshift({
    type: 'hit',
    dishName,
    timestamp: Date.now(),
    apiTimeSavedMs: estimatedApiTimeMs,
    details: `Cache HIT - saved ~${estimatedApiTimeMs}ms`,
  });

  // Keep log size manageable
  if (metrics.cacheOperations.length > MAX_OPERATIONS_LOG) {
    metrics.cacheOperations.pop();
  }

  console.log(`📦 CACHE HIT: "${dishName}" - saved ~${estimatedApiTimeMs}ms`);
}

/**
 * Record a cache miss
 */
export function recordCacheMiss(dishName: string): void {
  metrics.misses++;

  metrics.cacheOperations.unshift({
    type: 'miss',
    dishName,
    timestamp: Date.now(),
    details: 'Cache MISS - API call required',
  });

  if (metrics.cacheOperations.length > MAX_OPERATIONS_LOG) {
    metrics.cacheOperations.pop();
  }

  console.log(`❌ CACHE MISS: "${dishName}" - calling API`);
}

/**
 * Record a cache store operation
 */
export function recordCacheStore(dishName: string): void {
  metrics.cacheOperations.unshift({
    type: 'store',
    dishName,
    timestamp: Date.now(),
    details: 'Stored in cache',
  });

  if (metrics.cacheOperations.length > MAX_OPERATIONS_LOG) {
    metrics.cacheOperations.pop();
  }

  console.log(`💾 CACHE STORE: "${dishName}"`);
}

/**
 * Get current cache metrics
 */
export function getCacheMetrics(): CacheMetrics {
  return { ...metrics };
}

/**
 * Get cache hit rate as percentage
 */
export function getCacheHitRate(): number {
  const total = metrics.hits + metrics.misses;
  if (total === 0) return 0;
  return Math.round((metrics.hits / total) * 100);
}

/**
 * Get formatted metrics summary
 */
export function getMetricsSummary(): string {
  const total = metrics.hits + metrics.misses;
  const hitRate = getCacheHitRate();
  const timeSavedSec = (metrics.totalTimesSavedMs / 1000).toFixed(1);

  return `
📊 CACHE METRICS
────────────────────
Total lookups: ${total}
Cache hits: ${metrics.hits}
Cache misses: ${metrics.misses}
Hit rate: ${hitRate}%
Est. time saved: ${timeSavedSec}s
────────────────────`;
}

/**
 * Print metrics to console
 */
export function logMetrics(): void {
  console.log(getMetricsSummary());
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  metrics = {
    hits: 0,
    misses: 0,
    totalTimesSavedMs: 0,
    avgApiCallTimeMs: 2000,
    cacheOperations: [],
  };
  console.log('📊 Cache metrics reset');
}

/**
 * Get recent cache operations for debugging
 */
export function getRecentOperations(count: number = 10): CacheOperation[] {
  return metrics.cacheOperations.slice(0, count);
}
