import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolveNodeRejection } from '@workflow-builder/execution-core/workflow';
import { TERMINAL_EXECUTION_STATUSES } from '@workflow-builder/types/workflow-execution/execution-events';

import {
  AllowAllAuthPort,
  AuthDeniedError,
  type AuthPort,
  type AuthVariables,
  createAuthMiddleware,
  makeAssertAuthorized,
} from '../auth';
import { SUBMITTED_DECISION_ERRORS, type SubmittedDecisionErrorCode } from '../domain/decision/decision-issues';
import { createDecisionRoutes } from './decision';

// ---- module mocks -----------------------------------------------------------

const { databaseMock, getEngineMock, engineMock } = vi.hoisted(() => ({
  databaseMock: { select: vi.fn() },
  engineMock: { submit: vi.fn(), cancel: vi.fn(), resolveNode: vi.fn() },
  getEngineMock: vi.fn(),
}));

vi.mock('../db/client', () => ({ database: databaseMock }));
vi.mock('../engine', () => ({ getWorkflowEngine: getEngineMock }));

// ---- helpers ----------------------------------------------------------------

function chainProxyHandler<T>(value: T): ProxyHandler<Promise<T>> {
  return {
    get(target, property, receiver) {
      if (property === 'then' || property === 'catch' || property === 'finally') {
        const v = Reflect.get(target, property, receiver);
        return typeof v === 'function' ? v.bind(target) : v;
      }
      return () => chainResolving(value);
    },
  };
}

function chainResolving<T>(value: T): Promise<T> {
  return new Proxy(Promise.resolve(value), chainProxyHandler(value));
}

function buildApp(port: AuthPort) {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use('*', createAuthMiddleware(port));
  app.onError((error, c) => {
    if (error instanceof AuthDeniedError) {
      if (!error.caller) {
        return c.json({ code: 'unauthenticated', message: 'Authentication required' }, 401);
      }
      return c.json({ code: 'forbidden', message: error.message }, 403);
    }
    return c.json({ code: 'internal_error', message: 'Internal server error' }, 500);
  });
  app.route('/api/executions', createDecisionRoutes(makeAssertAuthorized(port)));
  return app;
}

function allowAll(spy = vi.fn(async () => true)): AuthPort {
  return { identify: vi.fn(async () => null), authorize: spy };
}

function denyAll(): AuthPort {
  return { identify: vi.fn(async () => null), authorize: vi.fn(async () => false) };
}

