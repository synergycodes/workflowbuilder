const THEME_KEY = 'wb-theme';

export type Theme = 'dark' | 'light';

type Listener = () => void;

const listeners = new Set<Listener>();

function applyToDom(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

export function getTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'dark' || stored === 'light' ? stored : 'light';
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
 * Reflect the persisted theme on the DOM. Idempotent and SSR-safe (no-op when
 * `document` is absent). Call once from the editor root's client-side mount
 * effect so a saved non-default theme paints on first load without waiting for
 * a `setTheme` toggle, including custom layouts that omit the app bar. Kept off
 * the module's top level on purpose: a side effect at import would crash any
 * server-side import of the SDK and could be dropped by tree-shaking.
 */
export function initTheme(): void {
  applyToDom(getTheme());
}
