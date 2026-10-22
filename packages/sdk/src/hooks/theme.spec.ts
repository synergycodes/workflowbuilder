import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getTheme, notifyThemeChange, setControlledTheme, setTheme, subscribeTheme } from './theme';

describe('theme module', () => {
  beforeEach(() => {
    setControlledTheme(null, null);
    localStorage.clear();
  });

  afterEach(() => {
    setControlledTheme(null, null);
    localStorage.clear();
  });

  it('defaults to "light" when localStorage has no value', () => {
    expect(getTheme()).toBe('light');
  });

  it('reads the persisted value from localStorage', () => {
    localStorage.setItem('wb-theme', 'dark');
    expect(getTheme()).toBe('dark');
  });

  it('falls back to "light" for an empty or unrecognized stored value', () => {
    localStorage.setItem('wb-theme', '');
    expect(getTheme()).toBe('light');

    localStorage.setItem('wb-theme', 'Dark');
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
    setControlledTheme('dark', onChange);
    expect(getTheme()).toBe('dark');

    setTheme('light');

    expect(onChange).toHaveBeenCalledWith('light');
    expect(localStorage.getItem('wb-theme')).toBeNull();
    expect(getTheme()).toBe('dark'); // host decides
  });

  it('controlled: setTheme with the current value does not call onChange', () => {
    const onChange = vi.fn();
    setControlledTheme('dark', onChange);

    setTheme('dark');

    expect(onChange).not.toHaveBeenCalled();
  });

  // Root stores the controlled value during render; notifying there would update other
  // components mid-render, so subscribers hear about it only through notifyThemeChange().
  it('controlled: setControlledTheme only stores the value, notifyThemeChange notifies', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);

    setControlledTheme('dark', vi.fn());
    expect(listener).not.toHaveBeenCalled();

    notifyThemeChange();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
