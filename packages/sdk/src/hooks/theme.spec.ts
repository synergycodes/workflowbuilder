import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getTheme, setControlledTheme, setTheme, subscribeTheme, useThemeStore } from './theme';

function resetThemeStore(): void {
  useThemeStore.setState({ persisted: 'light', controlled: null, onChange: null });
  localStorage.clear();
}

describe('theme module', () => {
  beforeEach(resetThemeStore);

  afterEach(resetThemeStore);

  it('defaults to "light" when localStorage has no value', () => {
    expect(getTheme()).toBe('light');
  });

  // The store reads storage once at start-up; rehydrate() repeats that read.
  it('reads the persisted value from localStorage', async () => {
    localStorage.setItem('wb-theme', 'dark');
    await useThemeStore.persist.rehydrate();
    expect(getTheme()).toBe('dark');
  });

  it('falls back to "light" for an empty or unrecognized stored value', async () => {
    localStorage.setItem('wb-theme', '');
    await useThemeStore.persist.rehydrate();
    expect(getTheme()).toBe('light');

    localStorage.setItem('wb-theme', 'Dark');
    await useThemeStore.persist.rehydrate();
    expect(getTheme()).toBe('light');
  });

  it('setTheme persists and never writes to document', () => {
    setTheme('dark');

    expect(localStorage.getItem('wb-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBeUndefined();
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

  it('unsubscribe removes the listener', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);
    unsubscribe();

    setTheme('dark');

    expect(listener).not.toHaveBeenCalled();
  });

  it('controlled: getTheme returns the controlled value and setTheme calls onChange without persisting', () => {
    const onChange = vi.fn();
    setControlledTheme('light', onChange);
    expect(getTheme()).toBe('light');

    setTheme('dark');

    expect(onChange).toHaveBeenCalledWith('dark');
    expect(localStorage.getItem('wb-theme')).not.toBe('dark');
    expect(getTheme()).toBe('light'); // host decides
  });

  it('controlled: setTheme with the current value does not call onChange', () => {
    const onChange = vi.fn();
    setControlledTheme('dark', onChange);

    setTheme('dark');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('controlled: changing the controlled value notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);

    setControlledTheme('dark', vi.fn());
    setControlledTheme('light', vi.fn());

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
