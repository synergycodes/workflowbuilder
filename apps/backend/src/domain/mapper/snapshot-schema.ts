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
