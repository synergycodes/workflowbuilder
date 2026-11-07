import { useCallback } from 'react';

import { getTheme, setTheme, useControlledTheme, usePersistedTheme } from './theme';

export function useTheme() {
  const controlledTheme = useControlledTheme((state) => state.controlled?.theme ?? null);
  const persistedTheme = usePersistedTheme((state) => state.theme);
  const theme = controlledTheme ?? persistedTheme;

  const toggleTheme = useCallback(() => {
    setTheme(getTheme() === 'light' ? 'dark' : 'light');
  }, []);

  return { theme, toggleTheme };
}

export { type Theme } from './theme';
