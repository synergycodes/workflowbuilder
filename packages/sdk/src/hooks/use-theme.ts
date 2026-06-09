import { useCallback, useSyncExternalStore } from 'react';

import { getTheme, setTheme, subscribeTheme } from './theme';

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme);

  const toggleTheme = useCallback(() => {
    setTheme(getTheme() === 'light' ? 'dark' : 'light');
  }, []);

  return { theme, toggleTheme };
}

export { type Theme } from './theme';
