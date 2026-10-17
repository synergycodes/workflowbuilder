import { act, render } from '@testing-library/react';
import i18n from 'i18next';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import '../features/i18n/index';
import { resetWorkflowStore, useStore } from '../store/store';
import { setTheme } from './theme';
import { type WorkflowBuilderState, useWorkflowBuilderState } from './use-workflow-builder-state';

function renderState() {
  const seen: WorkflowBuilderState[] = [];

  function Consumer() {
    seen.push(useWorkflowBuilderState());
    return null;
  }

  const { rerender } = render(<Consumer />);

  return {
    seen,
    current: () => seen.at(-1)!,
    rerender: () => rerender(<Consumer />),
  };
}

beforeEach(async () => {
  resetWorkflowStore();
  localStorage.clear();
  await i18n.changeLanguage('en');
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('useWorkflowBuilderState', () => {
  it('isReadOnly follows the store', () => {
    const state = renderState();
    expect(state.current().isReadOnly).toBe(false);

    act(() => useStore.setState({ isReadOnly: true }));

    expect(state.current().isReadOnly).toBe(true);
  });

  it('theme follows setTheme', () => {
    const state = renderState();
    expect(state.current().theme).toBe('light');

    act(() => setTheme('dark'));

    expect(state.current().theme).toBe('dark');
  });

  it('language follows i18n.changeLanguage', async () => {
    const state = renderState();
    expect(state.current().language).toBe('en');

    await act(() => i18n.changeLanguage('pl'));

    expect(state.current().language).toBe('pl');
  });

  it("language falls back to 'en' for an unsupported resolved language", async () => {
    i18n.addResourceBundle('de', 'translation', { greeting: 'Hallo' });
    try {
      const state = renderState();

      await act(() => i18n.changeLanguage('de'));

      expect(i18n.resolvedLanguage).toBe('de');
      expect(state.current().language).toBe('en');
    } finally {
      i18n.removeResourceBundle('de', 'translation');
    }
  });

  it('isPaletteOpen follows the store', () => {
    const state = renderState();
    expect(state.current().isPaletteOpen).toBe(false);

    act(() => useStore.setState({ isPaletteOpen: true }));

    expect(state.current().isPaletteOpen).toBe(true);
  });

  it('isPropertiesPanelOpen follows the store', () => {
    const state = renderState();
    expect(state.current().isPropertiesPanelOpen).toBe(true);

    act(() => useStore.setState({ isPropertiesPanelOpen: false }));

    expect(state.current().isPropertiesPanelOpen).toBe(false);
  });

  it('paletteFilter follows the store', () => {
    const state = renderState();
    expect(state.current().paletteFilter).toBe('');

    act(() => useStore.setState({ paletteFilter: 'mail' }));

    expect(state.current().paletteFilter).toBe('mail');
  });

  it('layoutDirection follows the store', () => {
    const state = renderState();
    expect(state.current().layoutDirection).toBe('RIGHT');

    act(() => useStore.setState({ layoutDirection: 'DOWN' }));

    expect(state.current().layoutDirection).toBe('DOWN');
  });

  it('documentName follows the store', () => {
    const state = renderState();

    act(() => useStore.setState({ documentName: 'Onboarding' }));

    expect(state.current().documentName).toBe('Onboarding');
  });

  it("documentName is '' when the store holds null", () => {
    act(() => useStore.setState({ documentName: null }));

    const state = renderState();

    expect(state.current().documentName).toBe('');
  });

  it('returns the same object while nothing changed', () => {
    const state = renderState();

    state.rerender();

    expect(state.seen.length).toBeGreaterThan(1);
    expect(state.seen.at(-1)).toBe(state.seen[0]);
  });
});
