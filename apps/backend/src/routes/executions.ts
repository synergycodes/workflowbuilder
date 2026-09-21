import { and, eq, notInArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import {
  TERMINAL_EVENT_TO_STATUS,
  TERMINAL_EXECUTION_STATUSES,
  type TerminalExecutionEventType,
} from '@workflow-builder/types/workflow-execution/execution-events';

import type { AssertAuthorized, AuthVariables } from '../auth';
import { database } from '../db/client';
import { executions } from '../db/schema';
import { getWorkflowEngine } from '../engine';
import { drainEventsSince } from '../events/drain-events';
import { subscribe } from '../events/execution-event-bus';
import { type ExecutionEventRow, fetchEventsAfter } from '../events/fetch-events-after';
import { createSerializedDrainer } from '../events/serialized-drainer';
import { logger as backendLogger } from '../logger';
import type { TenantVariables } from '../tenant';

const logger = backendLogger.child({ component: 'executions-route' });

const TERMINAL_STATUSES = new Set<string>(TERMINAL_EXECUTION_STATUSES);

export function createExecutionsRoutes(
  assertAuthorized: AssertAuthorized,
): Hono<{ Variables: AuthVariables & TenantVariables }> {
  const routes = new Hono<{ Variables: AuthVariables & TenantVariables }>();

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

    // Tenant cross-check, scoped to the stream on purpose. This is NOT the
    // general per-resource tenant guard - resource-level scoping of GET/:id
    // and DELETE/:id is the AuthPort's job (it receives { kind: 'execution',
    // executionId } and a real adapter checks ownership). The stream gets an
    // extra, independent check because EventSource cannot send an
    // Authorization header, so its auth falls back to weaker query-param /
    // cookie schemes (see the comment above this handler). The tenant resolved
    // by TenantContextPort - which can come from a subdomain or cookie - is a
    // second line of defence on exactly that weak path.
    //
    // No-op when either side is null: a tenant-less caller (single-tenant
    // reference, NoopTenantContextPort) or an untenanted execution row passes
    // through unchanged. Untenanted rows are therefore globally visible at the
    // app layer; Postgres RLS (decision-log seam 5) is the systematic backstop
    // for deployments that need rows to be invisible across tenants by default.
    //
    // On mismatch we return 404, byte-identical to the not-found branch above,
    // not 403. A distinct "belongs to another tenant" response would confirm
    // the id exists in some other tenant, letting a caller enumerate foreign
    // executions. Indistinguishable-from-absent is the only safe answer here.
    const tenant = c.var.tenant;
    if (tenant && execution.tenantId && execution.tenantId !== tenant.tenantId) {
      return c.json({ code: 'execution_not_found', message: 'Execution not found' }, 404);
    }

    // Any nginx hop between us and the browser buffers this stream into its
    // proxy buffers by default and flushes only at stream close, turning live
    // progress into one end-of-run burst. nginx honors this header from the
    // upstream response and disables buffering per-response, covering hops
    // whose config we don't own (e.g. a TLS-terminating host nginx).
    c.header('X-Accel-Buffering', 'no');

    return streamSSE(c, async (stream) => {
      // Catch-up snapshot. Reuses the same incremental query (afterSequence=0)
      // that powers live drains — one query shape across the route, not two.
      const existingEvents = await fetchEventsAfter(executionId, 0);
      const lastSequence = existingEvents.length > 0 ? Number(existingEvents.at(-1)!.sequence) : 0;

      // The worker commits the terminal event and the terminal status in two separate
      // activities, so the row read before this stream opened can lag the events read
      // here. Trusting the stale row would send a live-looking snapshot (the client
      // closes only on a terminal snapshot status, so it would reconnect forever) and
      // seed the drainer past the terminal row: the catch-up drain returns empty,
      // `updateStatus` fires no NOTIFY, and the stream heartbeats until the client
      // gives up. The last event is the authority on "over" — derive the status from it.
      const lastEventType = existingEvents.at(-1)?.type;
      const effectiveStatus = isTerminalEventType(lastEventType)
        ? TERMINAL_EVENT_TO_STATUS[lastEventType]
        : execution.status;

      await stream.writeSSE({
        data: JSON.stringify({
          type: 'execution_snapshot',
          executionId,
          status: effectiveStatus,
          lastSequence,
          events: existingEvents.map(formatEvent),
        }),
      });

      if (TERMINAL_STATUSES.has(effectiveStatus)) {
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

    // The check above is a courtesy read; this WHERE is the enforcement. The worker
    // can commit a terminal status between the two, and an unguarded UPDATE would
    // resurrect the finished run as 'cancelling' — a status nothing ever writes it
    // out of. 'cancelling' itself stays cancellable on purpose: a repeat cancel is
    // an idempotent no-op write and a second engine cancel is harmless, which is
    // friendlier to a retrying client than a 409.
    const [updated] = await database
      .update(executions)
      .set({ status: 'cancelling', updatedAt: new Date() })
      .where(and(eq(executions.id, executionId), notInArray(executions.status, [...TERMINAL_EXECUTION_STATUSES])))
      .returning({ id: executions.id });

    if (!updated) {
      return c.json({ code: 'execution_not_cancellable', message: 'Execution already finished' }, 409);
    }

    logger.info('cancel requested', { executionId: execution.id, workflowId: execution.workflowId });
    await getWorkflowEngine().cancel(execution.id);

    return c.json({ id: execution.id, status: 'cancelling' });
  });

  return routes;
}

function isTerminalEventType(type: string | undefined): type is TerminalExecutionEventType {
  return type !== undefined && type in TERMINAL_EVENT_TO_STATUS;
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
