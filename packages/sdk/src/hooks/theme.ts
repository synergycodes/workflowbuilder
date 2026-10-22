import { create } from 'zustand';
import { type PersistStorage, persist } from 'zustand/middleware';

const THEME_KEY = 'wb-theme';

export type Theme = 'dark' | 'light';

type ThemeStore = {
  persisted: Theme;
  controlled: Theme | null;
  onChange: ((theme: Theme) => void) | null;
};

type PersistedTheme = Pick<ThemeStore, 'persisted'>;

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

// Keeps the bare 'dark' | 'light' string that 3.x stored, so saved themes survive the upgrade.
// Guarded so a server-side import of the SDK never touches localStorage.
const themeStorage: PersistStorage<PersistedTheme> = {
  getItem: (name) => {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(name);
    return isTheme(stored) ? { state: { persisted: stored } } : null;
  },
  setItem: (name, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(name, value.state.persisted);
  },
  removeItem: (name) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(name);
  },
};

// Separate from the workflow store: Root resets that one on every mount.
export const useThemeStore = create<ThemeStore>()(
  persist((): ThemeStore => ({ persisted: 'light', controlled: null, onChange: null }), {
    name: THEME_KEY,
    storage: themeStorage,
    partialize: ({ persisted }) => ({ persisted }),
  }),
);

export function selectTheme(state: ThemeStore): Theme {
  return state.controlled ?? state.persisted;
}

export function getTheme(): Theme {
  return selectTheme(useThemeStore.getState());
}

export function setTheme(theme: Theme): void {
  const { controlled, onChange, persisted } = useThemeStore.getState();
  // Controlled: the host owns the value and passes the new one back in.
  if (controlled) {
    if (controlled !== theme) onChange?.(theme);
    return;
  }

  if (persisted !== theme) useThemeStore.setState({ persisted: theme });
}

export function subscribeTheme(listener: () => void): () => void {
  return useThemeStore.subscribe(listener);
}

/**
 * Hand the theme to the host; `null`, `null` gives it back to the editor.
 * Notifies subscribers synchronously, so Root must call it from an effect, never during render.
 */
export function setControlledTheme(theme: Theme | null, onChange: ((theme: Theme) => void) | null): void {
  useThemeStore.setState(theme && onChange ? { controlled: theme, onChange } : { controlled: null, onChange: null });
}
