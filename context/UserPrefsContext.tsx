import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  UserDailyTargets,
  UserAllergen,
  UserOrganPriority,
  LoggedMeal,
  DailySummary,
  AllergenDefinition,
  getUserProfile,
  updateUserProfile,
  setUserAllergens,
  setUserOrganPriorities,
  addWeightEntry,
  getDailyTracker,
  getWeeklyTracker,
  logMeal,
  deleteMeal,
  getAllergenDefinitions,
  getTodayDate,
} from '../api/api';

// Generate a unique user ID if not exists
async function getOrCreateUserId(): Promise<string> {
  try {
    let userId = await AsyncStorage.getItem('tummy_buddy_user_id');
    if (!userId) {
      // Generate a UUID-like ID
      userId = 'user_' + Math.random().toString(36).substring(2, 15) +
               Math.random().toString(36).substring(2, 15);
      await AsyncStorage.setItem('tummy_buddy_user_id', userId);
    }
    return userId;
  } catch {
    // Fallback for when AsyncStorage fails
    return 'user_' + Date.now().toString(36);
  }
}

interface TrackerData {
  date: string;
  summary: DailySummary | null;
  meals: LoggedMeal[];
  targets: UserDailyTargets | null;
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
  }) => Promise<{ success: boolean; duplicate?: boolean }>;
  deleteMealAction: (mealId: number) => Promise<boolean>;

  // Refresh all data
  refreshAll: () => Promise<void>;
}

const UserPrefsContext = createContext<UserPrefsContextValue | undefined>(undefined);

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  // User ID
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

  // Initialize user ID on mount
  useEffect(() => {
    getOrCreateUserId().then(id => {
      setUserId(id);
    });
  }, []);

  // Load profile when userId is set
  useEffect(() => {
    if (userId) {
      loadProfile();
      loadAllergenDefinitions();
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
      console.error('loadProfile error:', e);
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
      console.error('saveProfile error:', e);
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
      console.error('saveAllergens error:', e);
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
      console.error('saveOrganPriorities error:', e);
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
      console.error('updateWeight error:', e);
      return false;
    }
  }, [userId]);

  const loadDailyTracker = useCallback(async (date?: string) => {
    if (!userId) return;

    setIsTrackerLoading(true);
    try {
      const targetDate = date || getTodayDate();
      const result = await getDailyTracker(userId, targetDate);

      if (result.ok) {
        setTodayTracker({
          date: result.date,
          summary: result.summary || null,
          meals: result.meals || [],
          targets: result.targets || null,
        });
      }
    } catch (e) {
      console.error('loadDailyTracker error:', e);
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
      console.error('loadWeeklyTracker error:', e);
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
  }): Promise<{ success: boolean; duplicate?: boolean }> => {
    if (!userId) return { success: false };

    try {
      const result = await logMeal(userId, mealData);

      if (result.ok) {
        // Refresh tracker data
        await loadDailyTracker();
        return { success: true, duplicate: result.duplicate };
      }
      return { success: false };
    } catch (e) {
      console.error('logMealAction error:', e);
      return { success: false };
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
      console.error('deleteMealAction error:', e);
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
      deleteMealAction,
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
