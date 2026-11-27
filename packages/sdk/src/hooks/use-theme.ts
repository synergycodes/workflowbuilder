import { useContext } from 'react';

import { HostThemeContext } from './host-theme-context';
import { useControlledTheme, usePersistedTheme } from './theme';

export function useTheme() {
  const hostTheme = useContext(HostThemeContext);
  const controlledTheme = useControlledTheme((state) => state.controlled?.theme ?? null);
  const persistedTheme = usePersistedTheme((state) => state.theme);
  const theme = hostTheme ?? controlledTheme ?? persistedTheme;

  return { theme };
}

export { type Theme } from './theme';
