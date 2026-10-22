import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openExportModal } from '../features/integration/components/import-export/export-modal/open-export-modal';
import { openImportModal } from '../features/integration/components/import-export/import-modal/open-import-modal';
import { IntegrationContext } from '../features/integration/components/integration-variants/context/integration-context-wrapper';
import { useModalStore } from '../features/modals/stores/use-modal-store';
import type * as OpenTemplateSelectorModalModule from '../features/modals/template-selector/open-template-selector-modal';
import { openTemplateSelectorModal } from '../features/modals/template-selector/open-template-selector-modal';
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

vi.mock('../features/modals/template-selector/open-template-selector-modal', () => ({
  openTemplateSelectorModal: vi.fn(),
}));

vi.mock('../features/variables/modals/modal-settings', () => ({
  openModalWorkflowSettings: vi.fn(),
}));

// Short-circuit the use-integration-store chain that drags in
// @workflowbuilder/ui (CSS side-effect that vitest's jsdom env can't load).
vi.mock('@/features/integration/stores/use-integration-store', () => ({
  getStoreSavingStatus: vi.fn(),
  setStoreSavingStatus: vi.fn(),
}));

vi.mock('@/features/changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange: vi.fn(),
}));

const changeLanguage = vi.fn();
// A stable `i18n` object reference: the hook's useMemo depends on it, so a new
// object identity on every render would defeat the memoization-identity tests.
const i18nStub = { changeLanguage };
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: i18nStub }),
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
    // clearAllMocks doesn't undo a mockImplementation override (only resetAllMocks
    // does); one test below swaps in the real implementation to exercise its
    // internal read-only guard, so restore the plain stub for every other test.
    vi.mocked(openTemplateSelectorModal).mockReset();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    useStore.setState({
      isReadOnly: false,
      isPaletteOpen: false,
      isPropertiesPanelOpen: true,
      paletteFilter: '',
      layoutDirection: 'RIGHT',
      nodes: [],
      edges: [],
      selectedNodesIds: [],
      selectedEdgesIds: [],
      documentName: '',
      reactFlowInstance: undefined,
    });
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('renders without a ReactFlowProvider ancestor', () => {
    expect(() => renderHook(useWorkflowBuilderActions)).not.toThrow();
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

    it('openTemplates delegates to openTemplateSelectorModal', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.openTemplates();

      expect(openTemplateSelectorModal).toHaveBeenCalledTimes(1);
    });

    it('openTemplates is a no-op in read-only mode (the guard lives in openTemplateSelectorModal itself)', async () => {
      const actual = await vi.importActual<typeof OpenTemplateSelectorModalModule>(
        '../features/modals/template-selector/open-template-selector-modal',
      );
      vi.mocked(openTemplateSelectorModal).mockImplementation(actual.openTemplateSelectorModal);
      useStore.setState({ isReadOnly: true });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.openTemplates();

      expect(useModalStore.getState().isOpen).toBe(false);
    });
  });

  describe('deleteSelection', () => {
    const deleteElements = vi.fn();

    beforeEach(() => {
      useStore.setState({ reactFlowInstance: { deleteElements } as never });
    });

    it('passes every selected node and edge to deleteElements', () => {
      useStore.setState({
        nodes: [
          { id: 'n1', position: { x: 0, y: 0 } },
          { id: 'n2', position: { x: 0, y: 0 } },
        ] as never,
        edges: [{ id: 'e1', source: 'n1', target: 'n2' }] as never,
        selectedNodesIds: ['n1'],
        selectedEdgesIds: ['e1'],
      });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.deleteSelection();

      expect(deleteElements).toHaveBeenCalledWith({
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
        edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      });
    });

    it('does not call deleteElements when nothing is selected', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.deleteSelection();

      expect(deleteElements).not.toHaveBeenCalled();
    });

    it('is a no-op in read-only mode', () => {
      useStore.setState({
        isReadOnly: true,
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }] as never,
        selectedNodesIds: ['n1'],
      });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.deleteSelection();

      expect(deleteElements).not.toHaveBeenCalled();
    });

    it('is a no-op until the canvas has mounted', () => {
      useStore.setState({
        reactFlowInstance: null,
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }] as never,
        selectedNodesIds: ['n1'],
      });
      const { actions } = renderHook(useWorkflowBuilderActions);

      expect(() => actions.current!.deleteSelection()).not.toThrow();
      expect(deleteElements).not.toHaveBeenCalled();
    });

    it('uses the canvas instance mounted after the first render', () => {
      useStore.setState({
        reactFlowInstance: null,
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }] as never,
        selectedNodesIds: ['n1'],
      });
      const { actions } = renderHook(useWorkflowBuilderActions);

      act(() => {
        useStore.setState({ reactFlowInstance: { deleteElements } as never });
      });
      actions.current!.deleteSelection();

      expect(deleteElements).toHaveBeenCalledWith({ nodes: [{ id: 'n1', position: { x: 0, y: 0 } }], edges: [] });
    });
  });

  describe('setLanguage', () => {
    it('calls i18n.changeLanguage', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setLanguage('pl');

      expect(changeLanguage).toHaveBeenCalledWith('pl');
    });

    it('works in read-only mode', () => {
      useStore.setState({ isReadOnly: true });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setLanguage('pl');

      expect(changeLanguage).toHaveBeenCalledWith('pl');
    });
  });

  describe('renameDocument', () => {
    it('writes the store name', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.renameDocument('My Workflow');

      expect(useStore.getState().documentName).toBe('My Workflow');
    });

    it('accepts an empty name', () => {
      useStore.setState({ documentName: 'My Workflow' });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.renameDocument('');

      expect(useStore.getState().documentName).toBe('');
    });

    it('accepts a name of exactly 128 characters', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);
      const name = 'a'.repeat(128);

      actions.current!.renameDocument(name);

      expect(useStore.getState().documentName).toBe(name);
    });

    it('ignores a name over 128 characters and warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.renameDocument('a'.repeat(129));

      expect(useStore.getState().documentName).toBe('');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });

    it('is a no-op in read-only mode', () => {
      useStore.setState({ isReadOnly: true, documentName: 'My Workflow' });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.renameDocument('Renamed');

      expect(useStore.getState().documentName).toBe('My Workflow');
    });
  });

  describe('read-only', () => {
    it('toggleReadOnly flips isReadOnly', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);
      expect(useStore.getState().isReadOnly).toBe(false);

      actions.current!.toggleReadOnly();
      expect(useStore.getState().isReadOnly).toBe(true);

      actions.current!.toggleReadOnly();
      expect(useStore.getState().isReadOnly).toBe(false);
    });

    it('setReadOnly sets the value explicitly regardless of current state', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setReadOnly(true);
      expect(useStore.getState().isReadOnly).toBe(true);

      actions.current!.setReadOnly(true);
      expect(useStore.getState().isReadOnly).toBe(true);

      actions.current!.setReadOnly(false);
      expect(useStore.getState().isReadOnly).toBe(false);
    });

    it('save, openExport, toggles, sidebar actions and setPaletteFilter work in read-only mode', async () => {
      useStore.setState({ isReadOnly: true });
      const { actions, onSave } = renderHook(useWorkflowBuilderActions);

      await actions.current!.save();
      actions.current!.openExport();
      actions.current!.togglePalette();
      actions.current!.togglePropertiesPanel();
      actions.current!.setPaletteFilter('email');
      actions.current!.toggleDarkMode();

      expect(onSave).toHaveBeenCalledWith({ isAutoSave: false });
      expect(openExportModal).toHaveBeenCalledTimes(1);
      expect(useStore.getState().isPaletteOpen).toBe(true);
      expect(useStore.getState().isPropertiesPanelOpen).toBe(false);
      expect(useStore.getState().paletteFilter).toBe('email');
      expect(getTheme()).toBe('dark');
    });
  });

  describe('sidebar and palette filter', () => {
    it('togglePalette flips isPaletteOpen', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);
      expect(useStore.getState().isPaletteOpen).toBe(false);

      actions.current!.togglePalette();
      expect(useStore.getState().isPaletteOpen).toBe(true);

      actions.current!.togglePalette();
      expect(useStore.getState().isPaletteOpen).toBe(false);
    });

    it('setPaletteOpen sets it', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setPaletteOpen(true);
      expect(useStore.getState().isPaletteOpen).toBe(true);

      actions.current!.setPaletteOpen(true);
      expect(useStore.getState().isPaletteOpen).toBe(true);

      actions.current!.setPaletteOpen(false);
      expect(useStore.getState().isPaletteOpen).toBe(false);
    });

    it('togglePropertiesPanel flips isPropertiesPanelOpen', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);
      expect(useStore.getState().isPropertiesPanelOpen).toBe(true);

      actions.current!.togglePropertiesPanel();
      expect(useStore.getState().isPropertiesPanelOpen).toBe(false);

      actions.current!.togglePropertiesPanel();
      expect(useStore.getState().isPropertiesPanelOpen).toBe(true);
    });

    it('setPropertiesPanelOpen sets it', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setPropertiesPanelOpen(false);
      expect(useStore.getState().isPropertiesPanelOpen).toBe(false);

      actions.current!.setPropertiesPanelOpen(false);
      expect(useStore.getState().isPropertiesPanelOpen).toBe(false);

      actions.current!.setPropertiesPanelOpen(true);
      expect(useStore.getState().isPropertiesPanelOpen).toBe(true);
    });

    it('setPaletteFilter writes paletteFilter', () => {
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setPaletteFilter('email');
      expect(useStore.getState().paletteFilter).toBe('email');

      actions.current!.setPaletteFilter('');
      expect(useStore.getState().paletteFilter).toBe('');
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

    it('setLayoutDirection is a no-op in read-only mode', () => {
      useStore.setState({ isReadOnly: true });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setLayoutDirection('DOWN');

      expect(useStore.getState().layoutDirection).toBe('RIGHT');
    });

    it('toggleLayoutDirection is a no-op in read-only mode', () => {
      useStore.setState({ isReadOnly: true });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.toggleLayoutDirection();

      expect(useStore.getState().layoutDirection).toBe('RIGHT');
    });

    it('leaves node positions untouched by default', () => {
      useStore.setState({ nodes: [{ id: 'n1', position: { x: 10, y: 20 } }] as never });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.toggleLayoutDirection();

      expect(useStore.getState().nodes[0].position).toEqual({ x: 10, y: 20 });
    });

    it('swaps every node x/y when flipPositions is set', () => {
      useStore.setState({
        nodes: [
          { id: 'n1', position: { x: 10, y: 20 } },
          { id: 'n2', position: { x: 30, y: 40 } },
        ] as never,
      });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.toggleLayoutDirection({ flipPositions: true });

      expect(useStore.getState().nodes.map((n) => n.position)).toEqual([
        { x: 20, y: 10 },
        { x: 40, y: 30 },
      ]);
    });

    it('setLayoutDirection is idempotent and never moves nodes', () => {
      useStore.setState({ nodes: [{ id: 'n1', position: { x: 1, y: 2 } }] as never });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.setLayoutDirection('DOWN');
      actions.current!.setLayoutDirection('DOWN');

      expect(useStore.getState().layoutDirection).toBe('DOWN');
      expect(useStore.getState().nodes[0].position).toEqual({ x: 1, y: 2 });
    });

    it('flipPositions is relative: toggling twice restores original positions', () => {
      useStore.setState({ nodes: [{ id: 'n1', position: { x: 10, y: 20 } }] as never });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.toggleLayoutDirection({ flipPositions: true });
      actions.current!.toggleLayoutDirection({ flipPositions: true });

      expect(useStore.getState().nodes[0].position).toEqual({ x: 10, y: 20 });
    });

    it('fits the view when fitView is set', () => {
      const fitView = vi.fn();
      useStore.setState({ reactFlowInstance: { getZoom: () => 1, fitView } as never });
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
        callback(0);
        return 0;
      });
      const { actions } = renderHook(useWorkflowBuilderActions);

      actions.current!.toggleLayoutDirection({ fitView: true });

      expect(fitView).toHaveBeenCalledTimes(1);
      rafSpy.mockRestore();
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

    it('stays the same reference across store updates to sidebar, panel and filter state', () => {
      const seen: WorkflowBuilderActions[] = [];
      const onSave = vi.fn().mockResolvedValue('success' as const);

      function Consumer() {
        seen.push(useWorkflowBuilderActions());
        return null;
      }

      const { rerender } = render(
        <IntegrationContext.Provider value={{ onSave }}>
          <Consumer />
        </IntegrationContext.Provider>,
      );

      act(() => {
        seen[0].togglePalette();
        seen[0].togglePropertiesPanel();
        seen[0].setPaletteFilter('email');
      });

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
