import { act, renderHook } from '@testing-library/react';
import i18n from 'i18next';
import { afterEach, describe, expect, it } from 'vitest';

import '../features/i18n/index';
import { useTranslateIfPossible } from './use-translate-if-possible';

function translate(value?: string) {
  const { result } = renderHook(() => useTranslateIfPossible());
  return result.current(value);
}

afterEach(async () => {
  await act(() => i18n.changeLanguage('en'));
});

describe('useTranslateIfPossible', () => {
  it('translates a key that names a text', () => {
    expect(translate('common.settings')).toBe('Settings');
  });

  it('translates in the current language', async () => {
    await act(() => i18n.changeLanguage('pl'));

    expect(translate('common.settings')).toBe('Ustawienia');
  });

  it.each(['validation', 'header.projectSelection'])('returns nothing for %s, a key that names a group', (key) => {
    expect(translate(key)).toBeUndefined();
  });

  it.each([['Hello world'], [''], [undefined]])('returns nothing for %j, which is not a key', (value) => {
    expect(translate(value)).toBeUndefined();
  });
});