async function decide(app: ReturnType<typeof buildApp>, body: unknown): Promise<Response> {
  return app.request('/api/executions/e-1/decision', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

type Body = {
  code?: string;
  message?: string;
  details?: { code: string; path: (string | number)[] }[];
  attempt?: number;
  effect?: string;
};

function bodyOf(response: Response): Promise<Body> {
  return response.json() as Promise<Body>;
}

async function codeOf(response: Response): Promise<string | undefined> {
  const body = await bodyOf(response);
  return body.code;
}

// 1st select: the execution row (none when `execution` is undefined). 2nd: the wait count.
function program(execution?: unknown, waits = 1) {
  databaseMock.select.mockReturnValueOnce(chainResolving(execution === undefined ? [] : [execution]));
  databaseMock.select.mockReturnValue(chainResolving([{ waits }]));
}

// ---- fixtures ---------------------------------------------------------------

const refundForm = {
  type: 'object',
  properties: {
    orderDate: { type: 'string', readOnly: true },
    refundAmount: { type: 'number' },
    note: { type: 'string' },
  },
  required: ['refundAmount'],
};
const approve = { name: 'approve', label: 'Approve', effect: 'resume' };
const reject = { name: 'reject', label: 'Reject', effect: 'reject' };
const askAgain = { name: 'ask-again', label: 'Ask again', effect: 'rerun-source' };

// source-1 feeds two deciding nodes. review-1 offers all three effects and takes a reject
// without a reason; review-2 requires one. after-1 hangs off review-1's approved port.
const snapshot = {
  nodes: [
    { id: 'source-1', data: { type: 'product/any', properties: {} } },
    {
      id: 'review-1',
      data: {
        type: 'product/any',
        properties: {
          decisionRequest: {
            version: 1,
            actions: [approve, reject, askAgain],
            schema: refundForm,
            proposalSourceNodeId: 'source-1',
          },
        },
      },
    },
    {
      id: 'review-2',
      data: {
        type: 'product/any',
        properties: {
          decisionRequest: { version: 1, actions: [approve, { ...reject, reasonRequired: true }], schema: refundForm },
        },
      },
    },
    { id: 'after-1', data: { type: 'product/any', properties: {} } },
  ],
  edges: [
    { id: 'e1', source: 'source-1', target: 'review-1' },
    { id: 'e2', source: 'source-1', target: 'review-2' },
    { id: 'e3', source: 'review-1', target: 'after-1', sourceHandle: 'approved' },
  ],
};

const waitingExecution = {
  id: 'e-1',
  workflowId: 'w-1',
  sourceVersion: 'published',
  workflowSnapshotJson: snapshot,
  status: 'waiting',
  tenantId: 'acme',
  triggerPayloadJson: null,
  startedAt: new Date(0),
  finishedAt: null,
  errorMessage: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const approveBody = { nodeId: 'review-1', attempt: 1, action: 'approve', edits: { refundAmount: 120 } };
const approvedDecision = { action: 'approve', effect: 'resume-with-edits', edits: { refundAmount: 120 } };

beforeEach(() => {
  vi.clearAllMocks();
  getEngineMock.mockReturnValue(engineMock);
  engineMock.resolveNode.mockResolvedValue({});
});

// ---- authorization ------------------------------------------------------------

describe('POST /api/executions/:id/decision - authorization', () => {
  it('asserts executions:decide with the row attributes the port scopes by', async () => {
    const authorizeSpy = vi.fn(async () => true);
    program(waitingExecution);

    await decide(buildApp(allowAll(authorizeSpy)), approveBody);

    expect(authorizeSpy).toHaveBeenCalledWith(null, 'executions:decide', {
      kind: 'execution',
      executionId: 'e-1',
      attributes: { workflowId: 'w-1', tenantId: 'acme', status: 'waiting' },
    });
  });

  it('asserts without attributes when there is no row, and the deny still wins over the 404', async () => {
    const authorizeSpy = vi.fn<AuthPort['authorize']>(async () => false);
    program();

    const response = await decide(buildApp(allowAll(authorizeSpy)), approveBody);

    expect(response.status).toBe(401);
    expect(authorizeSpy.mock.calls[0]?.[2]).toEqual({ kind: 'execution', executionId: 'e-1' });
    expect(authorizeSpy.mock.calls[0]?.[2]).not.toHaveProperty('attributes');
    expect(engineMock.resolveNode).not.toHaveBeenCalled();
  });

  it('a deny answers 401 after the one row read, and the engine is never asked', async () => {
    program(waitingExecution);

    const response = await decide(buildApp(denyAll()), approveBody);

    expect(response.status).toBe(401);
    expect(databaseMock.select).toHaveBeenCalledTimes(1);
    expect(engineMock.resolveNode).not.toHaveBeenCalled();
  });

  describe('under the reference AllowAllAuthPort', () => {
    const originalAuthPort = process.env['WB_AUTH_PORT'];

    beforeEach(() => {
      process.env['WB_AUTH_PORT'] = 'allow-all';
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
      if (originalAuthPort === undefined) delete process.env['WB_AUTH_PORT'];
      else process.env['WB_AUTH_PORT'] = originalAuthPort;
    });

    it('an anonymous caller decides', async () => {
      program(waitingExecution);

      const response = await decide(buildApp(new AllowAllAuthPort()), approveBody);

      expect(response.status).toBe(200);
      expect(engineMock.resolveNode).toHaveBeenCalledTimes(1);
    });
  });
});

// ---- the run ----------------------------------------------------------------------

describe('POST /api/executions/:id/decision - the run', () => {
  it('404 execution_not_found when the row is missing', async () => {
    program();

    const response = await decide(buildApp(allowAll()), approveBody);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'execution_not_found', message: 'Execution not found' });
  });

  it.each([...TERMINAL_EXECUTION_STATUSES, 'cancelling'])(
    '409 execution_not_waiting on a %s run, before the body is even read',
    async (status) => {
      program({ ...waitingExecution, status });

      const response = await decide(buildApp(allowAll()), { not: 'a decision' });

      expect(response.status).toBe(409);
      expect(await codeOf(response)).toBe('execution_not_waiting');
      expect(engineMock.resolveNode).not.toHaveBeenCalled();
    },
  );

  it.each(['pending', 'running', 'waiting'])('a %s run goes through to the engine, the arbiter', async (status) => {
    program({ ...waitingExecution, status });

    const response = await decide(buildApp(allowAll()), approveBody);

    expect(response.status).toBe(200);
    expect(engineMock.resolveNode).toHaveBeenCalledTimes(1);
  });
});

// ---- the body ---------------------------------------------------------------------

describe('POST /api/executions/:id/decision - the body', () => {
  it.each<{ name: string; body: unknown; path: string }>([
    { name: 'a missing nodeId', body: { attempt: 1, action: 'approve' }, path: 'nodeId' },
    { name: 'an empty nodeId', body: { nodeId: '', attempt: 1, action: 'approve' }, path: 'nodeId' },
    { name: 'an attempt of 0', body: { nodeId: 'review-1', attempt: 0, action: 'approve' }, path: 'attempt' },
    { name: 'a non-integer attempt', body: { nodeId: 'review-1', attempt: 1.5, action: 'approve' }, path: 'attempt' },
    { name: 'a missing action', body: { nodeId: 'review-1', attempt: 1 }, path: 'action' },
  ])('400 validation_error for $name', async ({ body, path }) => {
    program(waitingExecution);

    const response = await decide(buildApp(allowAll()), body);

    expect(response.status).toBe(400);
    const json = await bodyOf(response);
    expect(json.code).toBe('validation_error');
    expect(json.details?.map((detail) => detail.path.join('.'))).toEqual([path]);
    expect(engineMock.resolveNode).not.toHaveBeenCalled();
  });
});

// ---- the node -----------------------------------------------------------------------

describe('POST /api/executions/:id/decision - the node', () => {
  it('404 node_not_found for a node the snapshot does not have', async () => {
    program(waitingExecution);

    const response = await decide(buildApp(allowAll()), { ...approveBody, nodeId: 'ghost' });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'node_not_found', message: "No node 'ghost' in this execution" });
  });

  it('409 node_not_waiting for a node that carries no decision request', async () => {
    program(waitingExecution);

    const response = await decide(buildApp(allowAll()), { ...approveBody, nodeId: 'source-1' });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: 'node_not_waiting',
      message: "Node 'source-1' carries no decision request",
    });
  });

  it('409 node_not_waiting for a node that has never parked', async () => {
    program(waitingExecution, 0);

    const response = await decide(buildApp(allowAll()), approveBody);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: 'node_not_waiting',
      message: "Node 'review-1' has not asked for a decision",
    });
    expect(engineMock.resolveNode).not.toHaveBeenCalled();
  });

  it('the node is looked up before the decision is judged: an unknown node with a bad decision is a 404', async () => {
    program(waitingExecution);

    const response = await decide(buildApp(allowAll()), { nodeId: 'ghost', attempt: 1, action: 'escalate' });

    expect(response.status).toBe(404);
  });
});

