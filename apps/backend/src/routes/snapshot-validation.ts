import type { Context } from 'hono';
import { z } from 'zod';

import type { SourceVersion } from '@workflow-builder/types/workflow-execution/api';

import { decisionIssueOf } from '../domain/decision/decision-issues';
import { type WorkflowSnapshot, workflowSnapshotSchema } from '../domain/mapper/snapshot-schema';
import { logger as backendLogger } from '../logger';

const logger = backendLogger.child({ component: 'snapshot-validation' });

// `code` is zod's; a domain issue adds `domainCode` and `params` so a client never keys on `message`.
export function formatValidationDetails(error: z.ZodError) {
  return error.issues.map((issue) => {
    const detail = { path: issue.path, message: issue.message, code: issue.code };
    const domain = decisionIssueOf(issue);
    if (domain === undefined) return detail;
    return { ...detail, domainCode: domain.issue, params: domain.value === undefined ? {} : { value: domain.value } };
  });
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
