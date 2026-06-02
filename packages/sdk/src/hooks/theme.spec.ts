import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getTheme, initTheme, setTheme, subscribeTheme } from './theme';

describe('theme module', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('defaults to "light" when localStorage has no value', () => {
    expect(getTheme()).toBe('light');
  });

  it('reads the persisted value from localStorage', () => {
    localStorage.setItem('wb-theme', 'dark');
    expect(getTheme()).toBe('dark');
  });

  it('setTheme updates localStorage and the document attribute', () => {
    setTheme('dark');

    expect(localStorage.getItem('wb-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(getTheme()).toBe('dark');
  });

  it('setTheme notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);

    setTheme('dark');

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('setTheme does NOT notify subscribers when the value is unchanged', () => {
    setTheme('light');
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);

    setTheme('light');

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('initTheme applies the persisted theme to the DOM without a toggle', () => {
    localStorage.setItem('wb-theme', 'dark');
    delete document.documentElement.dataset.theme;

    initTheme();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('unsubscribe removes the listener', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);
    unsubscribe();

    setTheme('dark');

    expect(listener).not.toHaveBeenCalled();
  });
});
