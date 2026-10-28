import { type SQL, and, desc, eq, isNull, or, sql } from 'drizzle-orm';

import type { ExecutionStatus } from '@workflow-builder/types/workflow-execution/execution-events';

import { executions } from '../db/schema';

const STATUS_KEYS = {
  pending: true,
  running: true,
  waiting: true,
  cancelling: true,
  completed: true,
  incomplete: true,
  failed: true,
  cancelled: true,
} satisfies Record<ExecutionStatus, true>;

export const EXECUTION_STATUSES: ReadonlySet<string> = new Set(Object.keys(STATUS_KEYS));

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Cursor = { createdAt: string; id: string };

type ListExecutionsQuery = {
  status?: ExecutionStatus;
  workflowId?: string;
  limit: number;
  cursor?: Cursor;
};

type ListExecutionsQueryCode = 'invalid_status' | 'invalid_workflow_id' | 'invalid_limit' | 'invalid_cursor';

type ParsedListExecutionsQuery =
  | { ok: true; query: ListExecutionsQuery }
  | { ok: false; code: ListExecutionsQueryCode; message: string };

export function parseListExecutionsQuery(raw: {
  status?: string;
  workflowId?: string;
  limit?: string;
  cursor?: string;
}): ParsedListExecutionsQuery {
  // `?status=` is an unset form field, not a typo: an empty value counts as absent.
  if (raw.status && !EXECUTION_STATUSES.has(raw.status)) {
    return { ok: false, code: 'invalid_status', message: 'Unknown execution status' };
  }
  if (raw.workflowId && !UUID_PATTERN.test(raw.workflowId)) {
    return { ok: false, code: 'invalid_workflow_id', message: 'workflowId must be a UUID' };
  }
  if (raw.limit && (!/^\d+$/.test(raw.limit) || Number(raw.limit) < 1)) {
    return { ok: false, code: 'invalid_limit', message: 'limit must be a positive integer' };
  }
  const cursor = raw.cursor ? decodeCursor(raw.cursor) : undefined;
  if (raw.cursor && cursor === undefined) {
    return { ok: false, code: 'invalid_cursor', message: 'Malformed cursor' };
  }

  return {
    ok: true,
    query: {
      status: (raw.status || undefined) as ExecutionStatus | undefined,
      workflowId: raw.workflowId || undefined,
      limit: raw.limit ? Math.min(Number(raw.limit), MAX_LIMIT) : DEFAULT_LIMIT,
      cursor,
    },
  };
}

// Why base64url, not base64: the token rides a query string, and `+ / =` would need escaping.
export function encodeCursor(item: { createdAt: Date; id: string }): string {
  return Buffer.from(`${item.createdAt.toISOString()}|${item.id}`).toString('base64url');
}

// Node's decoder never throws, so validity is judged on the decoded content.
export function decodeCursor(token: string): Cursor | undefined {
  const parts = Buffer.from(token, 'base64url').toString('utf8').split('|');
  if (parts.length !== 2) return;
  const [createdAt, id] = parts as [string, string];
  // Four-digit year at or after the epoch: toISOString also round-trips signed and year-0 forms Postgres rejects.
  const time = Date.parse(createdAt);
  if (!/^\d{4}-/.test(createdAt) || Number.isNaN(time) || time < 0 || new Date(time).toISOString() !== createdAt)
    return;
  if (!UUID_PATTERN.test(id)) return;
  return { createdAt, id };
}

// Postgres keeps created_at in microseconds and Drizzle returns a millisecond Date; a cursor built
// from that Date and compared against the raw column skips rows that share its millisecond.
// Truncating both sides makes the cursor exact.
const CREATED_AT_MILLIS = sql`date_trunc('milliseconds', ${executions.createdAt})`;

export const LIST_ORDER: SQL[] = [desc(CREATED_AT_MILLIS), desc(executions.id)];

export function listExecutionsWhere(
  query: Pick<ListExecutionsQuery, 'status' | 'workflowId' | 'cursor'>,
  tenantId: string | null,
): SQL | undefined {
  return and(
    query.status === undefined ? undefined : eq(executions.status, query.status),
    query.workflowId === undefined ? undefined : eq(executions.workflowId, query.workflowId),
    // Untenanted rows stay visible to every tenant, the stream route's rule; see tenant-context-port.decision-log.md.
    tenantId === null ? undefined : or(eq(executions.tenantId, tenantId), isNull(executions.tenantId)),
    query.cursor === undefined
      ? undefined
      : sql`(${CREATED_AT_MILLIS}, ${executions.id}) < (${query.cursor.createdAt}::timestamptz, ${query.cursor.id}::uuid)`,
  );
}

type ExecutionListRow = {
  id: string;
  workflowId: string;
  sourceVersion: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
};

type ExecutionListPage = { items: ExecutionListRow[]; nextCursor: string | null };

// Expects `limit + 1` rows: the extra one only tells whether a next page exists.
export function pageOf(rows: ExecutionListRow[], limit: number): ExecutionListPage {
  const items = rows.slice(0, limit).map((row) => ({
    id: row.id,
    workflowId: row.workflowId,
    sourceVersion: row.sourceVersion,
    status: row.status,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    createdAt: row.createdAt,
  }));
  const last = items.at(-1);
  return { items, nextCursor: rows.length > limit && last ? encodeCursor(last) : null };
}
