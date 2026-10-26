import { useCallback } from 'react';

import { getTheme, selectTheme, setTheme, useThemeStore } from './theme';

export function useTheme() {
  const theme = useThemeStore(selectTheme);

  const toggleTheme = useCallback(() => {
    setTheme(getTheme() === 'light' ? 'dark' : 'light');
  }, []);

  return { theme, toggleTheme };
}

export { type Theme } from './theme';
