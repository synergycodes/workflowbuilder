// Worker DB access — raw SQL to avoid coupling worker to backend's Drizzle schema.
import postgres from 'postgres';

import { TERMINAL_EXECUTION_STATUSES } from '@workflow-builder/types/workflow-execution/execution-events';

import { env } from './env';

const sql = postgres(env.DATABASE_URL);

// Widened alias: `status` arrives as a plain string, and `.includes` on a
// literal-union tuple rejects it.
const TERMINAL_STATUSES: readonly string[] = TERMINAL_EXECUTION_STATUSES;

export const database = {
  async emitExecutionEvent(executionId: string, sequence: number, type: string, payload?: unknown, nodeId?: string) {
    await sql`
      INSERT INTO execution_events (id, execution_id, sequence, timestamp, type, node_id, path_id, payload_json, tenant_id, created_at)
      VALUES (
        gen_random_uuid(),
        ${executionId},
        ${sequence},
        now(),
        ${type},
        ${nodeId ?? null},
        ${null},
        ${payload ? JSON.stringify(payload) : null}::jsonb,
        (SELECT tenant_id FROM executions WHERE id = ${executionId}),
        now()
      )
      ON CONFLICT (execution_id, sequence) DO NOTHING
    `;

    // Postgres NOTIFY → backend SSE stream picks this up and fans out to clients.
    await sql`SELECT pg_notify('execution_events', ${executionId})`;
  },

  async updateExecutionStatus(executionId: string, status: string, errorMessage?: string) {
    const isTerminal = TERMINAL_STATUSES.includes(status);

    // Terminal statuses are immutable: a cancel cleanup landing after the run already
    // wrote `failed` must not flip it to `cancelled`. Matching 0 rows is a silent
    // no-op, which also makes a retried terminal write idempotent.
    await sql`
      UPDATE executions SET
        status = ${status},
        started_at = CASE WHEN ${status} = 'running' THEN now() ELSE started_at END,
        finished_at = CASE WHEN ${isTerminal} THEN now() ELSE finished_at END,
        error_message = ${errorMessage ?? null},
        updated_at = now()
      WHERE id = ${executionId}
        AND status NOT IN ${sql([...TERMINAL_EXECUTION_STATUSES])}
    `;
  },
};
