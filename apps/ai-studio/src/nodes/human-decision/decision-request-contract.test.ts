import { describe, expect, it } from 'vitest';

// The real receiver, not a copy: the backend owns the publish contract. Resolved through the
// backend's own node_modules, so AI Studio takes no dependency on it. Where this test should
// live is still open (follow-up: decision-request-contract-test-home).
import { decisionRequestSchema } from '../../../../backend/src/domain/decision/decision-request-schema';
import { refundReviewRequest } from '../../data/refund-review-flow';
import { defaultDecisionRequest } from './default-properties-data';

describe('the decision requests AI Studio ships, against the backend contract', () => {
  it.each([
    ['the palette preset', defaultDecisionRequest],
    ['the "Refund Review" template', refundReviewRequest],
  ])('%s parses with decisionRequestSchema', (_name, request) => {
    const parsed = decisionRequestSchema.safeParse(request);

    expect(parsed.success, JSON.stringify(parsed.success ? null : parsed.error.issues)).toBe(true);
  });
});
