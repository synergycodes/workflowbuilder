import { NodeChange, Node } from '@xyflow/react';
import {
  addNodeChangedListener,
  removeNodeChangedListener,
} from '../features/diagram/listeners/node-changed-listeners';

const FALLBACK_TIMEOUT = 1000;

export function ensureBounds(nodes: Node[], finishCallback?: () => void) {
  if (nodes.length === 0) {
    return;
  }

  const idSet = new Map(nodes.map((node) => [node.id, false]));

  return new Promise<void>((resolve) => {
    const fallbackRejectId = setTimeout(() => {
      removeNodeChangedListener(callback);
      finishCallback?.();
      resolve();
    }, FALLBACK_TIMEOUT);

    function callback(changes: NodeChange[]) {
      for (const change of changes) {
        if (change.type !== 'dimensions') {
          continue;
        }

        if (idSet.has(change.id)) {
          idSet.set(change.id, true);
        }
      }

      if ([...idSet.values()].every((value) => !!value)) {
        clearTimeout(fallbackRejectId);
        removeNodeChangedListener(callback);
        finishCallback?.();
        resolve();
      }
    }

    addNodeChangedListener(callback);
  });
}
