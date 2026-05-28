import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openExportModal } from '../features/integration/components/import-export/export-modal/open-export-modal';
import { openImportModal } from '../features/integration/components/import-export/import-modal/open-import-modal';
import { IntegrationContext } from '../features/integration/components/integration-variants/context/integration-context-wrapper';
import { openModalWorkflowSettings } from '../features/variables/modals/modal-settings';
import { useStore } from '../store/store';
import { getTheme } from './theme';
import { type WorkflowBuilderActions, useWorkflowBuilderActions } from './use-workflow-builder-actions';

vi.mock('../features/integration/components/import-export/export-modal/open-export-modal', () => ({
  openExportModal: vi.fn(),
}));

vi.mock('../features/integration/components/import-export/import-modal/open-import-modal', () => ({
  openImportModal: vi.fn(),
}));

vi.mock('../features/variables/modals/modal-settings', () => ({
  openModalWorkflowSettings: vi.fn(),
}));

// Short-circuit the use-integration-store chain that drags in
// @synergycodes/overflow-ui (CSS side-effect that vitest's jsdom env can't load).
vi.mock('@/features/integration/stores/use-integration-store', () => ({
  getStoreSavingStatus: vi.fn(),
  setStoreSavingStatus: vi.fn(),
}));

vi.mock('@/features/changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange: vi.fn(),
}));

function renderHook<T>(useHookFn: () => T, onSave = vi.fn().mockResolvedValue('success' as const)) {
  const captured: { current: T | null } = { current: null };

  function Consumer() {
    captured.current = useHookFn();
    return null;
  }

  render(
    <IntegrationContext.Provider value={{ onSave }}>
      <Consumer />
    </IntegrationContext.Provider>,
  );

  return { actions: captured, onSave };
}

describe('useWorkflowBuilderActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    useStore.setState({ isReadOnlyMode: false, layoutDirection: 'RIGHT' });
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  describe('save', () => {
    it('calls IntegrationContext.onSave with isAutoSave: false', async () => {
      const { actions, onSave } = renderHook(useWorkflowBuilderActions);

      await actions.current!.save();

      expect(onSave).toHaveBeenCalledWith({ isAutoSave: false });
    });

    it('returns the resolution from onSave', async () => {
      const { actions } = renderHook(useWorkflowBuilderActions, vi.fn().mockResolvedValue('error'));

      await expect(actions.current!.save()).resolves.toBe('error');
    });
  });

  describe('modal openers', () => {
    it('openSettings delegates to openModalWorkflowSettings', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.openSettings();

      expect(openModalWorkflowSettings).toHaveBeenCalledTimes(1);
    });

    it('openImport delegates to openImportModal', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.openImport();

      expect(openImportModal).toHaveBeenCalledTimes(1);
    });

    it('openExport delegates to openExportModal', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.openExport();

      expect(openExportModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('read-only', () => {
    it('toggleReadOnly flips isReadOnlyMode', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);
      expect(useStore.getState().isReadOnlyMode).toBe(false);

      actions.current!.toggleReadOnly();
      expect(useStore.getState().isReadOnlyMode).toBe(true);

      actions.current!.toggleReadOnly();
      expect(useStore.getState().isReadOnlyMode).toBe(false);
    });

    it('setReadOnly sets the value explicitly regardless of current state', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setReadOnly(true);
      expect(useStore.getState().isReadOnlyMode).toBe(true);

      actions.current!.setReadOnly(true);
      expect(useStore.getState().isReadOnlyMode).toBe(true);

      actions.current!.setReadOnly(false);
      expect(useStore.getState().isReadOnlyMode).toBe(false);
    });
  });

  describe('theme', () => {
    it('setTheme writes through to the theme module', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setTheme('dark');

      expect(getTheme()).toBe('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('toggleDarkMode flips theme', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);
      expect(getTheme()).toBe('light');

      actions.current!.toggleDarkMode();
      expect(getTheme()).toBe('dark');

      actions.current!.toggleDarkMode();
      expect(getTheme()).toBe('light');
    });
  });

  describe('layout direction', () => {
    it('setLayoutDirection sets the value explicitly', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setLayoutDirection('DOWN');

      expect(useStore.getState().layoutDirection).toBe('DOWN');
    });

    it('toggleLayoutDirection flips RIGHT to DOWN and back', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);
      expect(useStore.getState().layoutDirection).toBe('RIGHT');

      actions.current!.toggleLayoutDirection();
      expect(useStore.getState().layoutDirection).toBe('DOWN');

      actions.current!.toggleLayoutDirection();
      expect(useStore.getState().layoutDirection).toBe('RIGHT');
    });
  });

  describe('identity', () => {
    it('returns a stable object reference across re-renders when dependencies are unchanged', () => {
      const seen: WorkflowBuilderActions[] = [];
      const onSave = vi.fn().mockResolvedValue('success' as const);

      function Consumer() {
        const actions = useWorkflowBuilderActions();
        const ref = useRef(0);
        ref.current += 1;
        seen.push(actions);
        return null;
      }

      const { rerender } = render(
        <IntegrationContext.Provider value={{ onSave }}>
          <Consumer />
        </IntegrationContext.Provider>,
      );

      rerender(
        <IntegrationContext.Provider value={{ onSave }}>
          <Consumer />
        </IntegrationContext.Provider>,
      );

      expect(seen.length).toBe(2);
      expect(seen[0]).toBe(seen[1]);
    });
  });
});
