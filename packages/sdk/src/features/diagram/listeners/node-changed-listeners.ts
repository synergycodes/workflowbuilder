import type { NodeChange } from '@xyflow/react';
import { useEffect, useRef } from 'react';

/**
 * Callback signature for {@link addNodeChangedListener}. Receives every
 * node change xyflow emits (position, dimensions, selection, …) before
 * the store updates.
 *
 * @category Listeners
 */
export type NodeChangedListener = (changes: NodeChange[]) => void;

const nodeChangedListeners = new Set<NodeChangedListener>();

/**
 * Subscribe to node changes (drag, resize, select, remove). The listener
 * receives xyflow's raw `NodeChange[]` for every emitted change — useful
 * for analytics, autosave, change-tracking plugins, etc.
 *
 * The registry is module-global and persists across `<WorkflowBuilder.Root>`
 * remounts — the SDK does not clear it automatically. **Plugins must call
 * {@link removeNodeChangedListener} themselves in their cleanup** (e.g.
 * `useEffect` teardown) to avoid stacking zombie listeners across mount
 * cycles. See `apps/demo/src/app/plugins/avoid-nodes-edges/providers/avoid-nodes-edges-provider.tsx`
 * for the canonical pattern.
 *
 * @returns Nothing. Call {@link removeNodeChangedListener} with the same
 *   reference to unsubscribe.
 *
 * @category Listeners
 */
export function addNodeChangedListener(listener: NodeChangedListener) {
  nodeChangedListeners.add(listener);
}

/**
 * Remove a previously-registered node-change listener.
 *
 * @category Listeners
 */
export function removeNodeChangedListener(listener: NodeChangedListener) {
  nodeChangedListeners.delete(listener);
}

export function callNodeChangedListeners(changes: NodeChange[]) {
  for (const callback of nodeChangedListeners) {
    callback(changes);
  }
}

/**
 * React-friendly variant of {@link addNodeChangedListener} with automatic
 * cleanup on unmount. Preferred over the raw `add` / `remove` pair for
 * components and providers — the SDK does NOT clear the listener registry
 * on `<WorkflowBuilder.Root>` remounts, so manual cleanup is mandatory and
 * easy to forget.
 *
 * The hook tolerates inline-arrow callbacks: a `useRef` trampoline keeps a
 * single stable subscription across re-renders while always invoking the
 * latest `listener` you passed. No need to wrap your callback in
 * `useCallback`.
 *
 * @example
 * ```tsx
 * function MyProvider() {
 *   useNodeChangedListener((changes) => {
 *     console.log('changes', changes);
 *   });
 *   return null;
 * }
 * ```
 *
 * @category Listeners
 */
export function useNodeChangedListener(listener: NodeChangedListener): void {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  useEffect(() => {
    const stable: NodeChangedListener = (changes) => listenerRef.current(changes);
    addNodeChangedListener(stable);
    return () => removeNodeChangedListener(stable);
  }, []);
}
