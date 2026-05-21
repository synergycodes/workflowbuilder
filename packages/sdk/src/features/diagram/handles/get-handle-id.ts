import type { HandleType } from '@xyflow/react';

import type { HandleId } from './types';

/**
 * Build a stable, parseable ID for a node handle. Concatenates
 * `<nodeId>:<handleType>` and, when an `innerId` is provided, appends
 * `:inner:<innerId>` for sub-handles inside compound nodes.
 *
 * Use this when authoring a custom node template — pass the returned
 * string to xyflow's `<Handle id={...}>` so the editor's edge logic
 * (validation, hover, selection) can find the right handle later.
 *
 * @category Utilities
 */
export function getHandleId({ handleType, nodeId, innerId }: GetHandleIdOptions): HandleId {
  const idBase = `${nodeId}:${handleType}` as const;

  if (!innerId) {
    return idBase;
  }

  return `${idBase}:inner:${innerId}`;
}

type GetHandleIdOptions = {
  nodeId: string;
  handleType: HandleType;
  innerId?: string;
};
