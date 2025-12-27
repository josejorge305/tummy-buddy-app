import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCacheMetrics,
  getCacheHitRate,
  resetMetrics,
  getRecentOperations,
} from '../utils/cacheMetrics';
import { clearDishCache, searchCachedDishes } from '../utils/dishCache';

interface CacheDebugPanelProps {
  visible?: boolean;
}

/**
 * Debug panel for testing and monitoring cache performance
 * Add this component to any screen during development to monitor cache behavior
 *
 * Usage: <CacheDebugPanel visible={__DEV__} />
 */
export default function CacheDebugPanel({ visible = true }: CacheDebugPanelProps) {
  const [metrics, setMetrics] = useState(getCacheMetrics());
  const [cachedDishes, setCachedDishes] = useState<string[]>([]);
  const [storageSize, setStorageSize] = useState<string>('0 KB');
  const [expanded, setExpanded] = useState(false);

  const refreshMetrics = async () => {
    setMetrics(getCacheMetrics());

    // Get all cached dishes
    const dishes = await searchCachedDishes('');
    setCachedDishes(dishes.map((d) => d.dishName));

    // Estimate storage size
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dishKeys = keys.filter((k) => k.startsWith('@dish_cache_'));
      let totalSize = 0;
      for (const key of dishKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2; // Rough estimate (UTF-16)
        }
      }
      const sizeKB = (totalSize / 1024).toFixed(1);
      setStorageSize(`${sizeKB} KB`);
    } catch (e) {
      setStorageSize('Unknown');
    }
  };

  useEffect(() => {
    if (visible) {
      refreshMetrics();
      const interval = setInterval(refreshMetrics, 2000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  if (!visible) return null;

  const hitRate = getCacheHitRate();
  const recentOps = getRecentOperations(5);

  const handleClearCache = async () => {
    await clearDishCache();
    resetMetrics();
    refreshMetrics();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.header}>
        <Text style={styles.headerText}>
          📊 Cache: {hitRate}% hit rate | {cachedDishes.length} dishes | {storageSize}
        </Text>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{metrics.hits}</Text>
              <Text style={styles.statLabel}>Hits</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{metrics.misses}</Text>
              <Text style={styles.statLabel}>Misses</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{hitRate}%</Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{(metrics.totalTimesSavedMs / 1000).toFixed(1)}s</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recent Operations:</Text>
          <ScrollView style={styles.operationsList}>
            {recentOps.map((op, i) => (
              <View key={i} style={styles.operationItem}>
                <Text
                  style={[
                    styles.operationType,
                    op.type === 'hit' && styles.hitText,
                    op.type === 'miss' && styles.missText,
                    op.type === 'store' && styles.storeText,
                  ]}
                >
                  {op.type.toUpperCase()}
                </Text>
                <Text style={styles.operationDish} numberOfLines={1}>
                  {op.dishName}
                </Text>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Cached Dishes ({cachedDishes.length}):</Text>
          <ScrollView style={styles.dishesList} horizontal>
            {cachedDishes.slice(0, 10).map((dish, i) => (
              <View key={i} style={styles.dishChip}>
                <Text style={styles.dishChipText}>{dish}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.refreshButton} onPress={refreshMetrics}>
              <Text style={styles.buttonText}>🔄 Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearCache}>
              <Text style={styles.buttonText}>🗑️ Clear Cache</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    zIndex: 9999,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  headerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandIcon: {
    color: '#fff',
    fontSize: 12,
  },
  content: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  operationsList: {
    maxHeight: 80,
  },
  operationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  operationType: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 40,
    marginRight: 8,
  },
  hitText: {
    color: '#4CAF50',
  },
  missText: {
    color: '#f44336',
  },
  storeText: {
    color: '#2196F3',
  },
  operationDish: {
    color: '#ccc',
    fontSize: 10,
    flex: 1,
  },
  dishesList: {
    maxHeight: 30,
  },
  dishChip: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  dishChipText: {
    color: '#fff',
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  clearButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
