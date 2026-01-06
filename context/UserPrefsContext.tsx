import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  UserProfile,
  UserDailyTargets,
  UserAllergen,
  UserOrganPriority,
  LoggedMeal,
  DailySummary,
  AllergenDefinition,
  PortionMode,
  WaterData,
  getUserProfile,
  updateUserProfile,
  setUserAllergens,
  setUserOrganPriorities,
  addWeightEntry,
  getDailyTracker,
  getWeeklyTracker,
  logMeal,
  deleteMeal,
  updateMealPortion,
  getAllergenDefinitions,
  getTodayDate,
  getWater,
  setWater,
} from '../api/api';
import { useAuth, getCurrentUserId } from './AuthContext';

interface TrackerData {
  date: string;
  summary: DailySummary | null;
  meals: LoggedMeal[];
  targets: UserDailyTargets | null;
  water: {
    total_glasses: number;
    target_glasses: number;
    hydration_score: number;
    organ_impacts: Record<string, number>;
  } | null;
}

interface WeeklyData {
  summaries: DailySummary[];
  weeklyAverages: {
    avg_calories: number;
    avg_protein_g: number;
    avg_carbs_g: number;
    avg_fat_g: number;
    days_logged: number;
  } | null;
}

interface UserPrefsContextValue {
  // User ID
  userId: string | null;

  // Profile data
  profile: UserProfile | null;
  targets: UserDailyTargets | null;
  allergens: UserAllergen[];
  organPriorities: UserOrganPriority[];
  allergenDefinitions: AllergenDefinition[];

  // Tracker data
  todayTracker: TrackerData | null;
  weeklyData: WeeklyData | null;

  // Loading states
  isLoading: boolean;
  isProfileLoading: boolean;
  isTrackerLoading: boolean;

  // Legacy compatibility
  selectedAllergens: string[];
  setSelectedAllergens: (next: string[]) => void;

  // Profile actions
  loadProfile: () => Promise<void>;
  saveProfile: (profileData: Partial<UserProfile>) => Promise<boolean>;
  saveAllergens: (allergens: Array<{ allergen_code: string; severity: 'avoid' | 'limit' | 'monitor' }>) => Promise<boolean>;
  saveOrganPriorities: (organs: Array<{ organ_code: string; priority_rank?: number; is_starred?: boolean }>) => Promise<boolean>;
  updateWeight: (weightKg: number) => Promise<boolean>;

  // Tracker actions
  loadDailyTracker: (date?: string) => Promise<void>;
  loadWeeklyTracker: () => Promise<void>;
  logMealAction: (mealData: {
    dish_name: string;
    dish_id?: string;
    restaurant_name?: string;
    meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    portion_factor?: number;
    // Portion & Sharing fields
    portion_percent?: number;
    portion_multiplier?: number;
    shared_with_count?: number | null;
    leftovers_saved?: boolean;
    portion_mode?: PortionMode;
    // Baseline values (full serving)
    baseline_calories?: number;
    baseline_protein_g?: number;
    baseline_carbs_g?: number;
    baseline_fat_g?: number;
    baseline_fiber_g?: number;
    baseline_sugar_g?: number;
    baseline_sodium_mg?: number;
    baseline_organ_impacts?: Record<string, number>;
    // Consumed values (after portion scaling)
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    organ_impacts?: Record<string, number>;
    risk_flags?: string[];
    full_analysis?: any;
  }) => Promise<{ success: boolean; duplicate?: boolean; error?: string }>;
  updateMealPortionAction: (
    mealId: number,
    portionData: {
      portion_percent: number;
      portion_multiplier: number;
      shared_with_count?: number | null;
      leftovers_saved?: boolean;
      portion_mode?: PortionMode;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteMealAction: (mealId: number) => Promise<boolean>;

  // Water tracking actions
  setWaterGlassesAction: (glasses: number) => Promise<boolean>;

  // Refresh all data
  refreshAll: () => Promise<void>;
}

const UserPrefsContext = createContext<UserPrefsContextValue | undefined>(undefined);

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  // Get user ID from auth context (falls back to device ID if not authenticated)
  const { userId: authUserId, isAuthenticated, isLoading: authLoading } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [targets, setTargets] = useState<UserDailyTargets | null>(null);
  const [allergens, setAllergens] = useState<UserAllergen[]>([]);
  const [organPriorities, setOrganPriorities] = useState<UserOrganPriority[]>([]);
  const [allergenDefinitions, setAllergenDefinitions] = useState<AllergenDefinition[]>([]);

  // Tracker state
  const [todayTracker, setTodayTracker] = useState<TrackerData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isTrackerLoading, setIsTrackerLoading] = useState(false);

