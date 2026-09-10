import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  type ExecutionStatus,
  TERMINAL_EXECUTION_STATUSES,
} from '@workflow-builder/types/workflow-execution/execution-events';

import type { AssertAuthorized, AuthResource, AuthVariables } from '../auth';
import { database } from '../db/client';
import { executions } from '../db/schema';
import { findDecisionRequest } from '../domain/decision/find-decision-request';
import { hasNodeResolution, toNodeResolution } from '../domain/decision/node-resolution';
import { submittedDecisionSchema, validateSubmittedDecision } from '../domain/decision/validate-submitted-decision';
import { workflowSnapshotSchema } from '../domain/mapper/snapshot-schema';
import { getWorkflowEngine } from '../engine';
import { countNodeWaits } from '../events/count-node-waits';
import { logger as backendLogger } from '../logger';
import type { TenantVariables } from '../tenant';
import { ENGINE_REFUSALS, LOOKUP_REFUSALS, refuse } from './decision-refusals';
import { formatValidationDetails } from './snapshot-validation';

const logger = backendLogger.child({ component: 'decision-route' });

// Every other status goes to the engine: the advisory status write is best-effort, so a
// parked run can still read 'pending'.
const NOT_DECIDABLE_STATUSES = new Set<string>([
  ...TERMINAL_EXECUTION_STATUSES,
  'cancelling' satisfies ExecutionStatus,
]);

const decisionBodySchema = submittedDecisionSchema.extend({
  nodeId: z.string().min(1),
  attempt: z.int().min(1),
});

export function createDecisionRoutes(
  assertAuthorized: AssertAuthorized,
): Hono<{ Variables: AuthVariables & TenantVariables }> {
  const routes = new Hono<{ Variables: AuthVariables & TenantVariables }>();

  routes.post('/:id/decision', async (c) => {
    const executionId = c.req.param('id');

    // Read before authorization so the port can scope by the row; a deny thus wins over 404.
    const [execution] = await database.select().from(executions).where(eq(executions.id, executionId));
    const resource: AuthResource = execution
      ? {
          kind: 'execution',
          executionId,
          attributes: { workflowId: execution.workflowId, tenantId: execution.tenantId, status: execution.status },
        }
      : { kind: 'execution', executionId };
    await assertAuthorized(c, 'executions:decide', resource);

    if (!execution) return refuse(c, 'execution_not_found');
    if (NOT_DECIDABLE_STATUSES.has(execution.status)) return refuse(c, 'execution_not_waiting');

    const parsedBody = z.safeParse(decisionBodySchema, await c.req.json());
    if (!parsedBody.success) {
      return refuse(c, 'body_invalid', undefined, { details: formatValidationDetails(parsedBody.error) });
    }
    const { nodeId, attempt, ...submitted } = parsedBody.data;

    const parsedSnapshot = z.safeParse(workflowSnapshotSchema, execution.workflowSnapshotJson);
    if (!parsedSnapshot.success) {
      logger.error('stored snapshot no longer parses', {
        executionId,
        error: { issues: formatValidationDetails(parsedSnapshot.error) },
      });
      throw new Error(`stored snapshot of execution ${executionId} no longer parses`);
    }
    const found = findDecisionRequest(parsedSnapshot.data, nodeId);
    if (found.error !== undefined) return refuse(c, LOOKUP_REFUSALS[found.error], nodeId);

    const validated = validateSubmittedDecision(found.request, submitted);
    if (validated.error !== undefined) {
      return refuse(c, 'decision_invalid', undefined, { details: [validated.error] });
    }
    const { decision, action } = validated;

    const waits = await countNodeWaits(executionId, nodeId);
    if (waits === 0) return refuse(c, 'node_never_parked', nodeId);
    if (waits !== attempt) return refuse(c, 'attempt_mismatch', undefined, { attempt: waits });

    // Refused until the engine can re-run a source (follow-up: decision-rerun-source).
    if (!hasNodeResolution(decision) || action.effect === 'rerun-source') {
      return refuse(c, 'effect_not_supported', action.name);
    }

    const result = await getWorkflowEngine().resolveNode(executionId, nodeId, toNodeResolution(decision, action));
    if (result.error !== undefined) {
      const outcome = ENGINE_REFUSALS[result.error.code];
      if (outcome === 'fault') {
        throw new Error(
          `engine refused the completion for node '${nodeId}': ${result.error.code}: ${result.error.message}`,
        );
      }
      return refuse(c, outcome, nodeId);
    }

    logger.info('decision delivered', { executionId, nodeId, attempt, action: action.name, effect: decision.effect });
    return c.json({ executionId, nodeId, attempt, action: action.name, effect: decision.effect });
  });

  return routes;
}
