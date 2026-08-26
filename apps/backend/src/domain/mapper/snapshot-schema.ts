// Validates the workflow snapshot at the HTTP boundary structurally only:
// every node has `id` and `data.type`; every edge has `id`, `source`, `target`.
// `data.properties` is opaque here — the backend does not know any product's
// node vocabulary. Per-type validation belongs to whichever worker registers
// executors for that vocabulary; an unknown node type surfaces at runtime as
// a `node_failed` event with the missing-executor message.
import { z } from 'zod';

const frontendNodeSchema = z.object({
  id: z.string(),
  data: z.object({
    type: z.string(),
    // The editor's entrypoint flag. Declared here because zod strips whatever
    // it is not told about, and the runner needs it to pick the node a run
    // starts from. The editor's node kind (`start-node`, `node`, ...) is a
    // rendering detail and deliberately not read here.
    isStartNode: z.boolean().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
  }),
});

const frontendEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
});

export const workflowSnapshotSchema = z.object({
  nodes: z.array(frontendNodeSchema),
  edges: z.array(frontendEdgeSchema),
});

export type WorkflowSnapshot = z.infer<typeof workflowSnapshotSchema>;
