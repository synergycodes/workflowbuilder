// Worker DB access — raw SQL to avoid coupling worker to backend's Drizzle schema.
import postgres from 'postgres';

import { env } from './env';

const sql = postgres(env.DATABASE_URL);

export const database = {
  async emitExecutionEvent(executionId: string, type: string, payload?: unknown, nodeId?: string) {
    await sql`
      INSERT INTO execution_events (id, execution_id, sequence, timestamp, type, node_id, path_id, payload_json, tenant_id, created_at)
      VALUES (
        gen_random_uuid(),
        ${executionId},
        (SELECT COALESCE(MAX(sequence), 0) + 1 FROM execution_events WHERE execution_id = ${executionId}),
        now(),
        ${type},
        ${nodeId ?? null},
        ${null},
        ${payload ? JSON.stringify(payload) : null}::jsonb,
        (SELECT tenant_id FROM executions WHERE id = ${executionId}),
        now()
      )
    `;

    // Postgres NOTIFY → backend SSE stream picks this up and fans out to clients
    await sql`SELECT pg_notify('execution_events', ${executionId})`;
  },

  async updateExecutionStatus(executionId: string, status: string, errorMessage?: string) {
    const isTerminal = ['completed', 'failed', 'cancelled'].includes(status);

    await sql`
      UPDATE executions SET
        status = ${status},
        started_at = CASE WHEN ${status} = 'running' THEN now() ELSE started_at END,
        finished_at = CASE WHEN ${isTerminal} THEN now() ELSE finished_at END,
        error_message = ${errorMessage ?? null},
        updated_at = now()
      WHERE id = ${executionId}
    `;
  },
};
