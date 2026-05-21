import type { Node, OnNodeDrag } from '@xyflow/react';
import { useEffect, useRef } from 'react';

const nodeDragStartListeners = new Set<OnNodeDrag>();

/**
 * Subscribe to "node drag started" events. The listener receives xyflow's
 * `OnNodeDrag` callback shape `(event, draggedNode, allNodes)` — fires
 * once at the start of every drag interaction, not on subsequent drag
 * frames.
 *
 * Useful for plugins that need to capture pre-drag state for snapping,
 * visual previews, or undo entries.
 *
 * The registry is module-global and persists across `<WorkflowBuilder.Root>`
 * remounts — the SDK does not clear it automatically. **Plugins must call
 * {@link removeNodeDragStartListener} themselves in their cleanup** (e.g.
 * `useEffect` teardown) to avoid stacking zombie listeners across mount
 * cycles.
 *
 * @category Listeners
 */
export function addNodeDragStartListener(listener: OnNodeDrag) {
  nodeDragStartListeners.add(listener);
}

/**
 * Remove a previously-registered node-drag-start listener.
 *
 * @category Listeners
 */
export function removeNodeDragStartListener(listener: OnNodeDrag) {
  nodeDragStartListeners.delete(listener);
}

export function callNodeDragStartListeners(event: React.MouseEvent, node: Node, nodes: Node[]) {
  for (const callback of nodeDragStartListeners) {
    callback(event, node, nodes);
  }
}

/**
 * React-friendly variant of {@link addNodeDragStartListener} with automatic
 * cleanup on unmount. Preferred over the raw `add` / `remove` pair — the
 * SDK does NOT clear the listener registry on `<WorkflowBuilder.Root>`
 * remounts, so manual cleanup is mandatory and easy to forget.
 *
 * The hook tolerates inline-arrow callbacks: a `useRef` trampoline keeps a
 * single stable subscription across re-renders while always invoking the
 * latest `listener` you passed. No need to wrap your callback in
 * `useCallback`.
 *
 * @category Listeners
 */
export function useNodeDragStartListener(listener: OnNodeDrag): void {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  useEffect(() => {
    const stable: OnNodeDrag = (event, node, nodes) => listenerRef.current(event, node, nodes);
    addNodeDragStartListener(stable);
    return () => removeNodeDragStartListener(stable);
  }, []);
}
