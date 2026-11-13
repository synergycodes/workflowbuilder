import { useSyncExternalStore } from 'react';

import { getTheme, subscribeTheme } from './theme';

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme);

  return { theme };
}

export { type Theme } from './theme';
