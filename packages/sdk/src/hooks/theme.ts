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
