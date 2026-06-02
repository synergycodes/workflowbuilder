const THEME_KEY = 'wb-theme';

export type Theme = 'dark' | 'light';

type Listener = () => void;

const listeners = new Set<Listener>();

function applyToDom(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function getTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'light';
}

export function setTheme(theme: Theme): void {
  const current = getTheme();
  if (current === theme) return;

  localStorage.setItem(THEME_KEY, theme);
  applyToDom(theme);

  for (const listener of listeners) listener();
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reflect the persisted theme on the DOM. Idempotent. Run once on import so a
 * saved non-default theme paints correctly on first load, without waiting for
 * a `setTheme` toggle. Previously this lived in `useTheme`'s mount effect, so
 * it only ran when the app-bar's theme toggle was mounted; centralizing it
 * here keeps it correct for custom layouts that omit the bar.
 */
export function initTheme(): void {
  applyToDom(getTheme());
}

// Client-only SDK: apply the persisted theme as soon as this module loads.
initTheme();