  // Legacy compatibility: derived from allergens
  const selectedAllergens = allergens.map(a => a.display_name || a.allergen_code);

  const setSelectedAllergens = useCallback(async (next: string[]) => {
    // Convert display names to allergen codes
    const allergenCodes = next.map(name => {
      const def = allergenDefinitions.find(d =>
        d.display_name.toLowerCase() === name.toLowerCase() ||
        d.allergen_code.toLowerCase() === name.toLowerCase()
      );
      return def?.allergen_code || name.toLowerCase().replace(/\s+/g, '_');
    });

    const newAllergens = allergenCodes.map(code => ({
      allergen_code: code,
      severity: 'avoid' as const,
    }));

    if (userId) {
      await saveAllergens(newAllergens);
    }
  }, [userId, allergenDefinitions]);

  // Initialize user ID - prefer auth user ID, fall back to device ID
  useEffect(() => {
    if (authLoading) {
      if (__DEV__) console.log('[UserPrefsContext] Auth still loading, waiting...');
      return;
    }

    if (isAuthenticated && authUserId) {
      if (__DEV__) console.log('[UserPrefsContext] Using auth userId:', authUserId);
      setUserId(authUserId);
    } else {
      // Get or create device user ID for anonymous usage
      if (__DEV__) console.log('[UserPrefsContext] Getting device userId...');
      getCurrentUserId().then(id => {
        if (__DEV__) console.log('[UserPrefsContext] Got device userId:', id);
        setUserId(id);
      });
    }
  }, [authLoading, isAuthenticated, authUserId]);

  // Load profile and tracker data when userId is set
  useEffect(() => {
    if (userId) {
      if (__DEV__) console.log('[UserPrefsContext] userId set, loading profile and tracker data');
      loadProfile();
      loadAllergenDefinitions();
      loadDailyTracker();
      loadWeeklyTracker();
    }
  }, [userId]);

