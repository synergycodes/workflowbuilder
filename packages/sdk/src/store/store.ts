import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { withInterceptingMiddleware } from './middleware/middleware';
import {
  type DiagramDataModificationState,
  useDiagramDataModificationSlice,
} from './slices/diagram-data-modification/diagram-data-modification-slice';
import {
  type DiagramSelectionState,
  useDiagramSelectionSlice,
} from './slices/diagram-selection/diagram-selection-slice';
import { type DiagramState, useDiagramSlice } from './slices/diagram-slice';
import { type PaletteState, usePaletteSlice } from './slices/palette/palette-slice';
import { type UserPreferencesState, useUserPreferencesSlice } from './slices/user-preferences/user-preferences-slice';

export type WorkflowEditorState = DiagramState &
  PaletteState &
  DiagramSelectionState &
  DiagramDataModificationState &
  UserPreferencesState;

export type SetDiagramState = (
  partial:
    | WorkflowEditorState
    | Partial<WorkflowEditorState>
    | ((state: WorkflowEditorState) => WorkflowEditorState | Partial<WorkflowEditorState>),
  replace?: false | undefined,
) => void;

export type GetDiagramState = () => WorkflowEditorState;

const storeInitializer = withInterceptingMiddleware((set, get) => ({
  ...useDiagramSlice(set, get),
  ...useDiagramDataModificationSlice(set, get),
  ...useDiagramSelectionSlice(set, get),
  ...usePaletteSlice(set, get),
  ...useUserPreferencesSlice(set, get),
}))([]);

/**
 * The SDK's Zustand store — a module-level **global singleton**.
 *
 * ## Why global (not per-Root)
 *
 * The SDK is single-instance by contract: mount one `<WorkflowBuilder.Root>`
 * per page (see README → "Single-instance constraint"). The plugin / i18n
 * registries and the palette/template config holders are already module-level
 * singletons, so the store is one too — a single, consistent lifetime model
 * instead of a per-Root store threaded through React context plus a
 * module-level "current" pointer kept in sync from a layout effect.
 *
 * This removes an entire bug class. Imperative reads (`useStore.getState()`
 * and the `getStore*` / `setStore*` action helpers built on it) used to throw
 * "store access before mount" when called during a descendant's render or
 * layout effect — i.e. before the Root's `useLayoutEffect` had a chance to
 * register the per-Root store. The store now exists from module load, so those
 * reads always resolve to a real (initially empty) state.
 *
 * `createWithEqualityFn` returns a hook that doubles as the store API:
 *   - subscribe with a selector — `const nodes = useStore((s) => s.nodes);`
 *   - read once, outside React — `useStore.getState()`
 *   - write / observe imperatively — `useStore.setState(...)`,
 *     `useStore.subscribe(...)`
 *
 * Equality is `shallow` by default, so selecting an object or array is safe.
 *
 * Sequential workflows (mount → save → unmount → mount next) get a clean slate
 * via {@link resetWorkflowStore}, which `<WorkflowBuilder.Root>` calls on mount
 * — the persistent global store would otherwise carry the previous diagram's
 * state into the next Root.
 *
 * @category Store
 */
// `import.meta.env.DEV` (vs `process.env.NODE_ENV`) is statically inlined by
// Vite at SDK build time, so consumers see a literal boolean in dist/. Avoids
// `ReferenceError: process is not defined` for consumers who load via raw ESM,
// run on edge runtimes, or use a bundler that doesn't shim Node globals.
export const useStore = createWithEqualityFn<WorkflowEditorState>()(
  devtools(storeInitializer, {
    name: 'WorkflowBuilder',
    enabled: import.meta.env.DEV,
  }),
  shallow,
);

/**
 * Reset the store to its initial state. Called by `<WorkflowBuilder.Root>` from
 * a mount-only `useLayoutEffect` so each fresh Root starts with a clean editor,
 * preserving the documented "sequential workflows" contract (mount → save →
 * unmount → mount next) now that the store is a persistent global singleton
 * rather than created anew per Root.
 *
 * `replace: true` swaps the whole state object; `getInitialState()` carries the
 * original slices INCLUDING their action functions, so the reset restores empty
 * `nodes` / `edges` / selection without dropping the action methods.
 *
 * @internal
 */
export function resetWorkflowStore(): void {
  useStore.setState(useStore.getInitialState(), true);
}
