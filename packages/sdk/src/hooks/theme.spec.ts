import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getTheme, setControlledTheme, setTheme, useControlledTheme, usePersistedTheme } from './theme';
import { resetThemeStore } from './theme.test-utils';

describe('theme module', () => {
  beforeEach(resetThemeStore);

  afterEach(resetThemeStore);

  it('defaults to "light" when localStorage has no value', () => {
    expect(getTheme()).toBe('light');
  });

  // The store reads storage once at start-up; rehydrate() repeats that read.
  it('reads the persisted value from localStorage', async () => {
    localStorage.setItem('wb-theme', 'dark');
    await usePersistedTheme.persist.rehydrate();
    expect(getTheme()).toBe('dark');
  });

  it('falls back to "light" for an empty or unrecognized stored value', async () => {
    usePersistedTheme.setState({ theme: 'dark' });
    localStorage.setItem('wb-theme', '');
    await usePersistedTheme.persist.rehydrate();
    expect(getTheme()).toBe('light');

    usePersistedTheme.setState({ theme: 'dark' });
    localStorage.setItem('wb-theme', 'Dark');
    await usePersistedTheme.persist.rehydrate();
    expect(getTheme()).toBe('light');
  });

  it('setTheme persists the bare string and never writes to document', () => {
    setTheme('dark');

    expect(localStorage.getItem('wb-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(getTheme()).toBe('dark');
  });

  it('setTheme notifies subscribers once', () => {
    const listener = vi.fn();
    const unsubscribe = usePersistedTheme.subscribe(listener);

    setTheme('dark');

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('setTheme does NOT notify subscribers when the value is unchanged', () => {
    setTheme('light');
    const listener = vi.fn();
    const unsubscribe = usePersistedTheme.subscribe(listener);

    setTheme('light');

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
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

  it('controlled updates never reach storage', () => {
    setControlledTheme('dark', vi.fn());
    setControlledTheme('light', vi.fn());

    expect(localStorage.getItem('wb-theme')).toBeNull();
  });

  it('controlled: a theme without onChange pins the value', () => {
    setControlledTheme('light', null);

    setTheme('dark');

    expect(getTheme()).toBe('light');
    expect(localStorage.getItem('wb-theme')).not.toBe('dark');
  });

  it('controlled: changing the controlled value notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = useControlledTheme.subscribe(listener);

    setControlledTheme('dark', vi.fn());
    setControlledTheme('light', vi.fn());

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('giving the theme back to the editor restores the persisted value', () => {
    setTheme('dark');
    setControlledTheme('light', vi.fn());
    expect(getTheme()).toBe('light');

    setControlledTheme(null, null);

    expect(getTheme()).toBe('dark');
  });
});
