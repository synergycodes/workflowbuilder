import { afterEach, describe, expect, it, vi } from 'vitest';

// The backend's schema for the decision itself, which the route extends with nodeId and attempt; read through
// the backend's own node_modules, as decision-request-contract.test.ts does.
import { submittedDecisionSchema } from '../../../backend/src/domain/decision/validate-submitted-decision';
import { BACKEND_URL } from '../config';
import { type DecisionInput, submitDecision } from './submit-decision';

const wait = { executionId: 'exec-1', nodeId: 'human-1', attempt: 1 };
const addressed = { nodeId: 'human-1', attempt: 1 };
const approve = { action: 'approve' };

function answer(status: number, payload: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn();
  fetchMock.mockImplementation(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function sentBody(input: DecisionInput) {
  const fetchMock = stubFetch(answer(200, { effect: 'resume' }));
  await submitDecision(wait, input);
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('the body submitDecision sends', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carries exactly the node, the wait and the action when there is nothing else to say', async () => {
    expect(await sentBody({ ...approve, edits: {}, reason: '   ' })).toEqual({ ...addressed, ...approve });
  });

  it('adds edits only when non-empty and reason only when non-blank', async () => {
    expect(await sentBody({ ...approve, edits: { refundAmount: 120 } })).toEqual({
      ...addressed,
      ...approve,
      edits: { refundAmount: 120 },
    });
    expect(await sentBody({ action: 'reject', reason: 'Too high' })).toEqual({
      ...addressed,
      action: 'reject',
      reason: 'Too high',
    });
  });

  it.each([
    ['approve without edits', approve],
    ['approve with edits', { ...approve, edits: { refundAmount: 120, replyDraft: null } }],
    ['reject with a reason', { action: 'reject', reason: 'Too high' }],
  ])('%s parses with the backend submittedDecisionSchema', async (_name, input) => {
    const { nodeId, attempt, ...decision } = await sentBody(input);
    const parsed = submittedDecisionSchema.strict().safeParse(decision);

    expect(parsed.success, JSON.stringify(parsed.success ? null : parsed.error.issues)).toBe(true);
    expect({ nodeId, attempt }).toEqual(addressed);
  });
});

describe('submitDecision', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to the execution decision route and reads the effect', async () => {
    const fetchMock = stubFetch(answer(200, { effect: 'resume-with-edits' }));

    const result = await submitDecision(wait, { ...approve, edits: { refundAmount: 120 } });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BACKEND_URL}/api/executions/exec-1/decision`);
    expect(init.method).toBe('POST');
  });

  it('returns the refusal code and message of a 409, with the current attempt when named', async () => {
    stubFetch(
      answer(409, {
        code: 'decision_attempt_mismatch',
        message: 'The decision names a wait that is not the current one',
        attempt: 2,
      }),
    );

    expect(await submitDecision(wait, approve)).toEqual({
      ok: false,
      status: 409,
      code: 'decision_attempt_mismatch',
      message: 'The decision names a wait that is not the current one',
      currentAttempt: 2,
    });
  });

  it('reads Retry-After from a 503', async () => {
    stubFetch(answer(503, { code: 'decision_delivery_timeout', message: 'Send it again' }, { 'Retry-After': '5' }));

    expect(await submitDecision(wait, approve)).toMatchObject({
      ok: false,
      status: 503,
      code: 'decision_delivery_timeout',
      retryAfterSeconds: 5,
    });
  });

  it('surfaces the first detail of a 400', async () => {
    stubFetch(
      answer(400, {
        code: 'invalid_decision',
        message: 'Decision failed validation',
        details: [{ code: 'reason_required', message: "action 'reject' requires a reason" }],
      }),
    );

    expect(await submitDecision(wait, approve)).toMatchObject({
      ok: false,
      status: 400,
      code: 'invalid_decision',
      detail: "action 'reject' requires a reason",
    });
  });

  it('says what happened when a proxy answers without the refusal envelope or a status text', async () => {
    stubFetch(new Response('<html>gateway</html>', { status: 502 }));

    expect(await submitDecision(wait, approve)).toEqual({
      ok: false,
      status: 502,
      code: 'http_502',
      message: 'The backend answered HTTP 502 without saying why.',
    });
  });

  it('does not take a success page from somewhere else for an accepted decision', async () => {
    stubFetch(new Response('<html>app</html>', { status: 200 }));

    expect(await submitDecision(wait, approve)).toMatchObject({ ok: false, status: 200 });
  });

  it('reports a failed request as a network error', async () => {
    stubFetch(new TypeError('Failed to fetch'));

    expect(await submitDecision(wait, approve)).toEqual({
      ok: false,
      status: 0,
      code: 'network_error',
      message: 'Failed to fetch',
    });
  });
});
