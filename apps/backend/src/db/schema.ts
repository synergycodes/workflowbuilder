import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  draftJson: jsonb('draft_json'),
  publishedJson: jsonb('published_json'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const executions = pgTable(
  'executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id),
    sourceVersion: text('source_version').notNull(), // 'draft' | 'published'
    workflowSnapshotJson: jsonb('workflow_snapshot_json').notNull(),
    status: text('status').notNull().default('pending'),
    triggerPayloadJson: jsonb('trigger_payload_json'),
    // Nullable: single-tenant deployments leave it NULL on every row.
    // Multi-tenant consumers populate via TenantContextPort at /execute time.
    // `text`, not `uuid`: TenantContext.tenantId is an opaque string (UUID or
    // slug), so the column must accept whatever the consumer's port returns.
    // See apps/backend/tenant-context-port.decision-log.md for the wiring.
    tenantId: text('tenant_id'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('executions_workflow_id_idx').on(table.workflowId),
    index('executions_status_idx').on(table.status),
    index('executions_tenant_id_idx').on(table.tenantId),
  ],
);

export const executionEvents = pgTable(
  'execution_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => executions.id),
    sequence: integer('sequence').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    type: text('type').notNull(),
    nodeId: text('node_id'),
    pathId: text('path_id'),
    payloadJson: jsonb('payload_json'),
    // Denormalised from `executions.tenant_id` so analytics queries can scope
    // events by tenant without joining. Worker writes inherit it from the
    // parent execution via subquery at INSERT time (see worker database.ts).
    // `text` to match executions.tenant_id. NULL in single-tenant mode.
    tenantId: text('tenant_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('execution_events_execution_sequence_idx').on(table.executionId, table.sequence),
    index('execution_events_execution_id_idx').on(table.executionId),
    index('execution_events_tenant_id_idx').on(table.tenantId),
  ],
);
