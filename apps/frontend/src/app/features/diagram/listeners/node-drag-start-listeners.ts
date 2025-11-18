import { OnNodeDrag, Node } from '@xyflow/react';

const nodeDragStartListeners = new Set<OnNodeDrag>();

export function addNodeDragStartListener(listener: OnNodeDrag) {
  nodeDragStartListeners.add(listener);
}

export function removeNodeDragStartListener(listener: OnNodeDrag) {
  nodeDragStartListeners.delete(listener);
}

export function destroyNodeDragStartListeners() {
  nodeDragStartListeners.clear();
}

export function callNodeDragStartListeners(event: React.MouseEvent, node: Node, nodes: Node[]) {
  for (const callback of nodeDragStartListeners) {
    callback(event, node, nodes);
  }
}
