import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import {
  startApifyScrape,
  getApifyJobStatus,
  ApifyJobStatusResponse,
} from '../api/api';

interface PrefetchState {
  restaurantName: string;
  address: string;
  placeId: string;
  jobId: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed';
  data?: any[];
  startedAt: number;
}

interface MenuPrefetchContextValue {
  prefetchMenu: (placeId: string, restaurantName: string, address: string) => Promise<PrefetchState>;
  getPrefetchedMenu: (placeId: string) => PrefetchState | null;
  isMenuReady: (placeId: string) => boolean;
  getPrefetchStatus: (placeId: string) => PrefetchState['status'];
  clearCache: (placeId: string) => void;
}

const MenuPrefetchContext = createContext<MenuPrefetchContextValue | null>(null);

interface MenuPrefetchCache {
  [placeId: string]: PrefetchState;
}

export function MenuPrefetchProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<MenuPrefetchCache>({});
  const activePollingRef = useRef<{ [jobId: string]: boolean }>({});
  const currentPrefetchRef = useRef<string | null>(null);

  const pollJobInBackground = useCallback(async (placeId: string, jobId: string) => {
    const maxWaitMs = 90000;
    const pollIntervalMs = 3000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      if (!activePollingRef.current[jobId]) {
        console.log(`[MenuPrefetch] Polling cancelled for job ${jobId}`);
        return;
      }

      if (currentPrefetchRef.current !== placeId) {
        console.log(`[MenuPrefetch] Different restaurant selected, stopping poll`);
        return;
      }

      try {
        const result = await getApifyJobStatus(jobId);

        if (result.status === 'completed') {
          console.log(`[MenuPrefetch] Job completed with ${result.resultCount || result.data?.length || 0} results`);
          const state = cacheRef.current[placeId];
          if (state) {
            state.status = 'completed';
            state.data = result.data;
          }
          activePollingRef.current[jobId] = false;
          return;
        }

        if (result.status === 'failed' || result.status === 'not_found') {
          console.log(`[MenuPrefetch] Job failed: ${result.error || 'unknown'}`);
          const state = cacheRef.current[placeId];
          if (state) {
            state.status = 'failed';
          }
          activePollingRef.current[jobId] = false;
          return;
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      } catch (e) {
        console.error(`[MenuPrefetch] Poll error:`, e);
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }
    }

    console.log(`[MenuPrefetch] Job timed out`);
    const state = cacheRef.current[placeId];
    if (state) {
      state.status = 'failed';
    }
    activePollingRef.current[jobId] = false;
  }, []);

  const prefetchMenu = useCallback(async (
    placeId: string,
    restaurantName: string,
    address: string
  ): Promise<PrefetchState> => {
    // If same restaurant is already being prefetched, skip
    if (currentPrefetchRef.current === placeId) {
      const existing = cacheRef.current[placeId];
      if (existing && (existing.status === 'running' || existing.status === 'completed')) {
        console.log(`[MenuPrefetch] Already prefetching/prefetched ${restaurantName}`);
        return existing;
      }
    }

    // Cancel any previous prefetch tracking
    if (currentPrefetchRef.current && currentPrefetchRef.current !== placeId) {
      const prevId = currentPrefetchRef.current;
      const prevState = cacheRef.current[prevId];
      if (prevState?.jobId) {
        console.log(`[MenuPrefetch] Cancelling tracking for previous restaurant`);
        activePollingRef.current[prevState.jobId] = false;
      }
    }

    currentPrefetchRef.current = placeId;

    // Check if we already have completed data
    const cached = cacheRef.current[placeId];
    if (cached?.status === 'completed' && cached.data?.length) {
      console.log(`[MenuPrefetch] Using cached data for ${restaurantName}`);
      return cached;
    }

    console.log(`[MenuPrefetch] Starting prefetch for ${restaurantName} at ${address}`);

    const state: PrefetchState = {
      restaurantName,
      address,
      placeId,
      jobId: '',
      status: 'starting',
      startedAt: Date.now(),
    };
    cacheRef.current[placeId] = state;

    try {
      const result = await startApifyScrape(restaurantName, address, 5);

      if (!result.ok || !result.jobId) {
        console.log(`[MenuPrefetch] Failed to start: ${result.message}`);
        state.status = 'failed';
        return state;
      }

      state.jobId = result.jobId;

      // If already cached on server
      if (result.status === 'already_cached' && result.data) {
        console.log(`[MenuPrefetch] Server had cached data`);
        state.status = 'completed';
        state.data = result.data;
        return state;
      }

      state.status = 'running';
      activePollingRef.current[result.jobId] = true;

      // Start background polling
      pollJobInBackground(placeId, result.jobId);

      return state;
    } catch (e: any) {
      console.error(`[MenuPrefetch] Error:`, e?.message || e);
      state.status = 'failed';
      return state;
    }
  }, [pollJobInBackground]);

  const getPrefetchedMenu = useCallback((placeId: string): PrefetchState | null => {
    return cacheRef.current[placeId] || null;
  }, []);

  const isMenuReady = useCallback((placeId: string): boolean => {
    const state = cacheRef.current[placeId];
    return state?.status === 'completed' && Boolean(state.data?.length);
  }, []);

  const getPrefetchStatus = useCallback((placeId: string): PrefetchState['status'] => {
    return cacheRef.current[placeId]?.status || 'idle';
  }, []);

  const clearCache = useCallback((placeId: string) => {
    const state = cacheRef.current[placeId];
    if (state?.jobId) {
      activePollingRef.current[state.jobId] = false;
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
