import { NodeChange } from '@xyflow/react';

export type NodeChangedListener = (changes: NodeChange[]) => void;

const nodeChangedListeners = new Set<NodeChangedListener>();

export function addNodeChangedListener(listener: NodeChangedListener) {
  nodeChangedListeners.add(listener);
}

export function removeNodeChangedListener(listener: NodeChangedListener) {
  nodeChangedListeners.delete(listener);
}

export function destroyNodeChangedListeners() {
  nodeChangedListeners.clear();
}

export function callNodeChangedListeners(changes: NodeChange[]) {
  for (const callback of nodeChangedListeners) {
    callback(changes);
  }
}
