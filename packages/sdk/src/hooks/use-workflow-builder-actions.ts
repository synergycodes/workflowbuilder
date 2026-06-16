import { useContext, useMemo } from 'react';

import { openExportModal } from '../features/integration/components/import-export/export-modal/open-export-modal';
import { openImportModal } from '../features/integration/components/import-export/import-modal/open-import-modal';
import { IntegrationContext } from '../features/integration/components/integration-variants/context/integration-context-wrapper';
import { openModalWorkflowSettings } from '../features/variables/modals/modal-settings';
import type { LayoutDirection } from '../node/common';
import { getStoreNodes, setStoreNodes } from '../store/slices/diagram-slice/actions';
import { useStore } from '../store/store';
import type { DidSaveStatus } from '../types/integration';
import { type Theme, getTheme, setTheme } from './theme';
import { useFitView } from './use-fit-view';

/**
 * Optional side effects for a layout-direction *toggle*.
 *
 * @category Hooks
 */
export type LayoutChangeOptions = {
  /**
   * Also reflow node positions by swapping each node's `x`/`y`, so the diagram
   * visually re-lays-out along the new axis. Defaults to `false` (handles and
   * edges re-orient, coordinates stay put). This is a naive mirror, not a
   * layout algorithm: it ignores node dimensions, so non-square nodes shift
   * relative to their neighbours. Pair it with `fitView` and treat it as a
   * quick approximation, not production auto-layout.
   */
  flipPositions?: boolean;
  /** Animate the view to fit all nodes after the change. Defaults to `false`. */
  fitView?: boolean;
};

/**
 * Imperative action surface for a custom layout that omits
 * `<WorkflowBuilder.TopBar />`. Mirrors every command the built-in app bar
 * exposes (`save`, modal openers, read-only and theme toggles) and adds
 * programmatic layout-direction control, which the bar itself does not offer.
 *
 * Stable across renders while the active integration and the mounted
 * React Flow instance are stable (layout actions close over the fit-view
 * callback, which is keyed on that instance).
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
   * Set the diagram layout direction (`'RIGHT'` ↔ `'DOWN'`). Idempotent:
   * setting the same direction twice is a no-op. Position reflow is only
   * offered on {@link toggleLayoutDirection}, where it is unambiguous.
   */
  setLayoutDirection: (direction: LayoutDirection) => void;
  /**
   * Flip the diagram layout direction. Pass `options.flipPositions` to also
   * reflow node coordinates and/or `options.fitView` to re-fit the view
   * afterwards.
   */
  toggleLayoutDirection: (options?: LayoutChangeOptions) => void;
};

/**
 * Returns a stable object of action callbacks: every command the built-in
 * `<WorkflowBuilder.TopBar />` offers, plus programmatic layout-direction
 * control. Use it from a custom header / toolbar when omitting the bar.
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

  return useMemo<WorkflowBuilderActions>(
    () => ({
      save: () => onSave({ isAutoSave: false }),

      openSettings: openModalWorkflowSettings,
      openImport: openImportModal,
      openExport: openExportModal,

      toggleReadOnly: () => setToggleReadOnlyMode(),
      setReadOnly: (value) => setToggleReadOnlyMode(value),

      toggleDarkMode: () => setTheme(getTheme() === 'light' ? 'dark' : 'light'),
      setTheme: (theme) => setTheme(theme),

      setLayoutDirection: (direction) => setStoreLayoutDirection(direction),
      toggleLayoutDirection: ({ flipPositions, fitView: doFitView } = {}) => {
        setStoreLayoutDirection(useStore.getState().layoutDirection === 'RIGHT' ? 'DOWN' : 'RIGHT');

        // Naive x/y mirror. Goes through setStoreNodes so the nodes stay on
        // the same mutation path as the rest of the editor (schema re-validation
        // included); positions can't change validation, but consistency matters
        // more than the redundant pass.
        if (flipPositions) {
          setStoreNodes(
            getStoreNodes().map((node) => ({ ...node, position: { x: node.position.y, y: node.position.x } })),
          );
        }

        if (doFitView) fitView();
      },
    }),
    [onSave, setToggleReadOnlyMode, setStoreLayoutDirection, fitView],
  );
}
