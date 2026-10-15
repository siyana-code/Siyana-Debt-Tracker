import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { createTheme, type ResolvedThemeMode, type Theme, type ThemeMode } from './index';

interface ThemeContextValue {
  theme: Theme;
  /** The user's explicit preference. */
  preference: ThemeMode;
  setPreference: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: createTheme('light'),
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({
  children,
  initialMode = 'system',
}: {
  children: ReactNode;
  initialMode?: ThemeMode;
}) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = useState<ThemeMode>(initialMode);

  const value = useMemo<ThemeContextValue>(() => {
    const system: ResolvedThemeMode | null =
      systemScheme === 'dark' || systemScheme === 'light' ? systemScheme : null;
    return {
      theme: createTheme(preference, system),
      preference,
      setPreference,
    };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemePreference(): [ThemeMode, (mode: ThemeMode) => void] {
  const { preference, setPreference } = useContext(ThemeContext);
  return [preference, setPreference];
}

export default ThemeProvider;