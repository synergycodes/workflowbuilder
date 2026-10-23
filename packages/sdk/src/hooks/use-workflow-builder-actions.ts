import { useContext } from 'react';

import { IntegrationContext } from '../features/integration/components/integration-variants/context/integration-context-wrapper';
import type { LayoutDirection } from '../node/common';
import type { DidSaveStatus } from '../types/integration';
import type { Theme } from './theme';
import type { WorkflowBuilderLanguage } from './use-workflow-builder-state';

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
 * `<WorkflowBuilder.EditorHeader />`. Mirrors every command the built-in editor header
 * exposes (`save`, modal openers, read-only and theme toggles) and adds
 * programmatic layout-direction control, which the header itself does not offer.
 *
 * The same object for the whole Root mount: every action reads the current canvas,
 * integration and read-only mode when it is called, so it is safe to keep, e.g. from
 * `onLoad`. Once the Root unmounts, every action does nothing and `save()` resolves
 * `'error'` without sending data.
 *
 * Actions that change the persisted diagram (`setWorkflowName`, `deleteSelection`,
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
  toggleTheme: () => void;
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
   * Rename the current workflow. An empty name is allowed; a name longer
   * than 128 characters is ignored (with a console warning) rather than
   * truncated.
   */
  setWorkflowName: (name: string) => void;
};

/**
 * Returns the Root's action object, the same one `onLoad` receives: every command the built-in
 * `<WorkflowBuilder.EditorHeader />` offers, plus programmatic layout-direction
 * control. Use it from a custom header or toolbar when omitting the editor header.
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
  return useContext(IntegrationContext).actions;
}
