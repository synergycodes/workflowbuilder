import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { DECISION_REFUSALS, DECISION_REFUSAL_STATUS, type DecisionRefusal, refuse } from './decision-refusals';

async function answer(refusal: DecisionRefusal, value?: string, extra?: Record<string, unknown>) {
  const app = new Hono().get('/', (c) => refuse(c, refusal, value, extra));
  const response = await app.request('/');
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe('decision refusals', () => {
  it('every code is answered in at least one situation', () => {
    const answered = new Set(Object.values(DECISION_REFUSALS).map((refusal) => refusal.code));

    expect([...answered].sort()).toEqual(Object.keys(DECISION_REFUSAL_STATUS).sort());
  });

  it('answers with the code, its status, the filled message and whatever else the route adds', async () => {
    expect(await answer('node_not_found', '$&-$1')).toEqual({
      status: 404,
      body: { code: 'node_not_found', message: "No node '$&-$1' in this execution" },
    });
    expect(await answer('attempt_mismatch', undefined, { attempt: 1 })).toEqual({
      status: 409,
      body: {
        code: 'decision_attempt_mismatch',
        message: 'The decision names a wait that is not the current one',
        attempt: 1,
      },
    });
  });
});
