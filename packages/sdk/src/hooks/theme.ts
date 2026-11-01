import { create } from 'zustand';
import { type PersistStorage, persist } from 'zustand/middleware';

const THEME_KEY = 'wb-theme';

/** The editor's color theme. */
export type Theme = 'dark' | 'light';

type PersistedThemeStore = { theme: Theme };

type ControlledTheme = { theme: Theme; onChange: ((theme: Theme) => void) | null };
type ControlledThemeStore = { controlled: ControlledTheme | null };

const DEFAULT_THEME: Theme = 'light';

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

// Keeps the bare 'dark' | 'light' string that 3.x stored, so saved themes survive the upgrade.
// Guarded so a server-side import of the SDK never touches localStorage.
const themeStorage: PersistStorage<PersistedThemeStore> = {
  getItem: (name) => {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(name);
    return { state: { theme: isTheme(stored) ? stored : DEFAULT_THEME } };
  },
  setItem: (name, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(name, value.state.theme);
  },
  removeItem: (name) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(name);
  },
};

// The user's own choice. Separate from the workflow store: Root resets that one on every mount.
export const usePersistedTheme = create<PersistedThemeStore>()(
  persist((): PersistedThemeStore => ({ theme: DEFAULT_THEME }), { name: THEME_KEY, storage: themeStorage }),
);

// The host's value while Root has a `theme` prop; its own store, so it never reaches storage.
export const useControlledTheme = create<ControlledThemeStore>()(() => ({ controlled: null }));

export function getTheme(): Theme {
  return useControlledTheme.getState().controlled?.theme ?? usePersistedTheme.getState().theme;
}

export function setTheme(theme: Theme): void {
  const { controlled } = useControlledTheme.getState();
  // Controlled: the host owns the value and passes the new one back in; without onChange it is pinned.
  if (controlled) {
    if (controlled.theme !== theme) controlled.onChange?.(theme);
    return;
  }

  if (usePersistedTheme.getState().theme !== theme) usePersistedTheme.setState({ theme });
}

/**
 * Hand the theme to the host; `null` gives it back to the editor.
 * Notifies subscribers synchronously, so Root must call it from an effect, never during render.
 */
export function setControlledTheme(theme: Theme | null, onChange: ((theme: Theme) => void) | null): void {
  useControlledTheme.setState({ controlled: theme ? { theme, onChange } : null });
}
