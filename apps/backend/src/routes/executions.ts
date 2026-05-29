import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import type { AssertAuthorized, AuthVariables } from '../auth';
import { database } from '../db/client';
import { executions } from '../db/schema';
import { getWorkflowEngine } from '../engine';
import { drainEventsSince } from '../events/drain-events';
import { subscribe } from '../events/execution-event-bus';
import { type ExecutionEventRow, fetchEventsAfter } from '../events/fetch-events-after';
import { createSerializedDrainer } from '../events/serialized-drainer';
import { logger as backendLogger } from '../logger';

const logger = backendLogger.child({ component: 'executions-route' });

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export function createExecutionsRoutes(assertAuthorized: AssertAuthorized): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();

  routes.get('/:id', async (c) => {
    const executionId = c.req.param('id');

    await assertAuthorized(c, 'executions:read', { kind: 'execution', executionId });

    const [execution] = await database.select().from(executions).where(eq(executions.id, executionId));

    if (!execution) {
      return c.json({ code: 'execution_not_found', message: 'Execution not found' }, 404);
    }

    return c.json({
      id: execution.id,
      workflowId: execution.workflowId,
      sourceVersion: execution.sourceVersion,
      status: execution.status,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
    });
  });

  // EventSource cannot send custom request headers - JWT bearer adapters that
  // rely on `Authorization` will not work for this endpoint out of the box.
  // See `auth-port.decision-log.md` section "SSE / EventSource auth caveats"
  // for the supported fallbacks (query-param token, cookie session).
  routes.get('/:id/stream', async (c) => {
    const executionId = c.req.param('id');

    await assertAuthorized(c, 'executions:stream', { kind: 'execution', executionId });

    const [execution] = await database.select().from(executions).where(eq(executions.id, executionId));

    if (!execution) {
      return c.json({ code: 'execution_not_found', message: 'Execution not found' }, 404);
    }

    return streamSSE(c, async (stream) => {
      // Catch-up snapshot. Reuses the same incremental query (afterSequence=0)
      // that powers live drains — one query shape across the route, not two.
      const existingEvents = await fetchEventsAfter(executionId, 0);
      const lastSequence = existingEvents.length > 0 ? Number(existingEvents.at(-1)!.sequence) : 0;

      await stream.writeSSE({
        data: JSON.stringify({
          type: 'execution_snapshot',
          executionId,
          status: execution.status,
          lastSequence,
          events: existingEvents.map(formatEvent),
        }),
      });

      if (TERMINAL_STATUSES.has(execution.status)) {
        return;
      }

      const writeEvent = async (event: ExecutionEventRow) => {
        await stream.writeSSE({ data: JSON.stringify(formatEvent(event)) });
      };

      const drainer = createSerializedDrainer(lastSequence, async (cursor) => {
        const result = await drainEventsSince(executionId, cursor, fetchEventsAfter, writeEvent);
        if (result.writeFailed) {
          logger.debug('SSE write failed, ending stream (client likely disconnected)', { executionId });
        }
        return result;
      });

      const unsubscribe = await subscribe(executionId, () => {
        void drainer.notify();
      });

      // Catch-up drain. An event inserted between the snapshot read above and
      // this subscribe fires its NOTIFY before any listener exists, so the
      // signal is lost. Without this pass a terminal event landing in that
      // window would never reach the client and the stream would hang in
      // "running" forever. Draining from the snapshot cursor replays anything
      // missed; a live execution with nothing new simply no-ops.
      void drainer.notify();

      // Heartbeat keepalive — prevents proxies from closing idle SSE connections
      const heartbeat = setInterval(async () => {
        if (drainer.done) {
          clearInterval(heartbeat);
          return;
        }
        try {
          await stream.writeSSE({ data: '', event: 'heartbeat' });
        } catch {
          clearInterval(heartbeat);
          drainer.stop();
        }
      }, 15_000);

      const cleanup = () => {
        drainer.stop();
        unsubscribe();
        clearInterval(heartbeat);
      };

      stream.onAbort(cleanup);

      // Hold connection open until the drainer is done
      await new Promise<void>((resolve) => {
        stream.onAbort(() => resolve());
        const check = setInterval(() => {
          if (drainer.done) {
            clearInterval(check);
            cleanup();
            resolve();
          }
        }, 500);
      });
    });
  });

  routes.delete('/:id', async (c) => {
    const executionId = c.req.param('id');

    await assertAuthorized(c, 'executions:cancel', { kind: 'execution', executionId });

    const [execution] = await database.select().from(executions).where(eq(executions.id, executionId));

    if (!execution) {
      return c.json({ code: 'execution_not_found', message: 'Execution not found' }, 404);
    }

    if (TERMINAL_STATUSES.has(execution.status)) {
      return c.json({ code: 'execution_not_cancellable', message: 'Execution already finished' }, 409);
    }

    await database
      .update(executions)
      .set({ status: 'cancelling', updatedAt: new Date() })
      .where(eq(executions.id, executionId));

    logger.info('cancel requested', { executionId: execution.id, workflowId: execution.workflowId });
    await getWorkflowEngine().cancel(execution.id);

    return c.json({ id: execution.id, status: 'cancelling' });
  });

  return routes;
}

function formatEvent(event: ExecutionEventRow) {
  return {
    executionId: event.executionId,
    sequence: event.sequence,
    timestamp: event.timestamp.toISOString(),
    type: event.type,
    nodeId: event.nodeId,
    pathId: event.pathId,
    payload: event.payloadJson,
  };
}
