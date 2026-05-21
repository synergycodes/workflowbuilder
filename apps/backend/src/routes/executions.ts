import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import { database } from '../db/client';
import { executionEvents, executions } from '../db/schema';
import { getWorkflowEngine } from '../engine';
import { subscribe } from '../events/execution-event-bus';
import { logger as backendLogger } from '../logger';

const logger = backendLogger.child({ component: 'executions-route' });

const TERMINAL_EVENT_TYPES = new Set(['execution_completed', 'execution_failed', 'execution_cancelled']);
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export const executionsRoutes = new Hono();

executionsRoutes.get('/:id', async (c) => {
  const [execution] = await database
    .select()
    .from(executions)
    .where(eq(executions.id, c.req.param('id')));

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

executionsRoutes.get('/:id/stream', async (c) => {
  const executionId = c.req.param('id');
  const [execution] = await database.select().from(executions).where(eq(executions.id, executionId));

  if (!execution) {
    return c.json({ code: 'execution_not_found', message: 'Execution not found' }, 404);
  }

  return streamSSE(c, async (stream) => {
    // Send catch-up snapshot so clients that connected late get full history
    const existingEvents = await database
      .select()
      .from(executionEvents)
      .where(eq(executionEvents.executionId, executionId))
      .orderBy(executionEvents.sequence);

    let lastSequence = existingEvents.length > 0 ? Number(existingEvents.at(-1)!.sequence) : 0;

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

    let done = false;

    const unsubscribe = await subscribe(executionId, async () => {
      if (done) return;

      const newEvents = await database
        .select()
        .from(executionEvents)
        .where(eq(executionEvents.executionId, executionId))
        .orderBy(executionEvents.sequence);

      const unsent = newEvents.filter((event) => Number(event.sequence) > lastSequence);

      for (const event of unsent) {
        try {
          await stream.writeSSE({ data: JSON.stringify(formatEvent(event)) });
          lastSequence = Number(event.sequence);
        } catch {
          done = true;
          return;
        }
      }

      const lastType = unsent.at(-1)?.type;
      if (lastType && TERMINAL_EVENT_TYPES.has(lastType)) {
        done = true;
      }
    });

    // Heartbeat keepalive — prevents proxies from closing idle SSE connections
    const heartbeat = setInterval(async () => {
      if (done) {
        clearInterval(heartbeat);
        return;
      }
      try {
        await stream.writeSSE({ data: '', event: 'heartbeat' });
      } catch {
        clearInterval(heartbeat);
        done = true;
      }
    }, 15_000);

    const cleanup = () => {
      done = true;
      unsubscribe();
      clearInterval(heartbeat);
    };

    stream.onAbort(cleanup);

    // Hold connection open until done
    await new Promise<void>((resolve) => {
      stream.onAbort(() => resolve());
      const check = setInterval(() => {
        if (done) {
          clearInterval(check);
          cleanup();
          resolve();
        }
      }, 500);
    });
  });
});

executionsRoutes.delete('/:id', async (c) => {
  const [execution] = await database
    .select()
    .from(executions)
    .where(eq(executions.id, c.req.param('id')));

  if (!execution) {
    return c.json({ code: 'execution_not_found', message: 'Execution not found' }, 404);
  }

  if (TERMINAL_STATUSES.has(execution.status)) {
    return c.json({ code: 'execution_not_cancellable', message: 'Execution already finished' }, 409);
  }

  await database
    .update(executions)
    .set({ status: 'cancelling', updatedAt: new Date() })
    .where(eq(executions.id, c.req.param('id')));

  logger.info('cancel requested', { executionId: execution.id, workflowId: execution.workflowId });
  await getWorkflowEngine().cancel(execution.id);

  return c.json({ id: execution.id, status: 'cancelling' });
});

function formatEvent(event: typeof executionEvents.$inferSelect) {
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
