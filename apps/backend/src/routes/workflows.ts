import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { database } from '../db/client';
import { executions, workflows } from '../db/schema';
import { mapToExecutionModel } from '../domain/mapper/from-integration-data';
import { workflowSnapshotSchema } from '../domain/mapper/snapshot-schema';
import { getWorkflowEngine } from '../engine';
import { logger as backendLogger } from '../logger';

const logger = backendLogger.child({ component: 'workflows-route' });

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  draftJson: z.unknown().optional(),
});

const updateDraftSchema = z.object({
  draftJson: z.unknown(),
});

const executeSchema = z.object({
  sourceVersion: z.enum(['draft', 'published']),
  triggerPayload: z.record(z.string(), z.unknown()).optional(),
});

function formatValidationDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
    code: issue.code,
  }));
}

export const workflowsRoutes = new Hono();

workflowsRoutes.post('/', async (c) => {
  const parsed = z.safeParse(createWorkflowSchema, await c.req.json());
  if (!parsed.success) {
    return c.json(
      {
        code: 'validation_error',
        message: 'Request body failed validation',
        details: formatValidationDetails(parsed.error),
      },
      400,
    );
  }
  const body = parsed.data;

  const [workflow] = await database
    .insert(workflows)
    .values({
      name: body.name,
      draftJson: body.draftJson ?? null,
    })
    .returning();

  return c.json(workflow, 201);
});

workflowsRoutes.get('/', async (c) => {
  const rows = await database
    .select({
      id: workflows.id,
      name: workflows.name,
      publishedAt: workflows.publishedAt,
      createdAt: workflows.createdAt,
      updatedAt: workflows.updatedAt,
      publishedJson: workflows.publishedJson,
    })
    .from(workflows);

  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    hasPublished: row.publishedJson !== null,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  return c.json(items);
});

workflowsRoutes.get('/:id', async (c) => {
  const [workflow] = await database
    .select()
    .from(workflows)
    .where(eq(workflows.id, c.req.param('id')));

  if (!workflow) {
    return c.json({ code: 'workflow_not_found', message: 'Workflow not found' }, 404);
  }

  return c.json(workflow);
});

workflowsRoutes.patch('/:id/draft', async (c) => {
  const parsed = z.safeParse(updateDraftSchema, await c.req.json());
  if (!parsed.success) {
    return c.json(
      {
        code: 'validation_error',
        message: 'Request body failed validation',
        details: formatValidationDetails(parsed.error),
      },
      400,
    );
  }
  const body = parsed.data;

  const [workflow] = await database
    .update(workflows)
    .set({
      draftJson: body.draftJson,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, c.req.param('id')))
    .returning();

  if (!workflow) {
    return c.json({ code: 'workflow_not_found', message: 'Workflow not found' }, 404);
  }

  return c.json(workflow);
});

workflowsRoutes.post('/:id/publish', async (c) => {
  const [existing] = await database
    .select()
    .from(workflows)
    .where(eq(workflows.id, c.req.param('id')));

  if (!existing) {
    return c.json({ code: 'workflow_not_found', message: 'Workflow not found' }, 404);
  }

  const [workflow] = await database
    .update(workflows)
    .set({
      publishedJson: existing.draftJson,
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, c.req.param('id')))
    .returning();

  return c.json(workflow);
});

workflowsRoutes.post('/:id/execute', async (c) => {
  const parsed = z.safeParse(executeSchema, await c.req.json());
  if (!parsed.success) {
    return c.json(
      {
        code: 'validation_error',
        message: 'Request body failed validation',
        details: formatValidationDetails(parsed.error),
      },
      400,
    );
  }
  const body = parsed.data;

  const workflowId = c.req.param('id');

  const [workflow] = await database.select().from(workflows).where(eq(workflows.id, workflowId));

  if (!workflow) {
    return c.json({ code: 'workflow_not_found', message: 'Workflow not found' }, 404);
  }

  const snapshotJson = body.sourceVersion === 'published' ? workflow.publishedJson : workflow.draftJson;

  if (!snapshotJson) {
    return c.json({ code: 'published_version_missing', message: `No ${body.sourceVersion} version available` }, 400);
  }

  const snapshotParsed = z.safeParse(workflowSnapshotSchema, snapshotJson);
  if (!snapshotParsed.success) {
    logger.warn('snapshot invalid', {
      workflowId,
      sourceVersion: body.sourceVersion,
      error: { issues: formatValidationDetails(snapshotParsed.error) },
    });
    return c.json(
      {
        code: 'invalid_snapshot',
        message: 'Workflow snapshot failed validation',
        details: formatValidationDetails(snapshotParsed.error),
      },
      400,
    );
  }

  const [execution] = await database
    .insert(executions)
    .values({
      workflowId,
      sourceVersion: body.sourceVersion,
      workflowSnapshotJson: snapshotJson,
      status: 'pending',
      triggerPayloadJson: body.triggerPayload ?? null,
    })
    .returning();

  const definition = mapToExecutionModel(workflowId, snapshotParsed.data);

  logger.info('execute requested', {
    workflowId,
    executionId: execution.id,
    sourceVersion: body.sourceVersion,
  });

  await getWorkflowEngine().submit({
    workflowId,
    executionId: execution.id,
    definition,
    triggerPayload: body.triggerPayload ?? {},
    variables: {},
    global: {}, // server-side globals (secrets, env) populated here later
  });

  return c.json(
    {
      executionId: execution.id,
      status: execution.status,
      streamUrl: `/api/executions/${execution.id}/stream`,
    },
    202,
  );
});
