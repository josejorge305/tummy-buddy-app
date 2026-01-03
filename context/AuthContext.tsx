import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.rrginvestment.com';

// Storage keys
const AUTH_TOKEN_KEY = '@tummy_buddy_auth_token';
const AUTH_USER_ID_KEY = '@tummy_buddy_auth_user_id';
const AUTH_EMAIL_KEY = '@tummy_buddy_auth_email';
const AUTH_EXPIRES_KEY = '@tummy_buddy_auth_expires';
const DEVICE_USER_ID_KEY = 'tummy_buddy_user_id'; // Legacy anonymous user ID

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  token: string | null;
  expiresAt: number | null;
}

export interface AuthContextValue extends AuthState {
  // Auth actions
  register: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;

  // Get device user ID for anonymous usage (before auth)
  getDeviceUserId: () => Promise<string>;

  // Check if user has completed auth setup
  hasAccount: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    email: null,
    token: null,
    expiresAt: null,
  });

  // Load stored auth state on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Auto-refresh token when it's about to expire (within 7 days)
  useEffect(() => {
    if (!state.token || !state.expiresAt) return;

    const now = Math.floor(Date.now() / 1000);
    const sevenDays = 7 * 24 * 60 * 60;

    if (state.expiresAt - now < sevenDays) {
      refreshToken();
    }
  }, [state.token, state.expiresAt]);

  const loadStoredAuth = async () => {
    try {
      const [token, userId, email, expiresStr] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_USER_ID_KEY),
        AsyncStorage.getItem(AUTH_EMAIL_KEY),
        AsyncStorage.getItem(AUTH_EXPIRES_KEY),
      ]);

      const expiresAt = expiresStr ? parseInt(expiresStr, 10) : null;
      const now = Math.floor(Date.now() / 1000);

      // Check if token is still valid
      if (token && userId && expiresAt && expiresAt > now) {
        // Verify token with backend
        const verified = await verifyToken(token);
        if (verified) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            userId,
            email,
            token,
            expiresAt,
          });
          return;
        }
      }

      // No valid auth, clear any stale data
      await clearStoredAuth();
      setState({
        isAuthenticated: false,
        isLoading: false,
        userId: null,
        email: null,
        token: null,
        expiresAt: null,
      });
    } catch (e) {
      console.error('loadStoredAuth error:', e);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      return data.ok === true;
    } catch (e) {
      console.error('verifyToken error:', e);
      return false;
    }
  };

  const storeAuth = async (userId: string, email: string, token: string, expiresAt: number) => {
    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
      AsyncStorage.setItem(AUTH_USER_ID_KEY, userId),
      AsyncStorage.setItem(AUTH_EMAIL_KEY, email),
      AsyncStorage.setItem(AUTH_EXPIRES_KEY, expiresAt.toString()),
    ]);
  };

  const clearStoredAuth = async () => {
    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_ID_KEY),
      AsyncStorage.removeItem(AUTH_EMAIL_KEY),
      AsyncStorage.removeItem(AUTH_EXPIRES_KEY),
    ]);
  };

  const getDeviceUserId = useCallback(async (): Promise<string> => {
    try {
      // If authenticated, return the auth user ID
      if (state.isAuthenticated && state.userId) {
        return state.userId;
      }

      // Otherwise, get or create anonymous device user ID
      let userId = await AsyncStorage.getItem(DEVICE_USER_ID_KEY);
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 15) +
                 Math.random().toString(36).substring(2, 15);
        await AsyncStorage.setItem(DEVICE_USER_ID_KEY, userId);
      }
      return userId;
    } catch {
      // Fallback for when AsyncStorage fails
      return 'user_' + Date.now().toString(36);
    }
  }, [state.isAuthenticated, state.userId]);

  const register = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      // Get device user ID for data migration
      const deviceUserId = await AsyncStorage.getItem(DEVICE_USER_ID_KEY);

      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          device_user_id: deviceUserId,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        return { ok: false, error: data.error || 'Registration failed' };
      }

      // Store auth data
      await storeAuth(data.user_id, email, data.token, data.expires_at);

      setState({
        isAuthenticated: true,
        isLoading: false,
        userId: data.user_id,
        email,
        token: data.token,
        expiresAt: data.expires_at,
      });

      return { ok: true };
    } catch (e: any) {
      console.error('register error:', e);
      return { ok: false, error: e?.message || 'Network error' };
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      // Get device user ID for data migration
      const deviceUserId = await AsyncStorage.getItem(DEVICE_USER_ID_KEY);

      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          device_user_id: deviceUserId,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        return { ok: false, error: data.error || 'Login failed' };
      }

      // Store auth data
      await storeAuth(data.user_id, email, data.token, data.expires_at);

      setState({
        isAuthenticated: true,
        isLoading: false,
        userId: data.user_id,
        email,
        token: data.token,
        expiresAt: data.expires_at,
      });

      return { ok: true };
    } catch (e: any) {
      console.error('login error:', e);
      return { ok: false, error: e?.message || 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Revoke token on backend
      if (state.token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.token}`,
          },
        }).catch(() => {}); // Ignore errors
      }
    } finally {
      // Clear local state regardless of backend response
      await clearStoredAuth();
      setState({
        isAuthenticated: false,
        isLoading: false,
        userId: null,
        email: null,
        token: null,
        expiresAt: null,
      });
    }
  }, [state.token]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!state.token) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
        },
      });

      const data = await res.json();

      if (!data.ok) {
        // Token invalid, log out
        await logout();
        return false;
      }

      // Update stored auth
      await storeAuth(data.user_id, state.email || '', data.token, data.expires_at);

      setState(prev => ({
        ...prev,
        token: data.token,
        expiresAt: data.expires_at,
      }));

      return true;
    } catch (e) {
      console.error('refreshToken error:', e);
      return false;
    }
  }, [state.token, state.email, logout]);

  const hasAccount = state.isAuthenticated && !!state.email;

  return (
    <AuthContext.Provider value={{
      ...state,
      register,
      login,
      logout,
      refreshToken,
      getDeviceUserId,
      hasAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

// Helper to get auth token for API calls
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

// Helper to get current user ID (auth or device)
export async function getCurrentUserId(): Promise<string> {
  try {
    // First try auth user ID
    const authUserId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
    if (authUserId) return authUserId;

    // Fall back to device user ID
    let deviceUserId = await AsyncStorage.getItem(DEVICE_USER_ID_KEY);
    if (!deviceUserId) {
      deviceUserId = 'user_' + Math.random().toString(36).substring(2, 15) +
                     Math.random().toString(36).substring(2, 15);
      await AsyncStorage.setItem(DEVICE_USER_ID_KEY, deviceUserId);
    }
    return deviceUserId;
  } catch {
    return 'user_' + Date.now().toString(36);
  }
}
