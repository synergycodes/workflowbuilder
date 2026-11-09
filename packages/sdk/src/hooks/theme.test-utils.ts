import { useControlledTheme, usePersistedTheme } from './theme';

/** Back to a fresh light theme with nothing stored; for `beforeEach` / `afterEach`. */
export function resetThemeStore(): void {
  useControlledTheme.setState({ controlled: null });
  usePersistedTheme.setState({ theme: 'light' });
  localStorage.clear();
}
