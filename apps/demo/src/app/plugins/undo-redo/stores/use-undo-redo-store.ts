import {
  getStoreEdges,
  getStoreLayoutDirection,
  getStoreNodes,
  setStoreEdges,
  setStoreLayoutDirection,
  setStoreNodes,
  trackFutureChange,
} from '@workflowbuilder/sdk';
import type { LayoutDirection, WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const DEFAULT_MAX_HISTORY_SIZE = 100;

type HistoryItem = {
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
  layoutDirection: LayoutDirection;
};

type SnapshotWatchers = {
  [name: string]: {
    snapshot?: HistoryItem;
  };
};

type UndoRedoStore = {
  snapshotsWatchers: SnapshotWatchers;
  past: HistoryItem[];
  future: HistoryItem[];
};

const emptyStore: UndoRedoStore = {
  snapshotsWatchers: {},
  past: [],
  future: [],
};

export const useUndoRedoStore = create<UndoRedoStore>()(
  devtools(
    () =>
      ({
        ...emptyStore,
      }) satisfies UndoRedoStore,
    { name: 'undoRedoStore' },
  ),
);

function areSnapshotsEqual(previous: HistoryItem, current: HistoryItem): boolean {
  if (
    previous.nodes === current.nodes &&
    previous.edges === current.edges &&
    previous.layoutDirection === current.layoutDirection
  ) {
    return true;
  }

  return JSON.stringify(previous) === JSON.stringify(current);
}

// core function of undo/redo functionality
// is responsible for recording each step that we decide to record via takeSnapshot or processSnapshotWatching
export function takeSnapshot(snapshot?: HistoryItem) {
  const nodes = snapshot?.nodes || getStoreNodes();
  const edges = snapshot?.edges || getStoreEdges();
  const layoutDirection = snapshot?.layoutDirection || getStoreLayoutDirection();

  const newSnapshot: HistoryItem = { nodes, edges, layoutDirection };

  const lastSnapshot = useUndoRedoStore.getState().past.at(-1);
  if (lastSnapshot && areSnapshotsEqual(lastSnapshot, newSnapshot)) {
    return;
  }

  useUndoRedoStore.setState((state) => ({
    past: [...state.past.slice(state.past.length - DEFAULT_MAX_HISTORY_SIZE + 1), newSnapshot],
    future: [],
  }));
}

// startSnapshotWatching function is used to start observing changes such as moving a node around the diagram
// you can use it together with the onNodeDragStart function
export function startSnapshotWatching(name: string) {
  useUndoRedoStore.setState((state) => ({
    snapshotsWatchers: {
      ...state.snapshotsWatchers,
      [name]: {
        snapshot: {
          nodes: getStoreNodes(),
          edges: getStoreEdges(),
          layoutDirection: getStoreLayoutDirection(),
        },
      },
    },
  }));
}

export function stopSnapshotWatching(name: string) {
  useUndoRedoStore.setState((state) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [name]: snapshotRemoved, ...newSnapshotsWatchers } = state.snapshotsWatchers;

    return {
      snapshotsWatchers: newSnapshotsWatchers,
    };
  });
}

// processSnapshotWatching function is used during processes like dragging node
// you can use it with onNodesChange function
export function processSnapshotWatching(name: string, shouldSkip = false) {
  const item = useUndoRedoStore.getState().snapshotsWatchers[name];

  if (!item?.snapshot) {
    return;
  }

  if (!shouldSkip) {
    takeSnapshot(item.snapshot);
    stopSnapshotWatching(name);
  }
}

export function undo() {
  trackFutureChange('undo');

  const state = useUndoRedoStore.getState();
  const pastState = state.past.at(-1);

  if (pastState) {
    const nodes = getStoreNodes();
    const edges = getStoreEdges();
    const layoutDirection = getStoreLayoutDirection();

    useUndoRedoStore.setState((state) => ({
      past: state.past.slice(0, -1),
      future: [...state.future, { nodes, edges, layoutDirection }],
    }));

    setStoreNodes(pastState.nodes);
    setStoreEdges(pastState.edges);
    setStoreLayoutDirection(pastState.layoutDirection);
  }
}

export function redo() {
  trackFutureChange('redo');

  const state = useUndoRedoStore.getState();
  const futureState = state.future.at(-1);

  if (futureState) {
    const nodes = getStoreNodes();
    const edges = getStoreEdges();
    const layoutDirection = getStoreLayoutDirection();

    useUndoRedoStore.setState((state) => ({
      past: [...state.past, { nodes, edges, layoutDirection }],
      future: state.future.slice(0, -1),
    }));

    setStoreNodes(futureState.nodes);
    setStoreEdges(futureState.edges);
    setStoreLayoutDirection(futureState.layoutDirection);
  }
}