// ---- the decision -------------------------------------------------------------------

const INVALID_DECISIONS = {
  unknown_action: { nodeId: 'review-1', action: 'escalate' },
  reason_required: { nodeId: 'review-2', action: 'reject' },
  comment_required: { nodeId: 'review-1', action: 'ask-again' },
  edits_not_allowed: { nodeId: 'review-1', action: 'reject', edits: { refundAmount: 1 } },
  unknown_field: { nodeId: 'review-1', action: 'approve', edits: { discount: 10 } },
  field_not_editable: { nodeId: 'review-1', action: 'approve', edits: { orderDate: '2026-01-01' } },
  required_field_missing: { nodeId: 'review-1', action: 'approve', edits: { refundAmount: null } },
} satisfies Record<SubmittedDecisionErrorCode, Record<string, unknown>>;

describe('POST /api/executions/:id/decision - the decision', () => {
  it.each(Object.keys(SUBMITTED_DECISION_ERRORS) as SubmittedDecisionErrorCode[])(
    '400 invalid_decision carrying %s',
    async (code) => {
      program(waitingExecution);

      const response = await decide(buildApp(allowAll()), { attempt: 1, ...INVALID_DECISIONS[code] });

      expect(response.status).toBe(400);
      const json = await bodyOf(response);
      expect(json.code).toBe('invalid_decision');
      expect(json.details).toHaveLength(1);
      expect(json.details?.[0]).toMatchObject({ code, message: expect.any(String), path: expect.any(Array) });
      expect(engineMock.resolveNode).not.toHaveBeenCalled();
    },
  );

  it('the decision is judged before the attempt: a bad decision with a stale attempt is a 400', async () => {
    program(waitingExecution, 1);

    const response = await decide(buildApp(allowAll()), { nodeId: 'review-1', attempt: 2, action: 'escalate' });

    expect(response.status).toBe(400);
    expect(await codeOf(response)).toBe('invalid_decision');
  });
});

