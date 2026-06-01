import { useContext, useMemo } from 'react';

import { openExportModal } from '../features/integration/components/import-export/export-modal/open-export-modal';
import { openImportModal } from '../features/integration/components/import-export/import-modal/open-import-modal';
import { IntegrationContext } from '../features/integration/components/integration-variants/context/integration-context-wrapper';
import { openModalWorkflowSettings } from '../features/variables/modals/modal-settings';
import type { LayoutDirection } from '../node/common';
import { useStore } from '../store/store';
import type { DidSaveStatus } from '../types/integration';
import { type Theme, getTheme, setTheme } from './theme';
import { useFitView } from './use-fit-view';

/**
 * Optional behavior for a layout-direction change.
 *
 * @category Hooks
 */
export type LayoutChangeOptions = {
  /**
   * Also reflow node positions by swapping each node's `x`/`y`, so the
   * diagram visually re-lays-out along the new direction. Defaults to
   * `false` — the direction change alone only re-orients handles and
   * re-routes edges, leaving node coordinates untouched.
   */
  flipPositions?: boolean;
  /** Animate the view to fit all nodes after the change. Defaults to `false`. */
  fitView?: boolean;
};

/**
 * Imperative action surface for every command the built-in app bar
 * exposes — `save`, modal openers, read-only / theme / layout-direction
 * toggles. Use this when omitting `<WorkflowBuilder.TopBar />` from a
 * custom layout so your own UI can trigger the same actions.
 *
 * Stable across renders when the active integration is stable.
 *
 * @category Hooks
 */
export type WorkflowBuilderActions = {
  /** Persist the current diagram through the active integration strategy. */
  save: () => Promise<DidSaveStatus>;
  /** Open the built-in workflow settings modal. */
  openSettings: () => void;
  /** Open the import-diagram modal. */
  openImport: () => void;
  /** Open the export-diagram modal. */
  openExport: () => void;
  /** Flip read-only mode. */
  toggleReadOnly: () => void;
  /** Set read-only mode explicitly. */
  setReadOnly: (value: boolean) => void;
  /** Flip the editor theme between `'light'` and `'dark'`. */
  toggleDarkMode: () => void;
  /** Set the editor theme explicitly. */
  setTheme: (theme: Theme) => void;
  /**
   * Set the diagram layout direction (`'RIGHT'` ↔ `'DOWN'`). Pass
   * `options.flipPositions` to also reflow node coordinates and/or
   * `options.fitView` to re-fit the view afterwards.
   */
  setLayoutDirection: (direction: LayoutDirection, options?: LayoutChangeOptions) => void;
  /**
   * Flip the diagram layout direction. Pass `options.flipPositions` to also
   * reflow node coordinates and/or `options.fitView` to re-fit the view
   * afterwards.
   */
  toggleLayoutDirection: (options?: LayoutChangeOptions) => void;
};

/**
 * Returns a stable object of action callbacks mirroring every command
 * the built-in `<WorkflowBuilder.TopBar />` offers. Use it from a custom
 * header / toolbar when omitting the bar.
 *
 * Must be called from a descendant of `<WorkflowBuilder.Root>`; `save`
 * reads the active integration via React context.
 *
 * @example
 * ```tsx
 * function MyToolbar() {
 *   const actions = useWorkflowBuilderActions();
 *   return <button onClick={actions.save}>Save</button>;
 * }
 *
 * <WorkflowBuilder.Root>
 *   <MyToolbar />
 *   <WorkflowBuilder.Canvas />
 * </WorkflowBuilder.Root>
 * ```
 *
 * @category Hooks
 */
export function useWorkflowBuilderActions(): WorkflowBuilderActions {
  const { onSave } = useContext(IntegrationContext);
  const setToggleReadOnlyMode = useStore((s) => s.setToggleReadOnlyMode);
  const setStoreLayoutDirection = useStore((s) => s.setLayoutDirection);
  const fitView = useFitView();

  return useMemo<WorkflowBuilderActions>(() => {
    // Apply a direction change plus its optional side effects. Position
    // flipping is a naive x/y swap — enough to read as a real layout reflow
    // for orthogonal directions; positions are written directly (no schema
    // re-validation, since coordinates can't affect node errors).
    const applyLayoutChange = (
      direction: LayoutDirection,
      { flipPositions, fitView: doFitView }: LayoutChangeOptions = {},
    ) => {
      setStoreLayoutDirection(direction);

      if (flipPositions) {
        useStore.setState((state) => ({
          nodes: state.nodes.map((node) => ({ ...node, position: { x: node.position.y, y: node.position.x } })),
        }));
      }

      if (doFitView) fitView();
    };

    return {
      save: () => onSave({ isAutoSave: false }),

      openSettings: openModalWorkflowSettings,
      openImport: openImportModal,
      openExport: openExportModal,

      toggleReadOnly: () => setToggleReadOnlyMode(),
      setReadOnly: (value) => setToggleReadOnlyMode(value),

      toggleDarkMode: () => setTheme(getTheme() === 'light' ? 'dark' : 'light'),
      setTheme: (theme) => setTheme(theme),

      setLayoutDirection: (direction, options) => applyLayoutChange(direction, options),
      toggleLayoutDirection: (options) =>
        applyLayoutChange(useStore.getState().layoutDirection === 'RIGHT' ? 'DOWN' : 'RIGHT', options),
    };
  }, [onSave, setToggleReadOnlyMode, setStoreLayoutDirection, fitView]);
}
