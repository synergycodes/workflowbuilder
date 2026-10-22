const THEME_KEY = 'wb-theme';

export type Theme = 'dark' | 'light';

type Listener = () => void;

type ControlledTheme = { theme: Theme; onChange: (theme: Theme) => void };

const listeners = new Set<Listener>();

let controlled: ControlledTheme | null = null;

function readPersistedTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'dark' || stored === 'light' ? stored : 'light';
}

export function getTheme(): Theme {
  return controlled ? controlled.theme : readPersistedTheme();
}

export function setTheme(theme: Theme): void {
  // Controlled: the host owns the value and passes the new one back in.
  if (controlled) {
    if (controlled.theme !== theme) controlled.onChange(theme);
    return;
  }

  if (readPersistedTheme() === theme) return;

  localStorage.setItem(THEME_KEY, theme);
  notifyThemeChange();
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Store the host-controlled theme, or `null` to fall back to the persisted one.
 * Written by Root during render, so it never notifies: updating subscribers mid-render
 * is a React error. Root calls `notifyThemeChange()` from an effect instead.
 */
export function setControlledTheme(theme: Theme | null, onChange: ((theme: Theme) => void) | null): void {
  controlled = theme && onChange ? { theme, onChange } : null;
}

export function notifyThemeChange(): void {
  for (const listener of listeners) listener();
}