  const loadAllergenDefinitions = async () => {
    const result = await getAllergenDefinitions();
    if (result.ok && result.allergens) {
      setAllergenDefinitions(result.allergens);
    }
  };

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    setIsProfileLoading(true);
    try {
      const result = await getUserProfile(userId);

      if (result.ok) {
        setProfile(result.profile || null);
        setTargets(result.targets || null);
        setAllergens(result.allergens || []);
        setOrganPriorities(result.organPriorities || []);
      }
    } catch (e) {
      if (__DEV__) console.error('loadProfile error:', e);
    } finally {
      setIsProfileLoading(false);
      setIsLoading(false);
    }
  }, [userId]);

  const saveProfile = useCallback(async (profileData: Partial<UserProfile>): Promise<boolean> => {
    if (!userId) return false;

    setIsProfileLoading(true);
    try {
      const result = await updateUserProfile(userId, profileData);

      if (result.ok) {
        if (result.profile) setProfile(result.profile);
        if (result.targets) setTargets(result.targets);
        return true;
      }
      return false;
    } catch (e) {
      if (__DEV__) console.error('saveProfile error:', e);
      return false;
    } finally {
      setIsProfileLoading(false);
    }
  }, [userId]);

  const saveAllergens = useCallback(async (
    newAllergens: Array<{ allergen_code: string; severity: 'avoid' | 'limit' | 'monitor' }>
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const result = await setUserAllergens(userId, newAllergens);

      if (result.ok) {
        if (result.allergens) setAllergens(result.allergens);
        if (result.targets) setTargets(result.targets);
        return true;
      }
      return false;
    } catch (e) {
      if (__DEV__) console.error('saveAllergens error:', e);
      return false;
    }
  }, [userId]);

  const saveOrganPriorities = useCallback(async (
    organs: Array<{ organ_code: string; priority_rank?: number; is_starred?: boolean }>
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const result = await setUserOrganPriorities(userId, organs);

      if (result.ok && result.organPriorities) {
        setOrganPriorities(result.organPriorities);
        return true;
      }
      return false;
    } catch (e) {
      if (__DEV__) console.error('saveOrganPriorities error:', e);
      return false;
    }
  }, [userId]);

  const updateWeight = useCallback(async (weightKg: number): Promise<boolean> => {
    if (!userId) return false;

    try {
      const result = await addWeightEntry(userId, weightKg);

      if (result.ok && result.profile) {
        setProfile(result.profile);
        return true;
      }
      return false;
    } catch (e) {
      if (__DEV__) console.error('updateWeight error:', e);
      return false;
    }
  }, [userId]);

  const loadDailyTracker = useCallback(async (date?: string) => {
    if (!userId) {
      if (__DEV__) console.log('[loadDailyTracker] No userId, skipping');
      return;
    }

    if (__DEV__) console.log('[loadDailyTracker] Loading for userId:', userId);
    setIsTrackerLoading(true);
    try {
      const targetDate = date || getTodayDate();
      if (__DEV__) console.log('[loadDailyTracker] Fetching for date:', targetDate);
      const result = await getDailyTracker(userId, targetDate);
      if (__DEV__) console.log('[loadDailyTracker] API result ok:', result.ok, 'meals:', result.meals?.length);

      if (result.ok) {
        // Water data is now included in daily tracker response
        const waterData = (result as any).water || null;

        // Organ impacts come as top-level array from backend
        const organImpactsArray = (result as any).organ_impacts || [];
        if (__DEV__) console.log('[loadDailyTracker] organ_impacts from backend:', organImpactsArray);

        // Convert array to object for organ_scores
        const organScores: Record<string, number> = {};
        if (Array.isArray(organImpactsArray)) {
          organImpactsArray.forEach((item: { organ: string; score: number }) => {
            if (item.organ && typeof item.score === 'number') {
              organScores[item.organ] = item.score;
            }
          });
        }
        if (__DEV__) console.log('[loadDailyTracker] organScores converted:', organScores);

        // Merge organ_scores into summary
        const summaryWithOrgans = result.summary ? {
          ...result.summary,
          organ_scores: Object.keys(organScores).length > 0 ? organScores : (result.summary as any).organ_scores,
        } : null;

        setTodayTracker({
          date: result.date,
          summary: summaryWithOrgans,
          meals: result.meals || [],
          targets: result.targets || null,
          water: waterData ? {
            total_glasses: waterData.total_glasses || 0,
            target_glasses: waterData.target_glasses || 8,
            hydration_score: waterData.hydration_score || 0,
            organ_impacts: waterData.organ_impacts || {},
          } : null,
        });
      }
    } catch (e) {
      if (__DEV__) console.error('loadDailyTracker error:', e);
    } finally {
      setIsTrackerLoading(false);
    }
  }, [userId]);

  const loadWeeklyTracker = useCallback(async () => {
    if (!userId) return;

    setIsTrackerLoading(true);
    try {
      const result = await getWeeklyTracker(userId);

      if (result.ok) {
        setWeeklyData({
          summaries: result.summaries || [],
          weeklyAverages: result.weeklyAverages || null,
        });
      }
    } catch (e) {
      if (__DEV__) console.error('loadWeeklyTracker error:', e);
    } finally {
      setIsTrackerLoading(false);
    }
  }, [userId]);

  const logMealAction = useCallback(async (mealData: {
    dish_name: string;
    dish_id?: string;
    restaurant_name?: string;
    meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    portion_factor?: number;
    // Portion & Sharing fields
    portion_percent?: number;
    portion_multiplier?: number;
    shared_with_count?: number | null;
    leftovers_saved?: boolean;
    portion_mode?: PortionMode;
    // Baseline values (full serving)
    baseline_calories?: number;
    baseline_protein_g?: number;
    baseline_carbs_g?: number;
    baseline_fat_g?: number;
    baseline_fiber_g?: number;
    baseline_sugar_g?: number;
    baseline_sodium_mg?: number;
    baseline_organ_impacts?: Record<string, number>;
    // Consumed values (after portion scaling)
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    organ_impacts?: Record<string, number>;
    risk_flags?: string[];
    full_analysis?: any;
  }): Promise<{ success: boolean; duplicate?: boolean; error?: string }> => {
    if (!userId) {
      if (__DEV__) console.error('logMealAction: No userId available');
      return { success: false, error: 'No user ID' };
    }

    if (__DEV__) console.log('logMealAction: Logging meal for user', userId, mealData.dish_name);

    try {
      const result = await logMeal(userId, mealData);
      if (__DEV__) console.log('logMealAction: API result', result);

      if (result.ok) {
        // Refresh tracker data
        await loadDailyTracker();
        return { success: true, duplicate: result.duplicate };
      }
      if (__DEV__) console.error('logMealAction: API returned not ok', result.error);
      return { success: false, error: result.error };
    } catch (e: any) {
      if (__DEV__) console.error('logMealAction error:', e);
      return { success: false, error: e?.message || 'Unknown error' };
    }
  }, [userId, loadDailyTracker]);

  const updateMealPortionAction = useCallback(async (
    mealId: number,
    portionData: {
      portion_percent: number;
      portion_multiplier: number;
      shared_with_count?: number | null;
      leftovers_saved?: boolean;
      portion_mode?: PortionMode;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      if (__DEV__) console.error('updateMealPortionAction: No userId available');
      return { success: false, error: 'No user ID' };
    }

    if (__DEV__) console.log('updateMealPortionAction: Updating portion for meal', mealId, portionData);

    try {
      const result = await updateMealPortion(userId, mealId, portionData);
      if (__DEV__) console.log('updateMealPortionAction: API result', result);

      if (result.ok) {
        // Refresh tracker data to get updated totals
        await loadDailyTracker();
        return { success: true };
      }
      if (__DEV__) console.error('updateMealPortionAction: API returned not ok', result.error);
      return { success: false, error: result.error };
    } catch (e: any) {
      if (__DEV__) console.error('updateMealPortionAction error:', e);
      return { success: false, error: e?.message || 'Unknown error' };
    }
  }, [userId, loadDailyTracker]);

  const deleteMealAction = useCallback(async (mealId: number): Promise<boolean> => {
    if (!userId) return false;

    try {
      const result = await deleteMeal(userId, mealId);

      if (result.ok) {
        // Refresh tracker data
        await loadDailyTracker();
        return true;
      }
      return false;
    } catch (e) {
      if (__DEV__) console.error('deleteMealAction error:', e);
      return false;
    }
  }, [userId, loadDailyTracker]);

  const setWaterGlassesAction = useCallback(async (glasses: number): Promise<boolean> => {
    if (!userId) {
      if (__DEV__) console.warn('setWaterGlassesAction: No userId available, cannot save water');
      return false;
    }

    if (__DEV__) console.log('setWaterGlassesAction: Saving', glasses, 'glasses for user', userId);

    try {
      const result = await setWater(userId, glasses);
      if (__DEV__) console.log('setWaterGlassesAction: API result', result);

      if (result.ok) {
        // Optimistically update local state
        setTodayTracker(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            water: {
              total_glasses: glasses,
              target_glasses: prev.water?.target_glasses || 8,
              hydration_score: Math.min(100, Math.round((glasses / (prev.water?.target_glasses || 8)) * 100)),
              organ_impacts: prev.water?.organ_impacts || {},
            },
          };
        });

        // Refresh tracker data in background to get accurate organ impacts
        loadDailyTracker();
        return true;
      }
      if (__DEV__) console.warn('setWaterGlassesAction: API returned not ok', result);
      return false;
    } catch (e) {
      if (__DEV__) console.error('setWaterGlassesAction error:', e);
      return false;
    }
  }, [userId, loadDailyTracker]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadProfile(),
      loadDailyTracker(),
      loadWeeklyTracker(),
    ]);
  }, [loadProfile, loadDailyTracker, loadWeeklyTracker]);

  return (
    <UserPrefsContext.Provider value={{
      userId,
      profile,
      targets,
      allergens,
      organPriorities,
      allergenDefinitions,
      todayTracker,
      weeklyData,
      isLoading,
      isProfileLoading,
      isTrackerLoading,
      selectedAllergens,
      setSelectedAllergens,
      loadProfile,
      saveProfile,
      saveAllergens,
      saveOrganPriorities,
      updateWeight,
      loadDailyTracker,
      loadWeeklyTracker,
      logMealAction,
      updateMealPortionAction,
      deleteMealAction,
      setWaterGlassesAction,
      refreshAll,
    }}>
      {children}
    </UserPrefsContext.Provider>
  );
}

export function useUserPrefs() {
  const ctx = useContext(UserPrefsContext);
  if (!ctx) {
    throw new Error("useUserPrefs must be used within a UserPrefsProvider");
  }
  return ctx;
}

export { UserPrefsContext };
