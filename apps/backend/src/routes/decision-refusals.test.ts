import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { DECISION_REFUSALS, DECISION_REFUSAL_STATUS, type DecisionRefusal, refuse } from './decision-refusals';

async function answer(refusal: DecisionRefusal, value?: string, extra?: Record<string, unknown>) {
  const app = new Hono().get('/', (c) => refuse(c, refusal, value, extra));
  const response = await app.request('/');
  return {
    status: response.status,
    retryAfter: response.headers.get('retry-after'),
    body: (await response.json()) as Record<string, unknown>,
  };
}

describe('decision refusals', () => {
  it('every code is answered in at least one situation', () => {
    const answered = new Set(Object.values(DECISION_REFUSALS).map((refusal) => refusal.code));

    expect([...answered].sort()).toEqual(Object.keys(DECISION_REFUSAL_STATUS).sort());
  });

  it('answers with the code, its status, the filled message and whatever else the route adds', async () => {
    expect(await answer('node_not_found', '$&-$1')).toEqual({
      status: 404,
      retryAfter: null,
      body: { code: 'node_not_found', message: "No node '$&-$1' in this execution" },
    });
    expect(await answer('attempt_mismatch', undefined, { attempt: 1 })).toEqual({
      status: 409,
      retryAfter: null,
      body: {
        code: 'decision_attempt_mismatch',
        message: 'The decision names a wait that is not the current one',
        attempt: 1,
      },
    });
  });

  it('a delivery timeout asks for a retry in five seconds and says the decision may have landed', async () => {
    const answered = await answer('delivery_timeout');

    expect(answered.status).toBe(503);
    expect(answered.retryAfter).toBe('5');
    expect(answered.body.code).toBe('decision_delivery_timeout');
    expect(answered.body.message).toContain('may or may not have landed');
    expect(answered.body.message).toContain('decision_already_made');
  });
});
