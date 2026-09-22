import { afterEach, describe, expect, it, vi } from 'vitest';

// The real receiver, through the backend's own node_modules, as decision-request-contract.test.ts does.
import { submittedDecisionSchema } from '../../../backend/src/domain/decision/validate-submitted-decision';
import { type DecisionBody, submitDecision } from './submit-decision';

const base = { nodeId: 'human-1', attempt: 1, action: 'approve' };

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

async function sentBody(input: DecisionBody) {
  const fetchMock = stubFetch(answer(200, { effect: 'resume' }));
  await submitDecision('exec-1', input);
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('the body submitDecision sends', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carries exactly nodeId, attempt and action when there is nothing else to say', async () => {
    expect(Object.keys(await sentBody({ ...base, edits: {}, reason: '   ' }))).toEqual(['nodeId', 'attempt', 'action']);
  });

  it('adds edits only when non-empty and reason only when non-blank', async () => {
    expect(await sentBody({ ...base, edits: { refundAmount: 120 } })).toEqual({
      ...base,
      edits: { refundAmount: 120 },
    });
    expect(await sentBody({ ...base, action: 'reject', reason: 'Too high' })).toEqual({
      ...base,
      action: 'reject',
      reason: 'Too high',
    });
  });

  it.each([
    ['approve without edits', base],
    ['approve with edits', { ...base, edits: { refundAmount: 120, replyDraft: null } }],
    ['reject with a reason', { ...base, action: 'reject', reason: 'Too high' }],
  ])('%s parses with the backend submittedDecisionSchema', async (_name, input) => {
    const body = await sentBody(input);
    const parsed = submittedDecisionSchema.safeParse(body);

    expect(parsed.success, JSON.stringify(parsed.success ? null : parsed.error.issues)).toBe(true);
    expect(typeof body['nodeId']).toBe('string');
    expect(Number.isInteger(body['attempt']) && Number(body['attempt']) >= 1).toBe(true);
  });
});

describe('submitDecision', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to the execution decision route and reads the effect', async () => {
    const fetchMock = stubFetch(answer(200, { effect: 'resume-with-edits' }));

    const result = await submitDecision('exec-1', { ...base, edits: { refundAmount: 120 } });

    expect(result).toEqual({ ok: true, effect: 'resume-with-edits' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:3001/api/executions/exec-1/decision');
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

    expect(await submitDecision('exec-1', base)).toEqual({
      ok: false,
      status: 409,
      code: 'decision_attempt_mismatch',
      message: 'The decision names a wait that is not the current one',
      currentAttempt: 2,
    });
  });

  it('reads Retry-After from a 503', async () => {
    stubFetch(answer(503, { code: 'decision_delivery_timeout', message: 'Send it again' }, { 'Retry-After': '5' }));

    expect(await submitDecision('exec-1', base)).toMatchObject({
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

    expect(await submitDecision('exec-1', base)).toMatchObject({
      ok: false,
      status: 400,
      code: 'invalid_decision',
      detail: "action 'reject' requires a reason",
    });
  });

  it('falls back to the HTTP status when the body is not the refusal envelope', async () => {
    stubFetch(new Response('gateway', { status: 502, statusText: 'Bad Gateway' }));

    expect(await submitDecision('exec-1', base)).toEqual({
      ok: false,
      status: 502,
      code: 'http_502',
      message: 'Bad Gateway',
    });
  });

  it('reports a failed request as a network error', async () => {
    stubFetch(new TypeError('Failed to fetch'));

    expect(await submitDecision('exec-1', base)).toEqual({
      ok: false,
      status: 0,
      code: 'network_error',
      message: 'Failed to fetch',
    });
  });
});
