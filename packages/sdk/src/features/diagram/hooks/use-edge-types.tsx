import type { EdgeTypes } from '@xyflow/react';
import { useMemo } from 'react';

import { getCustomEdgeTemplates } from '../../../data/edge-templates';
import { LabelEdge } from '../edges/label-edge/label-edge';

const BUILT_IN_KEYS: ReadonlySet<string> = new Set<string>(['labelEdge']);

/**
 * Resolves the ReactFlow `edgeTypes` map: the built-in `'labelEdge'` default
 * merged with any consumer-provided `edgeTemplates`. Mirrors {@link useNodeTypes}
 * but without an adapter — edge templates take ReactFlow's `EdgeProps` directly
 * (the built-in edges do too), so there are no computed props to inject and the
 * consumer's component drops straight into the map.
 *
 * An edge whose `type` matches no key falls back to ReactFlow's default edge,
 * same as nodes fall back to their built-in renderers.
 */
export function useEdgeTypes(): EdgeTypes {
  // Read outside useMemo so the dep stays referentially stable across renders.
  // When no consumer templates exist, getCustomEdgeTemplates() returns the same
  // frozen EMPTY object every call (see ../../../data/edge-templates), which is
  // what keeps this memo from handing ReactFlow a fresh edgeTypes object — and
  // emitting its "it looks like you've created a new edgeTypes object" warning —
  // on every render.
  const custom = getCustomEdgeTemplates();

  return useMemo<EdgeTypes>(() => {
    if (import.meta.env.DEV) {
      for (const key of Object.keys(custom)) {
        if (BUILT_IN_KEYS.has(key)) {
          console.warn(
            `[workflow-builder] edgeTemplates key "${key}" overrides a built-in renderer. Pick a unique key unless the override is intentional.`,
          );
        }
      }
    }

    return {
      labelEdge: LabelEdge,
      ...custom,
    };
  }, [custom]);
}
