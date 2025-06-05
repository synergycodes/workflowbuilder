// this file is based on https://pro.reactflow.dev/examples/react/undo-redo
import { createContext, useCallback, useRef, useState, useMemo } from 'react';
import { Edge, Node, useReactFlow } from '@xyflow/react';
import { ChildrenProps } from '@workflow-builder/types/common';
import { last, dropLast, funnel } from 'remeda';

const MAX_HISTORY_SIZE = 100;

type UndoRedo = {
  undo: () => void;
  redo: () => void;
  takeSnapshot: () => void;
  canUndo: boolean;
  canRedo: boolean;
  startSnapshotWatching: (name: string, count?: number) => void;
  stopSnapshotWatching: (name: string) => void;
  processSnapshotWatching: (name: string, skip?: boolean) => void;
};

export const UndoRedoContext = createContext<UndoRedo>({
  undo: () => {},
  redo: () => {},
  takeSnapshot: () => {},
  canUndo: false,
  canRedo: false,
  startSnapshotWatching: () => {},
  stopSnapshotWatching: () => {},
  processSnapshotWatching: () => {},
});

type HistoryItem = {
  nodes: Node[];
  edges: Edge[];
};

type SnapshotWatchers = {
  [name: string]: {
    count?: number;
    snapshot?: HistoryItem;
  };
};

export function UndoRedoProvider({ children }: ChildrenProps) {
  const snapshotWatcherRef = useRef<SnapshotWatchers>({});
  const waitingSnapshot = useRef<HistoryItem | null>(null);

  const [past, setPast] = useState<HistoryItem[]>([]);
  const [future, setFuture] = useState<HistoryItem[]>([]);

  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();

  const historyUpdate = useCallback(() => {
    if (!waitingSnapshot.current) {
      return;
    }
    const { nodes, edges } = waitingSnapshot.current;
    setPast((past) => [
      ...past.slice(past.length - MAX_HISTORY_SIZE + 1),
      {
        nodes,
        edges,
      },
    ]);

    setFuture([]);
    waitingSnapshot.current = null;
  }, []);

  const debouncedHistoryUpdate = useMemo(() => funnel(historyUpdate, { minQuietPeriodMs: 0 }).call, [historyUpdate]);

  const takeSnapshot = useCallback(
    (snapshot?: HistoryItem) => {
      if (!waitingSnapshot.current) {
        waitingSnapshot.current = {
          nodes: snapshot?.nodes || getNodes(),
          edges: snapshot?.edges || getEdges(),
        };
      }

      debouncedHistoryUpdate();
    },
    [getNodes, getEdges, debouncedHistoryUpdate],
  );

  const undo = useCallback(() => {
    const pastState = last(past);

    if (pastState) {
      const nodes = getNodes();
      const edges = getEdges();

      setPast((past) => dropLast(past, 1));
      setFuture((future) => [...future, { nodes, edges }]);
      setNodes(pastState.nodes);
      setEdges(pastState.edges);
    }
  }, [setNodes, setEdges, getNodes, getEdges, past]);

  const redo = useCallback(() => {
    const futureState = last(future);

    if (futureState) {
      const nodes = getNodes();
      const edges = getEdges();

      setFuture((future) => dropLast(future, 1));
      setPast((past) => [...past, { nodes, edges }]);
      setNodes(futureState.nodes);
      setEdges(futureState.edges);
    }
  }, [setNodes, setEdges, getNodes, getEdges, future]);

  const startSnapshotWatching = useCallback(
    (name: string, count = 0) => {
      return (snapshotWatcherRef.current[name] = {
        count,
        snapshot: { edges: getEdges(), nodes: getNodes() },
      });
    },
    [getEdges, getNodes, snapshotWatcherRef],
  );

  const stopSnapshotWatching = useCallback(
    (name: string) => {
      return delete snapshotWatcherRef.current[name];
    },
    [snapshotWatcherRef],
  );

  const processSnapshotWatching = useCallback(
    (name: string, skip = false) => {
      const item = snapshotWatcherRef.current[name];
      if (!item?.snapshot) {
        return;
      }
      if (item.count) {
        snapshotWatcherRef.current[name].count = item.count - 1;
      } else {
        if (!skip) {
          takeSnapshot(item.snapshot);
        }
        stopSnapshotWatching(name);
      }
    },
    [takeSnapshot, stopSnapshotWatching, snapshotWatcherRef],
  );

  return (
    <UndoRedoContext.Provider
      value={{
        undo,
        redo,
        takeSnapshot,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        startSnapshotWatching,
        stopSnapshotWatching,
        processSnapshotWatching,
      }}
    >
      {children}
    </UndoRedoContext.Provider>
  );
}