// ---- the wait instance ------------------------------------------------------------

describe('POST /api/executions/:id/decision - the wait instance', () => {
  it('409 decision_attempt_mismatch carrying the current attempt', async () => {
    program(waitingExecution, 1);

    const response = await decide(buildApp(allowAll()), { ...approveBody, attempt: 2 });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: 'decision_attempt_mismatch',
      message: 'The decision names a wait that is not the current one',
      attempt: 1,
    });
    expect(engineMock.resolveNode).not.toHaveBeenCalled();
  });

  it('a decision for the second of two waiting nodes is delivered while the first keeps waiting', async () => {
    program(waitingExecution, 1);

    const response = await decide(buildApp(allowAll()), { nodeId: 'review-2', attempt: 1, action: 'approve' });

    expect(response.status).toBe(200);
    expect(engineMock.resolveNode).toHaveBeenCalledTimes(1);
    expect(engineMock.resolveNode).toHaveBeenCalledWith('e-1', 'review-2', {
      output: { action: 'approve', effect: 'resume', edits: {} },
      nextPort: 'approved',
    });
  });
});

// ---- the effect ---------------------------------------------------------------------

describe('POST /api/executions/:id/decision - the effect', () => {
  it('501 effect_not_supported for rerun-source, engine never asked', async () => {
    program(waitingExecution);

    const response = await decide(buildApp(allowAll()), {
      nodeId: 'review-1',
      attempt: 1,
      action: 'ask-again',
      comment: 'too generous',
    });

    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({
      code: 'effect_not_supported',
      message: "Action 'ask-again' re-runs the proposal source, which is not supported yet",
    });
    expect(engineMock.resolveNode).not.toHaveBeenCalled();
  });
});

// ---- delivery -----------------------------------------------------------------------

describe('POST /api/executions/:id/decision - delivery', () => {
  it('hands the engine the decision as the output and the action port as the route, and answers 200', async () => {
    program(waitingExecution);

    const response = await decide(buildApp(allowAll()), approveBody);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      executionId: 'e-1',
      nodeId: 'review-1',
      attempt: 1,
      action: 'approve',
      effect: 'resume-with-edits',
    });
    expect(engineMock.resolveNode).toHaveBeenCalledWith('e-1', 'review-1', {
      output: approvedDecision,
      nextPort: 'approved',
    });
  });

  it('a reject with no reason, none required, resumes on the reject port', async () => {
    program(waitingExecution);

    const response = await decide(buildApp(allowAll()), { nodeId: 'review-1', attempt: 1, action: 'reject' });

    expect(response.status).toBe(200);
    const body = await bodyOf(response);
    expect(body.effect).toBe('reject');
    expect(engineMock.resolveNode).toHaveBeenCalledWith('e-1', 'review-1', {
      output: { action: 'reject', effect: 'reject', edits: {} },
      nextPort: 'rejected',
    });
  });

  it.each<{ code: ResolveNodeRejection; status: number; answer: string }>([
    { code: 'node_not_waiting', status: 409, answer: 'node_not_waiting' },
    { code: 'verdict_already_delivered', status: 409, answer: 'decision_already_made' },
    { code: 'run_not_found', status: 409, answer: 'execution_not_waiting' },
  ])('the engine answer $code becomes $status $answer on the first try, no retry', async ({ code, status, answer }) => {
    program(waitingExecution);
    engineMock.resolveNode.mockResolvedValue({ error: { code, message: 'engine said no' } });

    const response = await decide(buildApp(allowAll()), approveBody);

    expect(response.status).toBe(status);
    expect(await codeOf(response)).toBe(answer);
    expect(engineMock.resolveNode).toHaveBeenCalledTimes(1);
  });

  it.each<ResolveNodeRejection>(['verdict_malformed', 'verdict_for_unknown_node'])(
    'the engine answer %s is a backend fault: 500',
    async (code) => {
      program(waitingExecution);
      engineMock.resolveNode.mockResolvedValue({ error: { code, message: 'engine said no' } });

      const response = await decide(buildApp(allowAll()), approveBody);

      expect(response.status).toBe(500);
      expect(await codeOf(response)).toBe('internal_error');
    },
  );

  it('a stored snapshot that no longer parses is a backend fault: 500', async () => {
    program({ ...waitingExecution, workflowSnapshotJson: { nodes: 'broken' } });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await decide(buildApp(allowAll()), approveBody);

    expect(response.status).toBe(500);
    expect(engineMock.resolveNode).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
