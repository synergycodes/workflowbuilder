import { useCallback, useContext } from 'react';

import { HostThemeContext } from './host-theme-context';
import { getTheme, setTheme, useControlledTheme, usePersistedTheme } from './theme';

export function useTheme() {
  const hostTheme = useContext(HostThemeContext);
  const controlledTheme = useControlledTheme((state) => state.controlled?.theme ?? null);
  const persistedTheme = usePersistedTheme((state) => state.theme);
  const theme = hostTheme ?? controlledTheme ?? persistedTheme;

  const toggleTheme = useCallback(() => {
    setTheme(getTheme() === 'light' ? 'dark' : 'light');
  }, []);

  return { theme, toggleTheme };
}

export { type Theme } from './theme';
