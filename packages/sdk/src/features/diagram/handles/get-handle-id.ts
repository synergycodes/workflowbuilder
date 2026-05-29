import type { HandleType } from '@xyflow/react';

import type { HandleId } from './types';

/**
 * Build a stable, parseable ID for a node handle. Returns the bare
 * `handleType` for outer handles and `<handleType>:inner:<innerId>` for
 * sub-handles inside compound nodes (e.g. one per decision branch or AI
 * tool). The ID is local to the owning node — xyflow scopes handle IDs by
 * node, so the same string can appear on multiple nodes without clashing.
 *
 * Use this when authoring a custom node template — pass the returned
 * string to xyflow's `<Handle id={...}>` so the editor's edge logic
 * (validation, hover, selection) can find the right handle later.
 *
 * @category Utilities
 */
export function getHandleId({ handleType, innerId }: GetHandleIdOptions): HandleId {
  if (!innerId) {
    return handleType;
  }

  return `${handleType}:inner:${innerId}`;
}

type GetHandleIdOptions = {
  handleType: HandleType;
  innerId?: string;
  /**
   * @deprecated Handle IDs are scoped to the owning node by xyflow, so
   * `nodeId` is no longer part of the returned string. Accepted to keep
   * 2.0.0 call sites compiling and ignored at runtime. Will be removed in
   * the next major (3.0).
   */
  nodeId?: string;
};
