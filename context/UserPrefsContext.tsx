import React, { createContext, useContext, useState, ReactNode } from "react";

interface UserPrefsContextValue {
  selectedAllergens: string[];
  setSelectedAllergens: (next: string[]) => void;
}

const UserPrefsContext = createContext<UserPrefsContextValue | undefined>(undefined);

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  return (
    <UserPrefsContext.Provider value={{ selectedAllergens, setSelectedAllergens }}>
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
