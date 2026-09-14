// Shared with the editor through type-only imports, so nothing here reaches a bundle.

export type SnapshotNode = {
  id: string;
  data: {
    type: string;
    isStartNode?: boolean;
    properties?: Record<string, unknown>;
  };
};

export type SnapshotEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

export type DiagramSnapshot = {
  nodes: SnapshotNode[];
  edges: SnapshotEdge[];
};

export type RunRequest = DiagramSnapshot & {
  triggerPayload?: Record<string, unknown>;
};

export type RunResponse = {
  executionId: string;
  temporalUiUrl: string;
};

export type RunEvent =
  | { kind: 'event'; sequence: number; type: string; nodeId?: string; payload?: unknown }
  | { kind: 'status'; status: string; errorMessage?: string };
