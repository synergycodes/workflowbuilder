import { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openExportModal } from '../features/integration/components/import-export/export-modal/open-export-modal';
import { openImportModal } from '../features/integration/components/import-export/import-modal/open-import-modal';
import { IntegrationContext } from '../features/integration/components/integration-variants/context/integration-context-wrapper';
import { openTemplateSelectorModal } from '../features/modals/template-selector/open-template-selector-modal';
import { openModalWorkflowSettings } from '../features/variables/modals/modal-settings';
import type { LayoutDirection } from '../node/common';
import { getStoreSelection } from '../store/slices/diagram-selection/actions';
import { getStoreNodes, setStoreNodes } from '../store/slices/diagram-slice/actions';
import { useStore } from '../store/store';
import type { DidSaveStatus } from '../types/integration';
import { type Theme, getTheme, setTheme } from './theme';
import { useFitView } from './use-fit-view';
import type { WorkflowBuilderLanguage } from './use-workflow-builder-state';

/** Longest `renameDocument` accepts; longer names are ignored (see {@link WorkflowBuilderActions.renameDocument}). */
const MAX_DOCUMENT_NAME_LENGTH = 128;

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
 * React Flow instance are stable (`deleteSelection` and the layout actions
 * close over that instance).
 *
 * Actions that change the persisted diagram (`renameDocument`, `deleteSelection`,
 * `setLayoutDirection`, `toggleLayoutDirection`) or open the template picker
 * (`openTemplates`) do nothing while the editor is in read-only mode.
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
  /** Open the template picker modal. */
  openTemplates: () => void;
  /** Flip read-only mode. */
  toggleReadOnly: () => void;
  /** Set read-only mode explicitly. */
  setReadOnly: (value: boolean) => void;
  /** Flip the palette's open/closed state. */
  togglePalette: () => void;
  /** Set the palette's open/closed state explicitly. */
  setPaletteOpen: (open: boolean) => void;
  /** Flip the properties panel's open/closed state. */
  togglePropertiesPanel: () => void;
  /** Set the properties panel's open/closed state explicitly. */
  setPropertiesPanelOpen: (open: boolean) => void;
  /** Filter the palette's node list by a case-insensitive match on each item's translated label. */
  setPaletteFilter: (query: string) => void;
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
  /**
   * Delete every selected node and edge, through the same confirmation and
   * undo path as pressing the Delete key. No-op when nothing is selected,
   * and until the canvas (`<WorkflowBuilder.Canvas />`) has mounted.
   */
  deleteSelection: () => void;
  /** Switch the active editor language. */
  setLanguage: (code: WorkflowBuilderLanguage) => void;
  /**
   * Rename the current document. An empty name is allowed; a name longer
   * than 128 characters is ignored (with a console warning) rather than
   * truncated.
   */
  renameDocument: (name: string) => void;
};

/**
 * Returns a stable object of action callbacks: every command the built-in
 * `<WorkflowBuilder.TopBar />` offers, plus programmatic layout-direction
 * control. Use it from a custom header / toolbar when omitting the bar.
 *
 * Must be called from a descendant of `<WorkflowBuilder.Root>`: `save` reads the active
 * integration through React context, so outside Root `save()` logs an error and resolves
 * to `'error'`.
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
  const setStoreReadOnly = useStore((s) => s.setReadOnly);
  const setStorePaletteOpen = useStore((s) => s.setPaletteOpen);
  const setStorePropertiesPanelOpen = useStore((s) => s.setIsPropertiesPanelOpen);
  const setStorePaletteFilter = useStore((s) => s.setPaletteFilter);
  const setStoreLayoutDirection = useStore((s) => s.setLayoutDirection);
  const fitView = useFitView();
  const reactFlowInstance = useStore((s) => s.reactFlowInstance);
  const { i18n } = useTranslation();

  const isReadOnly = () => useStore.getState().isReadOnly;

  return useMemo<WorkflowBuilderActions>(
    () => ({
      save: () => onSave({ isAutoSave: false }),

      openSettings: openModalWorkflowSettings,
      openImport: openImportModal,
      openExport: openExportModal,
      openTemplates: openTemplateSelectorModal,

      toggleReadOnly: () => setStoreReadOnly(),
      setReadOnly: (value) => setStoreReadOnly(value),

      togglePalette: () => setStorePaletteOpen(),
      setPaletteOpen: (open) => setStorePaletteOpen(open),

      togglePropertiesPanel: () => setStorePropertiesPanelOpen(!useStore.getState().isPropertiesPanelOpen),
      setPropertiesPanelOpen: (open) => setStorePropertiesPanelOpen(open),

      setPaletteFilter: (query) => setStorePaletteFilter(query),

      toggleDarkMode: () => setTheme(getTheme() === 'light' ? 'dark' : 'light'),
      setTheme: (theme) => setTheme(theme),

      setLayoutDirection: (direction) => {
        if (isReadOnly()) return;
        setStoreLayoutDirection(direction);
      },
      toggleLayoutDirection: ({ flipPositions, fitView: doFitView } = {}) => {
        if (isReadOnly()) return;

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

      deleteSelection: () => {
        if (isReadOnly()) return;

        const { nodes, edges } = getStoreSelection();
        if (nodes.length === 0 && edges.length === 0) return;

        // `onBeforeDelete` in `diagram.tsx` shows the confirmation modal and
        // records the undo entry, the same path the Delete key goes through.
        void reactFlowInstance?.deleteElements({ nodes, edges });
      },

      setLanguage: (code) => {
        void i18n.changeLanguage(code);
      },

      renameDocument: (name) => {
        if (isReadOnly()) return;

        if (name.length > MAX_DOCUMENT_NAME_LENGTH) {
          console.warn(
            `[@workflowbuilder/sdk] renameDocument: ignored a name longer than ${MAX_DOCUMENT_NAME_LENGTH} characters.`,
          );
          return;
        }

        useStore.getState().setDocumentName(name);
      },
    }),
    [
      onSave,
      setStoreReadOnly,
      setStorePaletteOpen,
      setStorePropertiesPanelOpen,
      setStorePaletteFilter,
      setStoreLayoutDirection,
      fitView,
      reactFlowInstance,
      i18n,
    ],
  );
}
