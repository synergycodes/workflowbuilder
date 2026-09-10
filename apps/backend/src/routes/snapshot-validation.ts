import type { Context } from 'hono';
import { z } from 'zod';

import type { SourceVersion } from '@workflow-builder/types/workflow-execution/api';

import { type WorkflowSnapshot, workflowSnapshotSchema } from '../domain/mapper/snapshot-schema';
import { logger as backendLogger } from '../logger';

const logger = backendLogger.child({ component: 'snapshot-validation' });

export function formatValidationDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
    code: issue.code,
  }));
}

export type SnapshotParse =
  | { snapshot: WorkflowSnapshot; response?: undefined }
  | { snapshot?: undefined; response: Response };

// Publish and execute reject a snapshot the same way, so the two never drift.
export function parseSnapshot(
  c: Context,
  snapshotJson: unknown,
  source: { workflowId: string; sourceVersion: SourceVersion },
): SnapshotParse {
  const parsed = z.safeParse(workflowSnapshotSchema, snapshotJson);
  if (parsed.success) return { snapshot: parsed.data };

  const details = formatValidationDetails(parsed.error);
  logger.warn('snapshot invalid', { ...source, error: { issues: details } });
  return {
    response: c.json({ code: 'invalid_snapshot', message: 'Workflow snapshot failed validation', details }, 400),
  };
}
