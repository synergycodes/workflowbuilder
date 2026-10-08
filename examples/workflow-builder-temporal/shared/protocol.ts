// The wire contract between the worker bridge and the editor.

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

// A run is over once it reaches one of these; nothing the plugin sends afterwards replaces it.
export const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['completed', 'incomplete', 'failed', 'cancelled']);
