import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import {
  fetchMenuFast,
  ValidatedMenuData,
  MenuValidation,
  ValidatedRestaurant,
  ValidatedMenuSection,
} from '../api/api';

interface PrefetchState {
  restaurantName: string;
  address: string;
  placeId: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed';
  data?: ValidatedMenuData;
  validation?: MenuValidation;
  error?: string;
  startedAt: number;
}

interface MenuPrefetchContextValue {
  prefetchMenu: (placeId: string, restaurantName: string, address: string) => Promise<PrefetchState>;
  getPrefetchedMenu: (placeId: string) => PrefetchState | null;
  isMenuReady: (placeId: string) => boolean;
  getPrefetchStatus: (placeId: string) => PrefetchState['status'];
  getValidationConfidence: (placeId: string) => number | null;
  getError: (placeId: string) => string | null;
  clearCache: (placeId: string) => void;
}

const MenuPrefetchContext = createContext<MenuPrefetchContextValue | null>(null);

interface MenuPrefetchCache {
  [placeId: string]: PrefetchState;
}

export function MenuPrefetchProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<MenuPrefetchCache>({});
  const currentPrefetchRef = useRef<string | null>(null);
  const abortControllersRef = useRef<{ [placeId: string]: AbortController }>({});

  const prefetchMenu = useCallback(async (
    placeId: string,
    restaurantName: string,
    address: string
  ): Promise<PrefetchState> => {
    // If same restaurant is already being prefetched or completed, use cached
    if (currentPrefetchRef.current === placeId) {
      const existing = cacheRef.current[placeId];
      if (existing && (existing.status === 'running' || existing.status === 'completed')) {
        if (__DEV__) console.log(`[MenuPrefetch] Already prefetching/prefetched ${restaurantName}`);
        return existing;
      }
    }

    // Cancel any previous prefetch
    if (currentPrefetchRef.current && currentPrefetchRef.current !== placeId) {
      const prevId = currentPrefetchRef.current;
      const prevController = abortControllersRef.current[prevId];
      if (prevController) {
        if (__DEV__) console.log(`[MenuPrefetch] Cancelling previous prefetch`);
        prevController.abort();
        delete abortControllersRef.current[prevId];
      }
    }

    currentPrefetchRef.current = placeId;

    // Check if we already have completed data
    const cached = cacheRef.current[placeId];
    if (cached?.status === 'completed' && cached.data?.sections?.length) {
      if (__DEV__) console.log(`[MenuPrefetch] Using cached data for ${restaurantName}`);
      return cached;
    }

    if (__DEV__) console.log(`[MenuPrefetch] Starting prefetch for ${restaurantName} at ${address}`);

    const state: PrefetchState = {
      restaurantName,
      address,
      placeId,
      status: 'running',
      startedAt: Date.now(),
    };
    cacheRef.current[placeId] = state;

    // Create abort controller for this prefetch
    const abortController = new AbortController();
    abortControllersRef.current[placeId] = abortController;

    try {
      // Use fetchMenuFast which calls the in-house scraper
      const result = await fetchMenuFast(restaurantName, address, 100);

      // Check if this prefetch was cancelled
      if (abortController.signal.aborted) {
        if (__DEV__) console.log(`[MenuPrefetch] Prefetch was cancelled for ${restaurantName}`);
        return state;
      }

      if (result.ok && result.sections && result.sections.length > 0) {
        if (__DEV__) console.log(`[MenuPrefetch] Prefetch completed with ${result.sections.length} sections`);
        if (result.validation) {
          if (__DEV__) console.log(`[MenuPrefetch] Confidence: ${(result.validation.confidence * 100).toFixed(0)}%`);
        }

        state.status = 'completed';
        state.data = {
          restaurant: result.restaurant as ValidatedRestaurant,
          sections: result.sections,
          meta: result.meta || {
            totalSections: result.sections.length,
            totalItems: result.sections.reduce((sum, s) => sum + s.items.length, 0),
            availableItems: result.sections.reduce((sum, s) => sum + s.items.filter(i => i.available !== false).length, 0),
            source: result.source || 'inhouse',
            scrapedAt: new Date().toISOString(),
          },
        };
        state.validation = result.validation;
      } else {
        if (__DEV__) console.warn(`[MenuPrefetch] Prefetch failed: ${result.error}`);
        state.status = 'failed';
        state.error = result.error || 'No menu data found';
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        if (__DEV__) console.log(`[MenuPrefetch] Prefetch aborted for ${restaurantName}`);
      } else {
        if (__DEV__) console.error(`[MenuPrefetch] Error:`, e?.message || e);
        state.status = 'failed';
        state.error = e?.message || 'Failed to prefetch menu';
      }
    } finally {
      delete abortControllersRef.current[placeId];
    }

    return state;
  }, []);

  const getPrefetchedMenu = useCallback((placeId: string): PrefetchState | null => {
    return cacheRef.current[placeId] || null;
  }, []);

  const isMenuReady = useCallback((placeId: string): boolean => {
    const state = cacheRef.current[placeId];
    return state?.status === 'completed' && Boolean(state.data?.sections?.length);
  }, []);

  const getPrefetchStatus = useCallback((placeId: string): PrefetchState['status'] => {
    return cacheRef.current[placeId]?.status || 'idle';
  }, []);

  const getValidationConfidence = useCallback((placeId: string): number | null => {
    const state = cacheRef.current[placeId];
    return state?.validation?.confidence ?? null;
  }, []);

  const getError = useCallback((placeId: string): string | null => {
    const state = cacheRef.current[placeId];
    return state?.error ?? null;
  }, []);

  const clearCache = useCallback((placeId: string) => {
    const controller = abortControllersRef.current[placeId];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[placeId];
    }
    delete cacheRef.current[placeId];
  }, []);

  return (
    <MenuPrefetchContext.Provider
      value={{
        prefetchMenu,
        getPrefetchedMenu,
        isMenuReady,
        getPrefetchStatus,
        getValidationConfidence,
        getError,
        clearCache,
      }}
    >
      {children}
    </MenuPrefetchContext.Provider>
  );
}

export function useMenuPrefetch() {
  const context = useContext(MenuPrefetchContext);
  if (!context) {
    throw new Error('useMenuPrefetch must be used within MenuPrefetchProvider');
  }
  return context;
}

export default MenuPrefetchContext;
